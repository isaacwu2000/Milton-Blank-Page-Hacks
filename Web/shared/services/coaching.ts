/** Removes model-supplied checkbox markers; the interface supplies the actual checkbox. */
export function normalizePracticeStep(step: string): string {
  return step.trim().replace(/^(?:(?:[-*]\s*)?\[[ xX]\]\s*|[☐☑☒□✓✔✅]\s*)+/u, "").trim();
}
