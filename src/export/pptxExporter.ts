import pptxgen from 'pptxgenjs';
import type { ExportOptions } from '../store/timelineStore';
import type { TaskComment, TimelineItem } from '../types/timeline';
import { sortItems } from '../utils/sortItems';
import {
  buildExportSlides,
  type CommentBlockRowModel,
  type DetailSlideModel,
  type ExportMode,
  type OverviewSlideModel,
  type SummarySlideModel,
} from './timelineExportModel';
import { buildDashboardSlides, type DashboardTable, type DashboardTableSlideModel } from './dashboardSlides';
import { getQrCodeDataUrl, getSummaryQrCodes, type QrCodeModel } from './qrCode';
import { COLORS, FOOTER_TEXT, PPTX_FONT_FACE } from './theme';
import {
  BAR_HEIGHT_IN,
  BAR_PROGRESS_FONT_SIZE_PT,
  BAR_RADIUS_IN,
  COMMENT_META_ROW_HEIGHT_IN,
  CONTENT_BOTTOM_IN,
  CONTENT_TOP_IN,
  CONTENT_WIDTH_IN,
  CONTENT_X_IN,
  DEPENDENCY_LINE_WIDTH_PT,
  FOOTER_HEIGHT_IN,
  GRID_LINE_WIDTH_PT,
  GROUP_HEADER_HEIGHT_IN,
  HEADER_HEIGHT_IN,
  LIST_ROW_HEIGHT_IN,
  PAGE_HEIGHT_IN,
  PAGE_WIDTH_IN,
  ROW_LABEL_HEIGHT_IN,
  WEEK_GRID_LINE_WIDTH_PT,
  WEEK_TICK_HEIGHT_IN,
} from './slideLayout';

// Comment blocks are indented slightly from the section's left edge, same as
// the subtask rows above them.
const COMMENT_BODY_X_IN = CONTENT_X_IN + 0.2;
const COMMENT_BODY_WIDTH_IN = CONTENT_WIDTH_IN - 0.2;
const COMMENT_HEADING_FONT_SIZE: Record<1 | 2 | 3, number> = { 1: 16, 2: 14, 3: 12 };
const COMMENT_BODY_FONT_SIZE = 11;
const COMMENT_TABLE_FONT_SIZE = 10;

const CHEVRON_WIDTH_IN = 0.14;

type PptxSlide = ReturnType<pptxgen['addSlide']>;

function drawChrome(slide: PptxSlide, title: string) {
  slide.background = { color: COLORS.slideBg };

  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: PAGE_WIDTH_IN,
    h: HEADER_HEIGHT_IN,
    fill: { color: COLORS.navy },
    line: { color: COLORS.navy },
  });
  slide.addText(title, {
    x: CONTENT_X_IN,
    y: 0,
    w: CONTENT_WIDTH_IN,
    h: HEADER_HEIGHT_IN,
    fontSize: 24,
    bold: true,
    color: COLORS.lightText,
    fontFace: PPTX_FONT_FACE,
    valign: 'middle',
  });

  const footerY = PAGE_HEIGHT_IN - FOOTER_HEIGHT_IN;
  slide.addShape('rect', {
    x: 0,
    y: footerY,
    w: PAGE_WIDTH_IN,
    h: FOOTER_HEIGHT_IN,
    fill: { color: COLORS.border },
    line: { color: COLORS.border },
  });
  slide.addText(FOOTER_TEXT, {
    x: CONTENT_X_IN,
    y: footerY,
    w: CONTENT_WIDTH_IN,
    h: FOOTER_HEIGHT_IN,
    fontSize: 8,
    color: COLORS.footerText,
    fontFace: PPTX_FONT_FACE,
    valign: 'middle',
    align: 'right',
  });
}

