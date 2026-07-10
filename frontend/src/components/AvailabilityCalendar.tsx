"use client";

import { useMemo, useState } from "react";

import { Icon } from "@/components/Icon";
import { addDays, fromISO, rangeOverlapsBooked, todayISO, toISO } from "@/lib/dates";
import type { BookedRange } from "@/lib/types";

interface Props {
  bookedNights: Set<string>; // ISO days that are unavailable as a night
  bookedRanges: BookedRange[];
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  months?: number;
}

export function AvailabilityCalendar({
  bookedNights,
  bookedRanges,
  checkIn,
  checkOut,
  onChange,
  months = 2,
}: Props) {
  const today = todayISO();
  const [viewStart, setViewStart] = useState(() => {
    const d = fromISO(today);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  function handleDayClick(day: string) {
    // choosing a start, or restarting after a full range is picked
    if (!checkIn || (checkIn && checkOut)) {
      onChange(day, "");
      return;
    }
    // second click: must be after start and not jump across a booked night
    if (day <= checkIn) {
      onChange(day, "");
      return;
    }
    if (rangeOverlapsBooked(checkIn, day, bookedRanges)) {
      // range would span a taken night — treat as a fresh start instead
      onChange(day, "");
      return;
    }
    onChange(checkIn, day);
  }

  const monthGrids = useMemo(() => {
    return Array.from({ length: months }, (_, i) => {
      const base = new Date(viewStart.getFullYear(), viewStart.getMonth() + i, 1);
      return { base, weeks: buildMonth(base) };
    });
  }, [viewStart, months]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setViewStart(new Date(viewStart.getFullYear(), viewStart.getMonth() - 1, 1))
          }
          disabled={
            viewStart.getFullYear() === fromISO(today).getFullYear() &&
            viewStart.getMonth() <= fromISO(today).getMonth()
          }
          aria-label="Previous month"
          className="grid h-8 w-8 place-items-center rounded-full border border-line-strong text-ink transition-colors hover:border-ink disabled:opacity-30"
        >
          <Icon name="chevron_left" size={18} />
        </button>
        <button
          type="button"
          onClick={() =>
            setViewStart(new Date(viewStart.getFullYear(), viewStart.getMonth() + 1, 1))
          }
          aria-label="Next month"
          className="grid h-8 w-8 place-items-center rounded-full border border-line-strong text-ink transition-colors hover:border-ink"
        >
          <Icon name="chevron_right" size={18} />
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {monthGrids.map(({ base, weeks }) => (
          <div key={`${base.getFullYear()}-${base.getMonth()}`}>
            <p className="mb-2 text-center text-sm font-semibold text-ink">
              {base.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </p>
            <div className="grid grid-cols-7 gap-y-1 text-center text-xs text-ink-faint">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-y-1">
              {weeks.flat().map((day, idx) => {
                if (!day) return <span key={idx} />;
                const iso = toISO(day);
                const isPast = iso < today;
                const isBookedNight = bookedNights.has(iso);
                const disabled = isPast || isBookedNight;
                const isStart = iso === checkIn;
                const isEnd = iso === checkOut;
                const inRange = checkIn && checkOut && iso > checkIn && iso < checkOut;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleDayClick(iso)}
                    aria-label={iso}
                    className={[
                      "mx-auto grid h-9 w-9 place-items-center rounded-full text-sm transition-colors",
                      disabled
                        ? "cursor-not-allowed text-ink-faint line-through"
                        : "text-ink hover:bg-muted",
                      isStart || isEnd ? "!bg-contrast !text-on-contrast" : "",
                      inRange ? "!bg-accent-soft !text-ink" : "",
                    ].join(" ")}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-faint">
        Crossed-out dates are unavailable. Tap a start date, then an end date.
      </p>
    </div>
  );
}

/** Build a month as weeks of Date|null (nulls pad the leading/trailing cells). */
function buildMonth(base: Date): (Date | null)[][] {
  const year = base.getFullYear();
  const month = base.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// re-export for callers that only need the next-day helper alongside the calendar
export { addDays };
