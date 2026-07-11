// Date helpers for the availability calendar. All dates are handled as local
// calendar days via "YYYY-MM-DD" strings to avoid timezone drift from Date.toISOString.

import type { BookedRange } from "./types";

// Format a Date as a local "YYYY-MM-DD" day string.
export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Parse a "YYYY-MM-DD" string into a local Date (midnight local time).
export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Today's date as a "YYYY-MM-DD" string.
export function todayISO(): string {
  return toISO(new Date());
}

// Add (or subtract, if n is negative) n calendar days to an ISO day string.
export function addDays(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Nights between two ISO days (half-open); 0 if invalid order. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const ms = fromISO(checkOut).getTime() - fromISO(checkIn).getTime();
  const n = Math.round(ms / 86_400_000);
  return n > 0 ? n : 0;
}

/** Expand booked ranges into a Set of blocked check-in days.
 *  A range [in, out) blocks nights in..out-1 (the checkout day is free). */
export function blockedNightSet(ranges: BookedRange[]): Set<string> {
  const set = new Set<string>();
  for (const r of ranges) {
    for (let day = r.check_in; day < r.check_out; day = addDays(day, 1)) {
      set.add(day);
    }
  }
  return set;
}

/** True if the half-open selection [checkIn, checkOut) overlaps any booked range. */
export function rangeOverlapsBooked(
  checkIn: string,
  checkOut: string,
  ranges: BookedRange[],
): boolean {
  return ranges.some((r) => checkIn < r.check_out && checkOut > r.check_in);
}

// Human-readable single date, e.g. "Jul 10, 2026".
export function formatDateShort(iso: string): string {
  return fromISO(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Human-readable date range "Jul 10, 2026 – Jul 16, 2026" (empty if incomplete).
export function formatDateRange(checkIn: string, checkOut: string): string {
  if (!checkIn || !checkOut) return "";
  return `${formatDateShort(checkIn)} – ${formatDateShort(checkOut)}`;
}

// Compact "10 Jul" (no year) for the tight search-bar range label.
export function formatDateCompact(iso: string): string {
  return fromISO(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
