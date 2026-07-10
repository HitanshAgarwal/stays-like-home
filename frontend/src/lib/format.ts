export function formatPrice(value: number): string {
  // Prices are stored as plain numbers; all listings are in India, so display INR.
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
