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

/** Clear ground kept between two drawn strokes, as a multiple of the heaviest
 * stroke's own width.
 *
 * Two strokes separated by less than the width of one of them do not read as
 * two lines — they read as a single thick, slightly dirty one, which is what a
 * month line and the Monday three days after it look like once a year is
 * compressed into five inches (one day is then ~1.1pt). Requiring a full
 * stroke-width of clear ground either side is the smallest rule that keeps two
 * lines legible *as* two, and it is expressed against the heaviest stroke
 * because that is the one whose neighbour disappears first.
 *
 * At the year level's 1.75pt / 3px that is 3.5pt (~0.049in) on a slide and 6px
 * on screen. Within a level the marks are always further apart than this — a
 * week is 7.7pt even across a full year — so the rule only ever fires between
 * two different levels, which is exactly the collision it exists for. */
export const DATE_GRID_MIN_GAP_RATIO = 2;

const heaviest = DATE_GRID_LEVELS.reduce((widest, level) =>
  DATE_GRID_STYLES[level].widthPt > DATE_GRID_STYLES[widest].widthPt ? level : widest,
);
export const DATE_GRID_MIN_GAP_PT = DATE_GRID_STYLES[heaviest].widthPt * DATE_GRID_MIN_GAP_RATIO;
export const DATE_GRID_MIN_GAP_PX = DATE_GRID_STYLES[heaviest].widthPx * DATE_GRID_MIN_GAP_RATIO;

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
/** One drawn stroke: which level owns this position, where it is, and the day
 * it stands for. */
export interface DateGridStroke {
  level: DateGridLevel;
  x: number;
  /** The calendar day, as yyyy-mm-dd — carried so an audit can check that a
   * drawn line corresponds to a real date at its own level. */
  date: string;
}

/** The strokes actually drawn for a grid: one per position, owned by the
 * strongest level present there.
 *
 * A calendar position routinely qualifies for several levels at once — every
 * Monday is also a day, every 1 January is also a month start, a week and a
 * day — and drawing the grid level by level puts two or three strokes on the
 * same coordinate. They are not visible as separate lines; what they produce
 * is a stroke heavier than any level's own weight, which reads as an extra
 * line the calendar never had.
 *
 * So a position is not de-duplicated after the fact, it is *owned*: the
 * strongest level qualifying for it draws, the weaker ones do not draw there
 * at all. The same rule then extends by a tolerance — a weaker stroke closer
 * than `minGap` to a stronger one is the same collision a fraction of a point
 * apart (see DATE_GRID_MIN_GAP_RATIO), and is resolved the same way.
 *
 * Shared by the slides and the on-screen chart, each passing the gap in its
 * own unit, so neither can drift into drawing a different grid. */
export function resolveGridStrokes(
  grid: DateGrid,
  toX: (mark: DateGridMark) => number,
  minGap: number,
): DateGridStroke[] {
  const rankOf = (level: DateGridLevel) => DATE_GRID_LEVELS.indexOf(level);

  const candidates = DATE_GRID_LEVELS.flatMap((level) =>
    grid[level].map((mark) => ({ level, x: toX(mark), date: toIsoDate(mark.date) })),
  ).sort((a, b) => a.x - b.x || rankOf(b.level) - rankOf(a.level));

  const strokes: DateGridStroke[] = [];
  candidates.forEach((candidate) => {
    const last = strokes[strokes.length - 1];

    if (!last || candidate.x - last.x > minGap) {
      strokes.push(candidate);
      return;
    }
    // Close enough to collide. The stronger level takes the position — and
    // takes its x with it, which stays clear of the stroke before it because
    // it can only ever move further right.
    if (rankOf(candidate.level) > rankOf(last.level)) strokes[strokes.length - 1] = candidate;
  });

  return strokes;
}

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
