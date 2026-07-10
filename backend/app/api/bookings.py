"""Bookings API router for the Airbnb-clone.

Creating a booking is serialized through SQLite's single writer: the shared
engine opens every transaction as BEGIN IMMEDIATE (see db/session.py), so
``create_booking`` holds the write lock across its overlap check and insert.
Two racing requests for the same dates therefore cannot interleave -- one
commits, the other blocks and then sees the committed row and is rejected with
409. Booking status is stored as-is and the "completed" state is derived at
read time (see ``effective_status``) rather than by a scheduler.
"""
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, exists, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Booking, BookingStatus, Listing, ListingPhoto, User
from app.schemas.booking import BookingCreate, BookingListingOut, BookingOut, BookingWithListingOut

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


def effective_status(booking: Booking, today: date | None = None) -> str:
    """A confirmed booking whose stay is over reads as 'completed'.

    Bookings never auto-transition in storage; we derive the completed state at read
    time instead of running a scheduler. A stay counts as over once its checkout day
    has arrived (check_out is the departure day, so the guest may review on that day).
    Cancelled/pending/already-completed rows are returned unchanged.
    """
    if today is None:
        today = date.today()
    if booking.status == BookingStatus.CONFIRMED.value and booking.check_out <= today:
        return BookingStatus.COMPLETED.value
    return booking.status


def _overlap_clause(listing_id: int, check_in, check_out):
    """A confirmed booking on this listing whose date range intersects [check_in, check_out).

    Uses the (listing_id, check_in, check_out) columns of ix_booking_listing_dates.
    The half-open comparison (existing.check_in < check_out AND existing.check_out >
    check_in) treats a checkout day as free for a same-day check-in.
    """
    return and_(
        Booking.listing_id == listing_id,
        Booking.status == BookingStatus.CONFIRMED.value,
        Booking.check_in < check_out,
        Booking.check_out > check_in,
    )


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
async def create_booking(
    payload: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BookingOut:
    """Create a confirmed booking for the current user, serialized so concurrent requests can't double-book.

    Because the shared engine begins every transaction as BEGIN IMMEDIATE, this
    handler already holds SQLite's single write lock (get_current_user's read
    opened the transaction), and keeps it through the availability check and the
    insert until commit. It validates the listing exists and honors max_guests,
    rejects any date overlap with an existing confirmed booking (409), snapshots
    the listing's current nightly rate and cleaning fee onto the row so later
    host price edits don't reprice this stay, and rolls back on any error.
    """
    # --- the critical section --------------------------------------------------
    # Every transaction on this engine begins as BEGIN IMMEDIATE (see db/session.py),
    # so the moment this session touches the DB it holds SQLite's single write lock,
    # and keeps it until we commit. The get_current_user dependency already issued a
    # read on this same session, so the IMMEDIATE transaction -- and the write lock --
    # is open before we get here. A second concurrent booking request blocks at its
    # own BEGIN IMMEDIATE until we commit, then runs its overlap check against a table
    # that already contains our row. Exactly one of two racing requests can succeed;
    # the overlap check and the insert cannot interleave.
    #
    # We deliberately do NOT open a nested db.begin() here (SQLAlchemy forbids nesting
    # on an already-open transaction). We run the check + insert on the ambient
    # transaction and commit once at the end; any error rolls the whole thing back.
    try:
        listing = await db.get(Listing, payload.listing_id)
        if listing is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
        if payload.num_guests > listing.max_guests:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This listing allows at most {listing.max_guests} guests",
            )

        conflict = await db.scalar(
            select(exists().where(_overlap_clause(payload.listing_id, payload.check_in, payload.check_out)))
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Those dates are no longer available",
            )

        # Snapshot price from the listing's CURRENT values, so a later host price
        # edit doesn't retroactively reprice this stay.
        nights = (payload.check_out - payload.check_in).days
        nightly = Decimal(str(listing.price_per_night))
        cleaning = Decimal(str(listing.cleaning_fee))
        total = nightly * nights + cleaning

        booking = Booking(
            listing_id=payload.listing_id,
            guest_id=current_user.id,
            check_in=payload.check_in,
            check_out=payload.check_out,
            num_guests=payload.num_guests,
            nightly_rate_snapshot=nightly,
            cleaning_fee_snapshot=cleaning,
            total_price=total,
            status=BookingStatus.CONFIRMED.value,
        )
        db.add(booking)
        await db.commit()
    except Exception:
        await db.rollback()
        raise
    await db.refresh(booking)
    return BookingOut.model_validate(booking)


@router.get("/mine", response_model=list[BookingWithListingOut])
async def my_bookings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[BookingWithListingOut]:
    """List the current user's bookings (newest stay first), each with a compact listing summary and cover photo."""
    rows = (
        await db.scalars(
            select(Booking)
            .where(Booking.guest_id == current_user.id)
            .options(selectinload(Booking.listing).selectinload(Listing.photos))
            .order_by(Booking.check_in.desc(), Booking.id.desc())
        )
    ).all()
    return [_to_with_listing(b) for b in rows]


@router.get("/listing/{listing_id}", response_model=list[BookingOut])
async def listing_bookings(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[BookingOut]:
    """List all bookings for a listing, restricted to that listing's host (403 otherwise, 404 if the listing is missing)."""
    listing = await db.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.host_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the listing's host can view its bookings",
        )
    rows = (
        await db.scalars(
            select(Booking)
            .where(Booking.listing_id == listing_id)
            .order_by(Booking.check_in.desc(), Booking.id.desc())
        )
    ).all()
    return [_to_booking_out(b) for b in rows]


@router.patch("/{booking_id}/cancel", response_model=BookingOut)
async def cancel_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BookingOut:
    """Cancel a booking, allowed for either the guest or the listing's host; 404 if missing, 409 if already cancelled."""
    booking = await db.scalar(
        select(Booking).where(Booking.id == booking_id).options(selectinload(Booking.listing))
    )
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    is_guest = booking.guest_id == current_user.id
    is_host = booking.listing.host_id == current_user.id
    if not (is_guest or is_host):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the guest or the listing's host can cancel this booking",
        )
    if booking.status == BookingStatus.CANCELLED.value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Booking already cancelled")

    booking.status = BookingStatus.CANCELLED.value
    await db.commit()
    await db.refresh(booking)
    return BookingOut.model_validate(booking)


def _to_booking_out(booking: Booking) -> BookingOut:
    """Serialize a booking to BookingOut with its read-time effective status applied."""
    out = BookingOut.model_validate(booking)
    out.status = effective_status(booking)
    return out


def _to_with_listing(booking: Booking) -> BookingWithListingOut:
    """Serialize a booking to BookingWithListingOut, applying effective status and embedding a compact listing summary."""
    listing = booking.listing
    out = BookingWithListingOut.model_validate(booking)
    out.status = effective_status(booking)
    out.listing = BookingListingOut(
        id=listing.id,
        title=listing.title,
        city=listing.city,
        cover_photo=_cover_photo(listing.photos),
    )
    return out


def _cover_photo(photos: list[ListingPhoto]) -> str | None:
    """Pick a listing's cover image URL: the photo flagged is_cover, else the lowest-position photo, or None if there are none."""
    if not photos:
        return None
    for p in photos:
        if p.is_cover:
            return p.url
    return min(photos, key=lambda p: p.position).url
