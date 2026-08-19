import type { ExportOptions, ExportTimeframe } from '../store/timelineStore';
import type { Person } from '../store/peopleStore';
import {
  getTaskStatus,
  TASK_STATUS_COLORS,
  TASK_STATUS_SCALE,
  TASK_STATUS_LABELS,
  type TaskComment,
  type TimelineItem,
} from '../types/timeline';
import { parseMarkdownBlocks, type MarkdownBlock } from '../utils/renderMarkdown';
import { getStatusSegments, type StatusSegment } from '../utils/dashboardMetrics';
import { clampProgress } from '../utils/clampProgress';
import { resolveBarColor } from '../utils/barColor';
import { buildDepthMap, labelIndent, resolveBarGeometry } from '../utils/barNesting';
import { readableTextOn } from '../utils/colorContrast';
import { buildTaskHierarchy, type TaskNode } from '../utils/taskHierarchy';
import {
  daysBetween,
  BASE_PX_PER_DAY,
  formatMonthYear,
  formatShortDate,
  getDateRange,
  getItemBar,
} from './dateScale';
import {
  buildDateGrid,
  DATE_GRID_LEVELS,
  getVisibleGridLevels,
  MAX_VISIBLE_DAYS_FOR_WEEK_LINES,
  type DateGrid,
  type DateGridLevel,
  type DateGridMark,
} from './dateGrid';
import { measureLetterSpacingWidthIn, measureMonoTextWidthIn, measureTextWidthIn } from './textMetrics';
import { COLORS } from './theme';
import {
  BAR_HEIGHT_IN,
  BAR_LABEL_FONT_SIZE_PT,
  BAR_PROGRESS_FONT_SIZE_PT,
  BAR_PROGRESS_PADDING_IN,
  AXIS_LABEL_GAP_IN,
  AXIS_MONTH_FONT_SIZE_PT,
  AXIS_WEEK_FONT_SIZE_PT,
  STATUS_LETTER_SPACING_EM,
  DATE_LETTER_SPACING_EM,
  letterSpacingPt,
  SUBTASK_DATE_FONT_SIZE_PT,
  SUBTASK_META_GAP_IN,
  COMMENT_BLOCK_GAP_IN,
  COMMENT_BODY_FONT_SIZE_PT,
  COMMENT_GAP_IN,
  COMMENT_HEADING_ROW_HEIGHT_IN,
  COMMENT_LINE_HEIGHT_IN,
  COMMENT_META_ROW_HEIGHT_IN,
  COMMENT_TABLE_CELL_PADDING_IN,
  COMMENT_TABLE_FONT_SIZE_PT,
  COMMENT_TABLE_LINE_HEIGHT_IN,
  CONTENT_HEIGHT_IN,
  CONTENT_TOP_IN,
  CONTENT_BOTTOM_IN,
  CONTENT_X_IN,
  CONTENT_WIDTH_IN,
  DEPENDENCY_JOG_IN,
  GROUP_HEADER_HEIGHT_IN,
  LABEL_TAG_GAP_IN,
  LIST_ROW_HEIGHT_IN,
  MAX_OVERVIEW_BARS_PER_SLIDE,
  MIN_TRACK_WIDTH_IN,
  OVERVIEW_WINDOW_PAD_RATIO,
  TIMELINE_X_IN,
  TIMELINE_WIDTH_IN,
  STATUS_COL_WIDTH_IN,
  TASK_COL_WIDTH_IN,
  COLUMN_TEXT_INSET_IN,
  COLUMN_DIVIDER_X_IN,
  STATUS_CHIP_HEIGHT_IN,
  PARENT_SECTION_GAP_IN,
  ROW_GAP_IN,
  ROW_HEIGHT_IN,
  ROW_LABEL_HEIGHT_IN,
  SECTION_GAP_IN,
  STATUS_RIGHT_PADDING_IN,
  SUBTASK_META_STATUS_GAP_IN,
  SUBTASK_STATUS_FONT_SIZE_PT,
  SUBTASK_TEXT_FONT_SIZE_PT,
  subtaskRowIndent,
  TAG_PILL_FONT_SIZE_PT,
  TAG_PILL_GAP_IN,
  TAG_PILL_PADDING_IN,
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

// One tag pill drawn right after an overview bar's label, before its status
// text — position and width are already resolved here so a renderer just
// draws a rounded rect (TAG_PILL_HEIGHT_IN tall) and centers `text` in it,
// the same way it draws the bar's own track.
export interface OverviewBarTagModel {
  text: string;
  x: number;
  width: number;
}

export interface OverviewColumnHeaderModel {
  text: string;
  x: number;
  width: number;
}
export interface OverviewBarModel {
  id: string;
  label: string;
  // Where the label starts and how much room it gets. Fixed: the left edge of
  // the Task column plus its inset, on every row, however the bar moves.
  labelX: number;
  labelWidth: number;
  tags: OverviewBarTagModel[];
  color: string;
  // The status chip in the Status column: the same pale-surface / dark-text /
  // hairline-border chip the app draws, minus the dropdown chevron, which
  // would imply an interaction a slide cannot offer. `statusColor` is its
  // text; the two chip colours are the other two steps of the same scale.
  statusText: string;
  statusColor: string;
  statusChipX: number;
  statusChipY: number;
  statusChipWidth: number;
  statusChipHeight: number;
  statusChipBg: string;
  statusChipBorder: string;
  // The row's top edge. Everything drawn on the bar's *line* — its label,
  // status, progress, tag pills — is positioned against this and a full
  // BAR_HEIGHT_IN box, so those stay put whatever height the bar itself is.
  y: number;
  barX: number;
  // The track's own rectangle. A nested task's bar is drawn shorter than a
  // top-level one and centered in the same slot (see resolveBarGeometry), so
  // this is `y` plus a centering offset rather than `y` itself.
  barY: number;
  barHeight: number;
  trackWidth: number;
  fillWidth: number;
  // Progress percentage drawn on the bar itself, in the box
  // (progressX, progressWidth): centered in it when it sits inside the fill,
  // left-aligned when it sits just after the fill on the gray track.
  progressText: string;
  progressX: number;
  progressWidth: number;
  progressInsideFill: boolean;
  progressColor: string;
  // True when the task's real start/end falls outside the export timeframe
  // window, so the bar is drawn clipped at that edge with a chevron marker.
  chevronLeft: boolean;
  chevronRight: boolean;
}

// One vertical date line behind the bars. `level` picks its weight/color out
// of DATE_GRID_STYLES — the same table the on-screen grid draws from.
export interface OverviewGridLineModel {
  level: DateGridLevel;
  x: number;
}

// A date caption on the overview's axis. Month-level captions are the
// primary scale and set at the axis's normal size; week-level ones are
// smaller and get thinned out when they'd collide (see buildAxisLabels).
// Daily lines are deliberately never labeled — one caption per day would be
// an unreadable smear at any realistic range.
export interface OverviewAxisLabelModel {
  level: 'month' | 'week';
  text: string;
  x: number;
}

// One straight (horizontal or vertical) leg of a dependency connector's
// elbow path — drawn as its own line by both exporters, since neither
// pptxgenjs nor jsPDF can draw an arbitrary multi-segment path directly.
export interface DependencyConnectorSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface OverviewConnectorModel {
  id: string;
  // A polyline from one bar's edge to another's, as its individual legs:
  // 1 segment for a same-row (straight) connector, otherwise up to 5 for the
  // stub/gutter/approach route (see buildDependencyConnectors), with any
  // zero-length leg already dropped.
  segments: DependencyConnectorSegment[];
}

export interface OverviewSlideModel {
  kind: 'overview';
  title: string;
  dateAxisY: number;
  // Ordered palest-first (day, then week, then month) so a renderer can draw
  // the array straight through without a month line being overpainted by the
  // day line at the same x.
  gridLines: OverviewGridLineModel[];
  axisLabels: OverviewAxisLabelModel[];
  // The "Status" / "Task" headings, on the same line and at the same size as
  // the month captions so the three read as one header row. Empty when the
  // slide has no bars — an empty export gets no column scaffolding.
  columnHeaders: OverviewColumnHeaderModel[];
  // The hairline under the whole header row, and the vertical rule between the
  // two columns and the timeline. Both null on an empty slide.
  headerRuleY: number | null;
  dividerX: number | null;
  dividerTop: number;
  dividerBottom: number;
  bars: OverviewBarModel[];
  // Empty when exportOptions.showDependencies is off, or for any dependency
  // whose predecessor/successor didn't make it onto this slide (excluded
  // from export, outside the timeframe window, or truncated by overflow) —
  // silently omitted rather than drawn as a bracket to nowhere.
  dependencyConnectors: OverviewConnectorModel[];
  // --- what this overview leaves out ------------------------------------------
  // Two different facts, kept apart because conflating them is what made the
  // old single count unverifiable: a task can be missing from the *overview*
  // (still in the appendix, so nothing is lost) or missing from the *file*
  // (genuinely gone). All three fields are carried on the last overview slide
  // only — 'full' mode's pages each draw a subset, so a per-page count would
  // count the same task once per page it isn't on instead of once per deck.
  //
  // Exportable roots the overview draws no bar for, whatever the reason: past
  // a 'compact' slide's capacity, or outside the export timeframe.
  omittedFromOverviewCount: number;
  // Of those, the ones that appear nowhere in the deck at all — no bar, no
  // appendix section, no subtask row. The number that actually matters, and
  // the one the coverage check holds to zero-or-announced: see
  // docs/export-coverage.md and src/export/exportCoverage.ts.
  absentTaskCount: number;
  // The footer sentence built from the two, or null when the overview shows
  // every root. Resolved here rather than in each exporter because both would
  // otherwise build the same sentence from the same counts.
  omittedNote: string | null;
}

/** One subtask line on a detail slide. The left side used to be a single
 * pre-joined string ("name  —  2026-08-20 → 2026-08-28  —  45%") drawn in
 * one call; it's split into separately-positioned pieces now because each
 * carries its own typographic role — the name is the content, the dates are
 * monospace, the progress is a figure — and neither engine can vary the
 * face mid-string at a position the other could reproduce. Same approach as
 * OverviewBarTagModel: the model resolves x for every piece so a renderer
 * only has to draw. */
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
  progressText: string;
  progressX: number;
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
  // Present on a parent's first section (absent on its "(continued)"
  // overflow sections), whether or not the task actually has an assignee —
  // an unassigned task gets a "No assignee" placeholder instead, drawn in a
  // muted color via `assigneeMuted` so the gap is visible but not shouty.
  assigneeText?: string;
  assigneeY?: number;
  assigneeMuted?: boolean;
  // Hex without a leading '#' (theme.ts convention), resolved by matching
  // the assignee's name against peopleStore — undefined exactly when
  // assigneeMuted is true (no assignee, so nothing to swatch).
  assigneeColor?: string;
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
  const blocked = segments.find((segment) => segment.status === 'blocked');

  return {
    kind: 'summary',
    title: 'Summary',
    segments,
    stats: [
      { label: 'Total tasks', value: `${total}` },
      { label: 'Completed', value: `${done?.count ?? 0} (${done?.percent ?? 0}%)` },
      { label: 'At risk (blocked)', value: `${blocked?.count ?? 0}` },
    ],
  };
}

