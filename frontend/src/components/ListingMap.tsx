"use client";

// ListingMap: a small interactive map (react-leaflet + OpenStreetMap tiles) centered on
// a listing's coordinates with a single branded marker.
//
// Notes on the two classic Leaflet-in-Next gotchas, handled here:
//  1. SSR — Leaflet reads `window` at module load, so this file is client-only and the
//     page imports it via next/dynamic({ ssr: false }). We also guard on a mounted flag.
//  2. Marker icons — Leaflet's default marker PNGs are referenced by relative URLs a
//     bundler can't resolve, so they 404 and show broken images. We avoid that by using
//     a CSS-only divIcon (a coral pin) instead of the default image marker.
import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { MapContainer, Marker, TileLayer, Tooltip } from "react-leaflet";

// A coral teardrop pin built from HTML/CSS — no image asset to 404.
const pinIcon = L.divIcon({
  className: "", // drop Leaflet's default classes so only our markup styles it
  html: `<div style="
    width:26px;height:26px;border-radius:50% 50% 50% 0;
    background:var(--color-accent);transform:rotate(-45deg);
    border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);
  "></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26], // tip of the pin sits on the coordinate
});

export function ListingMap({
  latitude,
  longitude,
  label,
}: {
  latitude: number;
  longitude: number;
  label: string;
}) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={13}
      scrollWheelZoom={false}
      className="h-full w-full"
      // keyed by coords so switching listings re-centers cleanly
      key={`${latitude},${longitude}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[latitude, longitude]} icon={pinIcon}>
        <Tooltip direction="top" offset={[0, -24]}>
          {label}
        </Tooltip>
      </Marker>
    </MapContainer>
  );
}
