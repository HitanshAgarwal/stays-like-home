from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class BookingCreate(BaseModel):
    listing_id: int
    check_in: date
    check_out: date
    num_guests: int = Field(ge=1)

    @model_validator(mode="after")
    def _check_dates(self):
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
    listing: BookingListingOut
