"use client";

/**
 * Hook for fetching per-host stats, with a module-level cache and in-flight
 * request de-duplication so many cards for the same host share one request.
 */

import { useEffect, useState } from "react";

import { api } from "./api";
import type { HostStats } from "./types";

// Module-level cache so many cards for the same host share one request and
// re-renders don't refetch. Cleared on full reload, which is fine for stats.
const cache = new Map<number, HostStats>();
const inflight = new Map<number, Promise<HostStats>>();

// Returns cached or freshly fetched stats for a host id (null while unresolved).
export function useHostStats(hostId: number | undefined): HostStats | null {
  const [stats, setStats] = useState<HostStats | null>(
    hostId != null ? (cache.get(hostId) ?? null) : null,
  );

  useEffect(() => {
    if (hostId == null) return;
    let active = true;
    // resolve cache or fetch through a promise so no setState runs synchronously
    // in the effect body (avoids cascading-render warning)
    const cached = cache.get(hostId);
    const promise =
      cached != null
        ? Promise.resolve(cached)
        : (inflight.get(hostId) ??
          api.hosts.stats(hostId).then((s) => {
            cache.set(hostId, s);
            inflight.delete(hostId);
            return s;
          }));
    if (cached == null) inflight.set(hostId, promise);
    promise
      .then((s) => {
        if (active) setStats(s);
      })
      .catch(() => {
        inflight.delete(hostId);
      });
    return () => {
      active = false;
    };
  }, [hostId]);

  return stats;
}
