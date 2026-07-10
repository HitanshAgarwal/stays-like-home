"use client";

// Listing detail page: fetches a single listing (and its best-effort availability) by id
// and renders the full detail view — photo gallery, host + specs, description, amenities,
// location, reviews, and the sticky ReservePanel that drives the booking flow.
import Link from "next/link";
import { use, useEffect, useState } from "react";

import { Icon, type IconName } from "@/components/Icon";
import { PhotoGallery } from "@/components/PhotoGallery";
import { ReservePanel } from "@/components/ReservePanel";
import { SuperhostBadge } from "@/components/SuperhostBadge";
import { api, ApiError } from "@/lib/api";
import { formatDateShort } from "@/lib/dates";
import { titleCase } from "@/lib/format";
import type { Availability, ListingDetail } from "@/lib/types";

// Page component: loads the listing + availability and renders the detail layout with the reserve panel.
export default function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); // Next 16: params is a promise

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      setLoading(true);
      setNotFound(false);
      try {
        // detail is required; availability is best-effort (calendar still works without it)
        const [detail, avail] = await Promise.all([
          api.listings.get(id),
          api.listings.availability(id).catch(() => null),
        ]);
        if (controller.signal.aborted) return;
        setListing(detail);
        setAvailability(avail);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setNotFound(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    run();
    return () => controller.abort();
  }, [id]);

  if (loading) return <DetailSkeleton />;
  if (notFound || !listing) return <NotFound />;

  const rating = listing.average_rating;
  const bookedRanges = availability?.booked_ranges ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10">
      {/* title */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{listing.title}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
          <span className="flex items-center gap-1 text-ink">
            <StarIcon />
            {rating != null ? rating.toFixed(2) : "New"}
          </span>
          {rating != null && (
            <>
              <Dot />
              <span>
                {listing.reviews.length} review{listing.reviews.length === 1 ? "" : "s"}
              </span>
            </>
          )}
          <Dot />
          <span>
            {listing.city}, {listing.country}
          </span>
        </div>
      </div>

      <PhotoGallery photos={listing.photos} title={listing.title} />

      {/* body: content + sticky reserve panel */}
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          {/* host + specs */}
          <div className="flex items-start justify-between gap-4 border-b border-line pb-6">
            <div>
              <h2 className="text-xl font-semibold text-ink">
                {titleCase(listing.property_type)} hosted by {listing.host.name}
              </h2>
              <div className="mt-1">
                <SuperhostBadge hostId={listing.host_id} />
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {listing.max_guests} guests · {listing.bedrooms} bedroom
                {listing.bedrooms === 1 ? "" : "s"} · {listing.beds} bed
                {listing.beds === 1 ? "" : "s"} · {listing.bathrooms} bath
                {listing.bathrooms === 1 ? "" : "s"}
              </p>
            </div>
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-contrast text-sm font-semibold text-on-contrast"
              aria-hidden="true"
            >
              {initials(listing.host.name)}
            </div>
          </div>

          {/* description */}
          <section className="border-b border-line py-6">
            <p className="whitespace-pre-line leading-relaxed text-ink">{listing.description}</p>
          </section>

          {/* amenities */}
          <section className="border-b border-line py-6">
            <h3 className="text-lg font-semibold text-ink">What this place offers</h3>
            {listing.amenities.length > 0 ? (
              <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {listing.amenities.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 text-ink">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted">
                      <Icon name={amenityIcon(a.icon)} size={18} />
                    </span>
                    {a.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">No amenities listed.</p>
            )}
          </section>

          {/* location (map placeholder) */}
          <section className="border-b border-line py-6">
            <h3 className="text-lg font-semibold text-ink">Where you&apos;ll be</h3>
            <p className="mt-1 text-sm text-ink-soft">
              {listing.address}, {listing.city}, {listing.country}
            </p>
            <div className="mt-4 grid aspect-[16/9] w-full place-items-center rounded-2xl border border-line bg-muted text-center text-sm text-ink-faint">
              <div className="flex flex-col items-center">
                <Icon name="map" size={32} />
                <p className="mt-1">Map coming soon</p>
                <p className="text-xs">
                  {listing.latitude.toFixed(3)}, {listing.longitude.toFixed(3)}
                </p>
              </div>
            </div>
          </section>

          {/* reviews */}
          <section className="py-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <StarIcon />
              {rating != null ? rating.toFixed(2) : "New"}
              {rating != null && (
                <span className="text-ink-soft">
                  · {listing.reviews.length} review{listing.reviews.length === 1 ? "" : "s"}
                </span>
              )}
            </h3>
            {listing.reviews.length > 0 ? (
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                {listing.reviews.map((r) => (
                  <div key={r.id}>
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-muted text-xs font-semibold text-ink">
                        {initials(r.author_name)}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ink">{r.author_name}</p>
                        <p className="text-xs text-ink-faint">{formatDateShort(r.created_at.slice(0, 10))}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-0.5" aria-label={`${r.rating} out of 5`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < r.rating ? "text-ink" : "text-line-strong"}>
                          <StarIcon />
                        </span>
                      ))}
                    </div>
                    {r.comment && <p className="mt-2 text-sm text-ink">{r.comment}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">No reviews yet.</p>
            )}
          </section>
        </div>

        {/* sticky reserve panel */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <ReservePanel listing={listing} bookedRanges={bookedRanges} />
        </aside>
      </div>
    </div>
  );
}

// Loading placeholder mirroring the detail page layout while data is fetched.
function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-6 sm:px-6 lg:px-10">
      <div className="mb-4 h-8 w-2/3 rounded bg-muted" />
      <div className="aspect-[16/9] w-full rounded-2xl bg-muted sm:aspect-[2/1]" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          <div className="h-6 w-1/2 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
          <div className="h-4 w-4/6 rounded bg-muted" />
        </div>
        <div className="h-80 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}

// Shown when the listing can't be found (or failed to load), with a link back to explore.
function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="text-lg font-semibold text-ink">Listing not found</p>
      <p className="mt-1 text-sm text-ink-soft">It may have been removed.</p>
      <Link href="/" className="mt-4 inline-block font-semibold text-accent hover:underline">
        Back to explore
      </Link>
    </div>
  );
}

// Derive up-to-two-letter initials from a name for avatar placeholders.
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

// Map an amenity's icon key to a Material icon name, falling back to a generic check.
function amenityIcon(icon: string | null): IconName {
  const map: Record<string, IconName> = {
    wifi: "wifi",
    kitchen: "kitchen",
    pool: "pool",
    parking: "local_parking",
    ac: "ac_unit",
    washer: "local_laundry_service",
    workspace: "laptop",
    pets: "pets",
    hottub: "hot_tub",
    heating: "local_fire_department",
    ev: "ev_station",
    gym: "fitness_center",
  };
  return (icon && map[icon]) || "check";
}

// Inline star glyph used for ratings and review stars.
function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="inline fill-current" aria-hidden="true">
      <path d="M12 2l2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.8 5.9 21.2l1.4-6.8L2.2 9l6.9-.7z" />
    </svg>
  );
}

// Decorative middot separator between inline metadata items.
function Dot() {
  return <span aria-hidden="true">·</span>;
}