/** Drops any caption that would start before the previous kept one has
 * ended (plus a gap), walking left to right. Measuring each caption's own
 * drawn width beats the fixed pitch this used to use: "Jan 2027" is half as
 * wide again as "Sep 01", so one constant could only ever be right for one
 * of the two formats. */
function thinAxisLabels(
  labels: OverviewAxisLabelModel[],
  widthOf: (label: OverviewAxisLabelModel) => number,
): OverviewAxisLabelModel[] {
  const kept: OverviewAxisLabelModel[] = [];
  let nextFreeX = -Infinity;

  labels.forEach((label) => {
    if (label.x < nextFreeX) return;
    kept.push(label);
    nextFreeX = label.x + widthOf(label) + AXIS_LABEL_GAP_IN;
  });

  return kept;
}

/** Date captions for the overview axis, thinned to what actually fits.
 *
 * Which lines get captioned follows the grid's own density (see
 * getVisibleGridLevels): a range past a year has no week lines to caption at
 * all, and its month captions carry the year — "Jan 2027" rather than
 * "Jan 01", since on a multi-year axis the day of the month is noise and the
 * year is the thing you need. Month captions are thinned the same way week
 * captions always were, because 36 of them across a 9in axis collide just as
 * readily as weekly ones do. Day and year lines get no caption of their own:
 * a caption per day is an unreadable smear at any range, and every 1 January
 * already carries a month caption that names its year. */