function drawOmittedTasksWarning(slide: PptxSlide, omittedCount: number) {
  if (omittedCount <= 0) return;

  const footerY = PAGE_HEIGHT_IN - FOOTER_HEIGHT_IN;
  const taskWord = omittedCount === 1 ? 'task' : 'tasks';

  slide.addText(`+${omittedCount} ${taskWord} not shown — narrow the export timeframe to see them`, {
    x: CONTENT_X_IN,
    y: footerY,
    w: CONTENT_WIDTH_IN - 1.8,
    h: FOOTER_HEIGHT_IN,
    fontSize: 8,
    bold: true,
    color: COLORS.coral,
    fontFace: PPTX_FONT_FACE,
    valign: 'middle',
    align: 'left',
  });
}

function drawOverviewSlide(slide: PptxSlide, model: OverviewSlideModel) {
  drawChrome(slide, model.title);
  drawOmittedTasksWarning(slide, model.omittedCount);

  model.dateTicks.forEach((tick) => {
    slide.addText(tick.label, {
      x: tick.x,
      y: model.dateAxisY,
      w: 1,
      h: GROUP_HEADER_HEIGHT_IN,
      fontSize: 8,
      color: COLORS.footerText,
      fontFace: PPTX_FONT_FACE,
      valign: 'middle',
    });
  });

  if (model.dateTicks.length > 0) {
    const axisLineY = model.dateAxisY + GROUP_HEADER_HEIGHT_IN;
    slide.addShape('line', {
      x: CONTENT_X_IN,
      y: axisLineY,
      w: CONTENT_WIDTH_IN,
      h: 0,
      line: { color: COLORS.border, width: 0.75 },
    });

    // Grid lines dropped from each date-axis tick down through the bar
    // area — drawn before the bars so they sit behind them in z-order.
    model.dateTicks.forEach((tick) => {
      slide.addShape('line', {
        x: tick.x,
        y: axisLineY,
        w: 0,
        h: CONTENT_BOTTOM_IN - axisLineY,
        line: { color: COLORS.gridLine, width: GRID_LINE_WIDTH_PT },
      });
    });
  }

  // Weekly tick marks: short and faint, sitting at the bottom edge of the
  // bar area — a lighter secondary rhythm alongside the monthly-scale grid
  // lines above, not a replacement for them.
  model.weekTicks.forEach((tick) => {
    slide.addShape('line', {
      x: tick.x,
      y: CONTENT_BOTTOM_IN - WEEK_TICK_HEIGHT_IN,
      w: 0,
      h: WEEK_TICK_HEIGHT_IN,
      line: { color: COLORS.weekGridLine, width: WEEK_GRID_LINE_WIDTH_PT },
    });
  });

  model.bars.forEach((bar) => {
    slide.addShape('roundRect', {
      x: bar.barX,
      y: bar.y,
      w: bar.trackWidth,
      h: BAR_HEIGHT_IN,
      rectRadius: BAR_RADIUS_IN,
      fill: { color: COLORS.border },
      line: { color: COLORS.border },
    });

    if (bar.fillWidth > 0) {
      slide.addShape('roundRect', {
        x: bar.barX,
        y: bar.y,
        w: bar.fillWidth,
        h: BAR_HEIGHT_IN,
        rectRadius: BAR_RADIUS_IN,
        fill: { color: bar.color },
        line: { color: bar.color },
      });
    }

    // Progress rides on the bar itself: centered in the fill when it fits
    // there, otherwise just past the fill on the gray track (see
    // timelineExportModel for the measured fit). `margin: 0` + `wrap: false`
    // keep it on one line inside a box sized to the glyphs themselves.
    slide.addText(bar.progressText, {
      x: bar.progressX,
      y: bar.y,
      w: bar.progressWidth,
      h: BAR_HEIGHT_IN,
      fontSize: BAR_PROGRESS_FONT_SIZE_PT,
      bold: true,
      color: bar.progressColor,
      fontFace: PPTX_FONT_FACE,
      align: bar.progressInsideFill ? 'center' : 'left',
      valign: 'middle',
      margin: 0,
      wrap: false,
    });

    // Label sits outside the track, immediately to its right — never on top
    // of it — so it never gets split across the filled/unfilled boundary.
    slide.addText(bar.label, {
      x: bar.labelX,
      y: bar.y,
      w: bar.labelWidth,
      h: BAR_HEIGHT_IN,
      fontSize: 11,
      bold: true,
      color: COLORS.navy,
      fontFace: PPTX_FONT_FACE,
      valign: 'middle',
    });

    slide.addText(bar.statusText, {
      x: CONTENT_X_IN,
      y: bar.y,
      w: CONTENT_WIDTH_IN,
      h: BAR_HEIGHT_IN,
      fontSize: 9,
      bold: true,
      color: bar.statusColor,
      fontFace: PPTX_FONT_FACE,
      align: 'right',
      valign: 'middle',
    });

    // Chevrons mark a bar clipped by the export timeframe window: "starts
    // earlier" on the left, "continues further" on the right.
    if (bar.chevronLeft) {
      slide.addText('◀', {
        x: bar.barX,
        y: bar.y,
        w: CHEVRON_WIDTH_IN,
        h: BAR_HEIGHT_IN,
        fontSize: 9,
        bold: true,
        color: COLORS.navy,
        fontFace: PPTX_FONT_FACE,
        align: 'left',
        valign: 'middle',
      });
    }

    if (bar.chevronRight) {
      slide.addText('▶', {
        x: bar.barX + bar.trackWidth - CHEVRON_WIDTH_IN,
        y: bar.y,
        w: CHEVRON_WIDTH_IN,
        h: BAR_HEIGHT_IN,
        fontSize: 9,
        bold: true,
        color: COLORS.navy,
        fontFace: PPTX_FONT_FACE,
        align: 'right',
        valign: 'middle',
      });
    }
  });

  // Drawn last (on top of the bars) so a bracket stub landing right on a
  // bar's edge is never undercut by the bar shape painted after it.
  model.dependencyConnectors.forEach((connector) => {
    connector.segments.forEach((segment) => {
      slide.addShape('line', {
        x: Math.min(segment.x1, segment.x2),
        y: Math.min(segment.y1, segment.y2),
        w: Math.abs(segment.x2 - segment.x1),
        h: Math.abs(segment.y2 - segment.y1),
        line: { color: COLORS.dependencyLine, width: DEPENDENCY_LINE_WIDTH_PT },
      });
    });
  });
}

