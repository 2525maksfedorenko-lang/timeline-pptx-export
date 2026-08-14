import { daysBetween, getWeekMarkers, MS_PER_DAY } from './dateScale';
import { COLORS } from './theme';

/** The three densities of vertical date line drawn behind the timeline bars
 * — on screen (GanttChart) and on the exported overview slides alike. */
export type DateGridLevel = 'day' | 'week' | 'month';

export interface DateGridLevelStyle {
  /** Hex without a leading '#', matching theme.ts's COLORS convention. */
  color: string;
  /** Stroke width in the exported slides (points). */
  widthPt: number;
  /** Stroke width on screen (CSS px). */
  widthPx: number;
}

/** One style table for every renderer, so a level's weight and color are
 * defined once instead of once per exporter. The ramp is monotonic in both
 * dimensions — day is the thinnest and palest, month the thickest and
 * darkest — which is what makes the three densities read as a hierarchy
 * rather than as three arbitrary line styles. */
export const DATE_GRID_STYLES: Record<DateGridLevel, DateGridLevelStyle> = {
  day: { color: COLORS.dayGridLine, widthPt: 0.25, widthPx: 0.5 },
  week: { color: COLORS.weekGridLine, widthPt: 0.5, widthPx: 1 },
  month: { color: COLORS.gridLine, widthPt: 1, widthPx: 1.75 },
};

/** Back-to-front draw order: the palest, densest level first, so a month
 * line is never overpainted by the day line sharing its position (every
 * month boundary is also a day boundary, and every Monday is both). */
export const DATE_GRID_LEVELS: DateGridLevel[] = ['day', 'week', 'month'];

export interface DateGridMark {
  /** Whole days from the range start. Callers scale this into px (screen) or
   * inches (export) — this module deals in neither unit, which is what lets
   * both renderers share the exact same marks. */
  dayOffset: number;
  date: Date;
}

export type DateGrid = Record<DateGridLevel, DateGridMark[]>;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The day/week/month marks for one date range, derived from a single walk
 * of the range rather than three independent date computations: the weekly
 * and monthly levels are both filtered views of the daily one, so the three
 * can never disagree about where a given calendar day sits. */
export function buildDateGrid(minDate: Date, maxDate: Date): DateGrid {
  const totalDays = Math.max(1, daysBetween(minDate, maxDate) + 1);

  const day: DateGridMark[] = Array.from({ length: totalDays }, (_, dayOffset) => ({
    dayOffset,
    date: new Date(minDate.getTime() + dayOffset * MS_PER_DAY),
  }));

  const week = getWeekMarkers(toIsoDate(minDate), toIsoDate(maxDate))
    .map((marker) => daysBetween(minDate, new Date(marker)))
    // getWeekMarkers anchors on the Monday on or before the range start, so
    // its first marker can sit before the range — outside anything drawable.
    .filter((dayOffset) => dayOffset >= 0 && dayOffset < totalDays)
    .map((dayOffset) => day[dayOffset]);

  // The 1st of each month, plus the range's own first day when that isn't
  // already a 1st: a range containing no month boundary at all (say Jun 5 →
  // Jun 20) would otherwise leave the exported axis with no anchoring
  // month-level date caption.
  const month = day.filter((mark, index) => index === 0 || mark.date.getUTCDate() === 1);

  return { day, week, month };
}
