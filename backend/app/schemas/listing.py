"""Pydantic schemas for listings and their related amenities, photos, hosts, reviews, and availability."""
from datetime import date, datetime
from typing import Annotated

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator

PhotoUrl = Annotated[str, Field(min_length=1, max_length=500)]


class AmenityOut(BaseModel):
    """An amenity as returned to clients."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    icon: str | None


class ListingPhotoOut(BaseModel):
    """A listing photo as returned to clients."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    position: int
    is_cover: bool


class HostOut(BaseModel):
    """Public-facing host info — deliberately excludes email."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    avatar_url: str | None


class ReviewOut(BaseModel):
    """A review summary embedded in listing detail responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    rating: int
    comment: str | None
    created_at: datetime
    # populated from the Review.author relationship
    author_name: str = Field(validation_alias=AliasChoices("author_name", "author"))

    @field_validator("author_name", mode="before")
    @classmethod
    def _author_to_name(cls, value):
        """Accept either an author object (extract its name) or an already-resolved name string."""
        return getattr(value, "name", value)


class ListingBase(BaseModel):
    """Shared, validated listing fields common to create and output schemas."""

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    property_type: str = Field(min_length=1, max_length=50)
    address: str = Field(min_length=1, max_length=300)
    city: str = Field(min_length=1, max_length=120)
    country: str = Field(min_length=1, max_length=120)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    price_per_night: float = Field(gt=0)
    cleaning_fee: float = Field(ge=0, default=0)
    max_guests: int = Field(ge=1, default=1)
    bedrooms: int = Field(ge=0, default=1)
    beds: int = Field(ge=0, default=1)
    bathrooms: int = Field(ge=0, default=1)


class ListingCreate(ListingBase):
    """Request body for creating a listing, with amenity and photo references."""

    amenity_ids: list[int] = []
    photo_urls: list[PhotoUrl] = []


class ListingUpdate(BaseModel):
    """Request body for partially updating a listing; all fields optional."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=4000)
    property_type: str | None = Field(default=None, min_length=1, max_length=50)
    address: str | None = Field(default=None, min_length=1, max_length=300)
    city: str | None = Field(default=None, min_length=1, max_length=120)
    country: str | None = Field(default=None, min_length=1, max_length=120)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    price_per_night: float | None = Field(default=None, gt=0)
    cleaning_fee: float | None = Field(default=None, ge=0)
    max_guests: int | None = Field(default=None, ge=1)
    bedrooms: int | None = Field(default=None, ge=0)
    beds: int | None = Field(default=None, ge=0)
    bathrooms: int | None = Field(default=None, ge=0)
    # when provided, these REPLACE the listing's amenities/photos wholesale
    amenity_ids: list[int] | None = None
    photo_urls: list[PhotoUrl] | None = None


class ListingOut(ListingBase):
    """A listing as returned to clients, with its photos and amenities."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    host_id: int
    created_at: datetime
    photos: list[ListingPhotoOut] = []
    # populated from the Listing.amenity_links association rows
    amenities: list[AmenityOut] = Field(
        default=[], validation_alias=AliasChoices("amenities", "amenity_links")
    )

    @field_validator("amenities", mode="before")
    @classmethod
    def _links_to_amenities(cls, value):
        """Unwrap association rows to their Amenity objects, passing through already-plain amenities."""
        return [getattr(item, "amenity", item) for item in value]


class ListingDetailOut(ListingOut):
    """Full listing detail response, adding host info, reviews, and average rating."""

    host: HostOut
    reviews: list[ReviewOut] = []
    average_rating: float | None = None


class ListingListOut(BaseModel):
    """Paginated collection of listings."""

    items: list[ListingOut]
    total: int
    page: int
    page_size: int


class BookedRange(BaseModel):
    """A half-open [check_in, check_out) span that is already taken."""

    check_in: date
    check_out: date


class AvailabilityOut(BaseModel):
    """A listing's availability, expressed as the set of already-booked date ranges."""

    listing_id: int
    booked_ranges: list[BookedRange]