function buildAxisLabels(
  grid: DateGrid,
  toX: (mark: DateGridMark) => number,
  isMultiYear: boolean,
): OverviewAxisLabelModel[] {
  const monthLabels = thinAxisLabels(
    grid.month.map((mark) => ({
      level: 'month' as const,
      text: isMultiYear ? formatMonthYear(mark.date) : formatShortDate(mark.date),
      x: toX(mark),
    })),
    (label) => measureMonoTextWidthIn(label.text, AXIS_MONTH_FONT_SIZE_PT),
  );

  // Week captions fill the gaps the month captions leave, so they're thinned
  // against the months already kept as well as against each other.
  const weekLabels = thinAxisLabels(
    grid.week.map((mark) => ({ level: 'week' as const, text: formatShortDate(mark.date), x: toX(mark) })),
    (label) => measureMonoTextWidthIn(label.text, AXIS_WEEK_FONT_SIZE_PT),
  ).filter((label) =>
    monthLabels.every(
      (month) =>
        label.x + measureMonoTextWidthIn(label.text, AXIS_WEEK_FONT_SIZE_PT) + AXIS_LABEL_GAP_IN <= month.x ||
        label.x >= month.x + measureMonoTextWidthIn(month.text, AXIS_MONTH_FONT_SIZE_PT) + AXIS_LABEL_GAP_IN,
    ),
  );

  return [...monthLabels, ...weekLabels];
}

/** Parent items that overlap the given export timeframe window (any part of
 * the task's real date span inside the window counts). With no timeframe,
 * every parent item is "in range" — the window is implicitly the full date
 * span of the items themselves. */
export function getItemsInTimeframe(
  parentItems: TimelineItem[],
  timeframe: ExportTimeframe | null,
): TimelineItem[] {
  if (!timeframe) return parentItems;

  const windowStart = new Date(timeframe.start).getTime();
  const windowEnd = new Date(timeframe.end).getTime();

  return parentItems.filter((item) => {
    const start = new Date(item.start).getTime();
    const end = new Date(item.end).getTime();
    return start <= windowEnd && end >= windowStart;
  });
}

export interface OverviewPlan {
  /** Parent items that overlap the effective date range, before truncation. */
  inRange: TimelineItem[];
  /** How many of those actually fit on the single overview slide. */
  capacity: number;
  /** The (possibly truncated) items that will actually be drawn. */
  included: TimelineItem[];
}

/** Overview is always a single slide: this decides which of the in-range
 * parent items fit (first `MAX_OVERVIEW_BARS_PER_SLIDE`, in their current
 * sort order) so a caller can warn the user before truncating anything. */
export function planOverview(parentItems: TimelineItem[], timeframe: ExportTimeframe | null): OverviewPlan {
  const inRange = getItemsInTimeframe(parentItems, timeframe);
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
}

function addDays(date: Date, days: number): Date {
  const moved = new Date(date.getTime());
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved;
}

/** The Monday on or before `date` — the same anchor getWeekMarkers uses, so a
 * snapped edge lands on a week line the grid actually draws. */
