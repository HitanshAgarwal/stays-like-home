"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/Icon";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import type { Amenity, ListingDetail } from "@/lib/types";

const PROPERTY_TYPES = ["apartment", "house", "villa", "cabin", "boat", "tent"];

export interface ListingFormValues {
  title: string;
  description: string;
  property_type: string;
  address: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  price_per_night: string;
  cleaning_fee: string;
  max_guests: string;
  bedrooms: string;
  beds: string;
  bathrooms: string;
  amenity_ids: number[];
  photo_urls: string[];
}

const EMPTY: ListingFormValues = {
  title: "",
  description: "",
  property_type: "apartment",
  address: "",
  city: "",
  country: "",
  latitude: "",
  longitude: "",
  price_per_night: "",
  cleaning_fee: "0",
  max_guests: "1",
  bedrooms: "1",
  beds: "1",
  bathrooms: "1",
  amenity_ids: [],
  photo_urls: [],
};

export function listingToForm(listing: ListingDetail): ListingFormValues {
  return {
    title: listing.title,
    description: listing.description,
    property_type: listing.property_type,
    address: listing.address,
    city: listing.city,
    country: listing.country,
    latitude: String(listing.latitude),
    longitude: String(listing.longitude),
    price_per_night: String(listing.price_per_night),
    cleaning_fee: String(listing.cleaning_fee),
    max_guests: String(listing.max_guests),
    bedrooms: String(listing.bedrooms),
    beds: String(listing.beds),
    bathrooms: String(listing.bathrooms),
    amenity_ids: listing.amenities.map((a) => a.id),
    photo_urls: listing.photos.map((p) => p.url),
  };
}

