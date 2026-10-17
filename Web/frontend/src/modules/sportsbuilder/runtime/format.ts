export const formatDate = (s: string) =>
  new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
export const fmt = (v: number | null | undefined) =>
  v === null || v === undefined
    ? "—"
    : Math.abs(v) < 100
      ? v.toFixed(2)
      : v.toFixed(0);

/** Keep rounded math readable without hiding very small nonzero measurements. */
export function formatMathNumber(value: number): string {
  if (!Number.isFinite(value)) return "\\text{unavailable}";
  if (value === 0) return "0";
  if (Math.abs(value) >= 100000 || Math.abs(value) < 0.001) {
    const [coefficient, exponent] = value.toExponential(2).split("e");
    return `${Number(coefficient)}\\times10^{${Number(exponent)}}`;
  }
  return new Intl.NumberFormat("en-US", {
    maximumSignificantDigits: 4,
    maximumFractionDigits: 3,
  })
    .format(value)
    .replaceAll(",", "{,}");
}
