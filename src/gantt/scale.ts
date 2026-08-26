import type { TimelineItem } from '../types/timeline';
import { daysBetween, MS_PER_DAY } from '../export/dateScale';

/** The three timeline scales the handoff's toolbar switches between. Named
 * for what the *header* groups by, which is the only thing that changes
 * besides the column width. */
export type TimeScale = 'day' | 'week' | 'month';

export const TIME_SCALES: TimeScale[] = ['day', 'week', 'month'];

export const TIME_SCALE_LABELS: Record<TimeScale, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
};

/** Pixels per calendar day at each scale — the handoff's own numbers, and the
 * only geometry a scale change touches ("Day / Week / Month change
 * `columnWidth` only — all geometry derives from it"). A week column is
 * therefore 106.4px and a month one 210px.
 *
 * Deliberately *not* `BASE_PX_PER_DAY`: that constant is shared with
 * `src/export/timelineExportModel.ts`, where it sets the inches-per-day of
 * every slide. The screen's scale and the slide's scale are separate
 * questions and stay separate numbers. */
export const COLUMN_WIDTH_PX: Record<TimeScale, number> = {
  day: 30,
  week: 15.2,
  month: 7,
};

/** Midnight UTC of `date`, as a Date. Every index in this module counts whole
 * UTC days, matching how the rest of the app reads date-only ISO strings. */
function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Empty days the canvas carries before its first task and after its last.
 *
 * The prototype draws a fixed 133-day window whose data runs from day 7 to
 * day 102, i.e. exactly this much air at each end. A canvas derived from the
 * items instead would end on the last task's last day, and since a drag
 * clamps to `0 … totalDays - span`, the latest task in the plan could then
 * never be dragged to the right at all. The prototype's own headroom is what
 * keeps that from being a wall. */
const CANVAS_LEAD_DAYS = 7;
const CANVAS_TRAIL_DAYS = 30;

export interface PlanRange {
  /** Day 0 of the canvas. */
  minDate: Date;
  /** Columns drawn, i.e. the handoff's `TOTAL`. */
  totalDays: number;
  /** Which column carries the today band. Always inside the canvas, since
   * the range is widened to include today. */
  todayIndex: number;
  /** The first and last columns any task actually occupies — the plan's own
   * extent, without the padding and without today's pull on it. What "a
   * sensible place to open at" is measured against: today is only worth
   * opening on if it falls between these two. */
  firstTaskIndex: number;
  lastTaskIndex: number;
}

/** The canvas the plan is drawn on: the items' own extent, widened to include
 * today.
 *
 * Today is part of the range rather than a mark that may fall off the end
 * because the handoff gives it two jobs the chart would otherwise lose — the
 * today band, and the scroll position the view opens at (`todayIndex × cw −
 * 300`, on mount and on the Today button). A plan entirely in the past or the
 * future still gets both; it just carries the empty days between. */
export function planRange(items: TimelineItem[], today: Date): PlanRange {
  const todayMidnight = utcMidnight(today);
  const stamps = items.flatMap((item) => [new Date(item.start).getTime(), new Date(item.end).getTime()]);
  const first = new Date(Math.min(todayMidnight.getTime(), ...stamps));
  const last = new Date(Math.max(todayMidnight.getTime(), ...stamps));
  const minDate = new Date(first.getTime() - CANVAS_LEAD_DAYS * MS_PER_DAY);
  const maxDate = new Date(last.getTime() + CANVAS_TRAIL_DAYS * MS_PER_DAY);

  const taskStamps = stamps.length > 0 ? stamps : [todayMidnight.getTime()];

  return {
    minDate,
    totalDays: daysBetween(minDate, maxDate) + 1,
    todayIndex: daysBetween(minDate, todayMidnight),
    firstTaskIndex: daysBetween(minDate, new Date(Math.min(...taskStamps))),
    lastTaskIndex: daysBetween(minDate, new Date(Math.max(...taskStamps))),
  };
}

/** Column index of an ISO date on a canvas starting at `minDate`. */
export function dayIndexOf(iso: string, minDate: Date): number {
  return daysBetween(minDate, new Date(iso));
}

/** The ISO date (YYYY-MM-DD) at a column index — the inverse of dayIndexOf,
 * used to write a drag or a date field back onto the item. */
export function isoAtIndex(minDate: Date, index: number): string {
  return new Date(minDate.getTime() + index * MS_PER_DAY).toISOString().slice(0, 10);
}

/** "Aug 17" — the handoff's own `fmt`, used in a bar's `title`, in the drag
 * pill, and beside a predecessor in the panel. */
