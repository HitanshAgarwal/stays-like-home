from pydantic import BaseModel


class HostStatsOut(BaseModel):
    host_id: int
    average_rating: float | None
    review_count: int
    completed_bookings: int
    is_superhost: bool
