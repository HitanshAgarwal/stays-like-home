from pydantic import BaseModel


class WishlistToggleOut(BaseModel):
    listing_id: int
    wishlisted: bool
