"""Hosts API router: public aggregate stats for a host (average rating, review and completed-booking counts) used to derive the Superhost badge on the fly."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import Select, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import Booking, BookingStatus, Listing, Review, User
from app.schemas.host import HostStatsOut

router = APIRouter(prefix="/api/hosts", tags=["hosts"])

# Superhost thresholds: computed on the fly, not stored.
SUPERHOST_MIN_RATING = 4.8
SUPERHOST_MIN_COMPLETED = 3


def _host_listing_ids(host_id: int) -> Select:
    """Build a subquery selecting the ids of all listings owned by the given host, for use in aggregate `IN` filters."""
    return select(Listing.id).where(Listing.host_id == host_id)


@router.get("/{host_id}/stats", response_model=HostStatsOut)
async def get_host_stats(host_id: int, db: AsyncSession = Depends(get_db)) -> HostStatsOut:
    """Public aggregate stats for a host, used to compute the Superhost badge.

    - average_rating: mean of all reviews across the host's listings
    - completed_bookings: confirmed bookings whose checkout has passed (the same
      "completed" rule used elsewhere), across the host's listings
    """
    host_exists = await db.scalar(select(exists().where(User.id == host_id)))
    if not host_exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Host not found")

    listing_ids = _host_listing_ids(host_id)

    avg_rating = await db.scalar(
        select(func.avg(Review.rating)).where(Review.listing_id.in_(listing_ids))
    )
    review_count = await db.scalar(
        select(func.count()).select_from(Review).where(Review.listing_id.in_(listing_ids))
    )
    completed = await db.scalar(
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.listing_id.in_(listing_ids),
            Booking.status == BookingStatus.CONFIRMED.value,
            Booking.check_out <= date.today(),
        )
    )

    avg = round(float(avg_rating), 2) if avg_rating is not None else None
    completed_count = completed or 0
    is_superhost = (
        avg is not None and avg >= SUPERHOST_MIN_RATING and completed_count >= SUPERHOST_MIN_COMPLETED
    )

    return HostStatsOut(
        host_id=host_id,
        average_rating=avg,
        review_count=review_count or 0,
        completed_bookings=completed_count,
        is_superhost=is_superhost,
    )
