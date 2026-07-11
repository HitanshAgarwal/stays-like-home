"use client";

// ExploreSearch: the Airbnb-style search control on the explore page.
//
// Desktop (sm+): a three-segment pill — Where / When / Who — where clicking a
// segment opens the matching popover panel (destinations list, two-month
// calendar, guest steppers). Picking two calendar dates sets check-in/out.
//
// Mobile: a single compact "Start your search" pill that opens a full-screen
// sheet with the same three sections stacked vertically.
//
// Emits the chosen { city, check_in, check_out, guests } via onSearch.
import { useEffect, useRef, useState } from "react";

import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { Icon } from "@/components/Icon";
import { formatDateCompact } from "@/lib/dates";

export interface SearchValues {
  city: string;
  check_in: string;
  check_out: string;
  guests: number;
}

// Which segment's panel is currently open (or none).
type Segment = "where" | "when" | "who" | null;

const SUGGESTED_DESTINATIONS: { city: string; label: string; hint: string }[] = [
  { city: "Goa", label: "Goa", hint: "Popular beach destination" },
  { city: "Mumbai", label: "Mumbai, Maharashtra", hint: "City by the sea" },
  { city: "Udaipur", label: "Udaipur, Rajasthan", hint: "For its stunning architecture" },
  { city: "Manali", label: "Manali, Himachal", hint: "Mountains and pine forests" },
  { city: "Jaipur", label: "Jaipur, Rajasthan", hint: "The Pink City" },
  { city: "Kochi", label: "Kochi, Kerala", hint: "Backwaters and old-world charm" },
];

const NO_BOOKED = { nights: new Set<string>(), ranges: [] as never[] };

