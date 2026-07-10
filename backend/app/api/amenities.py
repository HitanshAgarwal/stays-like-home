"""Amenities API router: read-only endpoints exposing the catalog of amenities used to populate the listing form's multi-select."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import Amenity
from app.schemas.listing import AmenityOut

router = APIRouter(prefix="/api/amenities", tags=["amenities"])


@router.get("", response_model=list[AmenityOut])
async def list_amenities(db: AsyncSession = Depends(get_db)) -> list[Amenity]:
    """Public: every amenity (id, name, icon), for the listing form's multi-select."""
    rows = (await db.scalars(select(Amenity).order_by(Amenity.name))).all()
    return list(rows)
