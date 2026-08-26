import type { ExportOptions, ExportTimeframe } from '../store/timelineStore';
import {
  getTaskStatus,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  type TaskComment,
  type TaskStatus,
  type TimelineItem,
} from '../types/timeline';
import { parseMarkdownBlocks, type MarkdownBlock } from '../utils/renderMarkdown';
import { getStatusSegments, type StatusSegment } from '../utils/dashboardMetrics';
import { buildDepthMap } from '../utils/barNesting';
import { buildTaskHierarchy, type TaskNode } from '../utils/taskHierarchy';
import { phaseColor } from './theme';
import {
  daysBetween,
  BASE_PX_PER_DAY,
  formatShortDate,
  getDateRange,
  getItemBar,
} from './dateScale';
import {
  buildDateGrid,
  DATE_GRID_LEVELS,
  type DateGrid,
  type DateGridLevel,
} from './dateGrid';
import {
  estimateWrappedLines,
  measureLetterSpacingWidthIn,
  measureMonoTextWidthIn,
  measureTextWidthIn,
} from './textMetrics';
import {
  CARD_TOP_IN,
  CARD_X_IN,
  COLUMN_HEADER_HEIGHT_IN,
  COMMENT_BLOCK_GAP_IN,
  COMMENT_BODY_FONT_SIZE_PT,
  COMMENT_GAP_IN,
  COMMENT_HEADING_ROW_HEIGHT_IN,
  COMMENT_LINE_HEIGHT_IN,
  COMMENT_META_ROW_HEIGHT_IN,
  CONTENT_HEIGHT_IN,
  CONTENT_TOP_IN,
  CONTENT_X_IN,
  CONTENT_WIDTH_IN,
  DATE_LETTER_SPACING_EM,
  letterSpacingPt,
  LIST_ROW_HEIGHT_IN,
  MAX_OVERVIEW_BARS_PER_SLIDE,
  MIN_BAR_WIDTH_IN,
  OVERVIEW_BAR_HEIGHT_IN,
  OVERVIEW_NESTED_BAR_HEIGHT_IN,
  OVERVIEW_WINDOW_PAD_RATIO,
  PARENT_SECTION_GAP_IN,
  ROW_GAP_IN,
  ROW_LABEL_HEIGHT_IN,
  OVERVIEW_ROW_HEIGHT_IN,
  ROWS_AREA_TOP_IN,
  SECTION_GAP_IN,
  STATUS_ICON_SIZE_IN,
  STATUS_RIGHT_PADDING_IN,
  SUBTASK_DATE_FONT_SIZE_PT,
  SUBTASK_META_GAP_IN,
  SUBTASK_META_STATUS_GAP_IN,
  SUBTASK_STATUS_FONT_SIZE_PT,
  SUBTASK_TEXT_FONT_SIZE_PT,
  statusTextWidthIn,
  subtaskRowIndent,
  tableColumnTextWidthIn,
  tableRowHeightIn,
  TASK_CELL_PAD_IN,
  TASK_COL_WIDTH_IN,
  TASK_ICON_GAP_IN,
  TASK_NAME_FONT_SIZE_PT,
  taskCellIndent,
  TIMELINE_X_IN,
  TIMELINE_WIDTH_IN,
} from './slideLayout';

/** Shortens `text` with a trailing "..." until it measures at or under
 * `maxWidthIn` at `fontSizePt` — the shared strategy for a label sharing a
 * row with a fixed-position status text drawn independently of it: the
 * label is what gives way (truncated, never silently dropped), so the
 * shorter/higher-priority status text is never pushed into or overlapped by
 * it. A no-op when the text already fits. */
function truncateToWidth(text: string, fontSizePt: number, maxWidthIn: number): string {
  if (maxWidthIn <= 0) return '';
  if (measureTextWidthIn(text, fontSizePt) <= maxWidthIn) return text;

  const ellipsis = '...';
  if (measureTextWidthIn(ellipsis, fontSizePt) > maxWidthIn) return '';

  let end = text.length;
  while (end > 0 && measureTextWidthIn(text.slice(0, end) + ellipsis, fontSizePt) > maxWidthIn) {
    end -= 1;
  }
  return end > 0 ? text.slice(0, end) + ellipsis : ellipsis;
}

/** One time column of the chart card: an equal slice of the timeline zone,
 * captioned on two lines (`gantt-export.html:31`). Equal, not proportional to
 * the days it covers — the handoff draws `repeat(N, 1fr)` and places bars as a
 * percentage of the window, so a 28-day February column is as wide as the
 * 31-day January beside it. */
export interface OverviewColumnModel {
  /** Left edge, inches from the page's left. */
  x: number;
  width: number;
  /** The heavier line: a day number, `W3`, a month name, `Q2`. */
  top: string;
  /** The muted line under it: a weekday letter, a week-start date, `1–15`,
   * `'26`. */
  sub: string;
}

/** One row of the chart card: a task's name in the task column, its bar in the
 * timeline zone, and — unless it is a parent — the icon its status is read
 * from. Every row of every slide is OVERVIEW_ROW_HEIGHT_IN tall; `rowHeight`
 * is carried so a renderer and the coverage audit read one number rather than
 * each reaching for the constant. */
export interface OverviewBarModel {
  id: string;
  label: string;
  labelX: number;
  labelWidth: number;
  /** Parents are set in the heavier weight, exactly as the handoff sets a
   * phase (`:101` against `:142`). */
  labelBold: boolean;
  /** The status this row's icon states, or null for a parent — whose status is
   * its children's, and which the handoff draws no icon for. */
  icon: TaskStatus | null;
  iconX: number;
  /** The colour of the branch this task belongs to (see buildPhaseColors),
   * hex without '#'. */
  color: string;
  /** 1 for a top-level bar, the palette's tint for anything nested. */
  fillAlpha: number;
  /** The row's own box: its top edge and the height it shares out of the card. */
  y: number;
  rowHeight: number;
  barX: number;
  barY: number;
  barHeight: number;
  barWidth: number;
  /** True when the task's real start/end falls outside the export timeframe
   * window, so the bar is drawn clipped at that edge with a chevron marker. */
  chevronLeft: boolean;
  chevronRight: boolean;
}

// One vertical rule behind the bars: a column boundary, which is also a real
// calendar date at a real level. `level` is carried for the coverage audit,
// which holds every stroke to being a mark its window's calendar actually has
// — see auditGrid. Nothing is drawn from it: the handoff rules every boundary
// as the same 1px hairline.
export interface OverviewGridLineModel {
  /** The calendar day this stroke marks, yyyy-mm-dd. */
  date: string;
  level: DateGridLevel;
  x: number;
}

