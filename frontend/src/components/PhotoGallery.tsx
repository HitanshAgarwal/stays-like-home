"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/Icon";
import type { ListingPhoto } from "@/lib/types";

export function PhotoGallery({ photos, title }: { photos: ListingPhoto[]; title: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="grid aspect-[16/9] w-full place-items-center rounded-2xl bg-muted text-ink-faint">
        No photos
      </div>
    );
  }

  const [cover, ...rest] = photos;
  const thumbs = rest.slice(0, 4);

  return (
    <>
      {/* mosaic: big cover + up to 4 thumbs on desktop; single cover on mobile */}
      <div className="grid gap-2 overflow-hidden rounded-2xl sm:grid-cols-2 sm:grid-rows-2">
        <button
          type="button"
          onClick={() => setLightboxIndex(0)}
          className="relative row-span-2 aspect-[4/3] sm:aspect-auto"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover.url}
            alt={title}
            className="h-full w-full object-cover transition-opacity hover:opacity-95"
          />
        </button>
        {thumbs.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setLightboxIndex(i + 1)}
            className="relative hidden aspect-[4/3] sm:block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={`${title} photo ${i + 2}`}
              className="h-full w-full object-cover transition-opacity hover:opacity-95"
            />
          </button>
        ))}
      </div>

      {photos.length > 1 && (
        <button
          type="button"
          onClick={() => setLightboxIndex(0)}
          className="mt-2 rounded-lg border border-line-strong px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-ink sm:hidden"
        >
          Show all {photos.length} photos
        </button>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          title={title}
          onIndex={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

function Lightbox({
  photos,
  index,
  title,
  onIndex,
  onClose,
}: {
  photos: ListingPhoto[];
  index: number;
  title: string;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex((index + 1) % photos.length);
      if (e.key === "ArrowLeft") onIndex((index - 1 + photos.length) % photos.length);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, photos.length, onIndex, onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90">
      <div className="flex items-center justify-between p-4 text-white">
        <span className="text-sm">
          {index + 1} / {photos.length}
        </span>
        <button type="button" onClick={onClose} aria-label="Close gallery">
          <Icon name="close" size={24} />
        </button>
      </div>
      <div className="relative flex flex-1 items-center justify-center px-4 pb-6">
        <NavArrow side="left" onClick={() => onIndex((index - 1 + photos.length) % photos.length)} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[index].url}
          alt={`${title} photo ${index + 1}`}
          className="max-h-full max-w-full rounded-lg object-contain"
        />
        <NavArrow side="right" onClick={() => onIndex((index + 1) % photos.length)} />
      </div>
    </div>
  );
}

function NavArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous" : "Next"}
      className={`absolute top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink hover:bg-white ${
        side === "left" ? "left-4" : "right-4"
      }`}
    >
      <Icon name={side === "left" ? "chevron_left" : "chevron_right"} size={22} />
    </button>
  );
}
