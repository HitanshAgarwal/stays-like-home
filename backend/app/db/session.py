"""Async SQLAlchemy engine/session setup, including SQLite pragmas and BEGIN IMMEDIATE for race-safe bookings."""

from collections.abc import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=settings.SQL_ECHO)


# SQLite via pysqlite/aiosqlite has two defaults we need to override for correct
# concurrent booking behaviour:
#
#  1. Foreign keys are OFF per-connection, so ON DELETE CASCADE never fires at the
#     DB level. Turn them on for every connection.
#  2. The driver opens transactions in DEFERRED mode: a SELECT takes only a shared
#     read lock and the write lock isn't acquired until the first INSERT. That lets
#     two transactions both pass an overlap check before either writes. We emit
#     BEGIN IMMEDIATE instead, which grabs the write lock at transaction start and
#     forces would-be conflicting bookings to serialize. See bookings.create_booking.
if engine.url.get_backend_name() == "sqlite":

    @event.listens_for(engine.sync_engine, "connect")
    def _sqlite_on_connect(dbapi_conn, _record):
        """Per-connection SQLite setup: enable foreign keys, set a busy timeout, and cede transaction control to SQLAlchemy."""
        dbapi_conn.execute("PRAGMA foreign_keys=ON")
        # if another connection holds the write lock, wait up to 5s for it to
        # commit instead of failing immediately with SQLITE_BUSY. This is what
        # turns "one booking errors out" into "one booking waits, then correctly
        # sees the other and rejects on the overlap check."
        dbapi_conn.execute("PRAGMA busy_timeout=5000")
        # hand transaction control to us so our "begin" handler below can decide
        # DEFERRED vs IMMEDIATE; otherwise pysqlite would emit its own BEGIN.
        dbapi_conn.isolation_level = None

    @event.listens_for(engine.sync_engine, "begin")
    def _sqlite_begin_immediate(conn):
        """Start every SQLite transaction with BEGIN IMMEDIATE so the write lock is taken up front, serializing conflicting bookings."""
        conn.exec_driver_sql("BEGIN IMMEDIATE")


AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async session and closes it when the request ends."""
    async with AsyncSessionLocal() as session:
        yield session