function startOfWeek(date: Date): Date {
  return addDays(date, -((date.getUTCDay() + 6) % 7));
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** Widens a window outward until both edges sit on marks the grid will draw.
 *
 * Snapped to the *finest* level this window's length draws, not the coarsest:
 * the fine one is the smaller move (at most six days at week level against as
 * much as a month at month level), and an axis that begins and ends on a drawn
 * line reads as a measured range rather than as one cut at an arbitrary date.
 * A day-level window is already on whole days and needs no move at all. */
function snapWindowToGrid(window: OverviewWindow): OverviewWindow {
  const days = daysBetween(window.minDate, window.maxDate) + 1;
  // getVisibleGridLevels returns its levels finest-first.
  const [finest] = getVisibleGridLevels(days);

  if (finest === 'day') return window;

  if (finest === 'week') {
    const start = startOfWeek(window.minDate);
    const lastMonday = startOfWeek(window.maxDate);
    const end = lastMonday.getTime() === window.maxDate.getTime() ? lastMonday : addDays(lastMonday, 7);
    return { minDate: start, maxDate: end };
  }

  const start = startOfMonth(window.minDate);
  const firstOfMonth = startOfMonth(window.maxDate);
  const end =
    firstOfMonth.getTime() === window.maxDate.getTime()
      ? firstOfMonth
      : new Date(Date.UTC(firstOfMonth.getUTCFullYear(), firstOfMonth.getUTCMonth() + 1, 1));
  return { minDate: start, maxDate: end };
}

/** One axis per page, in page order; null for a page with nothing on it.
 *
 * An explicit export timeframe is a window the reader chose, so every slide
 * keeps it unchanged — narrowing it per slide would quietly overrule the
 * setting. Only the automatic window is computed per slide. */
function buildOverviewAxes(
  pages: TimelineItem[][],
  timeframe: ExportTimeframe | null,
): (OverviewAxis | null)[] {
  if (timeframe) {
    const minDate = new Date(timeframe.start);
    const maxDate = new Date(timeframe.end);
    const scale = TIMELINE_WIDTH_IN / ((daysBetween(minDate, maxDate) + 1) * BASE_PX_PER_DAY);
    return pages.map((page) => (page.length > 0 ? { minDate, maxDate, scale } : null));
  }

  const ranges = pages.map((page) => (page.length > 0 ? getDateRange(page) : null));
  const widestRawDays = Math.max(1, ...ranges.map((range) => range?.totalDays ?? 1));
  // One padding for the whole export, measured off the widest window, so the
  // clear space either side is the same number of inches on every slide.
  const padDays = Math.max(1, Math.round(widestRawDays * OVERVIEW_WINDOW_PAD_RATIO));

  const windows = ranges.map((range) =>
    range === null
      ? null
      : snapWindowToGrid({
          minDate: addDays(range.minDate, -padDays),
          maxDate: addDays(range.maxDate, padDays),
        }),
  );

  // The widest window fills the timeline zone exactly; every other slide runs
  // at that same inches-per-day and simply stops earlier.
  const widestDays = Math.max(
    1,
    ...windows.map((window) => (window ? daysBetween(window.minDate, window.maxDate) + 1 : 1)),
  );
  const scale = TIMELINE_WIDTH_IN / (widestDays * BASE_PX_PER_DAY);

  return windows.map((window) => (window ? { ...window, scale } : null));
}

/** Lays out one overview slide: a date-scale axis at the top, then one bar
 * per item. If a task's real dates fall outside `dateWindow`, the bar is
 * clipped to the content edge and flagged with a chevron — but its progress
 * is unaffected by the clip. */
function buildOverviewSlide(
  items: TimelineItem[],
  axis: OverviewAxis | null,
  title: string,
  omission: OverviewOmission,
  showDependencies: boolean,
): OverviewSlideModel {
  const bars: OverviewBarModel[] = [];
  const dateAxisY = CONTENT_TOP_IN;
  let gridLines: OverviewGridLineModel[] = [];
  let axisLabels: OverviewAxisLabelModel[] = [];
  let columnHeaders: OverviewColumnHeaderModel[] = [];
  let headerRuleY: number | null = null;
  let dividerX: number | null = null;

  // Depth per task for the set actually drawn on this slide, resolved once from
  // the tree. Judged against *these* items, so a task whose parent isn't on the
  // slide is a root here and is drawn like one.
  const depthById = buildDepthMap(items);

  if (axis && items.length > 0) {
    const { minDate, maxDate, scale } = axis;
    const totalDays = daysBetween(minDate, maxDate) + 1;
    // How much of the timeline zone this slide's window actually occupies. The
    // widest slide of the export fills it; a narrower one stops short, and
    // everything below clamps against *this* edge rather than the zone's, so a
    // bar at the end of a short window is held at the end of that window
    // instead of being allowed to run on into blank space.
    const windowWidthIn = totalDays * BASE_PX_PER_DAY * scale;

    const grid = buildDateGrid(minDate, maxDate);
    const toX = (mark: DateGridMark) => TIMELINE_X_IN + mark.dayOffset * BASE_PX_PER_DAY * scale;
    gridLines = DATE_GRID_LEVELS.flatMap((level) =>
      grid[level].map((mark) => ({ level, x: toX(mark) })),
    );
    // The slide shows the whole window at once, so the grid's density tier
    // follows the window's own length — and the axis captions follow the
    // same tier, so lines and captions can't disagree about how coarse this
    // range is.
    axisLabels = buildAxisLabels(grid, toX, totalDays > MAX_VISIBLE_DAYS_FOR_WEEK_LINES);

    // The two column headings sit on the axis row, so "Status", "Task" and the
    // month captions all share one line; the hairline under that row and the
    // vertical rule before the timeline are the same two lines the app draws.
    columnHeaders = [
      { text: 'Status', x: CONTENT_X_IN + COLUMN_TEXT_INSET_IN, width: STATUS_COL_WIDTH_IN },
      {
        text: 'Task',
        x: CONTENT_X_IN + STATUS_COL_WIDTH_IN + COLUMN_TEXT_INSET_IN,
        width: TASK_COL_WIDTH_IN,
      },
    ];
    headerRuleY = dateAxisY + GROUP_HEADER_HEIGHT_IN;
    dividerX = COLUMN_DIVIDER_X_IN;

    let y = CONTENT_TOP_IN + GROUP_HEADER_HEIGHT_IN;

    items.forEach((item) => {
      const { left, width } = getItemBar(item, minDate, BASE_PX_PER_DAY);
      const progress = clampProgress(item.progress ?? 0);
      const status = getTaskStatus(item);

      // Raw (unclamped) horizontal extent, in inches from TIMELINE_X_IN — used
      // only to detect whether the real task dates spill outside the window;
      // never used directly to draw, since it can be negative or exceed
      // TIMELINE_WIDTH_IN.
      const rawLeftIn = left * scale;
      const rawRightIn = (left + width) * scale;
      const chevronLeft = rawLeftIn < -0.001;
      const chevronRight = rawRightIn > windowWidthIn + 0.001;

      const clippedLeftIn = Math.max(rawLeftIn, 0);
      const clippedRightIn = Math.min(rawRightIn, windowWidthIn);

      // No label zone to reserve any more: the name and the status live in their
      // own columns, so a bar is free to use the whole timeline zone and is
      // clamped only by that zone's own right edge. A bar can still start at the
      // very end of the window, in which case MIN_TRACK_WIDTH_IN keeps it
      // visible — it just can't spill past TIMELINE_X_IN + TIMELINE_WIDTH_IN.
      const maxLeftIn = Math.max(0, windowWidthIn - MIN_TRACK_WIDTH_IN);
      const barX = TIMELINE_X_IN + Math.min(clippedLeftIn, maxLeftIn);

      const maxTrackWidth = Math.max(MIN_TRACK_WIDTH_IN, TIMELINE_X_IN + windowWidthIn - barX);
      const windowClippedWidth = Math.max(clippedRightIn - (barX - TIMELINE_X_IN), 0);
      const trackWidth = Math.min(Math.max(windowClippedWidth, MIN_TRACK_WIDTH_IN), maxTrackWidth);
      const fillWidth = progress > 0 ? Math.max((trackWidth * progress) / 100, 0.05) : 0;
      const barColor = resolveBarColor(item);
      // Nesting is judged against the items actually drawn on this slide:
      // a task whose parent isn't among them is a root here, and is drawn
      // full height like one.
      const depth = depthById.get(item.id) ?? 0;
      const { height: barHeight, offset: barOffsetY } = resolveBarGeometry(BAR_HEIGHT_IN, depth);

      // The progress text goes inside the fill only when the fill measurably
      // holds it at the size it's actually drawn — not at some percentage of
      // the bar, which says nothing about how wide "100%" renders on a track
      // that may itself be a fraction of an inch wide.
      const progressText = `${progress}%`;
      const progressTextWidth = measureTextWidthIn(progressText, BAR_PROGRESS_FONT_SIZE_PT);
      const progressInsideFill = fillWidth >= progressTextWidth + BAR_PROGRESS_PADDING_IN * 2;
      const progressX = progressInsideFill ? barX : barX + fillWidth + BAR_PROGRESS_PADDING_IN;
      const progressWidth = progressInsideFill ? fillWidth : progressTextWidth;

      // The name lives in the Task column: same x on every row, whatever the
      // bar is doing. Nothing about the bar feeds into this any more.
      // Indented by depth from the column's fixed left edge, by the same rule the
      // on-screen label column uses — and the box the name truncates against
      // shrinks by exactly that indent, so an indented name is cut earlier rather
      // than pushed past the column.
      const labelIndentIn = labelIndent(BAR_HEIGHT_IN, depth);
      const labelX = CONTENT_X_IN + STATUS_COL_WIDTH_IN + COLUMN_TEXT_INSET_IN + labelIndentIn;
      const labelBoxWidth = TASK_COL_WIDTH_IN - COLUMN_TEXT_INSET_IN * 2 - labelIndentIn;

      const statusText = TASK_STATUS_LABELS[status];
      const statusScale = TASK_STATUS_SCALE[status];

      // Tag pills share the Task column with the name, so their measured total
      // is reserved out of the name's box first and the name truncates against
      // what's left — the same rule as before, now against a fixed column
      // instead of whatever space a bar happened to leave.
      const tagTexts = item.tags ?? [];
      const tagPillWidths = tagTexts.map(
        (tag) => measureTextWidthIn(tag, TAG_PILL_FONT_SIZE_PT) + TAG_PILL_PADDING_IN * 2,
      );
      const tagsReservedWidth =
        tagPillWidths.length > 0
          ? tagPillWidths.reduce((sum, width) => sum + width, 0) +
            TAG_PILL_GAP_IN * (tagPillWidths.length - 1) +
            LABEL_TAG_GAP_IN
          : 0;

      // One truncation rule, in one place: the name is cut to the Task
      // column's own width with an ellipsis. At BAR_LABEL_FONT_SIZE_PT a glyph
      // averages 0.110in, so an untagged row holds roughly 20 characters
      // (2.35in of column, less 0.08in of inset either side) before the
      // ellipsis appears; a row carrying tags holds correspondingly fewer.
      const labelWidth = Math.max(labelBoxWidth - tagsReservedWidth, 0);
      const label = truncateToWidth(item.label, BAR_LABEL_FONT_SIZE_PT, labelWidth);

      // Tag pills start right after the label's own actual (already
      // truncated) text, not at the edge of its reserved box — otherwise a
      // short label would leave a visible gap before the first pill.
      let tagX = labelX + measureTextWidthIn(label, BAR_LABEL_FONT_SIZE_PT) + (tagTexts.length > 0 ? LABEL_TAG_GAP_IN : 0);
      const tags: OverviewBarTagModel[] = tagTexts.map((text, index) => {
        const width = tagPillWidths[index];
        const tag: OverviewBarTagModel = { text, x: tagX, width };
        tagX += width + TAG_PILL_GAP_IN;
        return tag;
      });

      bars.push({
        id: item.id,
        label,
        labelX,
        labelWidth,
        tags,
        color: barColor,
        statusText,
        statusColor: TASK_STATUS_COLORS[status],
        statusChipX: CONTENT_X_IN + COLUMN_TEXT_INSET_IN,
        statusChipY: y + (BAR_HEIGHT_IN - STATUS_CHIP_HEIGHT_IN) / 2,
        statusChipWidth: STATUS_COL_WIDTH_IN - COLUMN_TEXT_INSET_IN * 2,
        statusChipHeight: STATUS_CHIP_HEIGHT_IN,
        statusChipBg: statusScale.surface.replace('#', ''),
        statusChipBorder: statusScale.border.replace('#', ''),
        y,
        barX,
        barY: y + barOffsetY,
        barHeight,
        trackWidth,
        fillWidth,
        progressText,
        progressX,
        progressWidth,
        progressInsideFill,
        // Inside the fill, whichever of the two text tokens actually measures
        // more contrast against it (status fills clear 4.5:1 with the light one
        // by construction; a user's own item.color might not, and then the dark
        // one wins). Outside the fill the label sits on the pale track, where
        // only the dark token is readable.
        progressColor: progressInsideFill
          ? readableTextOn(barColor).replace('#', '')
          : COLORS.textOnSurface,
        chevronLeft,
        chevronRight,
      });

      y += ROW_HEIGHT_IN;
    });
  }

  const dependencyConnectors = showDependencies ? buildDependencyConnectors(items, bars) : [];

  return {
    kind: 'overview',
    title,
    dateAxisY,
    gridLines,
    axisLabels,
    columnHeaders,
    headerRuleY,
    dividerX,
    dividerTop: dateAxisY,
    dividerBottom: CONTENT_BOTTOM_IN,
    bars,
    dependencyConnectors,
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
  showDependencies: boolean,
  parentItems: TimelineItem[],
  sectionedIds: ReadonlySet<string>,
): OverviewSlideModel[] {
  const isPaged = exportMode === 'full' && plan.inRange.length > plan.capacity;
  const drawnItems = isPaged ? plan.inRange : plan.included;

  // Judged against every exportable root, not just the in-range ones, so a root
  // the timeframe filtered out is counted the same as one that didn't fit.
  const drawnIds = new Set(drawnItems.map((item) => item.id));
  const omission = resolveOmission(
    parentItems.filter((item) => !drawnIds.has(item.id)),
    sectionedIds,
  );

  // Paged first, so each page's own tasks are known before its window is: the
  // window is a fact about the page, and the shared density a fact about the
  // widest of them, so neither can be resolved one slide at a time.
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
    return [buildOverviewSlide(drawnItems, axes[0], 'Timeline Overview', omission, showDependencies)];
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
      showDependencies,
    ),
  );
}

