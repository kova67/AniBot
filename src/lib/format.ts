/** Formatters shared by the landing page and the workspace so a number never
 * looks like two different numbers in two places. */

/**
 * Building an Intl.NumberFormat is the expensive part; formatting with one is
 * cheap. A feed of six token cards formats around thirty values per render, so
 * the instances are cached by shape.
 */
const formatters = new Map<string, Intl.NumberFormat>();

function numberFormat(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(options);
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", options);
    formatters.set(key, formatter);
  }
  return formatter;
}

export function usd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const magnitude = Math.abs(value);
  // Memecoin prices need a fixed six places so a column of them stays aligned;
  // past a thousand, cents are noise that only makes the column wider.
  const fixed = magnitude > 0 && magnitude < 0.01;
  const compact = magnitude >= 1_000_000;
  const maximumFractionDigits = fixed
    ? 6
    : compact
      ? 1
      : magnitude < 1
        ? 4
        : magnitude < 1_000
          ? 2
          : 0;
  return numberFormat({
    currency: "USD",
    maximumFractionDigits,
    minimumFractionDigits: fixed ? 6 : undefined,
    notation: compact ? "compact" : "standard",
    style: "currency",
  }).format(value);
}

export function percent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function count(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return numberFormat({
    maximumFractionDigits: 1,
    notation: value >= 10_000 ? "compact" : "standard",
  }).format(value);
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "—";
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 45) return "just now";
  if (seconds < 90) return "1 min ago";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 7200) return "1 hr ago";
  return `${Math.round(seconds / 3600)} hr ago`;
}
