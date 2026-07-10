"""Pydantic schemas for creating and returning bookings."""
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class BookingCreate(BaseModel):
    """Request body for creating a booking."""

    listing_id: int
    check_in: date
    check_out: date
    num_guests: int = Field(ge=1)

    @model_validator(mode="after")
    def _check_dates(self):
        """Reject bookings whose check-out is not strictly after check-in."""
        if self.check_out <= self.check_in:
            raise ValueError("check_out must be after check_in")
        return self


class BookingListingOut(BaseModel):
    """Slim listing summary embedded in a booking, for the trips/dashboard views."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    city: str
    cover_photo: str | None = None


class BookingOut(BaseModel):
    """A booking as returned to clients, including snapshotted pricing and status."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    listing_id: int
    guest_id: int
    check_in: date
    check_out: date
    num_guests: int
    nightly_rate_snapshot: float
    cleaning_fee_snapshot: float
    total_price: float
    status: str
    created_at: datetime


class BookingWithListingOut(BookingOut):
    """A booking with its embedded listing summary, for trips/dashboard views."""

    listing: BookingListingOut
