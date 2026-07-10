from datetime import datetime
from typing import Annotated

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator

PhotoUrl = Annotated[str, Field(min_length=1, max_length=500)]


class AmenityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    icon: str | None


class ListingPhotoOut(BaseModel):
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
        return getattr(value, "name", value)


class ListingBase(BaseModel):
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
    amenity_ids: list[int] = []
    photo_urls: list[PhotoUrl] = []


class ListingUpdate(BaseModel):
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
        return [getattr(item, "amenity", item) for item in value]


class ListingDetailOut(ListingOut):
    host: HostOut
    reviews: list[ReviewOut] = []
    average_rating: float | None = None


class ListingListOut(BaseModel):
    items: list[ListingOut]
    total: int
    page: int
    page_size: int
