import pptxgen from 'pptxgenjs';
import type { ExportOptions } from '../store/timelineStore';
import type { Person } from '../store/peopleStore';
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
import {
  buildDashboardSlides,
  type DashboardSlideModel,
  type DashboardTable,
  type DashboardTableSlideModel,
} from './dashboardSlides';
import { getQrCodeDataUrl, getSummaryQrCodes, type QrCodeModel } from './qrCode';
import { buildSlideLinks, type SlideLinks } from './slideLinks';
import { orderExportSlides } from './slideOrder';
import { COLORS, FOOTER_TEXT, PPTX_FONT_FACE } from './theme';
import {
  ASSIGNEE_SWATCH_GAP_IN,
  ASSIGNEE_SWATCH_SIZE_IN,
  BACK_LINK_FONT_SIZE_PT,
  BACK_LINK_HEIGHT_IN,
  BACK_LINK_TEXT,
  BACK_LINK_WIDTH_IN,
  BACK_LINK_Y_IN,
  BAR_HEIGHT_IN,
  BAR_LABEL_FONT_SIZE_PT,
  BAR_PROGRESS_FONT_SIZE_PT,
  BAR_RADIUS_IN,
  BAR_STATUS_FONT_SIZE_PT,
  COMMENT_META_ROW_HEIGHT_IN,
  CONTENT_BOTTOM_IN,
  CONTENT_TOP_IN,
  CONTENT_WIDTH_IN,
  CONTENT_X_IN,
  DEPENDENCY_LINE_WIDTH_PT,
  DETAIL_ROW_INDENT_IN,
  FOOTER_HEIGHT_IN,
  GROUP_HEADER_HEIGHT_IN,
  HEADER_HEIGHT_IN,
  LIST_ROW_HEIGHT_IN,
  PAGE_HEIGHT_IN,
  PAGE_WIDTH_IN,
  ROW_LABEL_HEIGHT_IN,
  SUBTASK_STATUS_FONT_SIZE_PT,
  SUBTASK_TEXT_FONT_SIZE_PT,
} from './slideLayout';
import { DATE_GRID_STYLES } from './dateGrid';

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

/** Spread into a shape's or textbox's options to turn it into an internal
 * jump to `slideNumber`, or into nothing at all when there's no target.
 * Absent-means-inert is the whole point: an overview bar whose task has
 * neither subtasks nor comments has no appendix slide to open, so it must
 * stay unclickable rather than link somewhere arbitrary. */
function slideJump(slideNumber: number | null | undefined, tooltip: string) {
  return slideNumber ? { hyperlink: { slide: slideNumber, tooltip } } : {};
}

/** The "← Back to overview" affordance shared by every appendix slide — one
 * per slide, not one per parent section, since the whole slide returns to the
 * same place. Drawn as a plain teal caption rather than a button/chrome
 * shape: it's a breadcrumb, and the deck's other links are unadorned too. */
function drawBackToOverviewLink(slide: PptxSlide, overviewSlideNumber: number | null) {
  if (!overviewSlideNumber) return;

  slide.addText(BACK_LINK_TEXT, {
    x: CONTENT_X_IN,
    y: BACK_LINK_Y_IN,
    w: BACK_LINK_WIDTH_IN,
    h: BACK_LINK_HEIGHT_IN,
    fontSize: BACK_LINK_FONT_SIZE_PT,
    bold: true,
    color: COLORS.teal,
    fontFace: PPTX_FONT_FACE,
    valign: 'middle',
    margin: 0,
    wrap: false,
    ...slideJump(overviewSlideNumber, 'Back to the timeline overview'),
  });
}

/** Painted strictly back to front, because pptxgenjs has no z-index — shape
 * order *is* z-order:
 *   1. the three date-grid densities (palest first)
 *   2. the bar tracks and fills
 *   3. the dependency connectors, over the bars so a bracket stub landing on
 *      a bar's edge isn't undercut by it
 *   4. every piece of text, over the connectors so a bracket crossing a row
 *      can never cut through a label, percentage or status
 * Splitting the bars into a shapes pass and a text pass is what buys step 4;
 * drawing each bar's shapes and text together would put the first bars' text
 * under the connectors again. */