/** One connector per (successor, predecessor-id) pair, reusing each bar's
 * already-computed position — never recomputed from item dates. A
 * predecessor/successor missing from `barById` means it isn't on this slide
 * (excluded from export, outside the timeframe window, cut by compact-mode
 * truncation, or sitting on another page in 'full' mode), so that connector
 * is dropped rather than drawn to nowhere.
 *
 * Both ends land on a bar's vertical *edge*, and the path is routed to stay
 * off the bars in between — the exporters draw connectors under the bars
 * (matching the on-screen z-stack), but "hidden behind the bar" is a weaker
 * guarantee than "never there in the first place": a line emerging from the
 * middle of a bar still reads as crossing it.
 *
 * The path is a polyline through five points, degenerate legs dropped:
 *   1. out of the predecessor's right edge by one jog — the width of
 *      BAR_LABEL_PADDING_IN, so the stub sits in the gap before the label;
 *   2. off that row entirely, into the gutter between it and the next
 *      (ROW_GAP_IN), which is the one horizontal band with no bar, label,
 *      tag pill or status text in it;
 *   3. along that gutter to the successor's approach column;
 *   4. down/up that column to the successor's row;
 *   5. one jog back into the successor's edge.
 * Travelling along a row's own center line instead — the obvious elbow, and
 * what this used to do — draws a strikethrough right across whichever
 * label shares that row.
 *
 * Which edge of the successor the line arrives at depends on where that bar
 * sits, since a successor's bar is very often *not* to the right of its
 * predecessor's (overlapping date spans are normal, and any bar can be
 * clipped to the timeframe window, or a sliver at its right edge):
 * approach the left edge when there's room to drop in front of it, and the
 * right edge otherwise — never a point in between. */
