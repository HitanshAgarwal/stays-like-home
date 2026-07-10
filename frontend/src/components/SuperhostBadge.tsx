"use client";

// SuperhostBadge: a small "Superhost" pill shown next to qualifying hosts. It either
// derives the status from host stats (given a hostId) or accepts it directly via `show`,
// and renders nothing when the host is not a Superhost.
import { Icon } from "@/components/Icon";
import { useHostStats } from "@/lib/host-stats";

/** Small Superhost badge; renders nothing unless the host qualifies.
 *  Pass `hostId` to fetch+compute, or `show` to render directly (when the
 *  caller already knows the status). */
export function SuperhostBadge({
  hostId,
  show,
  className = "",
}: {
  hostId?: number;
  show?: boolean;
  className?: string;
}) {
  const stats = useHostStats(show === undefined ? hostId : undefined);
  const isSuperhost = show ?? stats?.is_superhost ?? false;
  if (!isSuperhost) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-1 text-xs font-semibold text-ink shadow-sm ring-1 ring-line dark:bg-surface/90 ${className}`}
    >
      <Icon name="workspace_premium" size={14} className="text-accent" />
      Superhost
    </span>
  );
}
