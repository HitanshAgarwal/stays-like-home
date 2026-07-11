"""Seed the database with realistic demo data for Stays Like Home.

Standalone, safe to re-run: it DROPS and RECREATES all tables every time, so the
result is always the same fresh dataset regardless of prior state.

    cd backend
    .venv/bin/python -m app.seed
    # or
    .venv/bin/python app/seed.py

Dates are anchored to a fixed TODAY (not the wall clock) so the past/current/future
split -- and therefore which bookings count as "completed" and get reviews -- stays
stable and reproducible across runs.
"""

import asyncio
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, select

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
from app.models import (
    Amenity,
    Booking,
    BookingStatus,
    Listing,
    ListingAmenity,
    ListingPhoto,
    Review,
    User,
    Wishlist,
)

# Anchor for all relative dates. Kept fixed so seeding is deterministic.
TODAY = date(2026, 7, 10)
DEV_PASSWORD = "password123"  # every seeded user shares this, for easy local login

AMENITIES = [
    ("WiFi", "wifi"),
    ("Kitchen", "kitchen"),
    ("Pool", "pool"),
    ("Free parking", "parking"),
    ("Air conditioning", "ac"),
    ("Washer", "washer"),
    ("Dedicated workspace", "workspace"),
    ("Pet friendly", "pets"),
    ("Hot tub", "hottub"),
    ("Heating", "heating"),
    ("EV charger", "ev"),
    ("Gym", "gym"),
]

# (name, email, is_host, is_guest) -- some users are both.
USERS = [
    ("Holly Host", "holly@stayslikehome.dev", True, False),
    ("Hiro Tanaka", "hiro@stayslikehome.dev", True, True),
    ("Priya Sharma", "priya@stayslikehome.dev", True, True),
    ("Diego Alvarez", "diego@stayslikehome.dev", True, False),
    ("Amara Okafor", "amara@stayslikehome.dev", True, True),
    ("Gary Guest", "gary@stayslikehome.dev", False, True),
    ("Mei Lin", "mei@stayslikehome.dev", False, True),
    ("Sam Porter", "sam@stayslikehome.dev", False, True),
]

# (title, city, country, lat, lon, property_type, price, cleaning, guests, beds, baths, amenity_idxs)
LISTINGS = [
    ("Sunny loft near the old city", "Jaipur", "India", 26.9124, 75.7873, "apartment", 42, 8, 3, 1, 1, [0, 1, 4]),
    ("Pink City heritage haveli", "Jaipur", "India", 26.9260, 75.8235, "house", 120, 25, 8, 4, 3, [0, 1, 3, 4, 5]),
    ("Beachfront villa with pool", "Goa", "India", 15.5524, 73.7517, "villa", 210, 40, 6, 3, 2, [0, 1, 2, 3, 4]),
    ("Cozy studio by the beach", "Goa", "India", 15.2993, 74.1240, "apartment", 55, 10, 2, 1, 1, [0, 4, 5]),
    ("Himalayan pine cabin", "Manali", "India", 32.2396, 77.1887, "cabin", 78, 15, 4, 2, 1, [0, 1, 9, 3]),
    ("Riverside cottage retreat", "Manali", "India", 32.2500, 77.1900, "cabin", 95, 18, 5, 3, 2, [0, 1, 8, 9]),
    ("Modern flat in the tech hub", "Bengaluru", "India", 12.9716, 77.5946, "apartment", 68, 12, 2, 1, 1, [0, 1, 4, 6]),
    ("Garden bungalow with workspace", "Bengaluru", "India", 12.9352, 77.6245, "house", 110, 20, 4, 2, 2, [0, 1, 4, 6, 11]),
    ("Skyline penthouse", "Mumbai", "India", 19.0760, 72.8777, "apartment", 260, 50, 4, 2, 2, [0, 1, 4, 6, 11]),
    ("Compact city crashpad", "Mumbai", "India", 19.0176, 72.8562, "apartment", 48, 9, 2, 1, 1, [0, 4]),
    ("Lakeview colonial home", "Udaipur", "India", 24.5854, 73.7125, "house", 140, 28, 7, 4, 3, [0, 1, 2, 3, 4, 5]),
    ("Rooftop artist's studio", "Udaipur", "India", 24.5760, 73.6890, "apartment", 60, 11, 2, 1, 1, [0, 1, 6]),
    ("Backwater houseboat stay", "Kochi", "India", 9.9312, 76.2673, "boat", 130, 22, 4, 2, 1, [0, 4, 7]),
    ("Colonial-era guest suite", "Kochi", "India", 9.9658, 76.2422, "house", 72, 14, 3, 2, 1, [0, 1, 4, 5]),
    ("Desert glamping tent", "Jaisalmer", "India", 26.9157, 70.9083, "tent", 88, 16, 2, 1, 1, [4, 7]),
    ("Fort-view boutique room", "Jaisalmer", "India", 26.9124, 70.9120, "apartment", 65, 12, 2, 1, 1, [0, 1, 4]),
    ("Hillside villa with hot tub", "Shimla", "India", 31.1048, 77.1734, "villa", 175, 35, 6, 3, 3, [0, 1, 8, 9, 3]),
    ("Snug mountain apartment", "Shimla", "India", 31.1020, 77.1700, "apartment", 58, 10, 3, 2, 1, [0, 9, 3]),
]