export function formatDayLabel(minDate: Date, index: number): string {
  return new Date(minDate.getTime() + index * MS_PER_DAY).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** The week number the handoff's header prints: days elapsed since 1 January
 * of that year, plus one, over seven, rounded up. Not the ISO-8601 week
 * number — transcribed as the prototype computes it, so "Week 31" here says
 * what "Week 31" says there. */
function weekNumber(date: Date): number {
  const dayOfYear = (date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / MS_PER_DAY;
  return Math.ceil((dayOfYear + 1) / 7);
}

export interface HeaderCell {
  /** Column index this cell starts at — its left edge is `index × cw`. */
  index: number;
  /** How many day columns it spans. */
  days: number;
  /** The big line: "Week 31" / "03" / "August". */
  top: string;
  /** The small line under it: "Aug 17 '26" / "Mon" / "2026". */
  sub: string;
  /** Day scale only: Saturday and Sunday cells wear a tint. */
  isWeekend: boolean;
}

/** One cell per period, left to right across the whole canvas.
 *
 * Each scale groups differently, and the first cell of the week and month
 * scales is a *partial* period whenever day 0 isn't a Monday or a 1st — the
 * handoff clips it rather than starting the grid on the previous boundary, so
 * the header and the bars share one origin. */
export function buildHeaderCells(minDate: Date, totalDays: number, scale: TimeScale): HeaderCell[] {
  const cells: HeaderCell[] = [];

  if (scale === 'day') {
    for (let index = 0; index < totalDays; index += 1) {
      const date = new Date(minDate.getTime() + index * MS_PER_DAY);
      const weekday = date.getUTCDay();
      cells.push({
        index,
        days: 1,
        top: String(date.getUTCDate()).padStart(2, '0'),
        sub: date.toLocaleString('en-US', { weekday: 'short', timeZone: 'UTC' }),
        isWeekend: weekday === 0 || weekday === 6,
      });
    }
    return cells;
  }

  let index = 0;
  while (index < totalDays) {
    const date = new Date(minDate.getTime() + index * MS_PER_DAY);

    if (scale === 'week') {
      // Days left in this calendar week, counting Monday as its first day.
      const days = Math.min(7 - ((date.getUTCDay() + 6) % 7), totalDays - index);
      cells.push({
        index,
        days,
        top: `Week ${weekNumber(date)}`,
        sub: `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} '${String(
          date.getUTCFullYear(),
        ).slice(-2)}`,
        isWeekend: false,
      });
      index += days;
      continue;
    }

    // Days left in this calendar month — day 0 of the next month is the last
    // day of this one.
    const lastOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    const days = Math.min(totalDays - index, lastOfMonth - date.getUTCDate() + 1);
    cells.push({
      index,
      days,
      top: date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' }),
      sub: String(date.getUTCFullYear()),
      isWeekend: false,
    });
    index += days;
  }

  return cells;
}

/** Where the body rules a strong period line, in canvas pixels: the right
 * edge of every header cell.
 *
 * This is the whole of the header/body agreement. The bars were always on the
 * calendar's own ruler — a bar's x is `dayIndexOf(iso) × cw`, so a task that
 * starts on 1 September lands exactly on the September cell's left edge — but
 * the grid used to be ruled at a fixed period instead (`columnWidth × 30` at
 * the month scale), which is a month no calendar has. The two rulers drifted
 * apart by up to 140px, and the prototype's own grid drifts the same way.
 *
 * Ruling from the cells makes the calendar the single source: a 31-day month
 * is 31 columns wide in the header and in the grid, and the line under a
 * cell's border is the same line. */
export function periodEdges(cells: HeaderCell[], columnWidth: number): number[] {
  return cells.map((cell) => (cell.index + cell.days) * columnWidth);
}

/** The strong period rules, as one background layer.
 *
 * Cells of equal width tile from x=0, so they are a repeating gradient and one
 * paint — the day scale always, and the week scale when the canvas happens to
 * begin on a Monday and end on a Sunday. A calendar that does not tile evenly
 * — a clipped first week, months of 28 to 31 days — is spelled out stop by
 * stop instead. Either way the rules land on the header's cell edges, which is
 * the point: one ruler, not two.
 *
 * Still a background rather than a line per period, so the layer order the
 * grid is built on (day lines over period lines over row lines, all of it
 * under the weekend tint) survives a scale change untouched. */
export function periodRuleLayer(cells: HeaderCell[], columnWidth: number): string {
  const edges = periodEdges(cells, columnWidth);
  if (edges.length === 0) return '';

  if (cells.every((cell) => cell.days === cells[0].days)) {
    const period = cells[0].days * columnWidth;
    return `repeating-linear-gradient(to right, transparent 0 ${period - 1}px, var(--gantt-rule-strong) ${period - 1}px ${period}px)`;
  }

  const stops = edges.flatMap((x) => [
    `transparent ${x - 1}px`,
    `var(--gantt-rule-strong) ${x - 1}px`,
    `var(--gantt-rule-strong) ${x}px`,
    `transparent ${x}px`,
  ]);
  return `linear-gradient(to right, transparent 0, ${stops.join(', ')})`;
}

/** Column indices that start a Saturday — the left edge of each weekend
 * block, which the body tints two columns wide. Day and week scales only:
 * at 7px a day the pair is 14px and reads as noise, which is why the handoff
 * draws no weekend tint at the month scale. */
export function weekendStarts(minDate: Date, totalDays: number, scale: TimeScale): number[] {
  if (scale === 'month') return [];

  const starts: number[] = [];
  for (let index = 0; index < totalDays; index += 1) {
    if (new Date(minDate.getTime() + index * MS_PER_DAY).getUTCDay() === 6) starts.push(index);
  }
  return starts;
}
