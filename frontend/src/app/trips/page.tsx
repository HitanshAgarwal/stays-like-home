"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDateRange, todayISO } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import { useToast } from "@/lib/toast-context";
import type { BookingWithListing } from "@/lib/types";

export default function TripsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<BookingWithListing[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  // redirect to login once we know there's no user
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
        const data = await api.bookings.mine();
        if (!controller.signal.aborted) setBookings(data);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof ApiError ? err.message : "Failed to load your trips");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    run();
    return () => controller.abort();
  }, [user]);

  const { upcoming, past } = useMemo(() => {
    const today = todayISO();
    const up: BookingWithListing[] = [];
    const pa: BookingWithListing[] = [];
    for (const b of bookings ?? []) {
      // upcoming = active booking whose stay hasn't ended; cancelled always goes to past
      if (b.status !== "cancelled" && b.check_out >= today) up.push(b);
      else pa.push(b);
    }
    up.sort((a, b) => a.check_in.localeCompare(b.check_in));
    pa.sort((a, b) => b.check_in.localeCompare(a.check_in));
    return { upcoming: up, past: pa };
  }, [bookings]);

  async function cancel(booking: BookingWithListing) {
    setCancelingId(booking.id);
    // optimistic: flip status locally
    setBookings((prev) =>
      prev?.map((b) => (b.id === booking.id ? { ...b, status: "cancelled" } : b)) ?? prev,
    );
    try {
      const updated = await api.bookings.cancel(booking.id);
      setBookings(
        (prev) => prev?.map((b) => (b.id === booking.id ? { ...b, ...updated } : b)) ?? prev,
      );
      toast("Booking cancelled.", "success");
    } catch (err) {
      // roll back
      setBookings(
        (prev) =>
          prev?.map((b) => (b.id === booking.id ? { ...b, status: booking.status } : b)) ?? prev,
      );
      toast(
        err instanceof ApiError ? err.message : "Could not cancel this booking.",
        "error",
      );
    } finally {
      setCancelingId(null);
    }
  }

  if (authLoading || (!user && loading)) return <TripsSkeleton />;
  if (!user) return null; // redirecting

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-10">
      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Trips</h1>

      {loading ? (
        <TripsSkeleton bare />
      ) : error ? (
        <p className="mt-8 text-ink-soft">{error}</p>
      ) : (bookings?.length ?? 0) === 0 ? (
        <EmptyTrips />
      ) : (
        <>
          <Section title="Upcoming" count={upcoming.length}>
            {upcoming.length === 0 ? (
              <p className="text-sm text-ink-soft">No upcoming trips.</p>
            ) : (
              upcoming.map((b) => (
                <TripCard
                  key={b.id}
                  booking={b}
                  cancelable
                  canceling={cancelingId === b.id}
                  onCancel={() => cancel(b)}
                />
              ))
            )}
          </Section>

          {past.length > 0 && (
            <Section title="Where you've been" count={past.length}>
              {past.map((b) => (
                <TripCard key={b.id} booking={b} />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-ink">
        {title} {count > 0 && <span className="text-ink-faint">({count})</span>}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function TripCard({
  booking,
  cancelable,
  canceling,
  onCancel,
}: {
  booking: BookingWithListing;
  cancelable?: boolean;
  canceling?: boolean;
  onCancel?: () => void;
}) {
  const { listing } = booking;
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:flex-row">
      <Link
        href={`/listings/${listing.id}`}
        className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:h-28 sm:w-40"
      >
        {listing.cover_photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.cover_photo} alt={listing.title} className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center text-ink-faint">No photo</span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/listings/${listing.id}`} className="block">
              <h3 className="truncate font-semibold text-ink">{listing.title}</h3>
            </Link>
            <p className="truncate text-sm text-ink-soft">{listing.city}</p>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <p className="mt-1 text-sm text-ink">{formatDateRange(booking.check_in, booking.check_out)}</p>
        <p className="text-sm text-ink-soft">
          {booking.num_guests} guest{booking.num_guests > 1 ? "s" : ""} ·{" "}
          {formatPrice(booking.total_price)} total
        </p>

        {cancelable && (
          <div className="mt-auto pt-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={canceling}
              className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-50"
            >
              {canceling ? "Cancelling…" : "Cancel booking"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: "bg-accent-soft text-accent",
    completed: "bg-muted text-ink-soft",
    cancelled: "bg-muted text-ink-faint line-through",
    pending: "bg-muted text-ink-soft",
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
        styles[status] ?? "bg-muted text-ink-soft"
      }`}
    >
      {status}
    </span>
  );
}

function EmptyTrips() {
  return (
    <div className="mt-10 rounded-2xl border border-line bg-surface p-10 text-center">
      <p className="text-lg font-semibold text-ink">No trips booked… yet!</p>
      <p className="mt-1 text-sm text-ink-soft">Time to dust off your bags and start planning.</p>
      <Link
        href="/"
        className="mt-5 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        Start searching
      </Link>
    </div>
  );
}

function TripsSkeleton({ bare }: { bare?: boolean }) {
  const cards = (
    <div className="mt-8 space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-4 rounded-2xl border border-line p-4">
          <div className="h-28 w-40 shrink-0 animate-pulse rounded-xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
  if (bare) return cards;
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-10">
      <div className="h-8 w-40 animate-pulse rounded bg-muted" />
      {cards}
    </div>
  );
}
