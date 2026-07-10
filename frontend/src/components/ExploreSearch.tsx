"use client";

import { useEffect, useRef, useState } from "react";

export interface SearchValues {
  city: string;
  check_in: string;
  check_out: string;
  guests: number;
}

export function ExploreSearch({
  initial,
  onSearch,
}: {
  initial: SearchValues;
  onSearch: (values: SearchValues) => void;
}) {
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState(initial.city);
  const [checkIn, setCheckIn] = useState(initial.check_in);
  const [checkOut, setCheckOut] = useState(initial.check_out);
  const [guests, setGuests] = useState(initial.guests);
  const panelRef = useRef<HTMLDivElement>(null);
  // NOTE: this component is keyed by its initial values in the parent, so when the
  // URL-driven search changes it remounts with fresh state -- no sync effect needed.

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function submit() {
    onSearch({ city: city.trim(), check_in: checkIn, check_out: checkOut, guests });
    setOpen(false);
  }

  const summary = [
    city.trim() || "Anywhere",
    checkIn && checkOut ? `${checkIn} → ${checkOut}` : "Any week",
    guests > 0 ? `${guests} guest${guests > 1 ? "s" : ""}` : "Add guests",
  ];

  return (
    <div ref={panelRef} className="relative mx-auto w-full max-w-2xl">
      {/* collapsed pill */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between gap-2 rounded-full border border-line-strong bg-surface py-2.5 pl-5 pr-2.5 shadow-sm transition-shadow hover:shadow-[var(--shadow-card)]"
        >
          <span className="flex min-w-0 items-center gap-3 text-sm font-semibold text-ink">
            <span className="truncate">{summary[0]}</span>
            <span className="hidden h-4 w-px bg-line sm:block" />
            <span className="hidden truncate sm:block">{summary[1]}</span>
            <span className="hidden h-4 w-px bg-line md:block" />
            <span className="hidden truncate font-normal text-ink-faint md:block">{summary[2]}</span>
          </span>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-white">
            <SearchIcon />
          </span>
        </button>
      )}

      {/* expanded panel */}
      {open && (
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Where
              </span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Search destinations"
                className="w-full rounded-xl border border-line-strong px-3 py-2.5 text-base outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Check in
              </span>
              <input
                type="date"
                value={checkIn}
                max={checkOut || undefined}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full rounded-xl border border-line-strong px-3 py-2.5 text-base outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Check out
              </span>
              <input
                type="date"
                value={checkOut}
                min={checkIn || undefined}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full rounded-xl border border-line-strong px-3 py-2.5 text-base outline-none focus:border-accent"
              />
            </label>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Guests
              </span>
              <Stepper value={guests} min={0} max={16} onChange={setGuests} />
            </div>
            <button
              type="button"
              onClick={submit}
              className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              <SearchIcon />
              Search
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="mt-1 flex items-center gap-3">
      <StepButton label="Decrease guests" disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </StepButton>
      <span className="w-6 text-center text-base font-medium tabular-nums">{value}</span>
      <StepButton label="Increase guests" disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </StepButton>
    </div>
  );
}

function StepButton({
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

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}
