"""Declarative base class that all ORM models inherit from and register their metadata on."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared SQLAlchemy declarative base; collects table metadata for all models."""

    pass
