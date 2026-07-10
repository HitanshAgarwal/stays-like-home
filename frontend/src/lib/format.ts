export function formatPrice(value: number): string {
  // backend prices are plain numbers (USD-ish demo values)
  return `$${Math.round(value).toLocaleString()}`;
}

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
