"use client";

// PriceRangeSlider: a dual-thumb price range control (Airbnb-style) built from two
// overlapping native range inputs, with a filled track between the thumbs and the
// selected Minimum / Maximum values shown below. No histogram bars (we don't have
// the price-distribution data), just the draggable range.
//
// Values are per-night rupees. The max thumb at the ceiling reads "₹N+" and maps to
// an empty max_price (i.e. no upper bound) so it doesn't exclude anything.
import { formatPrice } from "@/lib/format";

const MIN = 0;
const MAX = 500; // per-night ceiling; the top thumb means "this or more"
const STEP = 10;

export function PriceRangeSlider({
  min,
  max,
  onChange,
}: {
  min: string; // current min_price ("" = no bound)
  max: string; // current max_price ("" = no bound)
  onChange: (min: string, max: string) => void;
}) {
  // resolve the string filter values to concrete slider positions
  const lo = clamp(min === "" ? MIN : Number(min), MIN, MAX);
  const hi = clamp(max === "" ? MAX : Number(max), MIN, MAX);

  // keep the two thumbs from crossing (leave one step between them)
  function setLo(value: number) {
    const next = Math.min(value, hi - STEP);
    onChange(next <= MIN ? "" : String(next), max);
  }
  function setHi(value: number) {
    const next = Math.max(value, lo + STEP);
    onChange(min, next >= MAX ? "" : String(next));
  }

  const loPct = ((lo - MIN) / (MAX - MIN)) * 100;
  const hiPct = ((hi - MIN) / (MAX - MIN)) * 100;

  return (
    <div>
      {/* track + thumbs */}
      <div className="relative h-9">
        {/* base rail */}
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-line" />
        {/* selected segment */}
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent"
          style={{ left: `${loPct}%`, right: `${100 - hiPct}%` }}
        />
        {/* min thumb (input) */}
        <input
          type="range"
          aria-label="Minimum price"
          min={MIN}
          max={MAX}
          step={STEP}
          value={lo}
          onChange={(e) => setLo(Number(e.target.value))}
          className="range-thumb absolute top-0 h-9 w-full"
        />
        {/* max thumb (input) */}
        <input
          type="range"
          aria-label="Maximum price"
          min={MIN}
          max={MAX}
          step={STEP}
          value={hi}
          onChange={(e) => setHi(Number(e.target.value))}
          className="range-thumb absolute top-0 h-9 w-full"
        />
      </div>

      {/* value labels below the bar */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex-1 rounded-xl border border-line-strong px-4 py-2.5">
          <span className="block text-xs text-ink-faint">Minimum</span>
          <span className="block text-sm font-semibold text-ink">{formatPrice(lo)}</span>
        </div>
        <span className="text-ink-faint">–</span>
        <div className="flex-1 rounded-xl border border-line-strong px-4 py-2.5 text-right">
          <span className="block text-xs text-ink-faint">Maximum</span>
          <span className="block text-sm font-semibold text-ink">
            {formatPrice(hi)}
            {hi >= MAX ? "+" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.min(Math.max(n, lo), hi);
}
