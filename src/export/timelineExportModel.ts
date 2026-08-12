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
import { BASE_PX_PER_DAY, getDateRange, getItemBar, groupItemsForExport } from './dateScale';
import { statusColor } from './theme';
import {
  CONTENT_TOP_IN,
  CONTENT_X_IN,
  CONTENT_WIDTH_IN,
  LIST_ROW_HEIGHT_IN,
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
  labelY: number;
  barX: number;
  barY: number;
  trackWidth: number;
  fillWidth: number;
}

export interface OverviewSlideModel {
  kind: 'overview';
  title: string;
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

export interface DetailSlideModel {
  kind: 'detail';
  title: string;
  subtasksHeadingY?: number;
  subtasks: SubtaskRowModel[];
  commentsHeadingY?: number;
  comments: CommentRowModel[];
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

function buildOverviewSlide(parentItems: TimelineItem[], title: string): OverviewSlideModel {
  const bars: OverviewBarModel[] = [];

  if (parentItems.length > 0) {
    const { minDate, totalDays } = getDateRange(parentItems);
    const totalWidthPx = totalDays * BASE_PX_PER_DAY;
    const scale = CONTENT_WIDTH_IN / totalWidthPx;

    parentItems.forEach((item, index) => {
      const { left, width } = getItemBar(item, minDate, BASE_PX_PER_DAY);
      const progress = clampProgress(item.progress ?? 0);
      const rowY = CONTENT_TOP_IN + index * ROW_HEIGHT_IN;
      const barX = CONTENT_X_IN + left * scale;
      const trackWidth = Math.max(width * scale, 0.15);

      const status = getTaskStatus(item);

      bars.push({
        id: item.id,
        label: `${item.label}  ${progress}%`,
        color: statusColor(progress),
        statusText: TASK_STATUS_LABELS[status],
        statusColor: TASK_STATUS_COLORS[status],
        labelY: rowY,
        barX,
        barY: rowY + ROW_LABEL_HEIGHT_IN + ROW_GAP_IN,
        trackWidth,
        fillWidth: progress > 0 ? Math.max((trackWidth * progress) / 100, 0.05) : 0,
      });
    });
  }

  return { kind: 'overview', title, bars };
}

const MAX_OVERVIEW_BARS_PER_SLIDE = 20;

function buildOverviewSlides(parentItems: TimelineItem[]): OverviewSlideModel[] {
  const groups = groupItemsForExport(parentItems, MAX_OVERVIEW_BARS_PER_SLIDE);

  if (groups.length <= 1) {
    return [buildOverviewSlide(parentItems, 'Timeline Overview')];
  }

  return groups.map((group, index) =>
    buildOverviewSlide(group, `Timeline Overview (${index + 1}/${groups.length})`),
  );
}

function buildDetailSlide(
  parent: TimelineItem,
  children: TimelineItem[],
  relevantComments: TaskComment[],
): DetailSlideModel {
  let y = CONTENT_TOP_IN;
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
  }

  return { kind: 'detail', title: parent.label, subtasksHeadingY, subtasks, commentsHeadingY, comments };
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

  const slides: ExportSlideModel[] = [...buildOverviewSlides(parentItems)];

  roots.forEach((parentNode) => {
    const parent = parentNode.item;
    const children = parentNode.children.map((node) => node.item);
    const parentComments = comments.filter((comment) => comment.taskId === parent.id);

    if (children.length === 0 && parentComments.length === 0) return;

    const relevantComments = getCommentsForSlide(comments, parent.id, commentMode);
    slides.push(buildDetailSlide(parent, children, relevantComments));
  });

  slides.push(buildSummarySlide(exportableItems));

  return slides;
}
