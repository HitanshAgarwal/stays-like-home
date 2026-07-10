from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Amenity(Base):
    __tablename__ = "amenities"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)

    listing_links: Mapped[list["ListingAmenity"]] = relationship(
        back_populates="amenity", cascade="all, delete-orphan"
    )


class ListingAmenity(Base):
    """Pure association table — no attributes beyond the link, so composite PK, no surrogate id."""

    __tablename__ = "listing_amenities"

    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id", ondelete="CASCADE"), primary_key=True)
    amenity_id: Mapped[int] = mapped_column(ForeignKey("amenities.id", ondelete="CASCADE"), primary_key=True)

    listing: Mapped["Listing"] = relationship(back_populates="amenity_links")
    amenity: Mapped["Amenity"] = relationship(back_populates="listing_links")
