import pptxgen from 'pptxgenjs';
import { useTimelineStore, type ExportOptions } from '../store/timelineStore';
import type { TaskComment, TimelineItem } from '../types/timeline';
import { BASE_PX_PER_DAY, getDateRange, getItemBar } from './dateScale';

const SLIDE_TITLE_COLOR = '1e293b';
const SLIDE_SUBHEAD_COLOR = '475569';
const SLIDE_TEXT_COLOR = '334155';
const TRACK_COLOR = 'e2e8f0';
const DEFAULT_BAR_COLOR = '3b82f6';

const CHART_X_IN = 0.5;
const CHART_Y_IN = 1.3;
const CHART_WIDTH_IN = 9;
const ROW_HEIGHT_IN = 0.45;
const BAR_HEIGHT_IN = 0.32;

function toHexColor(color: string | undefined) {
  return (color ?? `#${DEFAULT_BAR_COLOR}`).replace('#', '');
}

function clampProgress(progress: number | undefined) {
  return Math.min(100, Math.max(0, progress ?? 0));
}

function buildOverviewSlide(pptx: pptxgen, parentItems: TimelineItem[]) {
  const slide = pptx.addSlide();
  slide.addText('Timeline Overview', {
    x: 0.5,
    y: 0.3,
    w: CHART_WIDTH_IN,
    h: 0.6,
    fontSize: 24,
    bold: true,
    color: SLIDE_TITLE_COLOR,
  });

  if (parentItems.length === 0) {
    slide.addText('No tasks to display.', {
      x: 0.5,
      y: CHART_Y_IN,
      w: CHART_WIDTH_IN,
      h: 0.4,
      fontSize: 14,
      color: SLIDE_SUBHEAD_COLOR,
    });
    return;
  }

  const { minDate, totalDays } = getDateRange(parentItems);
  const totalWidthPx = totalDays * BASE_PX_PER_DAY;
  const scale = CHART_WIDTH_IN / totalWidthPx;

  parentItems.forEach((item, index) => {
    const { left, width } = getItemBar(item, minDate, BASE_PX_PER_DAY);
    const y = CHART_Y_IN + index * ROW_HEIGHT_IN;
    const progress = clampProgress(item.progress);
    const color = toHexColor(item.color);
    const barX = CHART_X_IN + left * scale;
    const barWidth = Math.max(width * scale, 0.15);

    slide.addShape('roundRect', {
      x: barX,
      y,
      w: barWidth,
      h: BAR_HEIGHT_IN,
      fill: { color: TRACK_COLOR },
      line: { color: TRACK_COLOR },
    });

    if (progress > 0) {
      slide.addShape('roundRect', {
        x: barX,
        y,
        w: Math.max((barWidth * progress) / 100, 0.05),
        h: BAR_HEIGHT_IN,
        fill: { color },
        line: { color },
      });
    }

    slide.addText(`${item.label}  ${progress}%`, {
      x: barX,
      y,
      w: Math.max(barWidth, 1.5),
      h: BAR_HEIGHT_IN,
      fontSize: 10,
      color: SLIDE_TITLE_COLOR,
      valign: 'middle',
      margin: 2,
    });
  });
}

function getCommentsForSlide(
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

function buildDetailSlide(
  pptx: pptxgen,
  parent: TimelineItem,
  children: TimelineItem[],
  relevantComments: TaskComment[],
) {
  const slide = pptx.addSlide();
  slide.addText(parent.label, {
    x: 0.5,
    y: 0.3,
    w: CHART_WIDTH_IN,
    h: 0.5,
    fontSize: 22,
    bold: true,
    color: SLIDE_TITLE_COLOR,
  });

  let y = 1.1;

  if (children.length > 0) {
    slide.addText('Subtasks', {
      x: 0.5,
      y,
      w: CHART_WIDTH_IN,
      h: 0.3,
      fontSize: 14,
      bold: true,
      color: SLIDE_SUBHEAD_COLOR,
    });
    y += 0.35;

    children.forEach((child) => {
      const progress = clampProgress(child.progress);
      slide.addText(`${child.label}  —  ${child.start} → ${child.end}  —  ${progress}%`, {
        x: 0.7,
        y,
        w: 8.3,
        h: 0.3,
        fontSize: 12,
        color: SLIDE_TEXT_COLOR,
      });
      y += 0.32;
    });

    y += 0.2;
  }

  if (relevantComments.length > 0) {
    slide.addText('Comments', {
      x: 0.5,
      y,
      w: CHART_WIDTH_IN,
      h: 0.3,
      fontSize: 14,
      bold: true,
      color: SLIDE_SUBHEAD_COLOR,
    });
    y += 0.35;

    relevantComments.forEach((comment) => {
      const date = new Date(comment.createdAt).toLocaleDateString();
      const prefix = comment.isPinned ? '\u{1F4CC} ' : '';
      slide.addText(`${prefix}${comment.body} (${date})`, {
        x: 0.7,
        y,
        w: 8.3,
        h: 0.4,
        fontSize: 11,
        color: SLIDE_TEXT_COLOR,
      });
      y += 0.4;
    });
  }
}

export function exportTimelineToPptx(): void {
  const { items, exportOptions, comments } = useTimelineStore.getState();

  const exportableItems = items.filter((item) => item.includeInExport !== false);
  const parentItems = exportableItems.filter((item) => item.parentId === undefined);

  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';

  buildOverviewSlide(pptx, parentItems);

  parentItems.forEach((parent) => {
    const children = exportableItems.filter((item) => item.parentId === parent.id);
    const parentComments = comments.filter((comment) => comment.taskId === parent.id);

    if (children.length === 0 && parentComments.length === 0) return;

    const relevantComments = getCommentsForSlide(comments, parent.id, exportOptions.commentMode);
    buildDetailSlide(pptx, parent, children, relevantComments);
  });

  pptx.writeFile({ fileName: 'timeline-export.pptx' }).catch((error) => {
    console.error('Failed to export timeline to PowerPoint', error);
  });
}
