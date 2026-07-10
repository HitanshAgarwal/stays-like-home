// Typed fetch wrapper around the Stays Like Home FastAPI backend.
//
// Base URL comes from NEXT_PUBLIC_API_URL (falls back to localhost:8000 for dev).
// The auth token is persisted in localStorage under TOKEN_KEY and attached as a
// Bearer header. localStorage is browser-only, so token reads are guarded for
// server-side rendering.

import type {
  Amenity,
  Availability,
  Booking,
  BookingWithListing,
  HostStats,
  Listing,
  ListingDetail,
  ListingList,
  Review,
  Token,
  User,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "slh_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** attach the stored bearer token (default: true) */
  auth?: boolean;
  /** extra query params */
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, query, signal } = options;

  const url = new URL(path, BASE_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.ok) {
    throw new ApiError(res.status, await extractError(res));
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function extractError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    // FastAPI validation errors come back as an array of {msg, loc}
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string };
      if (first?.msg) return first.msg;
    }
    return res.statusText || "Request failed";
  } catch {
    return res.statusText || "Request failed";
  }
}

// ---- endpoint methods, grouped by resource ----------------------------------

export const api = {
  auth: {
    register: (data: { email: string; password: string; name: string }) =>
      request<Token>("/api/auth/register", { method: "POST", body: data, auth: false }),
    login: (data: { email: string; password: string }) =>
      request<Token>("/api/auth/login", { method: "POST", body: data, auth: false }),
    me: () => request<User>("/api/auth/me"),
  },

  amenities: {
    list: () => request<Amenity[]>("/api/amenities", { auth: false }),
  },

  hosts: {
    stats: (id: number | string) =>
      request<HostStats>(`/api/hosts/${id}/stats`, { auth: false }),
  },

  listings: {
    list: (params?: {
      city?: string;
      property_type?: string;
      min_price?: number;
      max_price?: number;
      check_in?: string;
      check_out?: string;
      guests?: number;
      page?: number;
      page_size?: number;
    }) => request<ListingList>("/api/listings", { auth: false, query: params }),
    get: (id: number | string) => request<ListingDetail>(`/api/listings/${id}`, { auth: false }),
    availability: (id: number | string) =>
      request<Availability>(`/api/listings/${id}/availability`, { auth: false }),
    mine: () => request<Listing[]>("/api/listings/mine"),
    create: (data: Record<string, unknown>) =>
      request<Listing>("/api/listings", { method: "POST", body: data }),
    update: (id: number | string, data: Record<string, unknown>) =>
      request<Listing>(`/api/listings/${id}`, { method: "PATCH", body: data }),
    remove: (id: number | string) =>
      request<void>(`/api/listings/${id}`, { method: "DELETE" }),
    reviews: (id: number | string, params?: { page?: number; page_size?: number }) =>
      request<{ items: Review[]; total: number; page: number; page_size: number }>(
        `/api/listings/${id}/reviews`,
        { auth: false, query: params },
      ),
  },

  bookings: {
    create: (data: {
      listing_id: number;
      check_in: string;
      check_out: string;
      num_guests: number;
    }) => request<Booking>("/api/bookings", { method: "POST", body: data }),
    mine: () => request<BookingWithListing[]>("/api/bookings/mine"),
    forListing: (listingId: number | string) =>
      request<Booking[]>(`/api/bookings/listing/${listingId}`),
    cancel: (id: number | string) =>
      request<Booking>(`/api/bookings/${id}/cancel`, { method: "PATCH" }),
  },

  reviews: {
    create: (data: { booking_id: number; rating: number; comment?: string }) =>
      request<Review>("/api/reviews", { method: "POST", body: data }),
  },

  wishlist: {
    toggle: (listingId: number | string) =>
      request<{ listing_id: number; wishlisted: boolean }>(`/api/wishlist/${listingId}`, {
        method: "POST",
      }),
    mine: () => request<Listing[]>("/api/wishlist/mine"),
  },
};
