import type { TimelineItem } from '../types/timeline';
import { daysBetween } from '../utils/dates';

/* What is left here after the date arithmetic moved to `utils/dates.ts`: the
 * three numbers and functions that only mean something because there is a deck.
 * See that file's header for the line the split was drawn on. */

/** The overview's own unit — pixels per day at scale 1, which every slide's
 * inches-per-day is derived from. Deliberately not the plan screen's column
 * width: the two are separate numbers on purpose (docs/design-system-map.md,
 * Phase 3, E3). */
export const BASE_PX_PER_DAY = 32;


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
  extension: 'pptx' | 'pdf' | 'csv',
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
