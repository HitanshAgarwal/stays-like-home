"use client";

// ListingCard: the grid card for a single listing. Shows a hover-zoom photo carousel with
// dots, a wishlist heart, an optional Superhost badge, and the location/title/type/price,
// all linking through to the listing detail page.
import Link from "next/link";
import { useState } from "react";

import { formatPrice } from "@/lib/format";
import type { Listing } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { useWishlist } from "@/lib/wishlist-context";
import { SuperhostBadge } from "@/components/SuperhostBadge";

// Renders the card image area (carousel + heart + badge) and the text block below.
export function ListingCard({ listing }: { listing: Listing }) {
  const photos = listing.photos.length > 0 ? listing.photos : [];
  const [active, setActive] = useState(0);

  return (
    <div className="group relative">
      {/* image area with heart + carousel */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
        <WishlistHeart listingId={listing.id} />
        <SuperhostBadge hostId={listing.host_id} className="absolute left-3 top-3 z-10" />

        <Link href={`/listings/${listing.id}`} className="block h-full w-full">
          {photos.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photos[active].url}
              alt={listing.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-ink-faint">No photo</div>
          )}
        </Link>

        {photos.length > 1 && (
          <>
            <CarouselButton
              side="left"
              onClick={() => setActive((i) => (i - 1 + photos.length) % photos.length)}
            />
            <CarouselButton
              side="right"
              onClick={() => setActive((i) => (i + 1) % photos.length)}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
              {photos.map((p, i) => (
                <span
                  key={p.id}
                  className={`h-1.5 rounded-full bg-white transition-all ${
                    i === active ? "w-1.5 opacity-100" : "w-1.5 opacity-60"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* text block */}
      <Link href={`/listings/${listing.id}`} className="mt-3 block">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold text-ink">
            {listing.city}, {listing.country}
          </h3>
          <Rating />
        </div>
        <p className="mt-0.5 truncate text-sm text-ink-soft">{listing.title}</p>
        <p className="mt-0.5 text-sm capitalize text-ink-faint">{listing.property_type}</p>
        <p className="mt-1.5 text-sm text-ink">
          <span className="font-semibold">{formatPrice(listing.price_per_night)}</span>
          <span className="text-ink-soft"> night</span>
        </p>
      </Link>
    </div>
  );
}

// Rating indicator; the list endpoint has no rating, so it always reads "New".
function Rating() {
  // The list endpoint doesn't return a per-listing rating, so unrated cards
  // read as "New" (Airbnb's own convention) rather than showing a fake number.
  return (
    <span className="flex shrink-0 items-center gap-1 text-sm text-ink">
      <StarIcon />
      <span>New</span>
    </span>
  );
}

// Heart toggle that saves/removes the listing from the wishlist (prompts login if signed out).
function WishlistHeart({ listingId }: { listingId: number }) {
  const { user } = useAuth();
  const { isWishlisted, toggle } = useWishlist();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const saved = isWishlisted(listingId);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast("Log in to save places to your wishlist.", "info");
      window.location.href = "/login";
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const nowSaved = await toggle(listingId);
      toast(nowSaved ? "Saved to your wishlist." : "Removed from your wishlist.", "success");
    } catch {
      // context already rolled back on error
      toast("Couldn't update your wishlist. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      aria-pressed={saved}
      className="absolute right-3 top-3 z-10 transition-transform active:scale-90"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 32 32"
        aria-hidden="true"
        className={saved ? "fill-accent" : "fill-black/50"}
        style={{ stroke: "white", strokeWidth: 2 }}
      >
        <path d="M16 28c7-4.7 12-10 12-16a6.5 6.5 0 0 0-12-3.5A6.5 6.5 0 0 0 4 12c0 6 5 11.3 12 16z" />
      </svg>
    </button>
  );
}

// Left/right overlay arrow for advancing the photo carousel.
function CarouselButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={`absolute top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow transition-opacity hover:bg-white group-hover:opacity-100 sm:grid ${
        side === "left" ? "left-2" : "right-2"
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        {side === "left" ? (
          <path d="m15 5-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}

// Inline star glyph for the rating indicator.
function StarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" className="fill-ink" aria-hidden="true">
      <path d="M12 2l2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.8 5.9 21.2l1.4-6.8L2.2 9l6.9-.7z" />
    </svg>
  );
}