export interface OverviewSlideModel {
  kind: 'overview';
  title: string;
  // The line beside the title used to name this slide's own span ("5 months ·
  // Aug 01 – Dec 31, 2028"), and the right of the legend row named the zoom
  // ("Zoom: months"). Both are gone: the window is one window for the whole
  // deck now, so a per-slide caption had nothing left to say that the axis
  // does not, and the customer asked for the deck's mark in that slot. The
  // mark is chrome — drawn by both engines, not carried here.
  columns: OverviewColumnModel[];
  /** The vertical rule between the task column and the timeline, and the
   * hairline under the column header. Both null on an empty slide. */
  dividerX: number | null;
  headerRuleY: number | null;
  /** Where the "today" rule falls, or null when today is outside the window. */
  todayX: number | null;
  gridLines: OverviewGridLineModel[];
  bars: OverviewBarModel[];
  // The date span this slide's axis covers, yyyy-mm-dd, or null when the slide
  // draws nothing. Carried for the same reason the grid lines carry their
  // dates: it is what an audit needs to say whether the grid matches the
  // window, and no renderer reads it.
  windowStart: string | null;
  windowEnd: string | null;
  // The day count the grid's density tier was chosen from — the widest
  // window's, shared by every slide (see OverviewAxis.tierDays).
  windowTierDays: number | null;
  // --- what this overview leaves out ------------------------------------------
  // Two different facts, kept apart because conflating them is what made the
  // old single count unverifiable: a task can be missing from the *overview*
  // (still in the appendix, so nothing is lost) or missing from the *file*
  // (genuinely gone). All three fields are carried on the last overview slide
  // only — 'full' mode's pages each draw a subset, so a per-page count would
  // count the same task once per page it isn't on instead of once per deck.
  omittedFromOverviewCount: number;
  absentTaskCount: number;
  omittedNote: string | null;
}

/** One subtask line on a detail slide. The left side used to be a single
 * pre-joined string ("name  —  2026-08-20 → 2026-08-28") drawn in one call;
 * it's split into separately-positioned pieces now because each carries its
 * own typographic role — the name is the content, the dates are monospace —
 * and neither engine can vary the face mid-string at a position the other
 * could reproduce. Same approach as OverviewBarTagModel: the model resolves x
 * for every piece so a renderer only has to draw. */
export interface SubtaskRowModel {
  /** Which task this row *is*. Carried for exactly the reason
   * DetailSectionModel.taskId is — nothing about the row is drawn from it —
   * so a caller can resolve "did task X reach the file, and on which slide"
   * from the finished models rather than by matching a truncated label. */
  taskId: string;
  /** Nesting depth *within this section*: 0 for a direct child of the
   * section's parent, 1 for a grandchild, and so on. The row's indent is
   * derived from it through the same barNesting ladder the screen uses, so a
   * text row with no bar of its own still shows which level it belongs to. */
  depth: number;
  /** Task name, already truncated to whatever room the rest of the row left. */
  label: string;
  labelX: number;
  /** "Aug 20 – Aug 28", drawn in the monospace face. */
  dateText: string;
  dateX: number;
  statusText: string;
  statusColor: string;
  y: number;
}

export interface CommentMetaModel {
  text: string;
  y: number;
}

// One parsed markdown block (heading/paragraph/list/table — see
// src/utils/renderMarkdown.ts) positioned within a comment's body.
export type CommentBlockRowModel = MarkdownBlock & { y: number; height: number };

export interface CommentModel {
  // Omitted when a comment's blocks were split across a "(continued)"
  // overflow slide (see expandCandidateToChunks) — the meta line (date/pin)
  // only appears once, alongside the first fragment.
  meta?: CommentMetaModel;
  blocks: CommentBlockRowModel[];
}

export interface DetailSectionModel {
  // The parent task this section documents. Carried through purely so a
  // renderer can resolve "which slide holds task X's detail" from the final
  // deck order (see slideLinks.ts) — nothing about the section is drawn from
  // it. A parent split across "(continued)" sections repeats the same id.
  taskId: string;
  parentTitle: string;
  parentTitleY: number;
  subtasksHeadingY?: number;
  subtasks: SubtaskRowModel[];
  commentsHeadingY?: number;
  commentsHeadingText?: string;
  comments: CommentModel[];
}

export interface DetailSlideModel {
  kind: 'detail';
  title: string;
  sections: DetailSectionModel[];
}

export type SummarySegmentModel = StatusSegment;

export interface SummaryStatModel {
  label: string;
  value: string;
}

export interface SummarySlideModel {
  kind: 'summary';
  title: string;
  segments: SummarySegmentModel[];
  stats: SummaryStatModel[];
}

export type ExportSlideModel = OverviewSlideModel | DetailSlideModel | SummarySlideModel;

/** How to handle more in-range top-level tasks than fit on one overview
 * slide: 'compact' keeps the single slide and notes the rest as omitted in
 * the footer, 'full' splits them across as many overview slides as needed.
 * Only meaningful when there's an overflow at all — with everything fitting,
 * both modes produce the same single slide. */
export type ExportMode = 'compact' | 'full';

function buildSummarySlide(items: TimelineItem[]): SummarySlideModel {
  const segments = getStatusSegments(items);
  const total = items.length;
  const done = segments.find((segment) => segment.status === 'done');

  return {
    kind: 'summary',
    title: 'Summary',
    segments,
    stats: [
      { label: 'Total tasks', value: `${total}` },
      { label: 'Completed', value: `${done?.count ?? 0} (${done?.percent ?? 0}%)` },
    ],
  };
}

/** The zoom levels the handoff draws, and the column each rules at.
 *
 * The app has no zoom control and this branch does not add one, so the level
 * is read off the window the deck is drawn against: the widest window of the
 * export, which is the one whose density every slide shares. The bands are the
 * points where a column stops being legible at the 24px floor — 13 weeks fit a
 * quarter, 12 half-months fit half a year, 12 months fit a year and a half. */
export type SlideZoom = 'days' | 'weeks' | 'halfMonths' | 'months' | 'quarters';

