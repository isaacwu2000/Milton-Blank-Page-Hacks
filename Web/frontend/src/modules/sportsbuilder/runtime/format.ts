export const formatDate = (s: string) =>
  new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
export const fmt = (v: number | null | undefined) =>
  v === null || v === undefined
    ? "—"
    : Math.abs(v) < 100
      ? v.toFixed(2)
      : v.toFixed(0);

export const formatFrameRate = (intervalSeconds: number) =>
  (1 / intervalSeconds).toLocaleString("en-US", { maximumFractionDigits: 2 });
