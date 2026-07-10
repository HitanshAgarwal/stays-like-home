from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.bookings import effective_status
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Booking, BookingStatus, Listing, Review, User
from app.schemas.review import ReviewCreate, ReviewListOut, ReviewOut

router = APIRouter(tags=["reviews"])


@router.post("/api/reviews", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
async def create_review(
    payload: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReviewOut:
    booking = await db.get(Booking, payload.booking_id)
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.guest_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="You can only review your own bookings"
        )
    if effective_status(booking) != BookingStatus.COMPLETED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only review a stay after it is completed",
        )

    review = Review(
        booking_id=booking.id,
        listing_id=booking.listing_id,
        author_id=current_user.id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)
    try:
        await db.commit()
    except IntegrityError:
        # the unique index on booking_id enforces one review per stay at the DB
        # level; turn the raced/duplicate insert into a clean 400 rather than a 500.
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This booking has already been reviewed",
        )

    # reload with the author relationship so ReviewOut can surface author_name
    review = await db.scalar(
        select(Review).where(Review.id == review.id).options(selectinload(Review.author))
    )
    return ReviewOut.model_validate(review)


@router.get("/api/listings/{listing_id}/reviews", response_model=ReviewListOut)
async def list_listing_reviews(
    listing_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> ReviewListOut:
    listing = await db.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    total = await db.scalar(
        select(func.count()).select_from(Review).where(Review.listing_id == listing_id)
    )
    rows = (
        await db.scalars(
            select(Review)
            .where(Review.listing_id == listing_id)
            .options(selectinload(Review.author))
            .order_by(Review.created_at.desc(), Review.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    return ReviewListOut(
        items=[ReviewOut.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )
