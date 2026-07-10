# Stays Like Home

A full-stack Airbnb-style vacation-rental app: browse and filter listings, view details,
book stays (with real double-booking prevention), leave reviews, keep a wishlist, and manage
your own listings as a host.

- **Backend:** FastAPI (Python), async SQLAlchemy, SQLite
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS v4
- **Auth:** JWT bearer tokens (bcrypt-hashed passwords)

---

## Tech stack

| Layer     | Choice                                                        |
| --------- | ------------------------------------------------------------- |
| Backend   | FastAPI, SQLAlchemy 2 (async), aiosqlite, Pydantic v2         |
| Database  | SQLite (file-based; `stayslikehome.db`)                       |
| Auth      | PyJWT (HS256), bcrypt, python-multipart                       |
| Frontend  | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Tooling   | uvicorn, ESLint                                               |

The backend requires **Python 3.11+** (developed on 3.13). The frontend requires **Node 18+**.

---

## Setup & running

The repo has two top-level folders: `backend/` and `frontend/`. Run each in its own terminal.

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# (optional) load demo data — 8 users, ~18 listings, bookings, reviews, wishlists
python -m app.seed

# run the API (http://localhost:8000, docs at /docs)
uvicorn app.main:app --reload
```

The database file and all tables are created automatically on first startup. `python -m app.seed`
**drops and recreates** every table, then loads a deterministic demo dataset — handy for a clean
slate, but don't run it against data you want to keep. Every seeded user has the password
`password123`.

To run the concurrency test that proves double-booking prevention:

```bash
pip install -r requirements-dev.txt   # adds httpx
# with the server running on :8000, in another terminal:
python -m pytest tests/ -s            # or: python tests/test_booking_race.py
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                           # http://localhost:3000
```

The frontend expects the backend at `http://localhost:8000` (see env vars below).

### Environment variables

**Backend** — all have working dev defaults, so a `.env` is optional locally. Set them in
`backend/.env` (or the real environment) for production:

| Variable                      | Default                                  | Notes                                                    |
| ----------------------------- | ---------------------------------------- | -------------------------------------------------------- |
| `DATABASE_URL`                | `sqlite+aiosqlite:///./stayslikehome.db` | Async SQLAlchemy URL.                                    |
| `SECRET_KEY`                  | `dev-secret-change-in-prod`              | **Must** be set to a strong secret in production — the default invalidates all tokens on restart and is public. |
| `ALGORITHM`                   | `HS256`                                  | JWT signing algorithm.                                   |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `43200` (30 days)                        | Token lifetime.                                          |
| `SQL_ECHO`                    | `false`                                  | Log SQL for debugging.                                   |
| `CORS_ORIGINS`                | `["http://localhost:3000"]`              | Allowed browser origins.                                 |

**Frontend** — set in `frontend/.env.local`:

| Variable              | Default                 | Notes                                    |
| --------------------- | ----------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Base URL of the backend API (browser-visible). |

---

## Architecture overview

```
backend/app/
  main.py            FastAPI app, CORS, router wiring, table creation on startup
  core/              config (env settings) + security (password hashing, JWT)
  db/                async engine/session + declarative Base
  models/            SQLAlchemy ORM models (the ERD, below)
  schemas/           Pydantic request/response models
  api/               one router per resource: auth, listings, bookings, reviews,
                     wishlist, amenities, hosts (+ deps.py for the auth dependency)
  seed.py            standalone demo-data loader

frontend/src/
  app/               App Router pages: / (explore), /listings/[id], /trips,
                     /host, /host/listings/new, /host/listings/[id]/edit, /login, /register
  components/        UI: cards, search, filters, calendar, reserve panel, gallery, etc.
  lib/               API client, typed models, and React contexts (auth, wishlist,
                     toast, theme) + date/format helpers
```

The frontend talks to the backend purely over the REST API in `lib/api.ts`; there is no
server-side coupling. Auth state lives in a React context backed by a JWT in `localStorage`.

### Data model (ERD)

Eight tables. Arrows point from the many side to the one side (foreign key owner).

```
User ──< Listing ──< ListingPhoto
  │         │
  │         ├──< ListingAmenity >── Amenity      (many-to-many join)
  │         │
  │         ├──< Booking ──1:1── Review
  │         │        │              │
  └─────────┴────────┴──────────────┘   (User is guest on Booking, author on Review)
  │
  └──< Wishlist >── Listing                       (many-to-many join)
```

**Entities & key relationships:**

- **User** — a single account is both host and guest depending on context (no separate roles).
  Owns listings, makes bookings, writes reviews, keeps wishlist entries.
- **Listing** — belongs to a host (`User`). Has many `ListingPhoto`s, many `Amenity`s (via the
  `ListingAmenity` join), many `Booking`s and `Review`s.
- **ListingPhoto** — image URLs for a listing (`position` ordering, one `is_cover`). No real
  file upload — the app stores URLs.
- **Amenity** / **ListingAmenity** — `Amenity` is a small fixed catalog (WiFi, Kitchen, …).
  `ListingAmenity` is a pure join table (composite PK `listing_id + amenity_id`, no surrogate id).
- **Booking** — a guest's reservation of a listing for a `[check_in, check_out)` date range.
  Statuses: `pending`, `confirmed`, `cancelled`, `completed`.
- **Review** — tied to exactly one `Booking` (`booking_id` is **unique**), so a review means a
  real completed stay — one review per stay, not per listing. Rating constrained 1–5.
- **Wishlist** — many-to-many User↔Listing favorites. Composite PK, no own attributes.

`ON DELETE CASCADE` is set on the foreign keys, and SQLite foreign-key enforcement is switched on
per connection (it's off by default), so deleting a listing removes its photos, amenity links,
bookings, and reviews.

### Design decisions worth calling out

**Booking overlap is prevented inside a single transaction.** The risk is a race: two guests
request the same dates at the same moment, both pass an availability check, and both insert —
a double booking. Rather than check-then-write (which has a gap between the two steps), the
overlap check and the insert run in **one transaction that holds the database write lock for its
entire duration**. On SQLite this is done by opening every transaction with `BEGIN IMMEDIATE`
(configured in `db/session.py`) plus a `busy_timeout`, so a second concurrent request blocks
until the first commits and then sees the row it wrote — exactly one booking wins, the other gets
a clean `409`. The overlap query itself is `existing.check_in < new.check_out AND
existing.check_out > new.check_in`, backed by the `ix_booking_listing_dates` index. This is
verified by `backend/tests/test_booking_race.py`, which fires many simultaneous requests and
asserts only one succeeds. (On Postgres the equivalent would be a `tstzrange` exclusion
constraint or `SELECT … FOR UPDATE`; the SQLite approach serializes writers app-wide, which is
fine at this scale.)

**Prices are snapshotted onto each booking.** `Booking` stores `nightly_rate_snapshot`,
`cleaning_fee_snapshot`, and `total_price` captured at booking time. If a host later edits the
listing's price, existing bookings keep the price the guest actually agreed to — the stay isn't
retroactively repriced. Reading the live listing price for a past booking would be wrong.

**There is no separate availability/calendar table.** Availability is *derived* from confirmed
bookings rather than stored. A date is unavailable if a `confirmed` booking overlaps it, computed
on the fly (`GET /api/listings/{id}/availability` returns the blocked ranges; the search endpoint
excludes overlapping listings when dates are supplied). A dedicated calendar table would duplicate
what the bookings already encode and would have to be kept in sync on every booking/cancellation —
a redundant source of truth and a bug surface. The trade-off (host-set blackout dates, seasonal
pricing) isn't needed for this scope, so deriving availability is simpler and always consistent.

**"Completed" is derived, not scheduled.** A booking has no background job flipping it to
`completed`. Instead, a `confirmed` booking whose `check_out` has passed is reported as completed
at read time. This avoids running a scheduler for a purely time-based state, and reviews are gated
on this derived status.

---

## Assumptions & scope notes

- **Single shared account type.** Any user can host and book; "host" and "guest" are contextual,
  not separate account types or a role flag.
- **Mocked checkout.** Booking is a demo flow — no real payment is processed. A flat mocked
  service fee (12%) is added in the price breakdown for realism.
- **Photos are URLs, not uploads.** Hosts paste image URLs (the assignment doesn't require file
  upload/storage). The seed uses `picsum.photos` placeholders.
- **Amenity catalog is fixed/seeded.** Hosts pick amenities from the existing catalog via
  `GET /api/amenities`; there's no host-facing "create a new amenity type" (that would be an admin
  concern).
- **Prices are plain numbers shown in INR (₹)** with Indian digit grouping. There's no
  multi-currency or FX handling; all demo listings are in India.
- **Superhost is computed on the fly** (`GET /api/hosts/{id}/stats`) as average rating ≥ 4.8 and
  ≥ 3 completed stays — not stored, so it's always current.
- **SQLite for the whole stack**, including production deploy. The booking-lock strategy is
  SQLite-specific; moving to Postgres would mean revisiting `db/session.py` (see above).
- **Map is a placeholder.** The listing detail shows coordinates and a "map coming soon" panel;
  an interactive map is out of scope for now.
- **No email verification / password reset.** Registration is immediate; tokens are long-lived
  (30 days) for demo convenience.
