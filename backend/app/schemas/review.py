"""Pydantic schemas for creating and returning reviews."""
from datetime import datetime

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator


class ReviewCreate(BaseModel):
    """Request body for submitting a review for a booking."""

    booking_id: int
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)


class ReviewOut(BaseModel):
    """A review as returned to clients, with the author's name resolved."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_id: int
    listing_id: int
    author_id: int
    rating: int
    comment: str | None
    created_at: datetime
    # populated from the Review.author relationship (or a plain author_name string)
    author_name: str = Field(validation_alias=AliasChoices("author_name", "author"))

    @field_validator("author_name", mode="before")
    @classmethod
    def _author_to_name(cls, value):
        """Accept either an author object (extract its name) or an already-resolved name string."""
        return getattr(value, "name", value)


class ReviewListOut(BaseModel):
    """Paginated collection of reviews."""

    items: list[ReviewOut]
    total: int
    page: int
    page_size: int
