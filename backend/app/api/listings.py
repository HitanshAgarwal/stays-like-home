from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Amenity, Booking, BookingStatus, Listing, ListingAmenity, ListingPhoto, Review, User
from app.schemas.listing import (
    AvailabilityOut,
    BookedRange,
    ListingCreate,
    ListingDetailOut,
    ListingListOut,
    ListingOut,
    ListingUpdate,
)

router = APIRouter(prefix="/api/listings", tags=["listings"])

# photos + amenities are needed by every listing response shape
LISTING_LOAD = (
    selectinload(Listing.photos),
    selectinload(Listing.amenity_links).selectinload(ListingAmenity.amenity),
)


async def _validated_amenity_ids(db: AsyncSession, amenity_ids: list[int]) -> list[int]:
    """Dedupe (order-preserving) and reject ids that don't exist — SQLite won't
    enforce the FK for us here."""
    deduped = list(dict.fromkeys(amenity_ids))
    if deduped:
        found = set((await db.scalars(select(Amenity.id).where(Amenity.id.in_(deduped)))).all())
        missing = [a for a in deduped if a not in found]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown amenity ids: {missing}"
            )
    return deduped


def _build_photos(photo_urls: list[str]) -> list[ListingPhoto]:
    return [
        ListingPhoto(url=url, position=i, is_cover=(i == 0)) for i, url in enumerate(photo_urls)
    ]


async def _get_owned_listing(db: AsyncSession, listing_id: int, user: User) -> Listing:
    listing = await db.scalar(
        select(Listing).where(Listing.id == listing_id).options(*LISTING_LOAD)
    )
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.host_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this listing"
        )
    return listing


@router.get("", response_model=ListingListOut)
async def list_listings(
    city: str | None = None,
    property_type: str | None = None,
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    check_in: date | None = None,
    check_out: date | None = None,
    guests: int | None = Query(default=None, ge=1),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> ListingListOut:
    if (check_in is None) != (check_out is None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="check_in and check_out must be provided together",
        )
    if check_in is not None and check_out is not None and check_out <= check_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="check_out must be after check_in"
        )

    filters = []
    if city:
        filters.append(func.lower(Listing.city) == city.lower())
    if property_type:
        filters.append(func.lower(Listing.property_type) == property_type.lower())
    if min_price is not None:
        filters.append(Listing.price_per_night >= min_price)
    if max_price is not None:
        filters.append(Listing.price_per_night <= max_price)
    if guests is not None:
        filters.append(Listing.max_guests >= guests)
    if check_in is not None and check_out is not None:
        overlapping = select(Booking.id).where(
            Booking.listing_id == Listing.id,
            Booking.status == BookingStatus.CONFIRMED.value,
            Booking.check_in < check_out,
            Booking.check_out > check_in,
        )
        filters.append(~exists(overlapping))

    total = await db.scalar(select(func.count()).select_from(Listing).where(*filters))
    rows = (
        await db.scalars(
            select(Listing)
            .where(*filters)
            .options(*LISTING_LOAD)
            .order_by(Listing.created_at.desc(), Listing.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    return ListingListOut(
        items=[ListingOut.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


# declared before /{listing_id} so "mine" isn't captured as a path param
@router.get("/mine", response_model=list[ListingOut])
async def my_listings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ListingOut]:
    rows = (
        await db.scalars(
            select(Listing)
            .where(Listing.host_id == current_user.id)
            .options(*LISTING_LOAD)
            .order_by(Listing.created_at.desc(), Listing.id.desc())
        )
    ).all()
    return [ListingOut.model_validate(r) for r in rows]


@router.get("/{listing_id}", response_model=ListingDetailOut)
async def get_listing(listing_id: int, db: AsyncSession = Depends(get_db)) -> ListingDetailOut:
    listing = await db.scalar(
        select(Listing)
        .where(Listing.id == listing_id)
        .options(
            *LISTING_LOAD,
            selectinload(Listing.host),
            selectinload(Listing.reviews).selectinload(Review.author),
        )
    )
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    detail = ListingDetailOut.model_validate(listing)
    if listing.reviews:
        detail.average_rating = round(
            sum(r.rating for r in listing.reviews) / len(listing.reviews), 2
        )
    return detail


@router.get("/{listing_id}/availability", response_model=AvailabilityOut)
async def get_availability(listing_id: int, db: AsyncSession = Depends(get_db)) -> AvailabilityOut:
    """Public: the confirmed-booking date ranges that block this listing.

    Exposes only the [check_in, check_out) spans (no guest, price, or booking id),
    so the client can gray out taken dates without leaking who booked what. Past
    ranges (already checked out) are omitted since they can't block a new stay.
    """
    listing_id_exists = await db.scalar(select(exists().where(Listing.id == listing_id)))
    if not listing_id_exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    today = date.today()
    rows = (
        await db.scalars(
            select(Booking)
            .where(
                Booking.listing_id == listing_id,
                Booking.status == BookingStatus.CONFIRMED.value,
                Booking.check_out > today,
            )
            .order_by(Booking.check_in)
        )
    ).all()
    return AvailabilityOut(
        listing_id=listing_id,
        booked_ranges=[BookedRange(check_in=b.check_in, check_out=b.check_out) for b in rows],
    )


@router.post("", response_model=ListingOut, status_code=status.HTTP_201_CREATED)
async def create_listing(
    payload: ListingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ListingOut:
    amenity_ids = await _validated_amenity_ids(db, payload.amenity_ids)

    listing = Listing(
        host_id=current_user.id,
        **payload.model_dump(exclude={"amenity_ids", "photo_urls"}),
    )
    listing.photos = _build_photos(payload.photo_urls)
    listing.amenity_links = [ListingAmenity(amenity_id=a) for a in amenity_ids]
    db.add(listing)
    await db.commit()

    listing = await db.scalar(
        select(Listing).where(Listing.id == listing.id).options(*LISTING_LOAD)
    )
    return ListingOut.model_validate(listing)


@router.patch("/{listing_id}", response_model=ListingOut)
async def update_listing(
    listing_id: int,
    payload: ListingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ListingOut:
    listing = await _get_owned_listing(db, listing_id, current_user)

    data = payload.model_dump(exclude_unset=True)
    amenity_ids = data.pop("amenity_ids", None)
    photo_urls = data.pop("photo_urls", None)

    for field, value in data.items():
        setattr(listing, field, value)

    if amenity_ids is not None:
        new_ids = await _validated_amenity_ids(db, amenity_ids)
        # reuse surviving link rows instead of delete+reinsert, which would
        # collide on the composite PK within a single flush
        existing = {link.amenity_id: link for link in listing.amenity_links}
        listing.amenity_links = [
            existing.get(a) or ListingAmenity(amenity_id=a) for a in new_ids
        ]

    if photo_urls is not None:
        listing.photos = _build_photos(photo_urls)

    await db.commit()

    listing = await db.scalar(
        select(Listing).where(Listing.id == listing_id).options(*LISTING_LOAD)
    )
    return ListingOut.model_validate(listing)


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_listing(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    listing = await _get_owned_listing(db, listing_id, current_user)
    await db.delete(listing)
    await db.commit()
