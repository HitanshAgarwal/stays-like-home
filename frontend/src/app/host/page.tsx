"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDateRange, todayISO } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import { useToast } from "@/lib/toast-context";
import type { Booking, Listing } from "@/lib/types";

export default function HostDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [listings, setListings] = useState<Listing[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Listing | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const mine = await api.listings.mine();
        if (!controller.signal.aborted) setListings(mine);
      } catch (err) {
        if (!controller.signal.aborted)
          setError(err instanceof ApiError ? err.message : "Failed to load your listings");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    run();
    return () => controller.abort();
  }, [user]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.listings.remove(toDelete.id);
      setListings((prev) => prev?.filter((l) => l.id !== toDelete.id) ?? prev);
      toast("Listing deleted.", "success");
      setToDelete(null);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not delete the listing.", "error");
    } finally {
      setDeleting(false);
    }
  }

  if (authLoading || !user) return <DashboardSkeleton />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Your listings</h1>
          <p className="mt-1 text-sm text-ink-soft">Manage the places you host.</p>
        </div>
        <Link
          href="/host/listings/new"
          className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          + New listing
        </Link>
      </div>

      {loading ? (
        <DashboardSkeleton bare />
      ) : error ? (
        <p className="mt-10 text-ink-soft">{error}</p>
      ) : (listings?.length ?? 0) === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-8 space-y-4">
          {listings!.map((listing) => (
            <HostListingCard key={listing.id} listing={listing} onDelete={() => setToDelete(listing)} />
          ))}
        </div>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete this listing?"
          message={`“${toDelete.title}” and its photos, amenities, and bookings will be permanently removed. This can't be undone.`}
          confirmLabel="Delete listing"
          destructive
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => !deleting && setToDelete(null)}
        />
      )}
    </div>
  );
}

function HostListingCard({ listing, onDelete }: { listing: Listing; onDelete: () => void }) {
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api.bookings
      .forListing(listing.id)
      .then((b) => {
        if (!controller.signal.aborted) setBookings(b);
      })
      .catch(() => {
        if (!controller.signal.aborted) setBookings([]);
      });
    return () => controller.abort();
  }, [listing.id]);

  const today = todayISO();
  const active = (bookings ?? []).filter((b) => b.status !== "cancelled");
  const upcoming = active.filter((b) => b.check_out >= today);
  const cover = listing.photos.find((p) => p.is_cover)?.url ?? listing.photos[0]?.url ?? null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:flex-row">
      <Link
        href={`/listings/${listing.id}`}
        className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:h-28 sm:w-44"
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={listing.title} className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center text-ink-faint">No photo</span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <Link href={`/listings/${listing.id}`}>
          <h3 className="truncate font-semibold text-ink">{listing.title}</h3>
        </Link>
        <p className="truncate text-sm text-ink-soft">
          {listing.city}, {listing.country} · <span className="capitalize">{listing.property_type}</span>
        </p>
        <p className="mt-1 text-sm text-ink">
          <span className="font-semibold">{formatPrice(listing.price_per_night)}</span>
          <span className="text-ink-soft"> night</span>
        </p>

        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {bookings === null ? (
            <span className="text-ink-faint">Loading bookings…</span>
          ) : (
            <>
              <span className="rounded-full bg-muted px-2.5 py-1 text-ink-soft">
                {active.length} booking{active.length === 1 ? "" : "s"}
              </span>
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-accent">
                {upcoming.length} upcoming
              </span>
            </>
          )}
        </div>

        {upcoming.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-xs text-ink-soft">
            {upcoming.slice(0, 3).map((b) => (
              <li key={b.id}>
                {formatDateRange(b.check_in, b.check_out)} · {b.num_guests} guest
                {b.num_guests > 1 ? "s" : ""}
              </li>
            ))}
            {upcoming.length > 3 && <li>+{upcoming.length - 3} more…</li>}
          </ul>
        )}
      </div>

      <div className="flex shrink-0 gap-2 sm:flex-col">
        <Link
          href={`/host/listings/${listing.id}/edit`}
          className="rounded-lg border border-line-strong px-3 py-1.5 text-center text-sm font-semibold text-ink transition-colors hover:border-ink"
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-semibold text-accent transition-colors hover:border-accent"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 rounded-2xl border border-line bg-surface p-10 text-center">
      <p className="text-lg font-semibold text-ink">You don&apos;t have any listings yet</p>
      <p className="mt-1 text-sm text-ink-soft">List your place and start hosting.</p>
      <Link
        href="/host/listings/new"
        className="mt-5 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        Create your first listing
      </Link>
    </div>
  );
}

function DashboardSkeleton({ bare }: { bare?: boolean }) {
  const cards = (
    <div className="mt-8 space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-4 rounded-2xl border border-line p-4">
          <div className="h-28 w-44 shrink-0 animate-pulse rounded-xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
  if (bare) return cards;
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-10">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      {cards}
    </div>
  );
}
