"use client";

// Wishlist page: shows the signed-in user's saved listings (GET /api/wishlist/mine)
// as the same card grid used on explore. Requires auth (redirects to login otherwise).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ListingCard } from "@/components/ListingCard";
import { ListingCardSkeleton } from "@/components/ListingCardSkeleton";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Listing } from "@/lib/types";

// Page component: guards auth, loads saved listings, and renders the grid / empty state.
export default function WishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [listings, setListings] = useState<Listing[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const saved = await api.wishlist.mine();
        if (!controller.signal.aborted) setListings(saved);
      } catch (err) {
        if (!controller.signal.aborted)
          setError(err instanceof ApiError ? err.message : "Failed to load your wishlist");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    run();
    return () => controller.abort();
  }, [user]);

  if (authLoading || !user) return <WishlistSkeleton />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Wishlist</h1>
      <p className="mt-1 text-sm text-ink-soft">Places you&apos;ve saved.</p>

      {loading ? (
        <Grid>
          {Array.from({ length: 8 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </Grid>
      ) : error ? (
        <p className="mt-10 text-ink-soft">{error}</p>
      ) : (listings?.length ?? 0) === 0 ? (
        <EmptyWishlist />
      ) : (
        <Grid>
          {listings!.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </Grid>
      )}
    </div>
  );
}

// Responsive card grid matching the explore page.
function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}

// Shown when the user hasn't saved any listings yet.
function EmptyWishlist() {
  return (
    <div className="mt-10 rounded-2xl border border-line bg-surface p-10 text-center">
      <p className="text-lg font-semibold text-ink">No saved places yet</p>
      <p className="mt-1 text-sm text-ink-soft">
        Tap the heart on any listing to save it here.
      </p>
      <Link
        href="/"
        className="mt-5 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        Explore stays
      </Link>
    </div>
  );
}

// Loading placeholder for the whole page (heading + card skeletons).
function WishlistSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <div className="h-8 w-40 animate-pulse rounded bg-muted" />
      <Grid>
        {Array.from({ length: 8 }).map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </Grid>
    </div>
  );
}
