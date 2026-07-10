"""FastAPI application entry point: wires up CORS, routers, DB startup, and a health check."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.amenities import router as amenities_router
from app.api.auth import router as auth_router
from app.api.bookings import router as bookings_router
from app.api.hosts import router as hosts_router
from app.api.listings import router as listings_router
from app.api.reviews import router as reviews_router
from app.api.wishlist import router as wishlist_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine

# import registers all model classes on Base.metadata before create_all runs
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: create all database tables on startup before serving requests."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="Stays Like Home API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(amenities_router)
app.include_router(listings_router)
app.include_router(hosts_router)
app.include_router(bookings_router)
app.include_router(reviews_router)
app.include_router(wishlist_router)


@app.get("/api/health")
async def health():
    """Liveness/health-check endpoint returning a simple ok status."""
    return {"status": "ok"}
