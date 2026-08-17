import { daysBetween, getWeekMarkers, MS_PER_DAY } from './dateScale';
import { COLORS } from './theme';

/** The densities of vertical date line drawn behind the timeline bars — on
 * screen (GanttChart) and on the exported overview slides alike. Which of
 * them are actually drawn depends on how much time is on screen at once; see
 * getVisibleGridLevels. */
export type DateGridLevel = 'day' | 'week' | 'month' | 'year';

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
  year: { color: COLORS.yearGridLine, widthPt: 1.75, widthPx: 3 },
};

/** Back-to-front draw order: the palest, densest level first, so a month
 * line is never overpainted by the day line sharing its position (every
 * month boundary is also a day boundary, and every Monday is both, and every
 * 1 January is all four). */
export const DATE_GRID_LEVELS: DateGridLevel[] = ['day', 'week', 'month', 'year'];

// How much time can be on screen at once before a level stops being worth
// drawing. Both thresholds are in days of *visible* range — the span the
// renderer fits across its own width, not the length of the plan — because
// that is what decides how close together the lines land: 90 days of daily
// lines across a slide is one line every 0.1in, and a year of them is one
// every 0.025in, which is not a grid any more, just a darker background.
export const MAX_VISIBLE_DAYS_FOR_DAY_LINES = 90;
export const MAX_VISIBLE_DAYS_FOR_WEEK_LINES = 365;

/** Which levels are worth drawing for a range of `visibleDays`: everything
 * down to daily on a quarter or less, weeks and months up to a year, and
 * months against year boundaries beyond that. Each tier keeps two or three
 * levels, so the grid always reads as a hierarchy rather than as one
 * undifferentiated comb. */
export function getVisibleGridLevels(visibleDays: number): DateGridLevel[] {
  if (visibleDays > MAX_VISIBLE_DAYS_FOR_WEEK_LINES) return ['month', 'year'];
  if (visibleDays > MAX_VISIBLE_DAYS_FOR_DAY_LINES) return ['week', 'month'];
  return ['day', 'week', 'month'];
}

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

/** The marks for one date range, derived from a single walk of the range
 * rather than independent date computations per level: the weekly, monthly
 * and yearly levels are all filtered views of the daily one, so they can
 * never disagree about where a given calendar day sits.
 *
 * `visibleDays` is how much of the range the renderer shows at once, and it
 * decides which levels come back populated — the rest come back empty, so a
 * renderer can keep iterating every level and simply draw nothing for the
 * ones this range is too long for. It defaults to the whole range, which is
 * what an exported slide shows; the on-screen chart passes what actually
 * fits in its scroll viewport at the current zoom. */
export function buildDateGrid(minDate: Date, maxDate: Date, visibleDays?: number): DateGrid {
  const totalDays = Math.max(1, daysBetween(minDate, maxDate) + 1);
  const levels = new Set(getVisibleGridLevels(visibleDays ?? totalDays));

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

  // Only true 1 Januarys — unlike the month level, this one takes no
  // range-start anchor: a year line at the very edge of the axis would sit
  // on top of the month line already there and mark nothing.
  const year = day.filter((mark) => mark.date.getUTCMonth() === 0 && mark.date.getUTCDate() === 1);

  return {
    day: levels.has('day') ? day : [],
    week: levels.has('week') ? week : [],
    month: levels.has('month') ? month : [],
    year: levels.has('year') ? year : [],
  };
}
