"""Pydantic schemas for authentication payloads."""
from pydantic import BaseModel


class Token(BaseModel):
    """OAuth2-style bearer token returned after successful login."""

    access_token: str
    token_type: str = "bearer"
