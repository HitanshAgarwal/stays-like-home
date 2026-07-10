"""SQLAlchemy model for user accounts, who can act as both hosts and guests."""
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    """A registered account with credentials and profile, linked to its listings, bookings, reviews, and wishlist."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # a user can be a host (listings) and a guest (bookings) simultaneously —
    # role is contextual, not a separate account type
    listings: Mapped[list["Listing"]] = relationship(back_populates="host", cascade="all, delete-orphan")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="guest", cascade="all, delete-orphan")
    reviews: Mapped[list["Review"]] = relationship(back_populates="author", cascade="all, delete-orphan")
    wishlist_items: Mapped[list["Wishlist"]] = relationship(back_populates="user", cascade="all, delete-orphan")
