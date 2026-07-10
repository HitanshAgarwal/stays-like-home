// Display helpers for formatting values (prices, casing) shown in the UI.

// Formats a numeric amount as a rounded INR price string (e.g. "₹1,234").
export function formatPrice(value: number): string {
  // Prices are stored as plain numbers; all listings are in India, so display INR.
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

// Capitalizes the first character of a string, leaving the rest unchanged.
export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
