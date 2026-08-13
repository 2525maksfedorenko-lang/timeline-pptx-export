import type { ExportOptions, ExportTimeframe } from '../store/timelineStore';
import {
  getTaskStatus,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  type TaskComment,
  type TaskStatus,
  type TimelineItem,
} from '../types/timeline';
import { markdownToPlainLines } from '../utils/renderMarkdown';
import { clampProgress } from '../utils/clampProgress';
import { buildTaskHierarchy } from '../utils/taskHierarchy';
import { daysBetween, BASE_PX_PER_DAY, MS_PER_DAY, formatShortDate, getDateRange, getItemBar } from './dateScale';
import { statusColor } from './theme';
import {
  BAR_LABEL_ZONE_MIN_IN,
  CONTENT_HEIGHT_IN,
  CONTENT_TOP_IN,
  CONTENT_X_IN,
  CONTENT_WIDTH_IN,
  DIMENSION_LINE_GAP_IN,
  DIMENSION_TICK_HEIGHT_IN,
  GROUP_HEADER_HEIGHT_IN,
  LIST_ROW_HEIGHT_IN,
  MAX_OVERVIEW_BARS_PER_SLIDE,
  MIN_TRACK_WIDTH_IN,
  PARENT_SECTION_GAP_IN,
  ROW_GAP_IN,
  ROW_HEIGHT_IN,
  ROW_LABEL_HEIGHT_IN,
  SECTION_GAP_IN,
} from './slideLayout';

export interface OverviewBarModel {
  id: string;
  label: string;
  color: string;
  statusText: string;
  statusColor: string;
  y: number;
  barX: number;
  trackWidth: number;
  fillWidth: number;
  // Technical-drawing-style dimension line above the bar: the task's real
  // (unclipped) start/end dates, always shown even if the bar itself is
  // visually cut off by an export timeframe window.
  dimensionLabel: string;
  dimensionLabelY: number;
  dimensionLineY: number;
  // True when the task's real start/end falls outside the export timeframe
  // window, so the bar is drawn clipped at that edge with a chevron marker.
  chevronLeft: boolean;
  chevronRight: boolean;
}

export interface OverviewDateTickModel {
  label: string;
  x: number;
}

export interface OverviewSlideModel {
  kind: 'overview';
  title: string;
  dateAxisY: number;
  dateTicks: OverviewDateTickModel[];
  bars: OverviewBarModel[];
}

export interface SubtaskRowModel {
  text: string;
  color: string;
  statusText: string;
  statusColor: string;
  y: number;
}

export interface CommentRowModel {
  text: string;
  y: number;
}

export interface DetailSectionModel {
  parentTitle: string;
  parentTitleY: number;
  subtasksHeadingY?: number;
  subtasks: SubtaskRowModel[];
  commentsHeadingY?: number;
  comments: CommentRowModel[];
}

export interface DetailSlideModel {
  kind: 'detail';
  title: string;
  sections: DetailSectionModel[];
}

export interface SummarySegmentModel {
  status: TaskStatus;
  label: string;
  color: string;
  count: number;
  percent: number;
}

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

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'done', 'blocked'];

function buildSummarySlide(items: TimelineItem[]): SummarySlideModel {
  const counts: Record<TaskStatus, number> = { todo: 0, in_progress: 0, done: 0, blocked: 0 };
  items.forEach((item) => {
    counts[getTaskStatus(item)] += 1;
  });

  const total = items.length;
  const segments: SummarySegmentModel[] = STATUS_ORDER.filter((status) => counts[status] > 0).map((status) => ({
    status,
    label: TASK_STATUS_LABELS[status],
    color: TASK_STATUS_COLORS[status],
    count: counts[status],
    percent: total > 0 ? Math.round((counts[status] / total) * 100) : 0,
  }));

  const completedPercent = total > 0 ? Math.round((counts.done / total) * 100) : 0;

  return {
    kind: 'summary',
    title: 'Summary',
    segments,
    stats: [
      { label: 'Total tasks', value: `${total}` },
      { label: 'Completed', value: `${counts.done} (${completedPercent}%)` },
      { label: 'At risk (blocked)', value: `${counts.blocked}` },
    ],
  };
}

const OVERVIEW_DATE_TICK_COUNT = 6;

/** Evenly spaced date labels across the slide's date range (there isn't
 * room for one label per day like the on-screen day header, since an
 * overview slide can span months in ~9in of width). */
