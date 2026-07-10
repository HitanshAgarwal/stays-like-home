"use client";

/**
 * Wishlist context: tracks the set of listing ids the current user has saved,
 * reloading on auth changes and exposing an optimistic toggle that rolls back on error.
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { api, ApiError } from "./api";
import { useAuth } from "./auth-context";

interface WishlistContextValue {
  /** listing ids the current user has saved */
  ids: Set<number>;
  isWishlisted: (listingId: number) => boolean;
  /** optimistic toggle; rolls back on error. Returns the resulting state. */
  toggle: (listingId: number) => Promise<boolean>;
  ready: boolean;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

// Provides wishlist state and the optimistic toggle action, synced to the logged-in user.
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<number>>(new Set());
  const [ready, setReady] = useState(false);

  // Load the user's saved listings whenever auth state changes.
  useEffect(() => {
    let active = true;
    (async () => {
      // logged out: clear and mark ready
      if (!user) {
        if (active) {
          setIds(new Set());
          setReady(true);
        }
        return;
      }
      if (active) setReady(false);
      try {
        const saved = await api.wishlist.mine();
        if (active) setIds(new Set(saved.map((l) => l.id)));
      } catch {
        if (active) setIds(new Set());
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const isWishlisted = useCallback((listingId: number) => ids.has(listingId), [ids]);

  const toggle = useCallback(
    async (listingId: number): Promise<boolean> => {
      const wasSaved = ids.has(listingId);
      // optimistic update
      setIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(listingId);
        else next.add(listingId);
        return next;
      });
      try {
        const res = await api.wishlist.toggle(listingId);
        // reconcile with the server's truth
        setIds((prev) => {
          const next = new Set(prev);
          if (res.wishlisted) next.add(listingId);
          else next.delete(listingId);
          return next;
        });
        return res.wishlisted;
      } catch (err) {
        // roll back on failure
        setIds((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.add(listingId);
          else next.delete(listingId);
          return next;
        });
        throw err instanceof ApiError ? err : new Error("Failed to update wishlist");
      }
    },
    [ids],
  );

  return (
    <WishlistContext.Provider value={{ ids, isWishlisted, toggle, ready }}>
      {children}
    </WishlistContext.Provider>
  );
}

// Hook to read the wishlist context; throws if used outside a WishlistProvider.
export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (ctx === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return ctx;
}