// Top-level: renders the collapsed trigger (segmented bar on desktop, single pill
// on mobile) and the open state (popovers on desktop, full-screen sheet on mobile).
export function ExploreSearch({
  initial,
  onSearch,
}: {
  initial: SearchValues;
  onSearch: (values: SearchValues) => void;
}) {
  const [segment, setSegment] = useState<Segment>(null);
  const [city, setCity] = useState(initial.city);
  const [checkIn, setCheckIn] = useState(initial.check_in);
  const [checkOut, setCheckOut] = useState(initial.check_out);
  const [guests, setGuests] = useState(initial.guests);
  // mobile full-screen sheet open state (independent of which section is expanded)
  const [sheetOpen, setSheetOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  // NOTE: keyed by initial values in the parent, so it remounts fresh when the URL changes.

  // desktop: close any open popover on outside click / Escape.
  // Skipped while the mobile sheet is open — that sheet has its own close button,
  // and its taps are "outside" the hidden desktop bar, which would otherwise
  // collapse the active section on every tap.
  useEffect(() => {
    if (segment === null || sheetOpen) return;
    function onClick(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setSegment(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSegment(null);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [segment, sheetOpen]);

  function submit() {
    onSearch({ city: city.trim(), check_in: checkIn, check_out: checkOut, guests });
    setSegment(null);
    setSheetOpen(false);
  }

  function clearWhen() {
    setCheckIn("");
    setCheckOut("");
  }

  const dateLabel =
    checkIn && checkOut
      ? `${formatDateCompact(checkIn)} – ${formatDateCompact(checkOut)}`
      : "Add dates";
  const guestLabel = guests > 0 ? `${guests} guest${guests > 1 ? "s" : ""}` : "Add guests";

  // shared section bodies (reused by desktop popovers and the mobile sheet)
  const whereBody = (
    <WherePanel
      city={city}
      onCity={setCity}
      onPick={(c) => {
        setCity(c);
        setSegment("when");
      }}
    />
  );
  // `months` differs by surface: 2 in the wide desktop popover, 1 in the phone sheet.
  const whenBody = (months: number) => (
    <div>
      <AvailabilityCalendar
        bookedNights={NO_BOOKED.nights}
        bookedRanges={NO_BOOKED.ranges}
        checkIn={checkIn}
        checkOut={checkOut}
        months={months}
        onChange={(ci, co) => {
          setCheckIn(ci);
          setCheckOut(co);
        }}
      />
      {(checkIn || checkOut) && (
        <button
          type="button"
          onClick={clearWhen}
          className="mt-2 text-sm font-semibold text-ink underline"
        >
          Clear dates
        </button>
      )}
    </div>
  );
  const whoBody = <WhoPanel guests={guests} onGuests={setGuests} />;

  return (
    <>
      {/* ---------- MOBILE: compact trigger ---------- */}
      <button
        type="button"
        onClick={() => {
          setSheetOpen(true);
          setSegment("where");
        }}
        className="flex w-full items-center gap-3 rounded-full border border-line-strong bg-surface px-4 py-2.5 shadow-sm sm:hidden"
        aria-label="Start your search"
      >
        <span className="text-accent">
          <Icon name="search" size={18} />
        </span>
        <span className="flex flex-col text-left leading-tight">
          <span className="text-sm font-semibold text-ink">
            {city.trim() || "Anywhere"}
          </span>
          <span className="text-xs text-ink-faint">
            {dateLabel === "Add dates" ? "Any week" : dateLabel} · {guestLabel}
          </span>
        </span>
      </button>

      {/* ---------- DESKTOP: three-segment bar ---------- */}
      <div ref={barRef} className="relative mx-auto hidden w-full max-w-2xl sm:block">
        <div
          className={`flex items-stretch rounded-full border bg-surface shadow-sm ${
            segment ? "border-line-strong bg-muted" : "border-line-strong"
          }`}
        >
          <SegmentButton
            label="Where"
            value={city.trim() || "Search destinations"}
            muted={!city.trim()}
            active={segment === "where"}
            onClick={() => setSegment(segment === "where" ? null : "where")}
          />
          <Divider />
          <SegmentButton
            label="When"
            value={dateLabel}
            muted={dateLabel === "Add dates"}
            active={segment === "when"}
            onClick={() => setSegment(segment === "when" ? null : "when")}
          />
          <Divider />
          <div className="flex flex-1 items-center pr-1.5">
            <SegmentButton
              label="Who"
              value={guestLabel}
              muted={guests === 0}
              active={segment === "who"}
              onClick={() => setSegment(segment === "who" ? null : "who")}
            />
            <button
              type="button"
              onClick={submit}
              className="my-1.5 ml-auto flex shrink-0 items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              <Icon name="search" size={16} />
              <span className={segment ? "inline" : "hidden lg:inline"}>Search</span>
            </button>
          </div>
        </div>

        {/* desktop popover under the bar */}
        {segment && (
          <div
            className={`absolute z-50 mt-2 rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] ${
              segment === "where" ? "left-0 w-[26rem]" : segment === "who" ? "right-0 w-[24rem]" : "left-1/2 w-[42rem] -translate-x-1/2"
            }`}
          >
            {segment === "where" && whereBody}
            {segment === "when" && whenBody(2)}
            {segment === "who" && whoBody}
          </div>
        )}
      </div>

      {/* ---------- MOBILE: full-screen sheet ---------- */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[70] flex h-dvh flex-col bg-canvas sm:hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-base font-semibold text-ink">Search</span>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              aria-label="Close search"
              className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted"
            >
              <Icon name="close" size={20} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            <SheetSection
              label="Where"
              open={segment === "where"}
              summary={city.trim() || "Anywhere"}
              onOpen={() => setSegment("where")}
            >
              {whereBody}
            </SheetSection>
            <SheetSection
              label="When"
              open={segment === "when"}
              summary={dateLabel === "Add dates" ? "Any week" : dateLabel}
              onOpen={() => setSegment("when")}
            >
              {whenBody(1)}
            </SheetSection>
            <SheetSection
              label="Who"
              open={segment === "who"}
              summary={guestLabel}
              onOpen={() => setSegment("who")}
            >
              {whoBody}
            </SheetSection>
          </div>

          <div className="border-t border-line p-4">
            <button
              type="button"
              onClick={submit}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              <Icon name="search" size={16} />
              Search
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// One clickable segment of the desktop bar (label above, current value below).
function SegmentButton({
  label,
  value,
  muted,
  active,
  onClick,
}: {
  label: string;
  value: string;
  muted?: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 flex-1 flex-col rounded-full px-5 py-2.5 text-left transition-colors ${
        active ? "bg-surface shadow-sm" : "hover:bg-line/40"
      }`}
    >
      <span className="text-xs font-semibold text-ink">{label}</span>
      <span className={`truncate text-sm ${muted ? "text-ink-faint" : "text-ink"}`}>{value}</span>
    </button>
  );
}

// Thin vertical divider between desktop segments.
function Divider() {
  return <span className="my-2 w-px self-stretch bg-line" />;
}

// A collapsible section used inside the mobile search sheet.
function SheetSection({
  label,
  summary,
  open,
  onOpen,
  children,
}: {
  label: string;
  summary: string;
  open: boolean;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="truncate pl-3 text-sm text-ink-soft">{summary}</span>
      </button>
      {open && <div className="border-t border-line p-4">{children}</div>}
    </div>
  );
}

// "Where" panel: free-text input plus a list of suggested destinations to tap.
function WherePanel({
  city,
  onCity,
  onPick,
}: {
  city: string;
  onCity: (c: string) => void;
  onPick: (c: string) => void;
}) {
  return (
    <div>
      <input
        type="text"
        value={city}
        onChange={(e) => onCity(e.target.value)}
        placeholder="Search destinations"
        autoFocus
        className="w-full rounded-xl border border-line-strong px-4 py-3 text-base outline-none focus:border-accent"
      />
      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Suggested destinations
      </p>
      <ul className="max-h-72 space-y-1 overflow-y-auto">
        {SUGGESTED_DESTINATIONS.map((d) => (
          <li key={d.label}>
            <button
              type="button"
              onClick={() => onPick(d.city)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-ink-soft">
                <Icon name="home" size={18} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">{d.label}</span>
                <span className="block truncate text-xs text-ink-faint">{d.hint}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// "Who" panel: guest-category steppers (adults/children/infants folded into one count).
function WhoPanel({ guests, onGuests }: { guests: number; onGuests: (n: number) => void }) {
  // The backend books on a single guest count, so we expose Adults/Children that
  // sum into it (infants don't count toward capacity, matching Airbnb).
  return (
    <div className="divide-y divide-line">
      <GuestRow
        title="Guests"
        subtitle="Ages 2 or above"
        value={guests}
        min={0}
        max={16}
        onChange={onGuests}
      />
    </div>
  );
}

// A single labeled +/- row in the guests panel.
function GuestRow({
  title,
  subtitle,
  value,
  min,
  max,
  onChange,
}: {
  title: string;
  subtitle: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-4">
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-ink-faint">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <StepButton label={`Decrease ${title}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          −
        </StepButton>
        <span className="w-6 text-center text-base font-medium tabular-nums">{value}</span>
        <StepButton label={`Increase ${title}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          +
        </StepButton>
      </div>
    </div>
  );
}

// Single round increment/decrement button used inside the guest rows.
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
