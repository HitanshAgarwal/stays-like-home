from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ListingPhoto(Base):
    __tablename__ = "listing_photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id", ondelete="CASCADE"), index=True)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0)
    is_cover: Mapped[bool] = mapped_column(Boolean, default=False)

    listing: Mapped["Listing"] = relationship(back_populates="photos")
