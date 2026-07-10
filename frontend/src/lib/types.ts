// Shapes mirror the FastAPI Pydantic response models.

export interface User {
  id: number;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface Amenity {
  id: number;
  name: string;
  icon: string | null;
}

export interface ListingPhoto {
  id: number;
  url: string;
  position: number;
  is_cover: boolean;
}

export interface Host {
  id: number;
  name: string;
  avatar_url: string | null;
}

export interface Review {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  author_name: string;
}

export interface Listing {
  id: number;
  host_id: number;
  title: string;
  description: string;
  property_type: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  price_per_night: number;
  cleaning_fee: number;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  created_at: string;
  photos: ListingPhoto[];
  amenities: Amenity[];
}

export interface ListingDetail extends Listing {
  host: Host;
  reviews: Review[];
  average_rating: number | null;
}

export interface ListingList {
  items: Listing[];
  total: number;
  page: number;
  page_size: number;
}

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface Booking {
  id: number;
  listing_id: number;
  guest_id: number;
  check_in: string;
  check_out: string;
  num_guests: number;
  nightly_rate_snapshot: number;
  cleaning_fee_snapshot: number;
  total_price: number;
  status: BookingStatus;
  created_at: string;
}

export interface HostStats {
  host_id: number;
  average_rating: number | null;
  review_count: number;
  completed_bookings: number;
  is_superhost: boolean;
}

export interface BookedRange {
  check_in: string;
  check_out: string;
}

export interface Availability {
  listing_id: number;
  booked_ranges: BookedRange[];
}

export interface BookingListing {
  id: number;
  title: string;
  city: string;
  cover_photo: string | null;
}

export interface BookingWithListing extends Booking {
  listing: BookingListing;
  reviewed: boolean;
}