function drawOverviewSlide(slide: PptxSlide, model: OverviewSlideModel, links: SlideLinks) {
  // A bar is clickable exactly when its task has an appendix slide to open.
  // The link goes on the track, the fill *and* the label because those are
  // three separate objects making up one visual row: the fill sits over the
  // track (so linking only the track would leave the colored part dead), and
  // a track clipped to MIN_TRACK_WIDTH_IN is a 0.15in sliver that nobody can
  // reasonably hit — the label beside it is the readable handle for the task.
  const barJump = (bar: OverviewSlideModel['bars'][number]) =>
    slideJump(links.detailSlideNumberByTaskId.get(bar.id), 'Open subtasks & comments');

  drawChrome(slide, model.title);
  drawOmittedTasksWarning(slide, model.omittedCount);

  const axisLineY = model.dateAxisY + GROUP_HEADER_HEIGHT_IN;

  if (model.gridLines.length > 0) {
    slide.addShape('line', {
      x: CONTENT_X_IN,
      y: axisLineY,
      w: CONTENT_WIDTH_IN,
      h: 0,
      line: { color: COLORS.border, width: 0.75 },
    });

    // Day/week/month lines, all full height through the bar area and all
    // drawn from the one shared style table — only the weight and color
    // differ per level. Model order is palest-first, so a month line always
    // ends up over the day line at the same x.
    model.gridLines.forEach((gridLine) => {
      const style = DATE_GRID_STYLES[gridLine.level];
      slide.addShape('line', {
        x: gridLine.x,
        y: axisLineY,
        w: 0,
        h: CONTENT_BOTTOM_IN - axisLineY,
        line: { color: style.color, width: style.widthPt },
      });
    });
  }

  model.bars.forEach((bar) => {
    // barJump() is called per object rather than shared between the two
    // shapes: pptxgenjs stamps its own `_rId` onto whatever hyperlink object
    // it's handed, so reusing one would leave both shapes rendering the
    // second one's relationship.
    slide.addShape('roundRect', {
      x: bar.barX,
      y: bar.y,
      w: bar.trackWidth,
      h: BAR_HEIGHT_IN,
      rectRadius: BAR_RADIUS_IN,
      fill: { color: COLORS.border },
      line: { color: COLORS.border },
      ...barJump(bar),
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
        ...barJump(bar),
      });
    }
  });

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

  // Month captions at the axis's normal size, week captions a notch smaller
  // (the model has already thinned any that would collide).
  model.axisLabels.forEach((label) => {
    slide.addText(label.text, {
      x: label.x,
      y: model.dateAxisY,
      w: 1,
      h: GROUP_HEADER_HEIGHT_IN,
      fontSize: label.level === 'month' ? 8 : 7,
      color: COLORS.footerText,
      fontFace: PPTX_FONT_FACE,
      valign: 'middle',
    });
  });

  model.bars.forEach((bar) => {
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
    // The model has already truncated it (with an ellipsis) to leave room
    // for the status text below, so `wrap: false` keeps it on the one line
    // that room was measured against instead of PowerPoint auto-wrapping a
    // measurement-approximation edge case onto a second line that would
    // land on top of the status text's own row.
    slide.addText(bar.label, {
      x: bar.labelX,
      y: bar.y,
      w: bar.labelWidth,
      h: BAR_HEIGHT_IN,
      fontSize: BAR_LABEL_FONT_SIZE_PT,
      bold: true,
      color: COLORS.navy,
      fontFace: PPTX_FONT_FACE,
      valign: 'middle',
      wrap: false,
      ...barJump(bar),
    });

    slide.addText(bar.statusText, {
      x: CONTENT_X_IN,
      y: bar.y,
      w: CONTENT_WIDTH_IN,
      h: BAR_HEIGHT_IN,
      fontSize: BAR_STATUS_FONT_SIZE_PT,
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

function drawDetailSlide(slide: PptxSlide, model: DetailSlideModel, links: SlideLinks) {
  drawChrome(slide, model.title);
  drawBackToOverviewLink(slide, links.overviewSlideNumber);

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
      // The model has already truncated the label portion of row.text (with
      // an ellipsis) to leave room for the status text on the same line —
      // `wrap: false` for the same reason as the overview bar's label.
      slide.addText(row.text, {
        x: CONTENT_X_IN + DETAIL_ROW_INDENT_IN,
        y: row.y,
        w: CONTENT_WIDTH_IN - DETAIL_ROW_INDENT_IN,
        h: LIST_ROW_HEIGHT_IN,
        fontSize: SUBTASK_TEXT_FONT_SIZE_PT,
        color: COLORS.navy,
        fontFace: PPTX_FONT_FACE,
        wrap: false,
      });

      slide.addText(row.statusText, {
        x: CONTENT_X_IN,
        y: row.y,
        w: CONTENT_WIDTH_IN,
        h: LIST_ROW_HEIGHT_IN,
        fontSize: SUBTASK_STATUS_FONT_SIZE_PT,
        bold: true,
        color: row.statusColor,
        fontFace: PPTX_FONT_FACE,
        align: 'right',
      });
    });

    if (section.assigneeText !== undefined && section.assigneeY !== undefined) {
      // Swatch only when there's an actual person color to show (i.e. not
      // the "No assignee" placeholder) — text starts right after it instead
      // of at the row's usual left edge.
      const textX = section.assigneeColor
        ? CONTENT_X_IN + ASSIGNEE_SWATCH_SIZE_IN + ASSIGNEE_SWATCH_GAP_IN
        : CONTENT_X_IN;
      const textW = section.assigneeColor
        ? CONTENT_WIDTH_IN - ASSIGNEE_SWATCH_SIZE_IN - ASSIGNEE_SWATCH_GAP_IN
        : CONTENT_WIDTH_IN;

      if (section.assigneeColor) {
        slide.addShape('ellipse', {
          x: CONTENT_X_IN,
          y: section.assigneeY + (LIST_ROW_HEIGHT_IN - ASSIGNEE_SWATCH_SIZE_IN) / 2,
          w: ASSIGNEE_SWATCH_SIZE_IN,
          h: ASSIGNEE_SWATCH_SIZE_IN,
          fill: { color: section.assigneeColor },
          line: { color: section.assigneeColor },
        });
      }

      slide.addText(section.assigneeText, {
        x: textX,
        y: section.assigneeY,
        w: textW,
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
  people: Person[],
  fileName: string = 'timeline-export.pptx',
  exportMode: ExportMode = 'compact',
): Promise<void> {
  const sortedItems = sortItems(items, exportOptions.sortMode);
  const slides = buildExportSlides(
    sortedItems,
    comments,
    people,
    exportOptions.commentMode,
    exportOptions.exportTimeframe,
    exportOptions.showDependencies,
    exportMode,
  );
  const dashboardSlides = buildDashboardSlides(sortedItems, new Date());
  const summaryQrCodes = await getSummaryQrCodes();
  // Keyed by the slide model itself rather than by position, so the deck
  // order (see slideOrder.ts) can change without silently pairing a slide
  // with another slide's QR code.
  const dashboardQrCodeDataUrls = new Map<DashboardSlideModel, string>(
    await Promise.all(
      dashboardSlides.map(
        async (slideModel) => [slideModel, await getQrCodeDataUrl(slideModel.qrUrl)] as const,
      ),
    ),
  );

  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';

  // Resolved from the ordered deck up front, so a bar drawn on slide 1 can
  // link forward to an appendix slide that hasn't been added yet.
  const orderedSlides = orderExportSlides(slides, dashboardSlides);
  const links = buildSlideLinks(orderedSlides);

  orderedSlides.forEach((slideModel) => {
    const slide = pptx.addSlide();
    if (slideModel.kind === 'overview') {
      drawOverviewSlide(slide, slideModel, links);
    } else if (slideModel.kind === 'detail') {
      drawDetailSlide(slide, slideModel, links);
    } else if (slideModel.kind === 'summary') {
      drawSummarySlide(slide, slideModel, summaryQrCodes);
    } else {
      drawDashboardTableSlide(slide, slideModel, dashboardQrCodeDataUrls.get(slideModel)!);
    }
  });

  await pptx.writeFile({ fileName }).catch((error) => {
    console.error('Failed to export timeline to PowerPoint', error);
  });
}
