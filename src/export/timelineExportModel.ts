import type { ExportOptions } from '../store/timelineStore';
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
import { BASE_PX_PER_DAY, MS_PER_DAY, formatShortDate, getDateRange, getItemBar } from './dateScale';
import { statusColor } from './theme';
import {
  BAR_LABEL_ZONE_MIN_IN,
  CONTENT_HEIGHT_IN,
  CONTENT_TOP_IN,
  CONTENT_X_IN,
  CONTENT_WIDTH_IN,
  GROUP_HEADER_HEIGHT_IN,
  LIST_ROW_HEIGHT_IN,
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
}

export interface OverviewGroupHeaderModel {
  label: string;
  color: string;
  y: number;
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
  groupHeaders: OverviewGroupHeaderModel[];
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

/** Lays out one overview page: a repeating date-scale axis at the top,
 * then each bar, with a status-group heading inserted wherever `headerAt`
 * says one is needed (either a real status change, or a repeated heading
 * because the previous page ended mid-group). */
function buildOverviewSlide(
  pageItems: TimelineItem[],
  headerAt: Map<number, TaskStatus>,
  title: string,
): OverviewSlideModel {
  const bars: OverviewBarModel[] = [];
  const groupHeaders: OverviewGroupHeaderModel[] = [];
  const dateAxisY = CONTENT_TOP_IN;
  let dateTicks: OverviewDateTickModel[] = [];

  if (pageItems.length > 0) {
    const { minDate, totalDays } = getDateRange(pageItems);
    const totalWidthPx = totalDays * BASE_PX_PER_DAY;
    const scale = CONTENT_WIDTH_IN / totalWidthPx;
    dateTicks = buildDateTicks(minDate, totalDays, scale);

    let y = CONTENT_TOP_IN + GROUP_HEADER_HEIGHT_IN;

    pageItems.forEach((item, index) => {
      const headerStatus = headerAt.get(index);
      if (headerStatus !== undefined) {
        groupHeaders.push({ label: TASK_STATUS_LABELS[headerStatus], color: TASK_STATUS_COLORS[headerStatus], y });
        y += GROUP_HEADER_HEIGHT_IN;
      }

      const { left, width } = getItemBar(item, minDate, BASE_PX_PER_DAY);
      const progress = clampProgress(item.progress ?? 0);
      const barX = CONTENT_X_IN + left * scale;
      // Cap how far right the track can extend so its label + status always
      // have BAR_LABEL_ZONE_MIN_IN of room after it, however late/long the
      // task's real date span would otherwise make the bar.
      const maxTrackWidth = Math.max(0.15, CONTENT_X_IN + CONTENT_WIDTH_IN - BAR_LABEL_ZONE_MIN_IN - barX);
      const trackWidth = Math.min(Math.max(width * scale, 0.15), maxTrackWidth);
      const status = getTaskStatus(item);

      bars.push({
        id: item.id,
        label: `${item.label}  ${progress}%`,
        color: statusColor(progress),
        statusText: TASK_STATUS_LABELS[status],
        statusColor: TASK_STATUS_COLORS[status],
        y,
        barX,
        trackWidth,
        fillWidth: progress > 0 ? Math.max((trackWidth * progress) / 100, 0.05) : 0,
      });

      y += ROW_HEIGHT_IN;
    });
  }

  return { kind: 'overview', title, dateAxisY, dateTicks, groupHeaders, bars };
}

interface OverviewPage {
  items: TimelineItem[];
  headerAt: Map<number, TaskStatus>;
}

// Real per-page height budget for the overview: every page reserves one
// GROUP_HEADER_HEIGHT_IN row for the repeating date-scale axis, and each
// status-group heading costs another GROUP_HEADER_HEIGHT_IN on top of its
// bars' own ROW_HEIGHT_IN. Computed, not guessed:
//   CONTENT_HEIGHT_IN       = 4.10625in
//   date axis reservation   = GROUP_HEADER_HEIGHT_IN = 0.26in
//   budget for headers+bars = 4.10625 - 0.26 = 3.84625in
const OVERVIEW_ROWS_HEIGHT_BUDGET_IN = CONTENT_HEIGHT_IN - GROUP_HEADER_HEIGHT_IN;

/** Paginates parent items onto overview pages by real measured height
 * (date axis + status headings + bars), inserting a status-group heading
 * above the first bar of each run of same-status bars — and repeating that
 * heading at the top of a new page if a group gets split across pages, so
 * no bar is ever shown without a visible status heading above it. */
function paginateOverviewItems(parentItems: TimelineItem[]): OverviewPage[] {
  if (parentItems.length === 0) return [];

  const pages: OverviewPage[] = [];
  let currentItems: TimelineItem[] = [];
  let currentHeaderAt = new Map<number, TaskStatus>();
  let usedHeight = 0;
  let lastStatus: TaskStatus | undefined;

  parentItems.forEach((item) => {
    const status = getTaskStatus(item);
    const isNewGroup = status !== lastStatus;
    const rowHeight = ROW_HEIGHT_IN + (isNewGroup ? GROUP_HEADER_HEIGHT_IN : 0);

    if (currentItems.length > 0 && usedHeight + rowHeight > OVERVIEW_ROWS_HEIGHT_BUDGET_IN) {
      pages.push({ items: currentItems, headerAt: currentHeaderAt });
      currentItems = [];
      currentHeaderAt = new Map();
      usedHeight = 0;

      // Starting a fresh page mid-group: repeat the heading so this bar is
      // never shown without one, even though its status didn't change.
      currentHeaderAt.set(0, status);
      usedHeight += GROUP_HEADER_HEIGHT_IN;
    } else if (isNewGroup) {
      currentHeaderAt.set(currentItems.length, status);
      usedHeight += GROUP_HEADER_HEIGHT_IN;
    }

    currentItems.push(item);
    usedHeight += ROW_HEIGHT_IN;
    lastStatus = status;
  });

  if (currentItems.length > 0) pages.push({ items: currentItems, headerAt: currentHeaderAt });

  return pages;
}

function buildOverviewSlides(parentItems: TimelineItem[]): OverviewSlideModel[] {
  const pages = paginateOverviewItems(parentItems);

  if (pages.length <= 1) {
    const headerAt = pages[0]?.headerAt ?? new Map<number, TaskStatus>();
    return [buildOverviewSlide(parentItems, headerAt, 'Timeline Overview')];
  }

  return pages.map((page, index) =>
    buildOverviewSlide(page.items, page.headerAt, `Timeline Overview (${index + 1}/${pages.length})`),
  );
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

/** Filters/groups items exactly like the on-screen Gantt chart and builds a
 * render-engine-agnostic slide model shared by the PPTX and PDF exporters. */
export function buildExportSlides(
  items: TimelineItem[],
  comments: TaskComment[],
  commentMode: ExportOptions['commentMode'],
): ExportSlideModel[] {
  const exportableItems = items.filter((item) => item.includeInExport !== false);
  const { roots } = buildTaskHierarchy(exportableItems);
  const parentItems = roots.map((node) => node.item);

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
    ...buildOverviewSlides(parentItems),
    ...buildDetailSlides(detailCandidates),
  ];

  slides.push(buildSummarySlide(exportableItems));

  return slides;
}