/** Draws a real pptxgenjs table (borders, columns, a bold header row) at an
 * arbitrary position/width — shared by a comment's markdown table blocks and
 * the dashboard's delayed/at-risk task tables, so there's exactly one table
 * renderer instead of one per caller. */
function drawTableBlock(
  slide: PptxSlide,
  table: DashboardTable,
  x: number,
  y: number,
  width: number,
  fontSize: number = COMMENT_TABLE_FONT_SIZE,
) {
  const colCount = Math.max(table.headers.length, 1);
  const colW = width / colCount;

  slide.addTable(
    [
      table.headers.map((header) => ({
        text: header,
        options: { bold: true, fill: { color: COLORS.border }, color: COLORS.navy },
      })),
      ...table.rows.map((row) => row.map((cell) => ({ text: cell }))),
    ],
    {
      x,
      y,
      w: width,
      colW: Array(colCount).fill(colW),
      fontSize,
      fontFace: PPTX_FONT_FACE,
      color: COLORS.navy,
      border: { type: 'solid', color: COLORS.border, pt: 0.5 },
      autoPage: false,
    },
  );
}

/** Renders one parsed-markdown block of a comment's body as real PPTX
 * content — a heading gets bold/sized text, a paragraph plain text, a list
 * a real bulleted textbox, and a table pptxgenjs's native addTable (borders
 * and columns, not a wall of "|" characters). */