function buildDependencyConnectors(items: TimelineItem[], bars: OverviewBarModel[]): OverviewConnectorModel[] {
  const barById = new Map(bars.map((bar) => [bar.id, bar]));

  // Every leg is pinned inside the timeline zone. Two of the x's a connector
  // derives are outside the bars themselves — the stub past the predecessor's
  // right edge and the approach column in front of the successor — and either
  // can fall outside the zone now that a bar may end at the zone's right edge
  // (nothing reserves label room after it any more) or start at its left edge.
  // Unclamped, the stub would run into the slide's right margin and the
  // approach column into the Task column, drawing a dependency line straight
  // through the task names.
  //
  // This matters far more with the export sorted by status than it did sorted
  // by date: rows are no longer in time order, so a connector routinely runs
  // upwards and diagonally across many rows instead of one step down.
  const clampX = (x: number) =>
    Math.min(Math.max(x, TIMELINE_X_IN), TIMELINE_X_IN + TIMELINE_WIDTH_IN);
  // Vertically the gutter between two rows is always inside the content area,
  // except for a connector leaving the very first row, whose "gutter above"
  // would sit a hair above the header rule.
  const clampY = (y: number) =>
    Math.min(Math.max(y, CONTENT_TOP_IN + GROUP_HEADER_HEIGHT_IN), CONTENT_BOTTOM_IN);

  return items.flatMap((item) => {
    const successorBar = barById.get(item.id);
    if (!successorBar) return [];

    return (item.dependencies ?? []).flatMap((depId) => {
      const predecessorBar = barById.get(depId);
      if (!predecessorBar) return [];

      const x1 = clampX(predecessorBar.barX + predecessorBar.trackWidth);
      const y1 = predecessorBar.y + BAR_HEIGHT_IN / 2;
      const y2 = successorBar.y + BAR_HEIGHT_IN / 2;

      const successorLeft = successorBar.barX;
      const successorRight = successorBar.barX + successorBar.trackWidth;
      // Room to drop in front of the successor means room for the approach
      // column too, i.e. a full jog either side of the predecessor's stub.
      const approachFromLeft = successorLeft - DEPENDENCY_JOG_IN >= x1 + DEPENDENCY_JOG_IN;

      const x2 = clampX(approachFromLeft ? successorLeft : successorRight);
      const stubX = clampX(x1 + DEPENDENCY_JOG_IN);
      const approachX = clampX(
        approachFromLeft
          ? successorLeft - DEPENDENCY_JOG_IN
          : Math.max(stubX, successorRight + DEPENDENCY_JOG_IN),
      );

      if (y1 === y2) return [{ id: `${depId}->${item.id}`, segments: [{ x1, y1, x2, y2 }] }];

      const gutterY = clampY(
        y2 > y1
          ? predecessorBar.y + BAR_HEIGHT_IN + ROW_GAP_IN / 2
          : predecessorBar.y - ROW_GAP_IN / 2,
      );

      const points: [number, number][] = [
        [x1, y1],
        [stubX, y1],
        [stubX, gutterY],
        [approachX, gutterY],
        [approachX, y2],
        [x2, y2],
      ];

      const segments: DependencyConnectorSegment[] = points
        .slice(1)
        .map(([x, y], index) => ({ x1: points[index][0], y1: points[index][1], x2: x, y2: y }))
        // A zero-length leg (the two columns coinciding, say) is nothing to
        // draw, and pptxgenjs would still emit a shape for it.
        .filter((segment) => segment.x1 !== segment.x2 || segment.y1 !== segment.y2);

      return [{ id: `${depId}->${item.id}`, segments }];
    });
  });
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
 * subtree's rows + assignee + a slice of its comments' fragments. One chunk
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
  // Whether this chunk carries the parent's assignee row at all — true only
  // for a parent's first chunk, like its subtasks. Distinct from `assignee`
  // being undefined, which means the task genuinely has nobody assigned: a
  // "(continued)" chunk repeating "No assignee" would read as the
  // continuation itself being unassigned rather than as a repeat.
  showAssignee: boolean;
  assignee?: TimelineItem['assignee'];
  commentFragments: CommentFragment[];
  commentsHeadingText: string;
}

