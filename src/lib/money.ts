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


export function weightedShares(bill: number, count: number): number[] {
  if (count <= 0) {
    return [];
  }

  const totalWeight = (count * (count + 1)) / 2;
  const cents = Math.round(bill * 100);
  const exact = Array.from(
    { length: count },
    (_, index) => (cents * (index + 1)) / totalWeight,
  );
  const shares = exact.map((value) => Math.floor(value));
  let remainder = cents - shares.reduce((sum, value) => sum + value, 0);

  const byFraction = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let i = 0; remainder > 0; i += 1) {
    shares[byFraction[i % count].index] += 1;
    remainder -= 1;
  }

  return shares.map((value) => value / 100);
}

/** `1234.5` + `रू` -> `रू1234.50`, but whole numbers stay short: `रू1235`. */
export function formatMoney(amount: number, currency: string): string {
  const rounded = Math.round(amount * 100) / 100;
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2);
  return `${currency}${text}`;
}
