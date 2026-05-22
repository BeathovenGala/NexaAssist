/**
 * Helpers for `<input type="date">` values (`YYYY-MM-DD`) in the user's local timezone.
 */

export function todayLocalYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * UTC ISO bounds for the user's local calendar day (not `…T00:00:00.000Z` on the raw date string).
 */
export function localCalendarDayUtcIsoRange(dateYmd: string): { from: string; to: string } {
  const from = new Date(`${dateYmd}T00:00:00`);
  const to = new Date(`${dateYmd}T23:59:59.999`);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Inclusive list of local calendar days from startYmd through endYmd (YYYY-MM-DD). */
export function eachLocalDayYmd(startYmd: string, endYmd: string): string[] {
  const out: string[] = [];
  const start = new Date(`${startYmd}T12:00:00`);
  const end = new Date(`${endYmd}T12:00:00`);
  if (end < start) {
    return [startYmd];
  }
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
  }
  return out;
}