// Rough text-wrapping estimate used only to size layout boxes ahead of
// render: neither pptxgenjs nor jsPDF expose real text measurement before
// drawing. Assumes an average glyph is ~0.55em wide — a bit wider than a
// typical sans-serif average, so this skews toward *more* estimated lines
// rather than fewer, which is the safer direction to be wrong in (extra
// whitespace instead of overlapping the next block).
const AVG_CHAR_WIDTH_EM = 0.55;

function estimateWrappedLines(text: string, fontSizePt: number, widthIn: number): number {
  if (!text) return 1;
  const charWidthIn = (fontSizePt * AVG_CHAR_WIDTH_EM) / 72;
  const charsPerLine = Math.max(1, Math.floor(widthIn / charWidthIn));
  return Math.max(1, Math.ceil(text.length / charsPerLine));
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

  // Every cell in a row is measured, and the tallest decides the row: a cell
  // whose text wraps to two lines makes the whole row two lines tall in
  // autoTable, and a row estimated at one line is exactly how a table ends up
  // taller than the space reserved for it.
  const columnWidth =
    COMMENT_BODY_WIDTH_IN / Math.max(block.headers.length, 1) - COMMENT_TABLE_CELL_PADDING_IN * 2;
  const rowHeight = (cells: string[]) =>
    Math.max(...cells.map((cell) => estimateWrappedLines(cell, COMMENT_TABLE_FONT_SIZE_PT, columnWidth))) *
      COMMENT_TABLE_LINE_HEIGHT_IN +
    COMMENT_TABLE_CELL_PADDING_IN * 2;

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
  people: Person[],
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
      const progress = clampProgress(child.progress ?? 0);
      const status = getTaskStatus(child);
      const statusText = TASK_STATUS_LABELS[status];

      // Same collision to guard against as an overview bar's label/status
      // (see truncateToWidth): the row's label is the flexible part, so it's
      // what gets truncated — the trailing dates/progress and the status
      // all stay intact and fully readable. Dates use formatShortDate (the
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
      const progressText = `${progress}%`;

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
      const progressWidth = measureTextWidthIn(progressText, SUBTASK_TEXT_FONT_SIZE_PT);
      const statusTextWidth =
        measureTextWidthIn(statusText, SUBTASK_STATUS_FONT_SIZE_PT) +
        measureLetterSpacingWidthIn(
          statusText,
          letterSpacingPt(SUBTASK_STATUS_FONT_SIZE_PT, STATUS_LETTER_SPACING_EM),
        );

      const availableWidth =
        CONTENT_WIDTH_IN -
        STATUS_RIGHT_PADDING_IN -
        rowIndentIn -
        statusTextWidth -
        SUBTASK_META_STATUS_GAP_IN -
        (dateWidth + dateTrackingWidth) -
        progressWidth -
        SUBTASK_META_GAP_IN * 2;
      const label = truncateToWidth(child.label, SUBTASK_TEXT_FONT_SIZE_PT, Math.max(availableWidth, 0));

      // Each piece follows the previous one's *actual* drawn width, not its
      // reserved box, so a short task name doesn't leave a gap before its
      // dates (same reasoning as the overview bar's tag pills).
      // An indented name is cut earlier rather than pushed past the content
      // edge — the same rule as an indented overview bar label.
      const labelX = CONTENT_X_IN + rowIndentIn;
      const dateX = labelX + measureTextWidthIn(label, SUBTASK_TEXT_FONT_SIZE_PT) + SUBTASK_META_GAP_IN;
      const progressX = dateX + dateWidth + dateTrackingWidth + SUBTASK_META_GAP_IN;

      subtasks.push({
        taskId: child.id,
        depth,
        label,
        labelX,
        dateText,
        dateX,
        progressText,
        progressX,
        statusText,
        statusColor: TASK_STATUS_COLORS[status],
        y,
      });
      y += LIST_ROW_HEIGHT_IN;
    });

    y += SECTION_GAP_IN;
  }

  let assigneeText: string | undefined;
  let assigneeY: number | undefined;
  let assigneeMuted: boolean | undefined;
  let assigneeColor: string | undefined;

  if (chunk.showAssignee) {
    assigneeText = chunk.assignee ? `Assigned to: ${chunk.assignee.name}` : 'No assignee';
    assigneeMuted = !chunk.assignee;
    // Matched by name (see the Person.color doc comment) — a real person's
    // color when one's found, COLORS.assigneeFallback for a name that no
    // longer matches anyone in peopleStore, nothing at all when unassigned.
    assigneeColor = chunk.assignee
      ? (people.find((person) => person.name === chunk.assignee?.name)?.color ?? COLORS.assigneeFallback)
      : undefined;
    assigneeY = y;
    y += LIST_ROW_HEIGHT_IN + SECTION_GAP_IN;
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
      assigneeText,
      assigneeY,
      assigneeMuted,
      assigneeColor,
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
 * silently cut off: if the parent's whole subtree, assignee and comments fit
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
function expandCandidateToChunks(candidate: DetailCandidate, people: Person[]): DetailChunk[] {
  const { parent, descendants, relevantComments, totalComments } = candidate;

  const makeChunk = (isFirst: boolean): DetailChunk => ({
    taskId: parent.id,
    parentTitle: isFirst ? parent.label : `${parent.label} (continued)`,
    rows: [],
    showAssignee: isFirst,
    assignee: isFirst ? parent.assignee : undefined,
    commentFragments: [],
    commentsHeadingText: buildCommentsHeading(relevantComments.length, totalComments),
  });

  const chunks: DetailChunk[] = [];
  let current = makeChunk(true);

  const fits = (chunk: DetailChunk) => buildDetailSection(chunk, 0, people).endY <= CONTENT_HEIGHT_IN;
  // "Nothing on it yet", not "no comments yet": a chunk already carrying
  // subtree rows has no room to spare, so the best-effort fallbacks below must
  // not mistake it for a blank slate and let oversized content through.
  const isEmpty = (chunk: DetailChunk) =>
    chunk.rows.length === 0 && chunk.commentFragments.length === 0 && !chunk.showAssignee;
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
    // continuation carries neither the assignee row nor a full-height title
    // block. Worth retrying before resorting to breaking the branch up.
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
function buildDetailSlides(candidates: DetailCandidate[], people: Person[]): DetailSlideModel[] {
  const chunks = candidates.flatMap((candidate) => expandCandidateToChunks(candidate, people));
  if (chunks.length === 0) return [];

  const withHeight = chunks.map((chunk) => ({
    chunk,
    // Height is independent of the starting Y (the layout math is purely
    // additive), so probing at startY = 0 gives the chunk's own height.
    heightIn: buildDetailSection(chunk, 0, people).endY,
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
      const { section, endY } = buildDetailSection(chunk, y, people);
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

/** The top-level (parent) items that would appear on the overview slide for
 * a given item set — same hierarchy rules used by the export settings list
 * and the overview/detail slide builders, so all three always agree on
 * "what counts as a top-level task". Exported so a caller (e.g. the export
 * button) can run `planOverview` itself before generating the file. */
export function getExportParentItems(items: TimelineItem[]): TimelineItem[] {
  const exportableItems = items.filter((item) => item.includeInExport !== false);
  const { roots } = buildTaskHierarchy(exportableItems);
  return roots.map((node) => node.item);
}

/** Filters/groups items exactly like the on-screen Gantt chart and builds a
 * render-engine-agnostic slide model shared by the PPTX and PDF exporters. */
export function buildExportSlides(
  items: TimelineItem[],
  comments: TaskComment[],
  people: Person[],
  commentMode: ExportOptions['commentMode'],
  exportTimeframe: ExportTimeframe | null,
  showDependencies: boolean,
  exportMode: ExportMode = 'compact',
): ExportSlideModel[] {
  const exportableItems = items.filter((item) => item.includeInExport !== false);
  const { roots } = buildTaskHierarchy(exportableItems);
  const parentItems = roots.map((node) => node.item);
  const overviewPlan = planOverview(parentItems, exportTimeframe);

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

  // Which roots have an appendix section is what tells a root the overview left
  // off ("also in the appendix") from one that reaches no slide at all.
  const sectionedIds = new Set(detailCandidates.map((candidate) => candidate.parent.id));

  const slides: ExportSlideModel[] = [
    ...buildOverviewSlides(
      overviewPlan,
      exportTimeframe,
      exportMode,
      showDependencies,
      parentItems,
      sectionedIds,
    ),
    ...buildDetailSlides(detailCandidates, people),
  ];

  slides.push(buildSummarySlide(exportableItems));

  return slides;
}
