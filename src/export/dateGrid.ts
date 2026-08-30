import { daysBetween, getWeekMarkers, MS_PER_DAY } from '../utils/dates';

/** The densities of vertical date line the overview slide can be ruled at.
 * Which of them a slide actually uses is decided by its zoom level; see
 * getVisibleGridLevels and slideZoomFor.
 *
 * The screen is not one of the surfaces here any more — src/gantt draws its
 * own grid from its own scale — so these serve the export alone. */
export type DateGridLevel = 'day' | 'week' | 'halfMonth' | 'month' | 'year';

/** Weakest to strongest, which is both the draw order and the ownership order:
 * a position claimed by several levels belongs to the last of them (see
 * resolveGridStrokes). Every Monday is also a day, every 1st is also a
 * half-month mark, and every 1 January is all five.
 *
 * The levels carry no weight or colour of their own. A slide's grid is the
 * column boundaries of its zoom, drawn as one uniform hairline in `--border`
 * (see docs/export-handoff-map.md); what a level still decides is which dates
 * *qualify* as a boundary, which is what the coverage audit holds a drawn line
 * to. */
export const DATE_GRID_LEVELS: DateGridLevel[] = ['day', 'week', 'halfMonth', 'month', 'year'];

// How much time can be on screen at once before a level stops being worth
// drawing. Both thresholds are in days of *visible* range — the span the
// renderer fits across its own width, not the length of the plan — because
// that is what decides how close together the lines land: 90 days of daily
// lines across a slide is one line every 0.1in, and a year of them is one
// every 0.025in, which is not a grid any more, just a darker background.
export const MAX_VISIBLE_DAYS_FOR_DAY_LINES = 90;
export const MAX_VISIBLE_DAYS_FOR_WEEK_LINES = 365;

/** Which levels a range of `visibleDays` can be ruled at: everything down to
 * daily on a quarter or less, weeks through months up to a year, and months
 * against year boundaries beyond that.
 *
 * The half-month level exists for the zoom of the same name — a six-month
 * window is too long for a legible week column and too short for a month one
 * (see slideZoomFor) — so it appears exactly where that zoom can be chosen. */
export function getVisibleGridLevels(visibleDays: number): DateGridLevel[] {
  if (visibleDays > MAX_VISIBLE_DAYS_FOR_WEEK_LINES) return ['month', 'year'];
  if (visibleDays > MAX_VISIBLE_DAYS_FOR_DAY_LINES) return ['week', 'halfMonth', 'month'];
  return ['day', 'week', 'month'];
}

/** Clear ground kept between two drawn strokes.
 *
 * Two strokes closer than this do not read as two lines — they read as one
 * thick, slightly dirty one, which is what a month line and the Monday three
 * days after it look like once a year is compressed into nine inches. The
 * value is the one the levels used to derive between them when each carried
 * its own weight: twice the heaviest stroke, 1.75pt, so nothing about which
 * positions survive a collision has changed. */
export const DATE_GRID_MIN_GAP_PT = 3.5;

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
 * apart (see DATE_GRID_MIN_GAP_PT), and is resolved the same way.
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

  // The 1st and the 16th: the two boundaries the half-month zoom rules. The
  // 1st belongs to the month level as well and loses the position to it (see
  // resolveGridStrokes), which leaves this level owning the 16ths — exactly
  // the marks no other level has.
  const halfMonth = day.filter((mark) => mark.date.getUTCDate() === 1 || mark.date.getUTCDate() === 16);

  // Only true 1 Januarys — unlike the month level, this one takes no
  // range-start anchor: a year line at the very edge of the axis would sit
  // on top of the month line already there and mark nothing.
  const year = day.filter((mark) => mark.date.getUTCMonth() === 0 && mark.date.getUTCDate() === 1);

  return {
    day: levels.has('day') ? day : [],
    week: levels.has('week') ? week : [],
    halfMonth: levels.has('halfMonth') ? halfMonth : [],
    month: levels.has('month') ? month : [],
    year: levels.has('year') ? year : [],
  };
}
