"use client";

import { useEffect, useRef, useState } from "react";

import { Icon, type IconName } from "@/components/Icon";

export interface Filters {
  property_type: string;
  min_price: string;
  max_price: string;
  amenities: string[]; // amenity names, filtered client-side
}

const PROPERTY_TYPES: { value: string; label: string; icon: IconName }[] = [
  { value: "", label: "All", icon: "auto_awesome" },
  { value: "apartment", label: "Apartments", icon: "apartment" },
  { value: "house", label: "Houses", icon: "home" },
  { value: "villa", label: "Villas", icon: "villa" },
  { value: "cabin", label: "Cabins", icon: "cabin" },
  { value: "boat", label: "Boats", icon: "sailing" },
  { value: "tent", label: "Tents", icon: "camping" },
];

export const ALL_AMENITIES = [
  "WiFi",
  "Kitchen",
  "Pool",
  "Free parking",
  "Air conditioning",
  "Washer",
  "Dedicated workspace",
  "Pet friendly",
  "Hot tub",
  "Heating",
  "Gym",
];

export function FilterRow({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const activeExtraCount =
    (filters.min_price ? 1 : 0) + (filters.max_price ? 1 : 0) + filters.amenities.length;

  return (
    <div className="flex items-center gap-3">
      {/* scrollable property-type chips */}
      <div className="scrollbar-none -mx-1 flex flex-1 gap-2 overflow-x-auto px-1 py-1">
        {PROPERTY_TYPES.map((pt) => {
          const active = filters.property_type === pt.value;
          return (
            <button
              key={pt.value || "all"}
              type="button"
              onClick={() => onChange({ ...filters, property_type: pt.value })}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-contrast bg-contrast text-on-contrast"
                  : "border-line-strong bg-surface text-ink hover:border-ink"
              }`}
            >
              <Icon name={pt.icon} size={16} />
              {pt.label}
            </button>
          );
        })}
      </div>

      {/* filters button */}
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        className="flex shrink-0 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink"
      >
        <FilterIcon />
        Filters
        {activeExtraCount > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-contrast px-1 text-xs text-on-contrast">
            {activeExtraCount}
          </span>
        )}
      </button>

      {panelOpen && (
        <FilterPanel
          filters={filters}
          onApply={(next) => {
            onChange(next);
            setPanelOpen(false);
          }}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  );
}

function FilterPanel({
  filters,
  onApply,
  onClose,
}: {
  filters: Filters;
  onApply: (next: Filters) => void;
  onClose: () => void;
}) {
  const [minPrice, setMinPrice] = useState(filters.min_price);
  const [maxPrice, setMaxPrice] = useState(filters.max_price);
  const [amenities, setAmenities] = useState<string[]>(filters.amenities);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggleAmenity(name: string) {
    setAmenities((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name],
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-6 shadow-[var(--shadow-card)] sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="grid h-8 w-8 place-items-center rounded-full text-ink hover:bg-muted"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-ink">Price range (per night)</h3>
          <div className="mt-2 flex items-center gap-3">
            <PriceInput label="Min" value={minPrice} onChange={setMinPrice} />
            <span className="mt-5 text-ink-faint">–</span>
            <PriceInput label="Max" value={maxPrice} onChange={setMaxPrice} />
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-ink">Amenities</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {ALL_AMENITIES.map((name) => {
              const on = amenities.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleAmenity(name)}
                  aria-pressed={on}
                  className={`rounded-full border px-3.5 py-2 text-sm transition-colors ${
                    on
                      ? "border-ink bg-accent-soft text-ink"
                      : "border-line-strong text-ink-soft hover:border-ink"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ink-faint">
            Amenity filters apply to the loaded results.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
          <button
            type="button"
            onClick={() => {
              setMinPrice("");
              setMaxPrice("");
              setAmenities([]);
            }}
            className="text-sm font-semibold text-ink underline"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={() =>
              onApply({
                ...filters,
                min_price: minPrice,
                max_price: maxPrice,
                amenities,
              })
            }
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Show results
          </button>
        </div>
      </div>
    </div>
  );
}

function PriceInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex-1">
      <span className="mb-1 block text-xs text-ink-faint">{label}</span>
      <div className="flex items-center rounded-xl border border-line-strong px-3 py-2 focus-within:border-accent">
        <span className="text-ink-faint">₹</span>
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-full bg-transparent pl-1 text-base outline-none"
        />
      </div>
    </label>
  );
}

function FilterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 5h18M6 12h12M10 19h4" strokeLinecap="round" />
    </svg>
  );
}
