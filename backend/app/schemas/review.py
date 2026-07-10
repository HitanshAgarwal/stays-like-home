from datetime import datetime

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator


class ReviewCreate(BaseModel):
    booking_id: int
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)


class ReviewOut(BaseModel):
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
        return getattr(value, "name", value)


class ReviewListOut(BaseModel):
    items: list[ReviewOut]
    total: int
    page: int
    page_size: int