export function ListingForm({
  mode,
  listingId,
  initial,
}: {
  mode: "create" | "edit";
  listingId?: number;
  initial?: ListingFormValues;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [values, setValues] = useState<ListingFormValues>(initial ?? EMPTY);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    api.amenities
      .list()
      .then((list) => {
        if (active) setAmenities(list);
      })
      .catch(() => {
        /* non-fatal: form still usable without amenity options */
      });
    return () => {
      active = false;
    };
  }, []);

  function set<K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function toggleAmenity(id: number) {
    setValues((v) => ({
      ...v,
      amenity_ids: v.amenity_ids.includes(id)
        ? v.amenity_ids.filter((a) => a !== id)
        : [...v.amenity_ids, id],
    }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!values.title.trim()) e.title = "Title is required";
    if (!values.description.trim()) e.description = "Description is required";
    if (!values.address.trim()) e.address = "Address is required";
    if (!values.city.trim()) e.city = "City is required";
    if (!values.country.trim()) e.country = "Country is required";
    const lat = Number(values.latitude);
    const lng = Number(values.longitude);
    if (values.latitude === "" || Number.isNaN(lat) || lat < -90 || lat > 90)
      e.latitude = "Latitude must be between -90 and 90";
    if (values.longitude === "" || Number.isNaN(lng) || lng < -180 || lng > 180)
      e.longitude = "Longitude must be between -180 and 180";
    if (!(Number(values.price_per_night) > 0)) e.price_per_night = "Price must be greater than 0";
    if (Number(values.cleaning_fee) < 0) e.cleaning_fee = "Cannot be negative";
    if (!(Number(values.max_guests) >= 1)) e.max_guests = "At least 1 guest";
    if (values.amenity_ids.length === 0) e.amenities = "Select at least one amenity";
    if (values.photo_urls.filter((u) => u.trim()).length === 0) e.photos = "Add at least one photo";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) {
      toast("Please fix the highlighted fields.", "error");
      return;
    }
    setSubmitting(true);
    const payload = {
      title: values.title.trim(),
      description: values.description.trim(),
      property_type: values.property_type,
      address: values.address.trim(),
      city: values.city.trim(),
      country: values.country.trim(),
      latitude: Number(values.latitude),
      longitude: Number(values.longitude),
      price_per_night: Number(values.price_per_night),
      cleaning_fee: Number(values.cleaning_fee),
      max_guests: Number(values.max_guests),
      bedrooms: Number(values.bedrooms),
      beds: Number(values.beds),
      bathrooms: Number(values.bathrooms),
      amenity_ids: values.amenity_ids,
      photo_urls: values.photo_urls.map((u) => u.trim()).filter(Boolean),
    };
    try {
      if (mode === "create") {
        const created = await api.listings.create(payload);
        toast("Listing published!", "success");
        router.push(`/listings/${created.id}`);
      } else {
        await api.listings.update(listingId!, payload);
        toast("Listing updated.", "success");
        router.push("/host");
      }
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "Could not save the listing. Please try again.",
        "error",
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* basics */}
      <Section title="About the place">
        <TextField
          label="Title"
          value={values.title}
          onChange={(v) => set("title", v)}
          error={errors.title}
          placeholder="Sunny loft near the old city"
        />
        <TextArea
          label="Description"
          value={values.description}
          onChange={(v) => set("description", v)}
          error={errors.description}
        />
        <div>
          <FieldLabel>Property type</FieldLabel>
          <select
            value={values.property_type}
            onChange={(e) => set("property_type", e.target.value)}
            className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-base capitalize outline-none focus:border-accent"
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t}
              </option>
            ))}
          </select>
        </div>
      </Section>

      {/* location */}
      <Section title="Location">
        <TextField
          label="Address"
          value={values.address}
          onChange={(v) => set("address", v)}
          error={errors.address}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="City" value={values.city} onChange={(v) => set("city", v)} error={errors.city} />
          <TextField
            label="Country"
            value={values.country}
            onChange={(v) => set("country", v)}
            error={errors.country}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Latitude"
            value={values.latitude}
            onChange={(v) => set("latitude", v)}
            error={errors.latitude}
            placeholder="26.9124"
          />
          <TextField
            label="Longitude"
            value={values.longitude}
            onChange={(v) => set("longitude", v)}
            error={errors.longitude}
            placeholder="75.7873"
          />
        </div>
        <p className="text-xs text-ink-faint">
          Enter coordinates manually for now — pin-drop map picker comes later.
        </p>
      </Section>

      {/* pricing + capacity */}
      <Section title="Pricing & capacity">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Price per night (₹)"
            type="number"
            value={values.price_per_night}
            onChange={(v) => set("price_per_night", v)}
            error={errors.price_per_night}
          />
          <TextField
            label="Cleaning fee (₹)"
            type="number"
            value={values.cleaning_fee}
            onChange={(v) => set("cleaning_fee", v)}
            error={errors.cleaning_fee}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <TextField
            label="Max guests"
            type="number"
            value={values.max_guests}
            onChange={(v) => set("max_guests", v)}
            error={errors.max_guests}
          />
          <TextField label="Bedrooms" type="number" value={values.bedrooms} onChange={(v) => set("bedrooms", v)} />
          <TextField label="Beds" type="number" value={values.beds} onChange={(v) => set("beds", v)} />
          <TextField label="Bathrooms" type="number" value={values.bathrooms} onChange={(v) => set("bathrooms", v)} />
        </div>
      </Section>

      {/* amenities */}
      <Section title="Amenities">
        {amenities.length === 0 ? (
          <p className="text-sm text-ink-faint">Loading amenities…</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {amenities.map((a) => {
              const on = values.amenity_ids.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAmenity(a.id)}
                  aria-pressed={on}
                  className={`inline-flex items-center gap-1 rounded-full border px-4 py-2 text-sm transition-colors ${
                    on
                      ? "border-ink bg-accent-soft text-ink"
                      : "border-line-strong text-ink-soft hover:border-ink"
                  }`}
                >
                  {on && <Icon name="check" size={14} />}
                  {a.name}
                </button>
              );
            })}
          </div>
        )}
        {errors.amenities && <p className="mt-2 text-xs text-accent">{errors.amenities}</p>}
      </Section>

      {/* photos */}
      <Section title="Photos">
        <PhotoUrlList
          urls={values.photo_urls}
          onChange={(urls) => set("photo_urls", urls)}
        />
        {errors.photos && <p className="mt-2 text-xs text-accent">{errors.photos}</p>}
      </Section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {submitting ? "Saving…" : mode === "create" ? "Publish listing" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl px-4 py-3 text-sm font-semibold text-ink hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function PhotoUrlList({ urls, onChange }: { urls: string[]; onChange: (u: string[]) => void }) {
  const [draft, setDraft] = useState("");

  function add() {
    const v = draft.trim();
    if (!v) return;
    onChange([...urls, v]);
    setDraft("");
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="url"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="https://images.example.com/photo.jpg"
          className="flex-1 rounded-xl border border-line-strong px-3 py-2.5 text-base outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-xl border border-line-strong px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink"
        >
          Add
        </button>
      </div>
      <p className="mt-1 text-xs text-ink-faint">
        Paste image URLs (no upload needed). The first photo is used as the cover.
      </p>
      {urls.length > 0 && (
        <ul className="mt-3 space-y-2">
          {urls.map((url, i) => (
            <li key={`${url}-${i}`} className="flex items-center gap-3 rounded-xl border border-line p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-12 w-16 shrink-0 rounded-md bg-muted object-cover" />
              <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{url}</span>
              {i === 0 && (
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-ink-soft">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => onChange(urls.filter((_, idx) => idx !== i))}
                aria-label="Remove photo"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-muted hover:text-ink"
              >
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-ink">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-sm font-medium text-ink">{children}</span>;
}

function TextField({
  label,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={type === "number" ? 0 : undefined}
        className={`w-full rounded-xl border px-3 py-2.5 text-base outline-none transition-colors focus:border-accent ${
          error ? "border-accent" : "border-line-strong"
        }`}
      />
      {error && <span className="mt-1 block text-xs text-accent">{error}</span>}
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className={`w-full rounded-xl border px-3 py-2.5 text-base outline-none transition-colors focus:border-accent ${
          error ? "border-accent" : "border-line-strong"
        }`}
      />
      {error && <span className="mt-1 block text-xs text-accent">{error}</span>}
    </label>
  );
}
