import type { TimelineItem } from '../types/timeline';

export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const BASE_PX_PER_DAY = 32;

export function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

export function shiftIsoDate(iso: string, days: number) {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** ISO dates (YYYY-MM-DD) of every **Monday** from `startDate` to `endDate`
 * inclusive. Anchored on the real Monday on or before `startDate` rather
 * than on `startDate` itself, so the markers land on actual week boundaries
 * instead of on an arbitrary 7-day rhythm set by whenever the first task
 * happens to begin. Steps via `setUTCDate` (not raw millisecond/day-of-month
 * arithmetic) so JS Date itself carries the step across a month boundary —
 * 31 -> 1, 28/29/30 -> 1 — instead of hand-rolled rollover logic. UTC-based
 * to match how the rest of this file treats date-only ISO strings (see
 * shiftIsoDate).
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

const FULL_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Export filename derived from the export timeframe: 'timeline-export.ext'
 * when there's no timeframe (the full date range), otherwise a human name
 * like 'June-September_2026_aicoo.pdf' (same year) or
 * 'November_2026-February_2027_aicoo.pdf' (spanning a year boundary). Dates
 * are read as UTC (matching how the rest of this file treats ISO date-only
 * strings) so the displayed month never shifts with the local timezone. */
export function buildExportFilename(
  timeframe: { start: string; end: string } | null,
  extension: 'pptx' | 'pdf',
): string {
  if (!timeframe) return `timeline-export.${extension}`;

  const start = new Date(timeframe.start);
  const end = new Date(timeframe.end);
  const startMonth = FULL_MONTH_NAMES[start.getUTCMonth()];
  const startYear = start.getUTCFullYear();
  const endMonth = FULL_MONTH_NAMES[end.getUTCMonth()];
  const endYear = end.getUTCFullYear();

  const range =
    startYear === endYear
      ? `${startMonth}-${endMonth}_${startYear}`
      : `${startMonth}_${startYear}-${endMonth}_${endYear}`;

  return `${range}_aicoo.${extension}`;
}

/** "Sep 01" — shared by the on-screen day header and the export overview's
 * date-scale axis, so both formats always agree. */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
}

/** "Jan 2027" — the axis caption for ranges too long for a day-level date
 * to mean anything (see getVisibleGridLevels). Formatted in UTC because the
 * grid marks it labels are built from UTC date parts, so a 1 January mark
 * can't come out labelled "Dec 2026" west of Greenwich. */
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
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

export interface ItemBar {
  left: number;
  width: number;
}

export function getItemBar(item: TimelineItem, minDate: Date, pxPerDay: number): ItemBar {
  const startOffsetDays = daysBetween(minDate, new Date(item.start));
  const durationDays = Math.max(1, daysBetween(new Date(item.start), new Date(item.end)) + 1);

  return {
    left: startOffsetDays * pxPerDay,
    width: durationDays * pxPerDay,
  };
}