async def seed() -> dict[str, int]:
    """Drop and recreate all tables, insert the demo dataset, and return row counts per table."""
    # Fresh slate every run.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    pw = hash_password(DEV_PASSWORD)  # hash once, reuse -- bcrypt is deliberately slow

    async with AsyncSessionLocal() as db:
        # --- users -----------------------------------------------------------
        users = [User(name=n, email=e, password_hash=pw) for (n, e, _h, _g) in USERS]
        db.add_all(users)
        await db.flush()  # assign ids

        host_ids = [users[i].id for i, u in enumerate(USERS) if u[2]]
        guest_ids = [users[i].id for i, u in enumerate(USERS) if u[3]]

        # --- amenities -------------------------------------------------------
        amenities = [Amenity(name=n, icon=i) for (n, i) in AMENITIES]
        db.add_all(amenities)
        await db.flush()

        # --- listings (+ photos + amenity links) -----------------------------
        listings = []
        for idx, (title, city, country, lat, lon, ptype, price, clean, guests, beds, baths, am_idxs) in enumerate(
            LISTINGS
        ):
            host_id = host_ids[idx % len(host_ids)]  # round-robin hosts
            listing = Listing(
                host_id=host_id,
                title=title,
                description=(
                    f"{title}. A lovely {ptype} in {city} sleeping up to {guests} guests, "
                    f"with {beds} bed(s) and {baths} bath(s). Great base for exploring the area."
                ),
                property_type=ptype,
                address=f"{idx + 1} Demo Street",
                city=city,
                country=country,
                latitude=lat,
                longitude=lon,
                price_per_night=Decimal(price),
                cleaning_fee=Decimal(clean),
                max_guests=guests,
                bedrooms=max(1, beds - 1),
                beds=beds,
                bathrooms=baths,
            )
            # 3-5 photos, deterministic count, stable picsum seeds
            n_photos = 3 + (idx % 3)
            listing.photos = [
                ListingPhoto(
                    url=f"https://picsum.photos/seed/slh-{idx}-{p}/1200/800",
                    position=p,
                    is_cover=(p == 0),
                )
                for p in range(n_photos)
            ]
            listing.amenity_links = [ListingAmenity(amenity_id=amenities[a].id) for a in am_idxs]
            listings.append(listing)
        db.add_all(listings)
        await db.flush()

        # --- bookings --------------------------------------------------------
        # (listing_idx, guest_slot, start_offset_days, nights, status)
        # negative offset = in the past. Past confirmed bookings read as completed.
        booking_specs = [
            # past / completed (checkout before TODAY)
            (0, 0, -60, 4, BookingStatus.CONFIRMED),
            (2, 1, -45, 5, BookingStatus.CONFIRMED),
            (4, 2, -30, 3, BookingStatus.CONFIRMED),
            (6, 0, -25, 2, BookingStatus.CONFIRMED),
            (8, 3, -20, 4, BookingStatus.CONFIRMED),
            (10, 1, -15, 6, BookingStatus.CONFIRMED),
            (12, 2, -12, 3, BookingStatus.CONFIRMED),
            (1, 3, -70, 2, BookingStatus.CONFIRMED),
            # current / future (confirmed)
            (3, 0, 5, 3, BookingStatus.CONFIRMED),
            (5, 1, 12, 4, BookingStatus.CONFIRMED),
            (7, 2, 20, 2, BookingStatus.CONFIRMED),
            (9, 3, 30, 5, BookingStatus.CONFIRMED),
            (11, 0, 45, 3, BookingStatus.CONFIRMED),
            # cancelled (dates don't matter; they don't block availability)
            (13, 1, 8, 2, BookingStatus.CANCELLED),
            (2, 2, 60, 4, BookingStatus.CANCELLED),
        ]
        bookings = []
        for listing_idx, guest_slot, start_off, nights, st in booking_specs:
            listing = listings[listing_idx]
            guest_id = guest_ids[guest_slot % len(guest_ids)]
            check_in = TODAY + timedelta(days=start_off)
            check_out = check_in + timedelta(days=nights)
            nightly = Decimal(listing.price_per_night)
            cleaning = Decimal(listing.cleaning_fee)
            bookings.append(
                Booking(
                    listing_id=listing.id,
                    guest_id=guest_id,
                    check_in=check_in,
                    check_out=check_out,
                    num_guests=min(2, listing.max_guests),
                    nightly_rate_snapshot=nightly,
                    cleaning_fee_snapshot=cleaning,
                    total_price=nightly * nights + cleaning,
                    status=st.value,
                )
            )
        db.add_all(bookings)
        await db.flush()

        # --- reviews (only on completed = confirmed + checkout on/before TODAY) --
        completed = [
            b
            for b in bookings
            if b.status == BookingStatus.CONFIRMED.value and b.check_out <= TODAY
        ]
        review_texts = [
            (5, "Absolutely wonderful stay, would book again!"),
            (4, "Great location and very clean. Minor noise at night."),
            (5, "The host was incredibly helpful. Highly recommend."),
            (3, "Decent place, but the photos were a bit generous."),
            (4, "Comfortable and well-equipped. Good value."),
            (5, "Stunning views and a spotless space."),
            (4, "Everything as described. Smooth check-in."),
        ]
        # 7 reviews across the 8 completed bookings (leave one un-reviewed)
        reviews = []
        for b, (rating, comment) in zip(completed, review_texts):
            reviews.append(
                Review(
                    booking_id=b.id,
                    listing_id=b.listing_id,
                    author_id=b.guest_id,
                    rating=rating,
                    comment=comment,
                )
            )
        db.add_all(reviews)

        # --- wishlists -------------------------------------------------------
        # (guest_slot, listing_idx) -- a few saved listings per guest
        wishlist_specs = [(0, 2), (0, 8), (0, 16), (1, 4), (1, 10), (2, 3), (2, 12), (3, 0)]
        seen = set()
        wishlists = []
        for guest_slot, listing_idx in wishlist_specs:
            user_id = guest_ids[guest_slot % len(guest_ids)]
            listing_id = listings[listing_idx].id
            if (user_id, listing_id) in seen:
                continue
            seen.add((user_id, listing_id))
            wishlists.append(Wishlist(user_id=user_id, listing_id=listing_id))
        db.add_all(wishlists)

        await db.commit()

        # --- counts ----------------------------------------------------------
        counts = {}
        for label, model in [
            ("users", User),
            ("amenities", Amenity),
            ("listings", Listing),
            ("listing_photos", ListingPhoto),
            ("listing_amenities", ListingAmenity),
            ("bookings", Booking),
            ("reviews", Review),
            ("wishlists", Wishlist),
        ]:
            counts[label] = await db.scalar(select(func.count()).select_from(model))
        return counts


async def main() -> None:
    """Entry point: run the seed, dispose the engine, and print the resulting row counts."""
    counts = await seed()
    await engine.dispose()
    width = max(len(k) for k in counts)
    print("\nSeed complete. Row counts:")
    for label, n in counts.items():
        print(f"  {label.ljust(width)}  {n}")
    print(f"\nAll users share the password: {DEV_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(main())
