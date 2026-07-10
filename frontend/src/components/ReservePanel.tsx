"use client";

// ReservePanel: the sticky booking widget on the listing detail page. It hosts the
// AvailabilityCalendar and guest stepper, computes the price breakdown (nightly + cleaning
// + service fee), validates the selected range against booked nights and guest limits, and
// on confirm creates the booking via the API before redirecting to Trips.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { Icon } from "@/components/Icon";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { blockedNightSet, formatDateRange, nightsBetween, rangeOverlapsBooked } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import { useToast } from "@/lib/toast-context";
import type { BookedRange, ListingDetail } from "@/lib/types";

// A flat mocked service fee percentage applied to the subtotal (Airbnb-style).
const SERVICE_FEE_RATE = 0.12;

// Manages date/guest selection, pricing, reserve validation, and the confirm-and-book flow.
export function ReservePanel({
  listing,
  bookedRanges,
}: {
  listing: ListingDetail;
  bookedRanges: BookedRange[];
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const bookedNights = useMemo(() => blockedNightSet(bookedRanges), [bookedRanges]);
  const nights = nightsBetween(checkIn, checkOut);

  const pricing = useMemo(() => {
    if (nights <= 0) return null;
    const nightly = listing.price_per_night * nights;
    const cleaning = listing.cleaning_fee;
    const service = Math.round((nightly + cleaning) * SERVICE_FEE_RATE);
    return { nightly, cleaning, service, total: nightly + cleaning + service };
  }, [nights, listing.price_per_night, listing.cleaning_fee]);

  const rangeConflicts = checkIn && checkOut && rangeOverlapsBooked(checkIn, checkOut, bookedRanges);
  const canReserve = nights > 0 && !rangeConflicts && guests >= 1 && guests <= listing.max_guests;

  function onReserveClick() {
    if (!user) {
      toast("Please log in to reserve this stay.", "info");
      router.push("/login");
      return;
    }
    if (!canReserve) return;
    setShowConfirm(true);
  }

  async function confirmBooking() {
    setSubmitting(true);
    try {
      await api.bookings.create({
        listing_id: listing.id,
        check_in: checkIn,
        check_out: checkOut,
        num_guests: guests,
      });
      toast("Booking confirmed! Redirecting to your trips…", "success");
      setShowConfirm(false);
      router.push("/trips");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? bookingErrorMessage(err)
          : "Something went wrong. Please try again.";
      toast(message, "error");
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold text-ink">{formatPrice(listing.price_per_night)}</span>
        <span className="text-ink-soft">night</span>
      </div>

      <div className="mt-4">
        <AvailabilityCalendar
          bookedNights={bookedNights}
          bookedRanges={bookedRanges}
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(ci, co) => {
            setCheckIn(ci);
            setCheckOut(co);
          }}
        />
      </div>

      {/* guests */}
      <div className="mt-4 flex items-center justify-between rounded-xl border border-line-strong px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink">Guests</p>
          <p className="text-xs text-ink-faint">Max {listing.max_guests}</p>
        </div>
        <div className="flex items-center gap-3">
          <StepBtn
            label="Fewer guests"
            disabled={guests <= 1}
            onClick={() => setGuests((g) => Math.max(1, g - 1))}
          >
            −
          </StepBtn>
          <span className="w-6 text-center tabular-nums">{guests}</span>
          <StepBtn
            label="More guests"
            disabled={guests >= listing.max_guests}
            onClick={() => setGuests((g) => Math.min(listing.max_guests, g + 1))}
          >
            +
          </StepBtn>
        </div>
      </div>

      {rangeConflicts && (
        <p className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
          Those dates include nights that are already booked. Pick a different range.
        </p>
      )}

      <button
        type="button"
        onClick={onReserveClick}
        disabled={!!user && !canReserve}
        className="mt-4 w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {nights > 0 ? "Reserve" : "Select dates to reserve"}
      </button>

      {pricing && (
        <div className="mt-4 space-y-2 text-sm">
          <Row
            label={`${formatPrice(listing.price_per_night)} × ${nights} night${nights > 1 ? "s" : ""}`}
            value={formatPrice(pricing.nightly)}
          />
          {pricing.cleaning > 0 && (
            <Row label="Cleaning fee" value={formatPrice(pricing.cleaning)} />
          )}
          <Row label="Service fee" value={formatPrice(pricing.service)} />
          <div className="mt-2 flex items-center justify-between border-t border-line pt-3 font-semibold text-ink">
            <span>Total</span>
            <span>{formatPrice(pricing.total)}</span>
          </div>
        </div>
      )}

      {showConfirm && pricing && (
        <ConfirmModal
          listing={listing}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guests}
          nights={nights}
          total={pricing.total}
          submitting={submitting}
          onConfirm={confirmBooking}
          onClose={() => !submitting && setShowConfirm(false)}
        />
      )}
    </div>
  );
}

// "Confirm and pay" modal summarizing the stay, dates, guests, and total before booking.
function ConfirmModal({
  listing,
  checkIn,
  checkOut,
  guests,
  nights,
  total,
  submitting,
  onConfirm,
  onClose,
}: {
  listing: ListingDetail;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  total: number;
  submitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirm and pay"
        className="w-full max-w-md rounded-t-2xl bg-surface p-6 shadow-[var(--shadow-card)] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Confirm and pay</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-ink hover:bg-muted"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="mt-4 flex gap-3 rounded-xl border border-line p-3">
          {listing.photos[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.photos[0].url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-lg object-cover"
            />
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{listing.title}</p>
            <p className="truncate text-sm text-ink-soft">
              {listing.city}, {listing.country}
            </p>
          </div>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Dates" value={formatDateRange(checkIn, checkOut)} />
          <Row label="Guests" value={`${guests} guest${guests > 1 ? "s" : ""}`} />
          <Row label="Nights" value={String(nights)} />
          <div className="flex items-center justify-between border-t border-line pt-3 text-base font-semibold text-ink">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </dl>

        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-ink-faint">
          This is a demo — no real payment is processed.
        </p>

        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className="mt-4 w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {submitting ? "Confirming…" : "Confirm booking"}
        </button>
      </div>
    </div>
  );
}

// Label/value line item used in the price breakdown and confirm modal.
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

// Round increment/decrement button used by the guest stepper.
function StepBtn({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-full border border-line-strong text-lg text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

// Map a booking API error to a user-friendly message based on its HTTP status.
function bookingErrorMessage(err: ApiError): string {
  switch (err.status) {
    case 401:
      return "Please log in to reserve this stay.";
    case 409:
      return "Sorry, those dates were just booked. Please choose another range.";
    case 400:
      return err.message || "That booking isn't valid. Check your dates and guest count.";
    case 404:
      return "This listing is no longer available.";
    default:
      return err.message || "Could not complete your booking. Please try again.";
  }
}