function drawCommentBlock(slide: PptxSlide, block: CommentBlockRowModel) {
  if (block.type === 'heading') {
    slide.addText(block.text, {
      x: COMMENT_BODY_X_IN,
      y: block.y,
      w: COMMENT_BODY_WIDTH_IN,
      h: block.height,
      fontSize: COMMENT_HEADING_FONT_SIZE[block.level],
      bold: true,
      color: COLORS.navy,
      fontFace: PPTX_FONT_FACE,
      valign: 'top',
    });
  } else if (block.type === 'paragraph') {
    slide.addText(block.text, {
      x: COMMENT_BODY_X_IN,
      y: block.y,
      w: COMMENT_BODY_WIDTH_IN,
      h: block.height,
      fontSize: COMMENT_BODY_FONT_SIZE,
      color: COLORS.navy,
      fontFace: PPTX_FONT_FACE,
      valign: 'top',
    });
  } else if (block.type === 'list') {
    slide.addText(
      block.items.map((item, index) => ({
        text: item,
        options: { bullet: true, breakLine: index < block.items.length - 1 },
      })),
      {
        x: COMMENT_BODY_X_IN,
        y: block.y,
        w: COMMENT_BODY_WIDTH_IN,
        h: block.height,
        fontSize: COMMENT_BODY_FONT_SIZE,
        color: COLORS.navy,
        fontFace: PPTX_FONT_FACE,
        valign: 'top',
      },
    );
  } else {
    drawTableBlock(slide, block, COMMENT_BODY_X_IN, block.y, COMMENT_BODY_WIDTH_IN);
  }
}

function drawDetailSlide(slide: PptxSlide, model: DetailSlideModel) {
  drawChrome(slide, model.title);

  model.sections.forEach((section) => {
    slide.addText(section.parentTitle, {
      x: CONTENT_X_IN,
      y: section.parentTitleY,
      w: CONTENT_WIDTH_IN,
      h: ROW_LABEL_HEIGHT_IN,
      fontSize: 16,
      bold: true,
      color: COLORS.navy,
      fontFace: PPTX_FONT_FACE,
    });

    if (section.subtasksHeadingY !== undefined) {
      slide.addText('Subtasks', {
        x: CONTENT_X_IN,
        y: section.subtasksHeadingY,
        w: CONTENT_WIDTH_IN,
        h: ROW_LABEL_HEIGHT_IN,
        fontSize: 14,
        bold: true,
        color: COLORS.navy,
        fontFace: PPTX_FONT_FACE,
      });
    }

    section.subtasks.forEach((row) => {
      slide.addText(row.text, {
        x: CONTENT_X_IN + 0.2,
        y: row.y,
        w: CONTENT_WIDTH_IN - 0.2,
        h: LIST_ROW_HEIGHT_IN,
        fontSize: 12,
        color: COLORS.navy,
        fontFace: PPTX_FONT_FACE,
      });

      slide.addText(row.statusText, {
        x: CONTENT_X_IN,
        y: row.y,
        w: CONTENT_WIDTH_IN,
        h: LIST_ROW_HEIGHT_IN,
        fontSize: 10,
        bold: true,
        color: row.statusColor,
        fontFace: PPTX_FONT_FACE,
        align: 'right',
      });
    });

    if (section.assigneeText !== undefined && section.assigneeY !== undefined) {
      slide.addText(section.assigneeText, {
        x: CONTENT_X_IN,
        y: section.assigneeY,
        w: CONTENT_WIDTH_IN,
        h: LIST_ROW_HEIGHT_IN,
        fontSize: 12,
        bold: true,
        color: section.assigneeMuted ? COLORS.mutedText : COLORS.navy,
        fontFace: PPTX_FONT_FACE,
      });
    }

    if (section.commentsHeadingY !== undefined) {
      slide.addText(section.commentsHeadingText ?? 'Comments', {
        x: CONTENT_X_IN,
        y: section.commentsHeadingY,
        w: CONTENT_WIDTH_IN,
        h: ROW_LABEL_HEIGHT_IN,
        fontSize: 14,
        bold: true,
        color: COLORS.navy,
        fontFace: PPTX_FONT_FACE,
      });
    }

    section.comments.forEach((comment) => {
      if (comment.meta) {
        slide.addText(comment.meta.text, {
          x: COMMENT_BODY_X_IN,
          y: comment.meta.y,
          w: COMMENT_BODY_WIDTH_IN,
          h: COMMENT_META_ROW_HEIGHT_IN,
          fontSize: 9,
          italic: true,
          color: COLORS.footerText,
          fontFace: PPTX_FONT_FACE,
          valign: 'top',
        });
      }

      comment.blocks.forEach((block) => drawCommentBlock(slide, block));
    });
  });
}