function buildDateTicks(minDate: Date, totalDays: number, scale: number): OverviewDateTickModel[] {
  const tickCount = Math.max(1, Math.min(OVERVIEW_DATE_TICK_COUNT, totalDays));

  return Array.from({ length: tickCount }, (_, i) => {
    const dayOffset = tickCount === 1 ? 0 : Math.round((i * (totalDays - 1)) / (tickCount - 1));
    const tickDate = new Date(minDate.getTime() + dayOffset * MS_PER_DAY);
    return {
      label: formatShortDate(tickDate),
      x: CONTENT_X_IN + dayOffset * BASE_PX_PER_DAY * scale,
    };
  });
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

/** Lays out the (single) overview slide: a date-scale axis at the top, then
 * one bar per item, each with its own dimension-line annotation showing its
 * real start/end dates. If an export timeframe window is set and a task's
 * real dates fall outside it, the bar is clipped to the content edge and
 * flagged with a chevron — but its dimension label always shows the task's
 * real, unclipped dates, and its progress is unaffected by the clip. */
function buildOverviewSlide(items: TimelineItem[], timeframe: ExportTimeframe | null, title: string): OverviewSlideModel {
  const bars: OverviewBarModel[] = [];
  const dateAxisY = CONTENT_TOP_IN;
  let dateTicks: OverviewDateTickModel[] = [];

  if (items.length > 0) {
    const fullRange = getDateRange(items);
    const minDate = timeframe ? new Date(timeframe.start) : fullRange.minDate;
    const maxDate = timeframe ? new Date(timeframe.end) : fullRange.maxDate;
    const totalDays = daysBetween(minDate, maxDate) + 1;
    const totalWidthPx = totalDays * BASE_PX_PER_DAY;
    const scale = CONTENT_WIDTH_IN / totalWidthPx;
    dateTicks = buildDateTicks(minDate, totalDays, scale);

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

      const barY = y + DIMENSION_TICK_HEIGHT_IN;

      bars.push({
        id: item.id,
        label: `${item.label}  ${progress}%`,
        color: statusColor(progress),
        statusText: TASK_STATUS_LABELS[status],
        statusColor: TASK_STATUS_COLORS[status],
        y: barY,
        barX,
        trackWidth,
        fillWidth: progress > 0 ? Math.max((trackWidth * progress) / 100, 0.05) : 0,
        dimensionLabel: `${formatShortDate(new Date(item.start))} – ${formatShortDate(new Date(item.end))}`,
        dimensionLabelY: y,
        dimensionLineY: barY - DIMENSION_LINE_GAP_IN,
        chevronLeft,
        chevronRight,
      });

      y += ROW_HEIGHT_IN;
    });
  }

  return { kind: 'overview', title, dateAxisY, dateTicks, bars };
}

interface DetailCandidate {
  parent: TimelineItem;
  children: TimelineItem[];
  relevantComments: TaskComment[];
}

/** Lays out one parent's subtasks/comments block starting at `startY`,
 * returning both the section model (with absolute Y coordinates) and the Y
 * where it ends — so a caller can measure a section's height (by calling
 * with startY = 0) before deciding whether it fits on the current slide, or
 * stack several sections on one slide by chaining `endY` into the next
 * section's `startY`. */
function buildDetailSection(candidate: DetailCandidate, startY: number): { section: DetailSectionModel; endY: number } {
  const { parent, children, relevantComments } = candidate;

  let y = startY;
  const parentTitleY = y;
  y += ROW_LABEL_HEIGHT_IN + ROW_GAP_IN;

  const subtasks: SubtaskRowModel[] = [];
  let subtasksHeadingY: number | undefined;

  if (children.length > 0) {
    subtasksHeadingY = y;
    y += ROW_LABEL_HEIGHT_IN + ROW_GAP_IN;

    children.forEach((child) => {
      const progress = clampProgress(child.progress ?? 0);
      const status = getTaskStatus(child);
      subtasks.push({
        text: `${child.label}  —  ${child.start} → ${child.end}  —  ${progress}%`,
        color: statusColor(progress),
        statusText: TASK_STATUS_LABELS[status],
        statusColor: TASK_STATUS_COLORS[status],
        y,
      });
      y += LIST_ROW_HEIGHT_IN;
    });

    y += SECTION_GAP_IN;
  }

  const comments: CommentRowModel[] = [];
  let commentsHeadingY: number | undefined;

  if (relevantComments.length > 0) {
    commentsHeadingY = y;
    y += ROW_LABEL_HEIGHT_IN + ROW_GAP_IN;

    relevantComments.forEach((comment) => {
      const date = new Date(comment.createdAt).toLocaleDateString();
      const prefix = comment.isPinned ? '\u{1F4CC} ' : '';
      const bodyLines = markdownToPlainLines(comment.body);

      bodyLines.forEach((line, index) => {
        const isLast = index === bodyLines.length - 1;
        const text = index === 0 ? `${prefix}${line}` : line;
        comments.push({ text: isLast ? `${text} (${date})` : text, y });
        y += LIST_ROW_HEIGHT_IN;
      });
    });

    y += SECTION_GAP_IN;
  }

  return {
    section: { parentTitle: parent.label, parentTitleY, subtasksHeadingY, subtasks, commentsHeadingY, comments },
    endY: y,
  };
}

/** Packs parent sections onto appendix slides by their actual measured
 * height (not a fixed count per slide — sections vary a lot depending on
 * how many subtasks/comments a parent has), so several parents share a
 * slide whenever they fit within CONTENT_HEIGHT_IN. */
function buildDetailSlides(candidates: DetailCandidate[]): DetailSlideModel[] {
  if (candidates.length === 0) return [];

  const withHeight = candidates.map((candidate) => ({
    candidate,
    // Height is independent of the starting Y (the layout math is purely
    // additive), so probing at startY = 0 gives the section's own height.
    heightIn: buildDetailSection(candidate, 0).endY,
  }));

  const groups: DetailCandidate[][] = [];
  let currentGroup: DetailCandidate[] = [];
  let usedHeight = 0;

  withHeight.forEach(({ candidate, heightIn }) => {
    const additionalHeight = currentGroup.length === 0 ? heightIn : PARENT_SECTION_GAP_IN + heightIn;

    if (currentGroup.length > 0 && usedHeight + additionalHeight > CONTENT_HEIGHT_IN) {
      groups.push(currentGroup);
      currentGroup = [];
      usedHeight = 0;
    }

    currentGroup.push(candidate);
    usedHeight += currentGroup.length === 1 ? heightIn : PARENT_SECTION_GAP_IN + heightIn;
  });

  if (currentGroup.length > 0) groups.push(currentGroup);

  return groups.map((group, index) => {
    let y = CONTENT_TOP_IN;
    const sections = group.map((candidate) => {
      const { section, endY } = buildDetailSection(candidate, y);
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
    buildOverviewSlide(overviewPlan.included, exportTimeframe, 'Timeline Overview'),
    ...buildDetailSlides(detailCandidates),
  ];

  slides.push(buildSummarySlide(exportableItems));

  return slides;
}
