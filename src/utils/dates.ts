import type { TimelineItem } from '../types/timeline';

/* Date arithmetic, in the layer that has no opinion about what it is for.
 *
 * All of this used to live in `src/export/dateScale.ts`, which made it the
 * export's — and then six files that have nothing to do with a deck imported
 * it from there anyway: the plan screen's own scale, the import dialog's
 * preview, the export settings panel's month pickers, the dashboard metrics.
 * One of those, `utils/dashboardMetrics.ts`, was the last edge keeping
 * `src/utils` and `src/export` in a dependency cycle with each other, for the
 * sake of a constant naming how many milliseconds are in a day.
 *
 * So the arithmetic is here and the deck's own numbers stayed behind. The test
 * for which is which: a function that would still make sense in an app that
 * exported nothing belongs in this file. `BASE_PX_PER_DAY`,
 * `buildExportFilename` and `getItemBar` would not, and did not move.
 *
 * Everything here reads date-only ISO strings as UTC, deliberately and
 * consistently, so a displayed month never shifts with the reader's timezone.
 */

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/** ISO dates (YYYY-MM-DD) of every **Monday** from `startDate` to `endDate`
 * inclusive. Anchored on the real Monday on or before `startDate` rather
 * than on `startDate` itself, so the markers land on actual week boundaries
 * instead of on an arbitrary 7-day rhythm set by whenever the first task
 * happens to begin. Steps via `setUTCDate` (not raw millisecond/day-of-month
 * arithmetic) so JS Date itself carries the step across a month boundary —
 * 31 -> 1, 28/29/30 -> 1 — instead of hand-rolled rollover logic. UTC-based
 * to match how the rest of this file treats date-only ISO strings.
 *
 * The first marker can fall *before* `startDate` (when the range doesn't
 * itself begin on a Monday) — callers that scale markers into a drawing
 * range need to drop those; see buildDateGrid in dateGrid.ts. */
export function getWeekMarkers(startDate: string, endDate: string): string[] {
  const end = new Date(endDate).getTime();
  const markers: string[] = [];
  const date = new Date(startDate);

  // getUTCDay() is 0 for Sunday, so the distance back to Monday is
  // (day + 6) % 7 — 0 on a Monday, 6 on a Sunday.
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));

  while (date.getTime() <= end) {
    markers.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 7);
  }

  return markers;
}

/** ISO date (YYYY-MM-DD) for the 1st of the given UTC month — `month` is
 * 0-indexed (0 = January), matching Date's own convention. */
export function firstDayOfMonthIso(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

/** ISO date (YYYY-MM-DD) for the last day of the given UTC month — day 0 of
 * the following month is a standard JS trick for "last day of this one". */
export function lastDayOfMonthIso(year: number, month: number): string {
  return new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
}

/** "Sep 01" — shared by the on-screen day header and the export overview's
 * date-scale axis, so both formats always agree. */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
}

export interface DateRange {
  minDate: Date;
  maxDate: Date;
  totalDays: number;
}

export function getDateRange(items: TimelineItem[]): DateRange {
  if (items.length === 0) {
    const today = new Date();
    return { minDate: today, maxDate: today, totalDays: 1 };
  }

  const starts = items.map((item) => new Date(item.start).getTime());
  const ends = items.map((item) => new Date(item.end).getTime());
  const minDate = new Date(Math.min(...starts));
  const maxDate = new Date(Math.max(...ends));

  return { minDate, maxDate, totalDays: daysBetween(minDate, maxDate) + 1 };
}
