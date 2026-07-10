"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ExploreSearch, type SearchValues } from "@/components/ExploreSearch";
import { FilterRow, type Filters } from "@/components/FilterRow";
import { ListingCard } from "@/components/ListingCard";
import { ListingCardSkeleton } from "@/components/ListingCardSkeleton";
import { api, ApiError } from "@/lib/api";
import type { Listing } from "@/lib/types";

const PAGE_SIZE = 12;

export default function ExplorePage() {
  return (
    // useSearchParams requires a Suspense boundary in the app router
    <Suspense fallback={<ExploreFallback />}>
      <ExploreInner />
    </Suspense>
  );
}

function ExploreInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // read state from the URL (single source of truth, shareable + back-button safe)
  const search: SearchValues = useMemo(
    () => ({
      city: searchParams.get("city") ?? "",
      check_in: searchParams.get("check_in") ?? "",
      check_out: searchParams.get("check_out") ?? "",
      guests: Number(searchParams.get("guests") ?? "0") || 0,
    }),
    [searchParams],
  );
  const filters: Filters = useMemo(
    () => ({
      property_type: searchParams.get("property_type") ?? "",
      min_price: searchParams.get("min_price") ?? "",
      max_price: searchParams.get("max_price") ?? "",
      amenities: (searchParams.get("amenities") ?? "").split(",").filter(Boolean),
    }),
    [searchParams],
  );
  const page = Number(searchParams.get("page") ?? "1") || 1;

  const [data, setData] = useState<{ items: Listing[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // push a new URL from partial param updates (resets to page 1 unless page given)
  const updateUrl = useCallback(
    (updates: Record<string, string | number | string[] | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        const str = Array.isArray(value) ? value.join(",") : value === undefined ? "" : String(value);
        if (str === "" || str === "0") next.delete(key);
        else next.set(key, str);
      }
      if (!("page" in updates)) next.delete("page");
      router.push(`/?${next.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  // fetch whenever the server-driving params change
  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.listings.list({
          city: search.city || undefined,
          property_type: filters.property_type || undefined,
          min_price: filters.min_price ? Number(filters.min_price) : undefined,
          max_price: filters.max_price ? Number(filters.max_price) : undefined,
          check_in: search.check_in || undefined,
          check_out: search.check_out || undefined,
          guests: search.guests || undefined,
          page,
          page_size: PAGE_SIZE,
        });
        if (!controller.signal.aborted) setData({ items: res.items, total: res.total });
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof ApiError ? err.message : "Failed to load listings");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    run();
    return () => controller.abort();
  }, [
    search.city,
    search.check_in,
    search.check_out,
    search.guests,
    filters.property_type,
    filters.min_price,
    filters.max_price,
    page,
  ]);

  // amenities aren't a backend filter, so narrow the loaded page client-side
  const visibleItems = useMemo(() => {
    if (!data) return [];
    if (filters.amenities.length === 0) return data.items;
    return data.items.filter((l) => {
      const names = new Set(l.amenities.map((a) => a.name));
      return filters.amenities.every((a) => names.has(a));
    });
  }, [data, filters.amenities]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-10">
      <div className="mb-5">
        <ExploreSearch
          key={`${search.city}|${search.check_in}|${search.check_out}|${search.guests}`}
          initial={search}
          onSearch={(v) =>
            updateUrl({
              city: v.city,
              check_in: v.check_in,
              check_out: v.check_out,
              guests: v.guests,
            })
          }
        />
      </div>

      <div className="sticky top-16 z-30 -mx-4 mb-6 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <FilterRow
          filters={filters}
          onChange={(next) =>
            updateUrl({
              property_type: next.property_type,
              min_price: next.min_price,
              max_price: next.max_price,
              amenities: next.amenities,
            })
          }
        />
      </div>

      {error ? (
        <ErrorState message={error} />
      ) : loading ? (
        <CardGrid>
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </CardGrid>
      ) : visibleItems.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <p className="mb-4 text-sm text-ink-soft">
            {data!.total} stay{data!.total === 1 ? "" : "s"}
            {filters.amenities.length > 0 && visibleItems.length !== data!.items.length
              ? ` · showing ${visibleItems.length} on this page matching amenities`
              : ""}
          </p>
          <CardGrid>
            {visibleItems.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </CardGrid>

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPage={(p) => updateUrl({ page: p })}
            />
          )}
        </>
      )}
    </div>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
      <PageBtn disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </PageBtn>
      <span className="px-3 text-sm text-ink-soft">
        Page {page} of {totalPages}
      </span>
      <PageBtn disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Next
      </PageBtn>
    </nav>
  );
}

function PageBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-line-strong px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="py-20 text-center">
      <p className="text-lg font-semibold text-ink">No stays found</p>
      <p className="mt-1 text-sm text-ink-soft">Try widening your dates, price, or location.</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="py-20 text-center">
      <p className="text-lg font-semibold text-ink">Something went wrong</p>
      <p className="mt-1 text-sm text-ink-soft">{message}</p>
    </div>
  );
}

function ExploreFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-10">
      <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
