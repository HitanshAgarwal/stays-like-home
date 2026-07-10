"""Wishlist API router: lets an authenticated user toggle a listing in their wishlist and list the listings they've saved."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.listings import LISTING_LOAD
from app.db.session import get_db
from app.models import Listing, User, Wishlist
from app.schemas.listing import ListingOut
from app.schemas.wishlist import WishlistToggleOut

router = APIRouter(prefix="/api/wishlist", tags=["wishlist"])


@router.post("/{listing_id}", response_model=WishlistToggleOut)
async def toggle_wishlist(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WishlistToggleOut:
    """Toggle a listing in the current user's wishlist -- adding it if absent, removing it if present -- and report the resulting state (404 if the listing is missing)."""
    listing = await db.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    entry = await db.get(Wishlist, (current_user.id, listing_id))
    if entry is None:
        db.add(Wishlist(user_id=current_user.id, listing_id=listing_id))
        wishlisted = True
    else:
        await db.delete(entry)
        wishlisted = False
    await db.commit()
    return WishlistToggleOut(listing_id=listing_id, wishlisted=wishlisted)


@router.get("/mine", response_model=list[ListingOut])
async def my_wishlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ListingOut]:
    """List the listings in the current user's wishlist, most recently saved first."""
    rows = (
        await db.scalars(
            select(Listing)
            .join(Wishlist, Wishlist.listing_id == Listing.id)
            .where(Wishlist.user_id == current_user.id)
            .options(*LISTING_LOAD)
            .order_by(Wishlist.created_at.desc(), Listing.id.desc())
        )
    ).all()
    return [ListingOut.model_validate(r) for r in rows]
