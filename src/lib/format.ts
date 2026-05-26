export function fmtCurrency(n: number | undefined | null, opts: { decimals?: number; compact?: boolean } = {}): string {
  if (n == null || !isFinite(n)) return "—";
  const { decimals = 0, compact = false } = opts;
  if (compact) {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  }
  return n.toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtPct(n: number | undefined | null, decimals = 2): string {
  if (n == null || !isFinite(n)) return "—";
  return `${(n * 100).toFixed(decimals)}%`;
}

export function fmtNumber(n: number | undefined | null, decimals = 0): string {
  if (n == null || !isFinite(n)) return "—";
  return n.toLocaleString("en-CA", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtMultiple(n: number | undefined | null): string {
  if (n == null || !isFinite(n)) return "—";
  return `${n.toFixed(2)}x`;
}