/** Draws the status-breakdown doughnut chart (pptxgenjs's native chart
 * engine — real slices, not a hand-drawn approximation) at an arbitrary
 * position/size — shared by the summary slide and the dashboard's "Status
 * breakdown" slide, which show the exact same segments data. */
function drawStatusDonutChart(
  slide: PptxSlide,
  segments: SummarySlideModel['segments'],
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (segments.length === 0) return;

  slide.addChart(
    'doughnut',
    [
      {
        name: 'Status',
        labels: segments.map((segment) => segment.label),
        values: segments.map((segment) => segment.count),
      },
    ],
    {
      x,
      y,
      w,
      h,
      chartColors: segments.map((segment) => segment.color),
      holeSize: 55,
      showLegend: true,
      legendPos: 'b',
      legendColor: COLORS.navy,
      legendFontFace: PPTX_FONT_FACE,
      legendFontSize: 10,
      showPercent: true,
      showValue: false,
      showLabel: false,
      dataLabelColor: COLORS.lightText,
      dataLabelFontFace: PPTX_FONT_FACE,
      dataLabelFontSize: 9,
      dataBorder: { color: COLORS.slideBg, pt: 1 },
    },
  );
}

/** Draws a QR code image with a link caption beneath — shared by the
 * summary slide and the dashboard slides, each pointing at a different
 * deep link (so each takes its own caption text and data URL). */
function drawQrWithLink(
  slide: PptxSlide,
  qrCodeDataUrl: string,
  linkDisplay: string,
  x: number,
  w: number,
  y: number,
  size: number,
) {
  const imageX = x + (w - size) / 2;

  slide.addImage({ data: qrCodeDataUrl, x: imageX, y, w: size, h: size });

  slide.addText(linkDisplay, {
    x,
    y: y + size + 0.1,
    w,
    h: 0.3,
    fontSize: 8,
    color: COLORS.footerText,
    fontFace: PPTX_FONT_FACE,
    align: 'center',
  });
}

const SUMMARY_CHART_WIDTH_IN = 3.6;
const SUMMARY_CHART_GAP_IN = 0.3;
const SUMMARY_STAT_GAP_IN = 0.3;
// The stats text is left-aligned and never wraps at these widths, so this
// box is narrower than it used to be purely to free up room for the second
// QR code — the donut and the stat figures render in exactly the same spot.
const SUMMARY_STATS_WIDTH_IN = 2.2;
const SUMMARY_QR_GAP_IN = 0.3;
const SUMMARY_QR_SIZE_IN = 1.15;

function drawSummarySlide(slide: PptxSlide, model: SummarySlideModel, qrCodes: QrCodeModel[]) {
  drawChrome(slide, model.title);

  const chartH = CONTENT_BOTTOM_IN - CONTENT_TOP_IN;
  drawStatusDonutChart(slide, model.segments, CONTENT_X_IN, CONTENT_TOP_IN, SUMMARY_CHART_WIDTH_IN, chartH);

  const statsX = CONTENT_X_IN + SUMMARY_CHART_WIDTH_IN + SUMMARY_CHART_GAP_IN;
  const statsW = SUMMARY_STATS_WIDTH_IN;
  const statH = (chartH - SUMMARY_STAT_GAP_IN * (model.stats.length - 1)) / model.stats.length;

  model.stats.forEach((stat, index) => {
    const y = CONTENT_TOP_IN + index * (statH + SUMMARY_STAT_GAP_IN);

    slide.addText(stat.label, {
      x: statsX,
      y,
      w: statsW,
      h: 0.3,
      fontSize: 12,
      color: COLORS.footerText,
      fontFace: PPTX_FONT_FACE,
    });

    slide.addText(stat.value, {
      x: statsX,
      y: y + 0.3,
      w: statsW,
      h: statH - 0.3,
      fontSize: 28,
      bold: true,
      color: COLORS.navy,
      fontFace: PPTX_FONT_FACE,
      valign: 'top',
    });
  });

  // The QR codes split the right-hand column into equal cells, side by side
  // and symmetric about its center — the export link plus a deep link to the
  // status view that used to have its own slide.
  const qrX = statsX + statsW + SUMMARY_QR_GAP_IN;
  const qrCellWidth = (CONTENT_X_IN + CONTENT_WIDTH_IN - qrX) / qrCodes.length;

  qrCodes.forEach((qr, index) => {
    drawQrWithLink(
      slide,
      qr.dataUrl,
      qr.display,
      qrX + index * qrCellWidth,
      qrCellWidth,
      CONTENT_TOP_IN,
      SUMMARY_QR_SIZE_IN,
    );
  });
}

