"""Pydantic schemas for host-level aggregate statistics."""
from pydantic import BaseModel


class HostStatsOut(BaseModel):
    """Aggregated host reputation metrics, including superhost eligibility."""

    host_id: int
    average_rating: float | None
    review_count: int
    completed_bookings: int
    is_superhost: bool