export function slideZoomFor(days: number): SlideZoom {
  if (days <= 45) return 'days';
  if (days <= 130) return 'weeks';
  if (days <= 200) return 'halfMonths';
  if (days <= 550) return 'months';
  return 'quarters';
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Monday-first initials, the single letter a 46px day column can hold. */
const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** True when `date` opens a column at this zoom. */
function isColumnStart(zoom: SlideZoom, date: Date): boolean {
  const day = date.getUTCDate();
  switch (zoom) {
    case 'days':
      return true;
    case 'weeks':
      return date.getUTCDay() === 1;
    case 'halfMonths':
      return day === 1 || day === 16;
    case 'months':
      return day === 1;
    case 'quarters':
      return day === 1 && date.getUTCMonth() % 3 === 0;
  }
}

/** The dates that open a column, across the whole ruled zone.
 *
 * The window's own first day always opens one, whether or not the calendar
 * agrees: a window the reader chose in the export settings can start anywhere,
 * and a first column labelled by the day it actually starts on is truer than
 * one silently widened to the nearest boundary. */
function columnStarts(zoom: SlideZoom, minDate: Date, zoneDays: number): Date[] {
  const starts: Date[] = [];
  for (let offset = 0; offset < zoneDays; offset += 1) {
    const date = addDays(minDate, offset);
    if (offset === 0 || isColumnStart(zoom, date)) starts.push(date);
  }
  return starts;
}

/** A column's two caption lines (gantt-export.html:31, and the zoom table in
 * the handoff's README). */
function columnCaption(zoom: SlideZoom, date: Date, index: number): { top: string; sub: string } {
  const month = MONTH_NAMES[date.getUTCMonth()];
  const year = `'${String(date.getUTCFullYear()).slice(2)}`;

  switch (zoom) {
    case 'days':
      return {
        top: String(date.getUTCDate()).padStart(2, '0'),
        sub: WEEKDAY_INITIALS[date.getUTCDay()],
      };
    case 'weeks':
      return { top: `W${index + 1}`, sub: `${month} ${date.getUTCDate()}` };
    case 'halfMonths':
      return { top: month, sub: date.getUTCDate() < 16 ? '1–15' : '16–end' };
    case 'months':
      return { top: month, sub: year };
    case 'quarters':
      return { top: `Q${Math.floor(date.getUTCMonth() / 3) + 1}`, sub: year };
  }
}

/** The strongest level of `calendar` that claims `date`, or null when none
 * does. A column boundary is drawn as a grid stroke only if it is a mark the
 * calendar actually has — which is what lets the coverage audit hold every
 * stroke to a real date at a real level (see auditGrid). */
function levelOfDate(date: Date, calendar: DateGrid): DateGridLevel | null {
  const iso = date.toISOString().slice(0, 10);
  let found: DateGridLevel | null = null;
  DATE_GRID_LEVELS.forEach((level) => {
    if (calendar[level].some((mark) => mark.date.toISOString().slice(0, 10) === iso)) found = level;
  });
  return found;
}

/** The colour of every task's bar, keyed by task id.
 *
 * Colour means branch, not status: a root takes the next colour of the phase
 * palette (or its own `color`, which is a choice someone made), and everything
 * under it inherits that colour whatever colour it carries itself — a subtree
 * drawn in four colours would say nothing about what belongs to what. Status
 * is the icon beside the name instead.
 *
 * Built once for the whole export, from the whole exportable set, so a task
 * keeps its colour whichever page of a 'full' export it lands on. */
export function buildPhaseColors(items: TimelineItem[]): Map<string, PhaseColor> {
  const { roots } = buildTaskHierarchy(items);
  const colors = new Map<string, PhaseColor>();

  roots.forEach((root, index) => {
    const color = phaseColor(index, root.item.color?.trim() || undefined);
    const paint = (node: TaskNode) => {
      colors.set(node.item.id, color);
      node.children.forEach(paint);
    };
    paint(root);
  });

  return colors;
}

export interface PhaseColor {
  solid: string;
  tintAlpha: number;
}

/** The items that overlap the given export timeframe window (any part of the
 * task's real date span inside the window counts). With no timeframe, every
 * item is "in range" — the window is implicitly the full date span of the
 * items themselves. */
export function getItemsInTimeframe(
  candidateItems: TimelineItem[],
  timeframe: ExportTimeframe | null,
): TimelineItem[] {
  if (!timeframe) return candidateItems;

  const windowStart = new Date(timeframe.start).getTime();
  const windowEnd = new Date(timeframe.end).getTime();

  return candidateItems.filter((item) => {
    const start = new Date(item.start).getTime();
    const end = new Date(item.end).getTime();
    return start <= windowEnd && end >= windowStart;
  });
}

export interface OverviewPlan {
  /** Candidate items that overlap the effective date range, before truncation. */
  inRange: TimelineItem[];
  /** How many of those actually fit on the single overview slide. */
  capacity: number;
  /** The (possibly truncated) items that will actually be drawn. */
  included: TimelineItem[];
}

/** Overview is always a single slide: this decides which of the in-range
 * items fit (first `MAX_OVERVIEW_BARS_PER_SLIDE`, in their current sort order)
 * so a caller can warn the user before truncating anything.
 *
 * Fed every exportable task, at every depth — the overview draws subtasks as
 * bars too, so counting only the roots here would let the pre-flight check tell
 * the user everything fits and then hand them a truncated slide. */
export function planOverview(candidateItems: TimelineItem[], timeframe: ExportTimeframe | null): OverviewPlan {
  const inRange = getItemsInTimeframe(candidateItems, timeframe);
  return {
    inRange,
    capacity: MAX_OVERVIEW_BARS_PER_SLIDE,
    included: inRange.slice(0, MAX_OVERVIEW_BARS_PER_SLIDE),
  };
}

/** The date span one overview slide is drawn against. */
interface OverviewWindow {
  minDate: Date;
  maxDate: Date;
}

/** A slide's own window, plus the density every slide of the export shares.
 *
 * The two halves are deliberately separate. The *window* is per slide, because
 * a slide holding one quarter of a three-year plan drawn against the whole
 * plan's axis puts its bars in the last inch and leaves the rest blank. The
 * *density* is shared, because a bar's length is the only thing on these
 * slides that says how long a task takes: if each slide stretched its own
 * window to the full width, a two-week task would be a stub on one slide and
 * half the slide wide on the next, and no two slides could be compared.
 *
 * A narrower window therefore does not stretch — it starts at the left edge of
 * the timeline zone, runs at the shared density, and stops wherever it ends. */
interface OverviewAxis extends OverviewWindow {
  /** Inches per BASE_PX_PER_DAY pixel. Identical on every slide. */
  scale: number;
  /** How many days a *full* timeline width holds at this density — which is
   * the widest window's own length, and therefore the same on every slide.
   *
   * This, not the slide's own day count, is what the grid's density tier has
   * to be chosen from. The tier answers "how close together would these lines
   * land", and at a shared density that is a property of the density, not of
   * how much of the width this particular slide happens to use: a 112-day
   * window drawn across half an inch has its Mondays 2pt apart, and calling
   * that a week-level range because 112 < 365 produces a comb, not a grid. */
  tierDays: number;
  /** The column granularity every slide of this export is ruled at, read off
   * `tierDays` — see slideZoomFor. */
  zoom: SlideZoom;
}

function addDays(date: Date, days: number): Date {
  const moved = new Date(date.getTime());
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved;
}

/** Widens a window outward until both edges open a column at `zoom`.
 *
 * A slide whose first column is a stub of two days out of a month reads as a
 * chart that starts mid-column; widening is the smaller lie, and it is the one
 * the handoff tells (each of its slides carries a whole number of columns).
 * A day-level window is already on whole columns and needs no move. */
function snapWindowToZoom(window: OverviewWindow, zoom: SlideZoom): OverviewWindow {
  if (zoom === 'days') return window;

  let minDate = window.minDate;
  while (!isColumnStart(zoom, minDate)) minDate = addDays(minDate, -1);

  let maxDate = window.maxDate;
  while (!isColumnStart(zoom, addDays(maxDate, 1))) maxDate = addDays(maxDate, 1);

  return { minDate, maxDate };
}

/** The one axis every overview slide of the deck is drawn against.
 *
 * **One window, repeated on every slide** — from the first day of the plan to
 * the last, whatever any individual slide happens to carry. This reverses the
 * earlier per-slide window (branch `fix/per-slide-timeframe`, and the section
 * it wrote in docs/export-sort.md): there each slide took a window from its own
 * tasks, so a bar's position on slide 3 meant nothing against a bar on slide 4.
 *
 * The customer asked for the shared window and accepted its cost, which is
 * real and visible: a slide whose tasks all sit late in the plan draws them
 * against an axis that starts at the plan's beginning, so the left half of
 * that slide is empty track. That is the trade — a slide reads less densely,
 * and any two slides of the deck can be laid side by side and compared. See
 * Phase 5 in docs/export-handoff-map.md before "fixing" this back.
 *
 * An explicit export timeframe is the same shape of thing — one window for the
 * deck — except that the reader chose it, so it is used exactly as given and
 * not padded or snapped. */
function buildOverviewAxes(
  pages: TimelineItem[][],
  timeframe: ExportTimeframe | null,
): (OverviewAxis | null)[] {
  const axisFor = (minDate: Date, maxDate: Date): OverviewAxis => {
    const tierDays = daysBetween(minDate, maxDate) + 1;
    return {
      minDate,
      maxDate,
      // The window fills the timeline zone exactly. Every slide shares it, so
      // every slide shares one inches-per-day and one set of columns.
      scale: TIMELINE_WIDTH_IN / (tierDays * BASE_PX_PER_DAY),
      tierDays,
      zoom: slideZoomFor(tierDays),
    };
  };

  // A window the reader chose is drawn exactly as chosen — not snapped to a
  // column boundary, which would quietly widen the setting.
  if (timeframe) {
    const axis = axisFor(new Date(timeframe.start), new Date(timeframe.end));
    return pages.map((page) => (page.length > 0 ? axis : null));
  }

  const drawnItems = pages.flat();
  if (drawnItems.length === 0) return pages.map(() => null);

  const range = getDateRange(drawnItems);
  // Breathing room either side of the plan, as a fraction of the plan's own
  // span — one window now, so there is no longer a "widest" to measure it off.
  const padDays = Math.max(1, Math.round(range.totalDays * OVERVIEW_WINDOW_PAD_RATIO));
  const padded = {
    minDate: addDays(range.minDate, -padDays),
    maxDate: addDays(range.maxDate, padDays),
  };
  // Snapping can only move an edge by less than one column, so the zoom is
  // read off the padded span before the snap and the snap cannot invalidate it.
  const zoom = slideZoomFor(range.totalDays + padDays * 2);
  const window = snapWindowToZoom(padded, zoom);

  const axis = axisFor(window.minDate, window.maxDate);
  return pages.map((page) => (page.length > 0 ? axis : null));
}

/** Lays out one overview slide to the export handoff: a title with the window
 * beside it, the status legend, then a card holding a column header and one
 * row per task.
 *
 * The rows share the card's height (the handoff's `flex:1`), the columns are
 * equal slices of the timeline zone, and a bar is placed by the fraction of
 * the window its dates cover — never by column index, so a task's length is
 * readable against any other task's on any slide of the deck. */
function buildOverviewSlide(
  items: TimelineItem[],
  axis: OverviewAxis | null,
  title: string,
  omission: OverviewOmission,
  depthById: ReadonlyMap<string, number>,
  colorByTaskId: ReadonlyMap<string, PhaseColor>,
  parentIds: ReadonlySet<string>,
  today: Date,
): OverviewSlideModel {
  const bars: OverviewBarModel[] = [];
  const windowStart = axis && items.length > 0 ? axis.minDate.toISOString().slice(0, 10) : null;
  const windowEnd = axis && items.length > 0 ? axis.maxDate.toISOString().slice(0, 10) : null;
  const windowTierDays = axis && items.length > 0 ? axis.tierDays : null;
  let gridLines: OverviewGridLineModel[] = [];
  let columns: OverviewColumnModel[] = [];
  let headerRuleY: number | null = null;
  let dividerX: number | null = null;
  let todayX: number | null = null;

  if (axis && items.length > 0) {
    const { minDate, scale, tierDays, zoom } = axis;
    // The deck's one window, so this is the whole timeline zone on every
    // slide. Kept as its own name because everything below clamps against it.
    const windowWidthIn = tierDays * BASE_PX_PER_DAY * scale;

    const gridEnd = addDays(minDate, tierDays - 1);
    const calendar = buildDateGrid(minDate, gridEnd, tierDays);
    const starts = columnStarts(zoom, minDate, tierDays);
    const columnWidth = TIMELINE_WIDTH_IN / starts.length;

    columns = starts.map((date, index) => ({
      x: TIMELINE_X_IN + index * columnWidth,
      width: columnWidth,
      ...columnCaption(zoom, date, index),
    }));

    // One stroke per column boundary, and the first boundary is the divider
    // between the task column and the zone — drawn once, as that divider.
    gridLines = starts.slice(1).flatMap((date, index) => {
      const level = levelOfDate(date, calendar);
      if (level === null) return [];
      return [
        {
          date: date.toISOString().slice(0, 10),
          level,
          x: TIMELINE_X_IN + (index + 1) * columnWidth,
        },
      ];
    });

    headerRuleY = CARD_TOP_IN + COLUMN_HEADER_HEIGHT_IN;
    dividerX = TIMELINE_X_IN;

    // Every slide shares one window, so the rule is on every slide or on
    // none: today either falls inside the plan's own span, and each overview
    // slide marks it at the same x, or it falls outside — a plan wholly in the
    // future, or one that finished before today — and no slide of the deck
    // draws it at all. There is no longer a middle case where the same day is
    // on slide 2 and off slide 3.
    const todayIn = daysBetween(minDate, today) * BASE_PX_PER_DAY * scale;
    todayX = todayIn >= 0 && todayIn <= windowWidthIn ? TIMELINE_X_IN + todayIn : null;

    // One pitch, fixed, on every slide — not the card's height shared out. A
    // slide carrying fewer than MAX_OVERVIEW_BARS_PER_SLIDE rows therefore
    // leaves the bottom of its card empty, which is the trade the customer
    // accepted for two slides being comparable (see OVERVIEW_ROW_HEIGHT_IN).
    const rowHeight = OVERVIEW_ROW_HEIGHT_IN;
    let y = ROWS_AREA_TOP_IN;

    items.forEach((item) => {
      const { left, width } = getItemBar(item, minDate, BASE_PX_PER_DAY);

      // Raw (unclamped) horizontal extent, in inches from TIMELINE_X_IN — used
      // only to detect whether the real task dates spill outside the window.
      const rawLeftIn = left * scale;
      const rawRightIn = (left + width) * scale;
      const chevronLeft = rawLeftIn < -0.001;
      const chevronRight = rawRightIn > windowWidthIn + 0.001;

      const clippedLeftIn = Math.max(rawLeftIn, 0);
      const clippedRightIn = Math.min(rawRightIn, windowWidthIn);

      const maxLeftIn = Math.max(0, windowWidthIn - MIN_BAR_WIDTH_IN);
      const barX = TIMELINE_X_IN + Math.min(clippedLeftIn, maxLeftIn);
      const maxBarWidth = Math.max(MIN_BAR_WIDTH_IN, TIMELINE_X_IN + windowWidthIn - barX);
      const windowClippedWidth = Math.max(clippedRightIn - (barX - TIMELINE_X_IN), 0);
      const barWidth = Math.min(Math.max(windowClippedWidth, MIN_BAR_WIDTH_IN), maxBarWidth);

      // Nesting is judged against the items the overview draws *in total*, not
      // against this page's slice of them: a task merely separated from its
      // parent by a page break keeps its level.
      const depth = depthById.get(item.id) ?? 0;
      const isParent = parentIds.has(item.id);
      const barHeight = depth === 0 ? OVERVIEW_BAR_HEIGHT_IN : OVERVIEW_NESTED_BAR_HEIGHT_IN;
      const color = colorByTaskId.get(item.id) ?? phaseColor(0, undefined);

      // A parent wears no icon, exactly as the handoff draws a phase: its
      // status is its children's, and the children state it themselves one row
      // down. A childless task states its own, whatever its depth — which is
      // the difference between "phase" in the handoff and "root" here.
      const indentIn = taskCellIndent(depth);
      const iconX = CARD_X_IN + indentIn;
      const labelX = isParent ? iconX : iconX + STATUS_ICON_SIZE_IN + TASK_ICON_GAP_IN;
      const labelWidth = CARD_X_IN + TASK_COL_WIDTH_IN - TASK_CELL_PAD_IN - labelX;

      bars.push({
        id: item.id,
        label: truncateToWidth(item.label, TASK_NAME_FONT_SIZE_PT, labelWidth),
        labelX,
        labelWidth,
        labelBold: isParent,
        icon: isParent ? null : getTaskStatus(item),
        iconX,
        color: color.solid,
        fillAlpha: depth === 0 ? 1 : color.tintAlpha,
        y,
        rowHeight,
        barX,
        barY: y + (rowHeight - barHeight) / 2,
        barHeight,
        barWidth,
        chevronLeft,
        chevronRight,
      });

      y += rowHeight;
    });
  }

  return {
    kind: 'overview',
    title,
    columns,
    dividerX,
    headerRuleY,
    todayX,
    gridLines,
    bars,
    windowStart,
    windowEnd,
    windowTierDays,
    ...omission,
  };
}

/** The three "what's left out" fields of an overview slide, resolved together
 * because the note is a sentence about the two counts. */
type OverviewOmission = Pick<
  OverviewSlideModel,
  'omittedFromOverviewCount' | 'absentTaskCount' | 'omittedNote'
>;

/** An overview slide that leaves nothing out — every page but the last. */
const NO_OMISSION: OverviewOmission = {
  omittedFromOverviewCount: 0,
  absentTaskCount: 0,
  omittedNote: null,
};

/** What the footer says about the roots this overview didn't draw.
 *
 * The distinction the sentence carries is the whole point: a task past a
 * compact slide's capacity is still in the Subtasks & Comments appendix, and
 * saying so is more use to a reader than the old "narrow the export timeframe"
 * advice, which pointed at the timeframe whatever the cause. A task with no
 * appendix section either is genuinely not in the file, and that is the one the
 * reader has to be told about — it is the last way a task can otherwise vanish
 * without trace (see docs/export-coverage.md). */
function resolveOmission(notDrawn: TimelineItem[], sectionedIds: ReadonlySet<string>): OverviewOmission {
  const absent = notDrawn.filter((item) => !sectionedIds.has(item.id));
  const omittedFromOverviewCount = notDrawn.length;
  const absentTaskCount = absent.length;

  if (omittedFromOverviewCount === 0) return NO_OMISSION;

  const inAppendix = omittedFromOverviewCount - absentTaskCount;
  const taskWord = omittedFromOverviewCount === 1 ? 'task' : 'tasks';
  const absentWord = absentTaskCount === 1 ? 'task' : 'tasks';

  const omittedNote =
    absentTaskCount === 0
      ? `+${omittedFromOverviewCount} ${taskWord} not on the overview - see the Subtasks & Comments appendix`
      : inAppendix === 0
        ? `+${absentTaskCount} ${absentWord} not in this export - outside the export timeframe`
        : `+${omittedFromOverviewCount} ${taskWord} not on the overview: ${inAppendix} in the appendix, ${absentTaskCount} not in this export`;

  return { omittedFromOverviewCount, absentTaskCount, omittedNote };
}

/** The overview slides for an export: one truncated slide in 'compact' mode
 * (and whenever everything fits anyway), or the in-range items split across
 * one slide per `plan.capacity` in 'full' mode, titled "… (1/N)". Every
 * slide shares one date window, so bar positions mean the same thing on
 * each. */
function buildOverviewSlides(
  plan: OverviewPlan,
  timeframe: ExportTimeframe | null,
  exportMode: ExportMode,
  candidateItems: TimelineItem[],
  sectionedIds: ReadonlySet<string>,
  today: Date,
): OverviewSlideModel[] {
  const isPaged = exportMode === 'full' && plan.inRange.length > plan.capacity;
  const drawnItems = isPaged ? plan.inRange : plan.included;

  // Judged against every exportable task, not just the in-range ones, so a task
  // the timeframe filtered out is counted the same as one that didn't fit.
  const drawnIds = new Set(drawnItems.map((item) => item.id));
  const omission = resolveOmission(
    candidateItems.filter((item) => !drawnIds.has(item.id)),
    sectionedIds,
  );

  // One depth answer for the whole overview, resolved from the set the overview
  // actually draws and then shared by every page of it.
  //
  // Judged against `drawnItems` rather than against the plan, so the existing
  // rule survives: a task whose parent the timeframe excluded, or whose parent
  // the compact cut dropped, has no parent on the overview and is drawn as a
  // root. Judged *once* rather than per page, so the other way a parent can go
  // missing — the page break between them — does not also reset a subtask to
  // full height, which would make nesting read as pagination.
  const depthById = buildDepthMap(drawnItems);
  // Colour by branch, and "is this a parent", both resolved from the drawn set
  // for the same reason depth is: a page break must not repaint a task or turn
  // a phase into a leaf.
  const colorByTaskId = buildPhaseColors(drawnItems);
  const parentIds = new Set(
    drawnItems.flatMap((item) => (item.parentId === undefined ? [] : [item.parentId])),
  );

  // Paged by the same capacity the row height derives (see
  // MAX_OVERVIEW_BARS_PER_SLIDE): a page holds as many rows as fit at the
  // deck's one row pitch, and the last page holds whatever is left — which is
  // the page the customer's example, half-filled slide 34, is.
  const pages: TimelineItem[][] = [];
  if (isPaged) {
    for (let i = 0; i < drawnItems.length; i += plan.capacity) {
      pages.push(drawnItems.slice(i, i + plan.capacity));
    }
  } else {
    pages.push(drawnItems);
  }

  const axes = buildOverviewAxes(pages, timeframe);

  if (!isPaged) {
    return [
      buildOverviewSlide(
        drawnItems,
        axes[0],
        'Timeline Overview',
        omission,
        depthById,
        colorByTaskId,
        parentIds,
        today,
      ),
    ];
  }

  return pages.map((pageItems, index) =>
    buildOverviewSlide(
      pageItems,
      axes[index],
      `Timeline Overview (${index + 1}/${pages.length})`,
      // The note belongs on the last page — a closing footnote, not something
      // repeated under every page — and the counts go with it so they stay
      // summable across the deck.
      index === pages.length - 1 ? omission : NO_OMISSION,
      depthById,
      colorByTaskId,
      parentIds,
      today,
    ),
  );
}

/** One task listed under a parent's "Subtasks" heading, with its nesting
 * depth *relative to that parent* (0 = a direct child, 1 = a grandchild).
 *
 * The depth is read out of the export's depth map (buildDepthMap) rather than
 * counted again while walking the tree: the screen, the overview bars and these
 * rows then all answer "how deep is this task" from one place, which is the
 * only way the three surfaces can be guaranteed to indent alike. */
interface DetailDescendant {
  item: TimelineItem;
  depth: number;
}

interface DetailCandidate {
  parent: TimelineItem;
  /** The parent's *whole* subtree in pre-order, at any depth — not just its
   * direct children. Only roots become candidates, so a grandchild has no
   * section of its own: if it is not in here, it reaches no slide at all. */
  descendants: DetailDescendant[];
  relevantComments: TaskComment[];
  /** Every comment the task has, not just the ones commentMode kept — so a
   * section showing a subset can say so in its heading rather than quietly
   * showing fewer (see buildCommentsHeading). */
  totalComments: number;
}

/** A parent node's whole subtree in pre-order: every descendant at any depth,
 * each with its depth relative to that parent.
 *
 * Depth is read out of `depthById`, not counted while walking. That map is what
 * the on-screen chart and the overview bars indent from as well
 * (buildDepthMap), so using the walk's own counter here would be a second,
 * independent answer to the same question — which is exactly the drift one
 * shared map exists to prevent. */
function collectSubtreeRows(node: TaskNode, depthById: Map<string, number>): DetailDescendant[] {
  const parentDepth = depthById.get(node.item.id) ?? 0;
  const rows: DetailDescendant[] = [];

  const visit = (parent: TaskNode) => {
    parent.children.forEach((child) => {
      const absoluteDepth = depthById.get(child.item.id) ?? parentDepth + 1;
      rows.push({ item: child.item, depth: absoluteDepth - parentDepth - 1 });
      visit(child);
    });
  };
  visit(node);

  return rows;
}

/** One comment's meta line (shown only alongside its first fragment — see
 * expandCandidateToChunks) plus a slice of its parsed markdown blocks. A
 * comment normally has exactly one fragment; it's split into more only when
 * its blocks don't all fit in one chunk. */
interface CommentFragment {
  comment: TaskComment;
  blocks: MarkdownBlock[];
  showMeta: boolean;
}

/** One self-contained chunk of a parent's detail content: a slice of its
 * subtree's rows + a slice of its comments' fragments. One chunk
 * per parent whenever everything fits on a slide; otherwise the content
 * spills into "(continued)" chunks that repeat the parent's title, so
 * nothing is ever cut off instead of continuing on a new slide:
 *   - subtree rows split at *branch* boundaries (see splitIntoBranches), so a
 *     break never separates a task from its own descendants;
 *   - comments split at markdown-block boundaries within a comment.
 * A chunk is guaranteed to fit CONTENT_HEIGHT_IN on its own, which is what
 * lets the exporters draw one without any pagination logic of their own. */
interface DetailChunk {
  taskId: string;
  parentTitle: string;
  rows: DetailDescendant[];
  commentFragments: CommentFragment[];
  commentsHeadingText: string;
}

const COMMENT_BODY_X_INDENT_IN = 0.2;
const COMMENT_BODY_WIDTH_IN = CONTENT_WIDTH_IN - COMMENT_BODY_X_INDENT_IN;
const COMMENT_LIST_BULLET_INDENT_IN = 0.2;

/** Estimates one markdown block's rendered height. Used both to lay out a
 * comment's blocks (layoutMarkdownBlocks) and, at the same per-block
 * granularity, to decide where a comment needs to be split across slides
 * (expandCandidateToChunks) — the two always agree on what fits. */
function estimateBlockHeight(block: MarkdownBlock): number {
  if (block.type === 'heading') return COMMENT_HEADING_ROW_HEIGHT_IN;

  if (block.type === 'paragraph') {
    return estimateWrappedLines(block.text, COMMENT_BODY_FONT_SIZE_PT, COMMENT_BODY_WIDTH_IN) * COMMENT_LINE_HEIGHT_IN;
  }

  if (block.type === 'list') {
    const totalLines = block.items.reduce(
      (sum, item) =>
        sum + estimateWrappedLines(item, COMMENT_BODY_FONT_SIZE_PT, COMMENT_BODY_WIDTH_IN - COMMENT_LIST_BULLET_INDENT_IN),
      0,
    );
    return Math.max(totalLines, 1) * COMMENT_LINE_HEIGHT_IN;
  }

  // Measured cell by cell through the same helper the dashboard's own tables
  // use (tableRowHeightIn): the tallest cell decides the row, because a row
  // estimated at one line is exactly how a table ends up taller than the space
  // reserved for it.
  const columnWidth = tableColumnTextWidthIn(COMMENT_BODY_WIDTH_IN, block.headers.length);
  const rowHeight = (cells: string[]) => tableRowHeightIn(cells, columnWidth);

  return rowHeight(block.headers) + block.rows.reduce((total, row) => total + rowHeight(row), 0);
}

/** Lays out one comment fragment's blocks starting at `startY`, using the
 * same additive-height approach as the rest of a detail section: each
 * block's height is estimated from its content and type, then blocks stack
 * with a small gap between them. */
function layoutMarkdownBlocks(blocks: MarkdownBlock[], startY: number): { rows: CommentBlockRowModel[]; endY: number } {
  let y = startY;
  const rows: CommentBlockRowModel[] = [];

  blocks.forEach((block, index) => {
    if (index > 0) y += COMMENT_BLOCK_GAP_IN;
    const height = estimateBlockHeight(block);
    rows.push({ ...block, y, height });
    y += height;
  });

  return { rows, endY: y };
}

/** Lays out one parent's subtasks/comments block starting at `startY`,
 * returning both the section model (with absolute Y coordinates) and the Y
 * where it ends — so a caller can measure a section's height (by calling
 * with startY = 0) before deciding whether it fits on the current slide, or
 * stack several sections on one slide by chaining `endY` into the next
 * section's `startY`. */
function buildDetailSection(
  chunk: DetailChunk,
  startY: number,
): { section: DetailSectionModel; endY: number } {
  let y = startY;
  const parentTitleY = y;
  y += ROW_LABEL_HEIGHT_IN + ROW_GAP_IN;

  const subtasks: SubtaskRowModel[] = [];
  let subtasksHeadingY: number | undefined;

  if (chunk.rows.length > 0) {
    subtasksHeadingY = y;
    y += ROW_LABEL_HEIGHT_IN + ROW_GAP_IN;

    chunk.rows.forEach(({ item: child, depth }) => {
      const status = getTaskStatus(child);
      const statusText = TASK_STATUS_LABELS[status];

      // Same collision to guard against as an overview bar's label/status
      // (see truncateToWidth): the row's label is the flexible part, so it's
      // what gets truncated — the trailing dates and the status
      // both stay intact and fully readable. Dates use formatShortDate (the
      // same "Aug 20" the on-screen day header and overview axis already
      // use) rather than the raw ISO string — no year, short month, so the
      // fixed non-truncatable tail stays as narrow as possible.
      //
      // Each trailing piece is measured in the face and size it's actually
      // drawn in: the dates monospace (measureMonoTextWidthIn — the
      // proportional table would under-reserve them by ~16%), the status
      // proportional *plus* its tracking, which neither engine folds into
      // its own metrics.
      const dateText = `${formatShortDate(new Date(child.start))} – ${formatShortDate(new Date(child.end))}`;

      // Depth is drawn as indent, from the same barNesting ladder the
      // on-screen label column steps by (see subtaskRowIndent). These rows
      // have no bar whose height could carry the nesting instead, so without
      // the indent a three-level subtree reads as one flat list.
      const rowIndentIn = subtaskRowIndent(depth);

      const dateWidth = measureMonoTextWidthIn(dateText, SUBTASK_DATE_FONT_SIZE_PT);
      const dateTrackingWidth = measureLetterSpacingWidthIn(
        dateText,
        letterSpacingPt(SUBTASK_DATE_FONT_SIZE_PT, DATE_LETTER_SPACING_EM),
      );
      const statusTextWidth = statusTextWidthIn(statusText, SUBTASK_STATUS_FONT_SIZE_PT);

      const availableWidth =
        CONTENT_WIDTH_IN -
        STATUS_RIGHT_PADDING_IN -
        rowIndentIn -
        statusTextWidth -
        SUBTASK_META_STATUS_GAP_IN -
        (dateWidth + dateTrackingWidth) -
        SUBTASK_META_GAP_IN;
      const label = truncateToWidth(child.label, SUBTASK_TEXT_FONT_SIZE_PT, Math.max(availableWidth, 0));

      // Each piece follows the previous one's *actual* drawn width, not its
      // reserved box, so a short task name doesn't leave a gap before its
      // dates (same reasoning as the overview bar's tag pills).
      // An indented name is cut earlier rather than pushed past the content
      // edge — the same rule as an indented overview bar label.
      const labelX = CONTENT_X_IN + rowIndentIn;
      const dateX = labelX + measureTextWidthIn(label, SUBTASK_TEXT_FONT_SIZE_PT) + SUBTASK_META_GAP_IN;

      subtasks.push({
        taskId: child.id,
        depth,
        label,
        labelX,
        dateText,
        dateX,
        statusText,
        statusColor: TASK_STATUS_COLORS[status],
        y,
      });
      y += LIST_ROW_HEIGHT_IN;
    });

    y += SECTION_GAP_IN;
  }

  const comments: CommentModel[] = [];
  let commentsHeadingY: number | undefined;

  if (chunk.commentFragments.length > 0) {
    commentsHeadingY = y;
    y += ROW_LABEL_HEIGHT_IN + ROW_GAP_IN;

    chunk.commentFragments.forEach((fragment, index) => {
      let meta: CommentMetaModel | undefined;

      if (fragment.showMeta) {
        const date = new Date(fragment.comment.createdAt).toLocaleDateString();
        const metaText = fragment.comment.isPinned ? `\u{1F4CC} ${date}` : date;
        meta = { text: metaText, y };
        y += COMMENT_META_ROW_HEIGHT_IN;
      }

      const { rows, endY } = layoutMarkdownBlocks(fragment.blocks, y);
      y = endY;

      comments.push({ meta, blocks: rows });

      if (index < chunk.commentFragments.length - 1) y += COMMENT_GAP_IN;
    });

    y += SECTION_GAP_IN;
  }

  return {
    section: {
      taskId: chunk.taskId,
      parentTitle: chunk.parentTitle,
      parentTitleY,
      subtasksHeadingY,
      subtasks,
      commentsHeadingY,
      commentsHeadingText: chunk.commentFragments.length > 0 ? chunk.commentsHeadingText : undefined,
      comments,
    },
    endY: y,
  };
}

/** One direct child of a parent, together with all of its own descendants —
 * the unit a subtree is split at when it outgrows a slide.
 *
 * Splitting anywhere else is what makes a deep tree unreadable: a break in the
 * middle of a branch strands children on a slide whose parent row sits on the
 * previous one, and their indent then measures from nothing. Keeping branches
 * whole means a row's parent is always either the section's own title or a row
 * above it on the same slide. */
function splitIntoBranches(rows: DetailDescendant[]): DetailDescendant[][] {
  const branches: DetailDescendant[][] = [];

  rows.forEach((row) => {
    // A depth-0 row opens a branch; anything deeper belongs to the branch in
    // progress. The length check only covers a malformed first row (depth > 0
    // with no branch open) — buildTaskHierarchy shouldn't produce one, and if
    // it somehow did, the row still has to land somewhere rather than vanish.
    if (row.depth === 0 || branches.length === 0) branches.push([row]);
    else branches[branches.length - 1].push(row);
  });

  return branches;
}

/** "Comments", plus a count when commentMode is showing fewer than the task
 * actually has. The truncation is the user's own choice in the export panel,
 * but the file never repeated it — which made a deck exported with
 * "latest only" indistinguishable from a plan whose tasks have one comment
 * each. Carried in the heading rather than on a line of its own so it costs
 * no layout. */
function buildCommentsHeading(shown: number, total: number): string {
  return shown < total ? `Comments (${shown} of ${total})` : 'Comments';
}

/** Splits one parent's detail content into one or more chunks so nothing is
 * silently cut off: if the parent's whole subtree and comments fit
 * within one slide's content height, there's a single chunk; otherwise the
 * content spills into "(continued)" chunks that repeat the parent's title.
 *
 * Subtree rows spill at branch boundaries (see splitIntoBranches), so a slide
 * break never separates a task from its own children. Only a single branch
 * taller than an entire slide is broken further, row by row, as best effort. When even one comment's blocks don't fit in a fresh
 * chunk, it's split at block boundaries (e.g. a heading+paragraph+list on
 * one slide, a trailing table continuing on the next) rather than accepted
 * as a single oversized chunk — letting a block-level element like a table
 * overflow a slide's bounds is what previously made jsPDF's table plugin
 * silently insert its own extra page when asked to draw past the bottom of
 * the content area. Chunks (possibly from different parents) are then
 * packed onto slides by buildDetailSlides exactly like whole sections used
 * to be. */
function expandCandidateToChunks(candidate: DetailCandidate): DetailChunk[] {
  const { parent, descendants, relevantComments, totalComments } = candidate;

  const makeChunk = (isFirst: boolean): DetailChunk => ({
    taskId: parent.id,
    parentTitle: isFirst ? parent.label : `${parent.label} (continued)`,
    rows: [],
    commentFragments: [],
    commentsHeadingText: buildCommentsHeading(relevantComments.length, totalComments),
  });

  const chunks: DetailChunk[] = [];
  let current = makeChunk(true);

  const fits = (chunk: DetailChunk) => buildDetailSection(chunk, 0).endY <= CONTENT_HEIGHT_IN;
  // "Nothing on it yet", not "no comments yet": a chunk already carrying
  // subtree rows has no room to spare, so the best-effort fallbacks below must
  // not mistake it for a blank slate and let oversized content through.
  const isEmpty = (chunk: DetailChunk) =>
    chunk.rows.length === 0 && chunk.commentFragments.length === 0;
  const withRows = (chunk: DetailChunk, rows: DetailDescendant[]): DetailChunk => ({
    ...chunk,
    rows: [...chunk.rows, ...rows],
  });
  const withFragment = (chunk: DetailChunk, fragment: CommentFragment): DetailChunk => ({
    ...chunk,
    commentFragments: [...chunk.commentFragments, fragment],
  });
  const startNewChunk = () => {
    chunks.push(current);
    current = makeChunk(false);
  };
  /** Closes out the last chunk and labels the comment headings. "(continued)"
   * belongs to the first chunk that actually *carries* comments, which needn't
   * be the parent's first chunk any more: a wide subtree can fill that one with
   * rows alone and push every comment onto the next. */
  const finish = (): DetailChunk[] => {
    chunks.push(current);

    let seenComments = false;
    return chunks.map((chunk) => {
      if (chunk.commentFragments.length === 0) return chunk;
      const commentsHeadingText = seenComments
        ? `${chunk.commentsHeadingText} (continued)`
        : chunk.commentsHeadingText;
      seenComments = true;
      return { ...chunk, commentsHeadingText };
    });
  };

  splitIntoBranches(descendants).forEach((branch) => {
    if (fits(withRows(current, branch))) {
      current = withRows(current, branch);
      return;
    }

    // Doesn't fit here — a chunk of its own may still hold it, since a
    // continuation carries no full-height title block. Worth retrying before
    // resorting to breaking the branch up.
    if (!isEmpty(current)) {
      startNewChunk();
      if (fits(withRows(current, branch))) {
        current = withRows(current, branch);
        return;
      }
    }

    // One branch taller than a whole slide: the only case where a level is
    // broken across slides. Rows keep their order and their depth, so the
    // continuation still reads as an outline, and it repeats the parent title.
    branch.forEach((row) => {
      if (!isEmpty(current) && !fits(withRows(current, [row]))) startNewChunk();
      current = withRows(current, [row]);
    });
  });

  if (relevantComments.length === 0) return finish();

  relevantComments.forEach((comment) => {
    const blocks = parseMarkdownBlocks(comment.body);

    if (blocks.length === 0) {
      // No parsed content (e.g. an empty/whitespace-only body) — still show
      // the meta line, on a fresh chunk if the current one has no room left.
      if (!isEmpty(current) && !fits(withFragment(current, { comment, blocks: [], showMeta: true }))) {
        startNewChunk();
      }
      current = withFragment(current, { comment, blocks: [], showMeta: true });
      return;
    }

    let remaining = blocks;
    let showMeta = true;

    while (remaining.length > 0) {
      // Grow this comment's fragment in the current chunk one block at a
      // time, taking as many as still fit.
      let taken = 0;
      for (let count = 1; count <= remaining.length; count++) {
        const attempt = withFragment(current, { comment, blocks: remaining.slice(0, count), showMeta });
        // The lone-block fallback only applies at count === 1: a single
        // block that's unavoidably too tall for an empty chunk is let
        // through as best effort rather than looping forever trying to
        // split it further.
        if (fits(attempt) || (isEmpty(current) && count === 1)) {
          taken = count;
        } else {
          break;
        }
      }

      if (taken === 0) {
        // Nothing from this comment fits alongside the current chunk's
        // existing content — start a fresh chunk and retry there.
        startNewChunk();
        continue;
      }

      current = withFragment(current, { comment, blocks: remaining.slice(0, taken), showMeta });
      remaining = remaining.slice(taken);
      showMeta = false;

      if (remaining.length > 0) startNewChunk();
    }
  });

  return finish();
}

/** Packs parent chunks onto appendix slides by their actual measured height
 * (not a fixed count per slide — sections vary a lot depending on how many
 * subtasks/comments a parent has), so several chunks share a slide whenever
 * they fit within CONTENT_HEIGHT_IN. */
function buildDetailSlides(candidates: DetailCandidate[]): DetailSlideModel[] {
  const chunks = candidates.flatMap((candidate) => expandCandidateToChunks(candidate));
  if (chunks.length === 0) return [];

  const withHeight = chunks.map((chunk) => ({
    chunk,
    // Height is independent of the starting Y (the layout math is purely
    // additive), so probing at startY = 0 gives the chunk's own height.
    heightIn: buildDetailSection(chunk, 0).endY,
  }));

  const groups: DetailChunk[][] = [];
  let currentGroup: DetailChunk[] = [];
  let usedHeight = 0;

  withHeight.forEach(({ chunk, heightIn }) => {
    const additionalHeight = currentGroup.length === 0 ? heightIn : PARENT_SECTION_GAP_IN + heightIn;

    if (currentGroup.length > 0 && usedHeight + additionalHeight > CONTENT_HEIGHT_IN) {
      groups.push(currentGroup);
      currentGroup = [];
      usedHeight = 0;
    }

    currentGroup.push(chunk);
    usedHeight += currentGroup.length === 1 ? heightIn : PARENT_SECTION_GAP_IN + heightIn;
  });

  if (currentGroup.length > 0) groups.push(currentGroup);

  return groups.map((group, index) => {
    let y = CONTENT_TOP_IN;
    const sections = group.map((chunk) => {
      const { section, endY } = buildDetailSection(chunk, y);
      y = endY + PARENT_SECTION_GAP_IN;
      return section;
    });

    const title = groups.length > 1 ? `Subtasks & Comments (${index + 1}/${groups.length})` : 'Subtasks & Comments';
    return { kind: 'detail', title, sections };
  });
}

export function getCommentsForSlide(
  comments: TaskComment[],
  taskId: string,
  mode: ExportOptions['commentMode'],
): TaskComment[] {
  const taskComments = comments.filter((comment) => comment.taskId === taskId);

  if (mode === 'none' || taskComments.length === 0) return [];

  if (mode === 'pinned') {
    return taskComments.filter((comment) => comment.isPinned);
  }

  if (mode === 'latest') {
    const [latest] = [...taskComments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return latest ? [latest] : [];
  }

  return taskComments;
}

/** The items that would appear on the overview slide for a given item set —
 * every exportable task at every depth, in the order given, which is exactly
 * what `buildExportSlides` hands `planOverview`. Exported so a caller (e.g. the
 * export button) can run `planOverview` itself before generating the file and
 * get the same answer the export will.
 *
 * One function rather than each caller filtering for itself: the pre-flight
 * check's whole job is to predict the file, and it can only do that while its
 * candidate set is the file's. */
export function getExportOverviewItems(items: TimelineItem[]): TimelineItem[] {
  return items.filter((item) => item.includeInExport !== false);
}

/** Filters/groups items exactly like the on-screen Gantt chart and builds a
 * render-engine-agnostic slide model shared by the PPTX and PDF exporters. */
export function buildExportSlides(
  items: TimelineItem[],
  comments: TaskComment[],
  commentMode: ExportOptions['commentMode'],
  exportTimeframe: ExportTimeframe | null,
  exportMode: ExportMode = 'compact',
  /** Where the overview draws its "today" rule. Passed in rather than read
   * off the clock, like buildDashboardSlides's own — the model stays pure, and
   * a deck built twice in one run marks the same day on every slide. */
  today: Date = new Date(),
): ExportSlideModel[] {
  const exportableItems = items.filter((item) => item.includeInExport !== false);
  const { roots } = buildTaskHierarchy(exportableItems);
  // Every exportable task is an overview candidate, at every depth — not just
  // the roots. A subtask reaching the deck only as a text row in the appendix
  // could be read but not *seen*: the one thing a Gantt slide is for, where a
  // task sits against the others in time, was exactly what the levels carrying
  // most of a plan's detail never got. They are drawn as bars now, shorter by
  // depth (BAR_HEIGHT_RATIO_BY_DEPTH) so a level is legible as a level.
  const overviewPlan = planOverview(exportableItems, exportTimeframe);

  // One depth answer for the whole export, from the same helper the on-screen
  // chart uses, handed down to the sections that indent by it.
  const depthById = buildDepthMap(exportableItems);

  const detailCandidates: DetailCandidate[] = [];
  roots.forEach((parentNode) => {
    const parent = parentNode.item;
    // The root's *entire* subtree, not its direct children: a grandchild never
    // becomes a candidate of its own (only roots do), so anything missing from
    // here would reach no slide in the deck.
    const descendants = collectSubtreeRows(parentNode, depthById);
    const parentComments = comments.filter((comment) => comment.taskId === parent.id);

    if (descendants.length === 0 && parentComments.length === 0) return;

    const relevantComments = getCommentsForSlide(comments, parent.id, commentMode);
    detailCandidates.push({
      parent,
      descendants,
      relevantComments,
      totalComments: parentComments.length,
    });
  });

  // Which tasks the appendix carries is what tells a task the overview left off
  // ("also in the appendix") from one that reaches no slide at all. Every row a
  // section prints, not just the section's own title task: a subtask is now an
  // overview candidate in its own right, so when one is left off the overview
  // the footer has to know that its parent's section still lists it.
  const sectionedIds = new Set(
    detailCandidates.flatMap((candidate) => [
      candidate.parent.id,
      ...candidate.descendants.map((descendant) => descendant.item.id),
    ]),
  );

  const slides: ExportSlideModel[] = [
    ...buildOverviewSlides(
      overviewPlan,
      exportTimeframe,
      exportMode,
      exportableItems,
      sectionedIds,
      today,
    ),
    ...buildDetailSlides(detailCandidates),
  ];

  slides.push(buildSummarySlide(exportableItems));

  return slides;
}
