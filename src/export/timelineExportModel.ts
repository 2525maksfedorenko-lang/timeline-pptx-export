import type { ExportOptions, ExportTimeframe } from '../store/timelineStore';
import {
  getTaskStatus,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  type TaskComment,
  type TimelineItem,
} from '../types/timeline';
import { parseMarkdownBlocks, type MarkdownBlock } from '../utils/renderMarkdown';
import { getStatusSegments, type StatusSegment } from '../utils/dashboardMetrics';
import { clampProgress } from '../utils/clampProgress';
import { needsDarkText } from '../utils/colorContrast';
import { buildTaskHierarchy } from '../utils/taskHierarchy';
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
  type DateGridMark,
} from './dateGrid';
import { measureTextWidthIn } from './textMetrics';
import { COLORS, statusColor } from './theme';
import {
  BAR_HEIGHT_IN,
  BAR_LABEL_FONT_SIZE_PT,
  BAR_LABEL_PADDING_IN,
  BAR_LABEL_ZONE_MIN_IN,
  BAR_PROGRESS_FONT_SIZE_PT,
  BAR_PROGRESS_PADDING_IN,
  BAR_STATUS_FONT_SIZE_PT,
  COMMENT_BLOCK_GAP_IN,
  COMMENT_GAP_IN,
  COMMENT_HEADING_ROW_HEIGHT_IN,
  COMMENT_LINE_HEIGHT_IN,
  COMMENT_META_ROW_HEIGHT_IN,
  COMMENT_TABLE_HEADER_ROW_HEIGHT_IN,
  COMMENT_TABLE_ROW_HEIGHT_IN,
  CONTENT_HEIGHT_IN,
  CONTENT_TOP_IN,
  CONTENT_X_IN,
  CONTENT_WIDTH_IN,
  DEPENDENCY_JOG_IN,
  DETAIL_ROW_INDENT_IN,
  GROUP_HEADER_HEIGHT_IN,
  LABEL_STATUS_GAP_IN,
  LIST_ROW_HEIGHT_IN,
  MAX_OVERVIEW_BARS_PER_SLIDE,
  MIN_TRACK_WIDTH_IN,
  PARENT_SECTION_GAP_IN,
  ROW_GAP_IN,
  ROW_HEIGHT_IN,
  ROW_LABEL_HEIGHT_IN,
  SECTION_GAP_IN,
  SUBTASK_STATUS_FONT_SIZE_PT,
  SUBTASK_TEXT_FONT_SIZE_PT,
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

export interface OverviewBarModel {
  id: string;
  label: string;
  // Where the label starts and how much room it gets — normally just past
  // the track, but pushed further right when a progress text drawn outside a
  // narrow fill ends past the track's own right edge.
  labelX: number;
  labelWidth: number;
  color: string;
  statusText: string;
  statusColor: string;
  y: number;
  barX: number;
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
  // 1 segment for a same-row (straight) connector, 3 for the bracket-shaped
  // right/down-or-up/right elbow ("┐" + "└") otherwise.
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
  bars: OverviewBarModel[];
  // Empty when exportOptions.showDependencies is off, or for any dependency
  // whose predecessor/successor didn't make it onto this slide (excluded
  // from export, outside the timeframe window, or truncated by overflow) —
  // silently omitted rather than drawn as a bracket to nowhere.
  dependencyConnectors: OverviewConnectorModel[];
  // How many in-range parent tasks didn't fit on this slide and were left
  // off entirely — surfaced in the footer so the omission is visible in the
  // exported file itself, not just in the dialog shown before export (see
  // ExportOverflowModal). Always 0 in 'full' mode, which pages the overflow
  // onto further slides instead of dropping it.
  omittedCount: number;
}

export interface SubtaskRowModel {
  text: string;
  color: string;
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

// Horizontal room a date caption ("Sep 01") needs before the next one may
// start. Measured against the week captions, which are the smaller of the
// two sizes and therefore the ones that crowd first.
const AXIS_LABEL_MIN_PITCH_IN = 0.5;

/** Date captions for the overview axis: one per month line, plus week-line
 * captions wherever they still fit. Week captions are thinned to every Nth
 * week once consecutive ones would sit closer than a caption is wide (a
 * 3-month range packs weeks ~0.2in apart at slide scale), and any that would
 * collide with a month caption is dropped in favor of it. Day lines get no
 * caption at any range — see OverviewAxisLabelModel. */
function buildAxisLabels(grid: DateGrid, toX: (mark: DateGridMark) => number): OverviewAxisLabelModel[] {
  const monthLabels: OverviewAxisLabelModel[] = grid.month.map((mark) => ({
    level: 'month',
    text: formatShortDate(mark.date),
    x: toX(mark),
  }));

  const weekPitch = grid.week.length > 1 ? toX(grid.week[1]) - toX(grid.week[0]) : Infinity;
  const stride = weekPitch > 0 ? Math.max(1, Math.ceil(AXIS_LABEL_MIN_PITCH_IN / weekPitch)) : 1;

  const weekLabels: OverviewAxisLabelModel[] = grid.week
    .filter((_, index) => index % stride === 0)
    .map((mark) => ({ level: 'week' as const, text: formatShortDate(mark.date), x: toX(mark) }))
    .filter((label) => monthLabels.every((month) => Math.abs(month.x - label.x) >= AXIS_LABEL_MIN_PITCH_IN));

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

/** The date span every overview slide of one export is drawn against. */
interface OverviewWindow {
  minDate: Date;
  maxDate: Date;
}

/** The window for a set of overview slides: the export timeframe when one is
 * set, otherwise the full span of the items being drawn. Computed once for
 * the whole export rather than per slide, so 'full' mode's pages all share a
 * single axis — pages drawn to their own scales couldn't be read against
 * each other. Null when there's nothing to draw. */
function getOverviewWindow(items: TimelineItem[], timeframe: ExportTimeframe | null): OverviewWindow | null {
  if (items.length === 0) return null;
  if (timeframe) return { minDate: new Date(timeframe.start), maxDate: new Date(timeframe.end) };

  const { minDate, maxDate } = getDateRange(items);
  return { minDate, maxDate };
}

/** Lays out one overview slide: a date-scale axis at the top, then one bar
 * per item. If a task's real dates fall outside `dateWindow`, the bar is
 * clipped to the content edge and flagged with a chevron — but its progress
 * is unaffected by the clip. */
function buildOverviewSlide(
  items: TimelineItem[],
  dateWindow: OverviewWindow | null,
  title: string,
  omittedCount: number,
  showDependencies: boolean,
): OverviewSlideModel {
  const bars: OverviewBarModel[] = [];
  const dateAxisY = CONTENT_TOP_IN;
  let gridLines: OverviewGridLineModel[] = [];
  let axisLabels: OverviewAxisLabelModel[] = [];

  if (dateWindow && items.length > 0) {
    const { minDate, maxDate } = dateWindow;
    const totalDays = daysBetween(minDate, maxDate) + 1;
    const totalWidthPx = totalDays * BASE_PX_PER_DAY;
    const scale = CONTENT_WIDTH_IN / totalWidthPx;

    const grid = buildDateGrid(minDate, maxDate);
    const toX = (mark: DateGridMark) => CONTENT_X_IN + mark.dayOffset * BASE_PX_PER_DAY * scale;
    gridLines = DATE_GRID_LEVELS.flatMap((level) =>
      grid[level].map((mark) => ({ level, x: toX(mark) })),
    );
    axisLabels = buildAxisLabels(grid, toX);

    let y = CONTENT_TOP_IN + GROUP_HEADER_HEIGHT_IN;

    items.forEach((item) => {
      const { left, width } = getItemBar(item, minDate, BASE_PX_PER_DAY);
      const progress = clampProgress(item.progress ?? 0);
      const status = getTaskStatus(item);

      // Raw (unclamped) horizontal extent, in inches from CONTENT_X_IN — used
      // only to detect whether the real task dates spill outside the window;
      // never used directly to draw, since it can be negative or exceed
      // CONTENT_WIDTH_IN.
      const rawLeftIn = left * scale;
      const rawRightIn = (left + width) * scale;
      const chevronLeft = rawLeftIn < -0.001;
      const chevronRight = rawRightIn > CONTENT_WIDTH_IN + 0.001;

      const clippedLeftIn = Math.max(rawLeftIn, 0);
      const clippedRightIn = Math.min(rawRightIn, CONTENT_WIDTH_IN);

      // Cap how far right the bar can even *start*, so its label + status
      // always have BAR_LABEL_ZONE_MIN_IN of room after it — otherwise a
      // task clipped to a sliver right at the timeframe window's edge would
      // leave its track's own left edge with no room for a label at all.
      const maxLeftIn = Math.max(0, CONTENT_WIDTH_IN - BAR_LABEL_ZONE_MIN_IN - MIN_TRACK_WIDTH_IN);
      const barX = CONTENT_X_IN + Math.min(clippedLeftIn, maxLeftIn);

      // Cap how far right the track can extend so its label + status always
      // have BAR_LABEL_ZONE_MIN_IN of room after it, however late/long the
      // task's real date span would otherwise make the bar.
      const maxTrackWidth = Math.max(MIN_TRACK_WIDTH_IN, CONTENT_X_IN + CONTENT_WIDTH_IN - BAR_LABEL_ZONE_MIN_IN - barX);
      const windowClippedWidth = Math.max(clippedRightIn - (barX - CONTENT_X_IN), 0);
      const trackWidth = Math.min(Math.max(windowClippedWidth, MIN_TRACK_WIDTH_IN), maxTrackWidth);
      const fillWidth = progress > 0 ? Math.max((trackWidth * progress) / 100, 0.05) : 0;
      const barColor = statusColor(progress);

      // The progress text goes inside the fill only when the fill measurably
      // holds it at the size it's actually drawn — not at some percentage of
      // the bar, which says nothing about how wide "100%" renders on a track
      // that may itself be a fraction of an inch wide.
      const progressText = `${progress}%`;
      const progressTextWidth = measureTextWidthIn(progressText, BAR_PROGRESS_FONT_SIZE_PT);
      const progressInsideFill = fillWidth >= progressTextWidth + BAR_PROGRESS_PADDING_IN * 2;
      const progressX = progressInsideFill ? barX : barX + fillWidth + BAR_PROGRESS_PADDING_IN;
      const progressWidth = progressInsideFill ? fillWidth : progressTextWidth;

      const labelX = Math.max(barX + trackWidth, progressX + progressWidth) + BAR_LABEL_PADDING_IN;

      // The label and the status text are two independently-positioned
      // textboxes sharing one row. Reserve the status's own measured width
      // (plus a small gap) out of the label's box first, so a label long
      // enough to reach that far is truncated with an ellipsis instead of
      // visually overlapping the status — which stays untouched and fully
      // readable either way.
      const statusText = TASK_STATUS_LABELS[status];
      const statusTextWidth = measureTextWidthIn(statusText, BAR_STATUS_FONT_SIZE_PT);
      const labelWidth = Math.max(
        CONTENT_X_IN + CONTENT_WIDTH_IN - labelX - statusTextWidth - LABEL_STATUS_GAP_IN,
        0,
      );
      const label = truncateToWidth(item.label, BAR_LABEL_FONT_SIZE_PT, labelWidth);

      bars.push({
        id: item.id,
        label,
        labelX,
        labelWidth,
        color: barColor,
        statusText,
        statusColor: TASK_STATUS_COLORS[status],
        y,
        barX,
        trackWidth,
        fillWidth,
        progressText,
        progressX,
        progressWidth,
        progressInsideFill,
        // Light text only where it's readable: on the fill when that fill is
        // dark enough, dark navy otherwise (including every outside label,
        // which sits on the light gray track).
        progressColor: progressInsideFill && !needsDarkText(barColor) ? COLORS.lightText : COLORS.navy,
        chevronLeft,
        chevronRight,
      });

      y += ROW_HEIGHT_IN;
    });
  }

  const dependencyConnectors = showDependencies ? buildDependencyConnectors(items, bars) : [];

  return { kind: 'overview', title, dateAxisY, gridLines, axisLabels, bars, dependencyConnectors, omittedCount };
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
): OverviewSlideModel[] {
  const isPaged = exportMode === 'full' && plan.inRange.length > plan.capacity;
  const drawnItems = isPaged ? plan.inRange : plan.included;
  const dateWindow = getOverviewWindow(drawnItems, timeframe);

  if (!isPaged) {
    const omittedCount = plan.inRange.length - plan.included.length;
    return [buildOverviewSlide(drawnItems, dateWindow, 'Timeline Overview', omittedCount, showDependencies)];
  }

  const pages: TimelineItem[][] = [];
  for (let i = 0; i < drawnItems.length; i += plan.capacity) {
    pages.push(drawnItems.slice(i, i + plan.capacity));
  }

  return pages.map((pageItems, index) =>
    buildOverviewSlide(
      pageItems,
      dateWindow,
      `Timeline Overview (${index + 1}/${pages.length})`,
      0,
      showDependencies,
    ),
  );
}

/** One connector per (successor, predecessor-id) pair, reusing each bar's
 * already-computed position — never recomputed from item dates. A
 * predecessor/successor missing from `barById` means it isn't on this slide
 * (excluded from export, outside the timeframe window, cut by compact-mode
 * truncation, or sitting on another page in 'full' mode), so that connector
 * is dropped rather than drawn to nowhere. */
function buildDependencyConnectors(items: TimelineItem[], bars: OverviewBarModel[]): OverviewConnectorModel[] {
  const barById = new Map(bars.map((bar) => [bar.id, bar]));

  return items.flatMap((item) => {
    const successorBar = barById.get(item.id);
    if (!successorBar) return [];

    return (item.dependencies ?? []).flatMap((depId) => {
      const predecessorBar = barById.get(depId);
      if (!predecessorBar) return [];

      const x1 = predecessorBar.barX + predecessorBar.trackWidth;
      const y1 = predecessorBar.y + BAR_HEIGHT_IN / 2;
      const x2 = successorBar.barX;
      const y2 = successorBar.y + BAR_HEIGHT_IN / 2;

      const segments: DependencyConnectorSegment[] =
        y1 === y2
          ? [{ x1, y1, x2, y2 }]
          : [
              { x1, y1, x2: x1 + DEPENDENCY_JOG_IN, y2: y1 },
              { x1: x1 + DEPENDENCY_JOG_IN, y1, x2: x1 + DEPENDENCY_JOG_IN, y2 },
              { x1: x1 + DEPENDENCY_JOG_IN, y1: y2, x2, y2 },
            ];

      return [{ id: `${depId}->${item.id}`, segments }];
    });
  });
}

interface DetailCandidate {
  parent: TimelineItem;
  children: TimelineItem[];
  relevantComments: TaskComment[];
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

/** One self-contained chunk of a parent's detail content: subtasks +
 * assignee + a slice of its comments' fragments. Almost always one chunk per
 * parent — split into further "(continued)" chunks only when a parent's
 * comments are too long to fit on a single slide even alone (see
 * expandCandidateToChunks), splitting at block boundaries within a comment
 * if needed, so a block is never silently cut off instead of continuing on
 * a new slide. */
interface DetailChunk {
  parentTitle: string;
  children: TimelineItem[];
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
const COMMENT_BODY_FONT_SIZE = 11;

/** Estimates one markdown block's rendered height. Used both to lay out a
 * comment's blocks (layoutMarkdownBlocks) and, at the same per-block
 * granularity, to decide where a comment needs to be split across slides
 * (expandCandidateToChunks) — the two always agree on what fits. */
function estimateBlockHeight(block: MarkdownBlock): number {
  if (block.type === 'heading') return COMMENT_HEADING_ROW_HEIGHT_IN;

  if (block.type === 'paragraph') {
    return estimateWrappedLines(block.text, COMMENT_BODY_FONT_SIZE, COMMENT_BODY_WIDTH_IN) * COMMENT_LINE_HEIGHT_IN;
  }

  if (block.type === 'list') {
    const totalLines = block.items.reduce(
      (sum, item) =>
        sum + estimateWrappedLines(item, COMMENT_BODY_FONT_SIZE, COMMENT_BODY_WIDTH_IN - COMMENT_LIST_BULLET_INDENT_IN),
      0,
    );
    return Math.max(totalLines, 1) * COMMENT_LINE_HEIGHT_IN;
  }

  return COMMENT_TABLE_HEADER_ROW_HEIGHT_IN + block.rows.length * COMMENT_TABLE_ROW_HEIGHT_IN;
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
function buildDetailSection(chunk: DetailChunk, startY: number): { section: DetailSectionModel; endY: number } {
  let y = startY;
  const parentTitleY = y;
  y += ROW_LABEL_HEIGHT_IN + ROW_GAP_IN;

  const subtasks: SubtaskRowModel[] = [];
  let subtasksHeadingY: number | undefined;

  if (chunk.children.length > 0) {
    subtasksHeadingY = y;
    y += ROW_LABEL_HEIGHT_IN + ROW_GAP_IN;

    chunk.children.forEach((child) => {
      const progress = clampProgress(child.progress ?? 0);
      const status = getTaskStatus(child);
      const statusText = TASK_STATUS_LABELS[status];

      // Same collision to guard against as an overview bar's label/status
      // (see truncateToWidth): the row's label is the flexible part, so it's
      // what gets truncated — the trailing dates/progress and the status
      // both stay intact and fully readable.
      const meta = `  —  ${child.start} → ${child.end}  —  ${progress}%`;
      const statusTextWidth = measureTextWidthIn(statusText, SUBTASK_STATUS_FONT_SIZE_PT);
      const availableWidth =
        CONTENT_WIDTH_IN -
        DETAIL_ROW_INDENT_IN -
        statusTextWidth -
        LABEL_STATUS_GAP_IN -
        measureTextWidthIn(meta, SUBTASK_TEXT_FONT_SIZE_PT);
      const label = truncateToWidth(child.label, SUBTASK_TEXT_FONT_SIZE_PT, Math.max(availableWidth, 0));

      subtasks.push({
        text: `${label}${meta}`,
        color: statusColor(progress),
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

  if (chunk.showAssignee) {
    assigneeText = chunk.assignee ? `Assigned to: ${chunk.assignee.name}` : 'No assignee';
    assigneeMuted = !chunk.assignee;
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
      parentTitle: chunk.parentTitle,
      parentTitleY,
      subtasksHeadingY,
      subtasks,
      assigneeText,
      assigneeY,
      assigneeMuted,
      commentsHeadingY,
      commentsHeadingText: chunk.commentFragments.length > 0 ? chunk.commentsHeadingText : undefined,
      comments,
    },
    endY: y,
  };
}

/** Splits one parent's detail content into one or more chunks so nothing is
 * silently cut off: if the parent's subtasks/assignee/comments all fit
 * within one slide's content height, there's a single chunk as before;
 * otherwise comments spill into "(continued)" chunks that repeat the
 * parent's title. When even one comment's blocks don't fit in a fresh
 * chunk, it's split at block boundaries (e.g. a heading+paragraph+list on
 * one slide, a trailing table continuing on the next) rather than accepted
 * as a single oversized chunk — letting a block-level element like a table
 * overflow a slide's bounds is what previously made jsPDF's table plugin
 * silently insert its own extra page when asked to draw past the bottom of
 * the content area. Chunks (possibly from different parents) are then
 * packed onto slides by buildDetailSlides exactly like whole sections used
 * to be. */
function expandCandidateToChunks(candidate: DetailCandidate): DetailChunk[] {
  const { parent, children, relevantComments } = candidate;

  const makeChunk = (isFirst: boolean): DetailChunk => ({
    parentTitle: isFirst ? parent.label : `${parent.label} (continued)`,
    children: isFirst ? children : [],
    showAssignee: isFirst,
    assignee: isFirst ? parent.assignee : undefined,
    commentFragments: [],
    commentsHeadingText: isFirst ? 'Comments' : 'Comments (continued)',
  });

  if (relevantComments.length === 0) return [makeChunk(true)];

  const chunks: DetailChunk[] = [];
  let current = makeChunk(true);

  const fits = (chunk: DetailChunk) => buildDetailSection(chunk, 0).endY <= CONTENT_HEIGHT_IN;
  const isEmpty = (chunk: DetailChunk) => chunk.commentFragments.length === 0;
  const withFragment = (chunk: DetailChunk, fragment: CommentFragment): DetailChunk => ({
    ...chunk,
    commentFragments: [...chunk.commentFragments, fragment],
  });
  const startNewChunk = () => {
    chunks.push(current);
    current = makeChunk(false);
  };

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

  chunks.push(current);
  return chunks;
}

/** Packs parent chunks onto appendix slides by their actual measured height
 * (not a fixed count per slide — sections vary a lot depending on how many
 * subtasks/comments a parent has), so several chunks share a slide whenever
 * they fit within CONTENT_HEIGHT_IN. */
function buildDetailSlides(candidates: DetailCandidate[]): DetailSlideModel[] {
  const chunks = candidates.flatMap(expandCandidateToChunks);
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
  commentMode: ExportOptions['commentMode'],
  exportTimeframe: ExportTimeframe | null,
  showDependencies: boolean,
  exportMode: ExportMode = 'compact',
): ExportSlideModel[] {
  const exportableItems = items.filter((item) => item.includeInExport !== false);
  const { roots } = buildTaskHierarchy(exportableItems);
  const parentItems = roots.map((node) => node.item);
  const overviewPlan = planOverview(parentItems, exportTimeframe);

  const detailCandidates: DetailCandidate[] = [];
  roots.forEach((parentNode) => {
    const parent = parentNode.item;
    const children = parentNode.children.map((node) => node.item);
    const parentComments = comments.filter((comment) => comment.taskId === parent.id);

    if (children.length === 0 && parentComments.length === 0) return;

    const relevantComments = getCommentsForSlide(comments, parent.id, commentMode);
    detailCandidates.push({ parent, children, relevantComments });
  });

  const slides: ExportSlideModel[] = [
    ...buildOverviewSlides(overviewPlan, exportTimeframe, exportMode, showDependencies),
    ...buildDetailSlides(detailCandidates),
  ];

  slides.push(buildSummarySlide(exportableItems));

  return slides;
}
