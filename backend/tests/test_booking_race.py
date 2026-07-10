"""Concurrency repro: N near-simultaneous booking requests for the SAME overlapping
date range must never all succeed. Exactly one wins (201); the rest get 409.

This is the guarantee described in app/api/bookings.create_booking: because every
transaction opens as BEGIN IMMEDIATE (app/db/session.py), the first request to touch
the DB holds SQLite's write lock through its overlap-check-and-insert, and the others
block on their own BEGIN IMMEDIATE (up to busy_timeout) until it commits -- at which
point they see the winning row and reject.

Run the server first:
    .venv/bin/uvicorn app.main:app --port 8000
Then:
    .venv/bin/python -m pytest tests/test_booking_race.py -s
or just run this file directly:
    .venv/bin/python tests/test_booking_race.py
"""

import asyncio
import sys

import httpx

BASE = "http://127.0.0.1:8000"
N = 10  # concurrent identical booking attempts
DATES = {"check_in": "2027-01-10", "check_out": "2027-01-15"}


async def _register(client: httpx.AsyncClient, email: str) -> str:
    # register is idempotent-ish for our purpose: 201 gives a token, 409 means the
    # user already exists from a previous run, so fall back to login.
    r = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "password123", "name": email.split("@")[0]},
    )
    if r.status_code == 201:
        return r.json()["access_token"]
    r = await client.post("/api/auth/login", json={"email": email, "password": "password123"})
    r.raise_for_status()
    return r.json()["access_token"]


async def _setup(client: httpx.AsyncClient) -> int:
    """Create a host + listing, return the listing id."""
    host = await _register(client, "race-host@slh.example.com")
    r = await client.post(
        "/api/listings",
        headers={"Authorization": f"Bearer {host}"},
        json={
            "title": "Race Test Listing",
            "description": "For the concurrency repro.",
            "property_type": "apartment",
            "address": "1 Race St",
            "city": "Testville",
            "country": "Testland",
            "latitude": 0.0,
            "longitude": 0.0,
            "price_per_night": 50,
            "cleaning_fee": 0,
            "max_guests": 10,
        },
    )
    r.raise_for_status()
    return r.json()["id"]


async def run() -> int:
    async with httpx.AsyncClient(base_url=BASE, timeout=30) as client:
        listing_id = await _setup(client)

        # N distinct guests so the race is purely on the dates, not on one user
        # double-booking. Register them up front (sequentially) so token creation
        # isn't part of the timed race.
        tokens = [await _register(client, f"race-guest-{i}@slh.example.com") for i in range(N)]

        async def attempt(token: str) -> int:
            r = await client.post(
                "/api/bookings",
                headers={"Authorization": f"Bearer {token}"},
                json={"listing_id": listing_id, "num_guests": 1, **DATES},
            )
            return r.status_code

        # fire all N at once
        statuses = await asyncio.gather(*(attempt(t) for t in tokens))

        created = statuses.count(201)
        conflict = statuses.count(409)
        print(f"statuses: {sorted(statuses)}")
        print(f"201 Created: {created}   409 Conflict: {conflict}   other: {N - created - conflict}")

        # confirm the DB agrees: exactly one CONFIRMED booking for these dates
        # (checked via the host dashboard endpoint)
        host = await _register(client, "race-host@slh.example.com")
        r = await client.get(
            f"/api/bookings/listing/{listing_id}", headers={"Authorization": f"Bearer {host}"}
        )
        confirmed_here = [
            b
            for b in r.json()
            if b["status"] == "confirmed"
            and b["check_in"] == DATES["check_in"]
            and b["check_out"] == DATES["check_out"]
        ]
        print(f"confirmed bookings in DB for these dates: {len(confirmed_here)}")

        ok = created == 1 and conflict == N - 1 and len(confirmed_here) == 1
        print("\nRESULT:", "PASS -- exactly one booking won" if ok else "FAIL -- race not prevented")
        return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
