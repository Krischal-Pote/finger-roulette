/** Parses a bill total typed by the user. Returns `null` when there is nothing usable. */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[^0-9.]/g, '');
  if (cleaned.length === 0) {
    return null;
  }
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

/** `1234.5` + `₹` -> `₹1234.50`, but whole numbers stay short: `₹1235`. */
export function formatMoney(amount: number, currency: string): string {
  const rounded = Math.round(amount * 100) / 100;
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2);
  return `${currency}${text}`;
}
