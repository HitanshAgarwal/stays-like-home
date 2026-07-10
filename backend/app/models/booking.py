"""SQLAlchemy model for guest bookings of listings, including booking status states."""
from datetime import date, datetime
from enum import Enum as PyEnum

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class BookingStatus(str, PyEnum):
    """Lifecycle states a booking can be in."""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class Booking(Base):
    """A reservation of a listing by a guest for a date range, with pricing snapshotted at booking time."""

    __tablename__ = "bookings"
    __table_args__ = (
        CheckConstraint("check_out > check_in", name="ck_booking_dates_valid"),
        # supports the overlap query: WHERE listing_id = ? AND check_in < ? AND check_out > ?
        Index("ix_booking_listing_dates", "listing_id", "check_in", "check_out"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id", ondelete="CASCADE"), index=True)
    guest_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    check_in: Mapped[date] = mapped_column(Date, nullable=False)
    check_out: Mapped[date] = mapped_column(Date, nullable=False)
    num_guests: Mapped[int] = mapped_column(Integer, default=1)

    # snapshotted at booking time so later host price edits don't retroactively reprice this stay
    nightly_rate_snapshot: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    cleaning_fee_snapshot: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    total_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    status: Mapped[str] = mapped_column(String(20), default=BookingStatus.CONFIRMED.value, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    listing: Mapped["Listing"] = relationship(back_populates="bookings")
    guest: Mapped["User"] = relationship(back_populates="bookings")
    review: Mapped["Review | None"] = relationship(
        back_populates="booking", uselist=False, cascade="all, delete-orphan"
    )
