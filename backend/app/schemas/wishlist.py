"""Pydantic schemas for wishlist operations."""
from pydantic import BaseModel


class WishlistToggleOut(BaseModel):
    """Result of toggling a listing in a user's wishlist, reporting the new state."""

    listing_id: int
    wishlisted: bool
