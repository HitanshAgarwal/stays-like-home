"""SQLAlchemy model for property listings, the central entity hosts publish for guests to book."""
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Listing(Base):
    """A property a host offers for stays, with location, pricing, capacity, and related photos/amenities/bookings/reviews."""

    __tablename__ = "listings"

    id: Mapped[int] = mapped_column(primary_key=True)
    host_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(String(4000), nullable=False)
    property_type: Mapped[str] = mapped_column(String(50), index=True)

    address: Mapped[str] = mapped_column(String(300))
    city: Mapped[str] = mapped_column(String(120), index=True)
    country: Mapped[str] = mapped_column(String(120), index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)

    price_per_night: Mapped[float] = mapped_column(Numeric(10, 2), index=True)
    cleaning_fee: Mapped[float] = mapped_column(Numeric(10, 2), default=0)

    max_guests: Mapped[int] = mapped_column(Integer, default=1)
    bedrooms: Mapped[int] = mapped_column(Integer, default=1)
    beds: Mapped[int] = mapped_column(Integer, default=1)
    bathrooms: Mapped[int] = mapped_column(Integer, default=1)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    host: Mapped["User"] = relationship(back_populates="listings")
    photos: Mapped[list["ListingPhoto"]] = relationship(
        back_populates="listing", cascade="all, delete-orphan", order_by="ListingPhoto.position"
    )
    amenity_links: Mapped[list["ListingAmenity"]] = relationship(
        back_populates="listing", cascade="all, delete-orphan"
    )
    bookings: Mapped[list["Booking"]] = relationship(back_populates="listing", cascade="all, delete-orphan")
    reviews: Mapped[list["Review"]] = relationship(back_populates="listing", cascade="all, delete-orphan")
    wishlisted_by: Mapped[list["Wishlist"]] = relationship(back_populates="listing", cascade="all, delete-orphan")
