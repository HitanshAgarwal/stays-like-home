"use client";

// FilterRow: the explore page's filter bar. Shows scrollable amenity chips inline
// plus a "Filters" button that opens a dropdown (anchored under the button) for
// property type and price range. Reports the updated Filters via onChange.
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

// Renders the inline amenity chips and the Filters button + dropdown.
export function FilterRow({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  // active count on the Filters button: property type + price bounds (amenities show inline)
  const activeExtraCount =
    (filters.property_type ? 1 : 0) + (filters.min_price ? 1 : 0) + (filters.max_price ? 1 : 0);

  // close the dropdown on outside click / Escape
  useEffect(() => {
    if (!panelOpen) return;
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setPanelOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPanelOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [panelOpen]);

  function toggleAmenity(name: string) {
    const next = filters.amenities.includes(name)
      ? filters.amenities.filter((a) => a !== name)
      : [...filters.amenities, name];
    onChange({ ...filters, amenities: next });
  }

  return (
    <div className="flex items-center gap-3">
      {/* scrollable amenity chips */}
      <div className="scrollbar-none -mx-1 flex flex-1 gap-2 overflow-x-auto px-1 py-1">
        {ALL_AMENITIES.map((name) => {
          const active = filters.amenities.includes(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => toggleAmenity(name)}
              aria-pressed={active}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-contrast bg-contrast text-on-contrast"
                  : "border-line-strong bg-surface text-ink hover:border-ink"
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>

      {/* filters button + anchored dropdown */}
      <div ref={wrapRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          aria-expanded={panelOpen}
          className="flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink"
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
    </div>
  );
}

// Dropdown (anchored under the Filters button) for property type + price range.
function FilterPanel({
  filters,
  onApply,
  onClose,
}: {
  filters: Filters;
  onApply: (next: Filters) => void;
  onClose: () => void;
}) {
  const [propertyType, setPropertyType] = useState(filters.property_type);
  const [minPrice, setMinPrice] = useState(filters.min_price);
  const [maxPrice, setMaxPrice] = useState(filters.max_price);

  return (
    <div
      role="dialog"
      aria-label="Filters"
      className="absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-[min(92vw,28rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
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

      {/* property type */}
      <div className="mt-5">
        <h3 className="text-sm font-semibold text-ink">Property type</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((pt) => {
            const on = propertyType === pt.value;
            return (
              <button
                key={pt.value || "all"}
                type="button"
                onClick={() => setPropertyType(pt.value)}
                aria-pressed={on}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors ${
                  on
                    ? "border-contrast bg-contrast text-on-contrast"
                    : "border-line-strong text-ink-soft hover:border-ink"
                }`}
              >
                <Icon name={pt.icon} size={16} />
                {pt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* price range */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-ink">Price range (per night)</h3>
        <div className="mt-2 flex items-center gap-3">
          <PriceInput label="Min" value={minPrice} onChange={setMinPrice} />
          <span className="mt-5 text-ink-faint">–</span>
          <PriceInput label="Max" value={maxPrice} onChange={setMaxPrice} />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
        <button
          type="button"
          onClick={() => {
            setPropertyType("");
            setMinPrice("");
            setMaxPrice("");
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
              property_type: propertyType,
              min_price: minPrice,
              max_price: maxPrice,
            })
          }
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Show results
        </button>
      </div>
    </div>
  );
}

// Labeled numeric price input with a currency prefix (used for Min/Max).
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

// Inline sliders icon for the Filters button.
function FilterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 5h18M6 12h12M10 19h4" strokeLinecap="round" />
    </svg>
  );
}