const DASHBOARD_TABLE_QR_COLUMN_WIDTH_IN = 2.0;
const DASHBOARD_TABLE_GAP_IN = 0.4;
const DASHBOARD_TABLE_QR_SIZE_IN = 1.5;

function drawDashboardTableSlide(slide: PptxSlide, model: DashboardTableSlideModel, qrCodeDataUrl: string) {
  drawChrome(slide, model.title);

  const tableWidth = CONTENT_WIDTH_IN - DASHBOARD_TABLE_QR_COLUMN_WIDTH_IN - DASHBOARD_TABLE_GAP_IN;

  if (model.table) {
    drawTableBlock(slide, model.table, CONTENT_X_IN, CONTENT_TOP_IN, tableWidth);
  } else {
    slide.addText(model.emptyMessage, {
      x: CONTENT_X_IN,
      y: CONTENT_TOP_IN,
      w: tableWidth,
      h: 0.4,
      fontSize: 13,
      color: COLORS.footerText,
      fontFace: PPTX_FONT_FACE,
    });
  }

  const qrX = CONTENT_X_IN + tableWidth + DASHBOARD_TABLE_GAP_IN;
  drawQrWithLink(
    slide,
    qrCodeDataUrl,
    model.qrDisplay,
    qrX,
    DASHBOARD_TABLE_QR_COLUMN_WIDTH_IN,
    CONTENT_TOP_IN,
    DASHBOARD_TABLE_QR_SIZE_IN,
  );
}

export async function exportTimelineToPptx(
  items: TimelineItem[],
  exportOptions: ExportOptions,
  comments: TaskComment[],
  fileName: string = 'timeline-export.pptx',
  exportMode: ExportMode = 'compact',
): Promise<void> {
  const sortedItems = sortItems(items, exportOptions.sortMode);
  const slides = buildExportSlides(
    sortedItems,
    comments,
    exportOptions.commentMode,
    exportOptions.exportTimeframe,
    exportOptions.showDependencies,
    exportMode,
  );
  const dashboardSlides = buildDashboardSlides(sortedItems, new Date());
  const summaryQrCodes = await getSummaryQrCodes();
  const dashboardQrCodeDataUrls = await Promise.all(
    dashboardSlides.map((slideModel) => getQrCodeDataUrl(slideModel.qrUrl)),
  );

  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';

  slides.forEach((slideModel) => {
    const slide = pptx.addSlide();
    if (slideModel.kind === 'overview') {
      drawOverviewSlide(slide, slideModel);
    } else if (slideModel.kind === 'detail') {
      drawDetailSlide(slide, slideModel);
    } else {
      drawSummarySlide(slide, slideModel, summaryQrCodes);
    }
  });

  dashboardSlides.forEach((slideModel, index) => {
    drawDashboardTableSlide(pptx.addSlide(), slideModel, dashboardQrCodeDataUrls[index]);
  });

  await pptx.writeFile({ fileName }).catch((error) => {
    console.error('Failed to export timeline to PowerPoint', error);
  });
}
