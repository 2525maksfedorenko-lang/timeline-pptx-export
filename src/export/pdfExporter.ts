import { jsPDF } from 'jspdf';
import type { TextOptionsLight } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
import {
  buildDashboardSlides,
  type DashboardSlideModel,
  type DashboardTable,
  type DashboardTableSlideModel,
} from './dashboardSlides';
import { getQrCodeDataUrl, getSummaryQrCodes, type QrCodeModel } from './qrCode';
import { buildSlideLinks, type SlideLinks } from './slideLinks';
import { orderExportSlides } from './slideOrder';
import { COLORS, FOOTER_TEXT, PDF_FONT_FACE, withHash } from './theme';
import {
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
  COMMENT_LINE_HEIGHT_IN,
  CONTENT_BOTTOM_IN,
  CONTENT_TOP_IN,
  CONTENT_WIDTH_IN,
  CONTENT_X_IN,
  DEPENDENCY_LINE_WIDTH_PT,
  DETAIL_ROW_INDENT_IN,
  FOOTER_HEIGHT_IN,
  GROUP_HEADER_HEIGHT_IN,
  HEADER_HEIGHT_IN,
  PAGE_HEIGHT_IN,
  PAGE_WIDTH_IN,
  SUBTASK_STATUS_FONT_SIZE_PT,
  SUBTASK_TEXT_FONT_SIZE_PT,
} from './slideLayout';
import { DATE_GRID_LEVELS, DATE_GRID_STYLES } from './dateGrid';

const PT_TO_IN = 1 / 72;
const CHEVRON_WIDTH_IN = 0.14;

// Comment blocks are indented slightly from the section's left edge, same as
// the subtask rows above them.
const COMMENT_BODY_X_IN = CONTENT_X_IN + 0.2;
const COMMENT_BODY_WIDTH_IN = CONTENT_WIDTH_IN - 0.2;
const COMMENT_HEADING_FONT_SIZE: Record<1 | 2 | 3, number> = { 1: 16, 2: 14, 3: 12 };
const COMMENT_BODY_FONT_SIZE = 11;
const COMMENT_TABLE_FONT_SIZE = 9;
const COMMENT_LIST_BULLET_INDENT_IN = 0.2;

// jsPDF's built-in standard fonts (helvetica/times/courier) only support the
// WinAnsi character set, so any richer Unicode punctuation must be swapped
// for a plain-ASCII equivalent before rendering, or glyphs render as garbage.
function toPdfSafeText(text: string): string {
  return text
    .replace(/→/g, '->')
    .replace(/[–—]/g, '-')
    .replace(/\u{1F4CC}/gu, '[pinned] ')
    .replace(/◀/g, '<')
    .replace(/▶/g, '>')
    .replace(/←/g, '<-');
}

/** Marks a rectangle as an internal jump to `pageNumber`. jsPDF resolves the
 * page number to that page's own PDF object at output time, so this may name
 * a page that hasn't been added yet — which is what lets slide 1's bars link
 * forward into the appendix. A no-op without a target, leaving the region
 * inert exactly like a PPTX shape with no hyperlink (see slideLinks.ts). */
function linkToPage(
  doc: jsPDF,
  pageNumber: number | null | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (!pageNumber) return;
  doc.link(x, y, w, h, { pageNumber });
}

/** The "← Back to overview" affordance shared by every appendix slide — one
 * per slide, not one per parent section, since the whole slide returns to the
 * same place. Mirrors pptxExporter.ts's placement and styling. */
function drawBackToOverviewLink(doc: jsPDF, overviewSlideNumber: number | null) {
  if (!overviewSlideNumber) return;

  doc.setFont(PDF_FONT_FACE, 'bold');
  doc.setFontSize(BACK_LINK_FONT_SIZE_PT);
  doc.setTextColor(withHash(COLORS.teal));
  drawText(doc, BACK_LINK_TEXT, CONTENT_X_IN, BACK_LINK_Y_IN + BACK_LINK_HEIGHT_IN / 2, { baseline: 'middle' });

  linkToPage(doc, overviewSlideNumber, CONTENT_X_IN, BACK_LINK_Y_IN, BACK_LINK_WIDTH_IN, BACK_LINK_HEIGHT_IN);
}

function drawText(doc: jsPDF, text: string, x: number, y: number, options?: TextOptionsLight) {
  doc.text(toPdfSafeText(text), x, y, options);
}

function drawChrome(doc: jsPDF, title: string) {
  doc.setFillColor(withHash(COLORS.slideBg));
  doc.rect(0, 0, PAGE_WIDTH_IN, PAGE_HEIGHT_IN, 'F');

  doc.setFillColor(withHash(COLORS.navy));
  doc.rect(0, 0, PAGE_WIDTH_IN, HEADER_HEIGHT_IN, 'F');

  doc.setFont(PDF_FONT_FACE, 'bold');
  doc.setFontSize(24);
  doc.setTextColor(withHash(COLORS.lightText));
  drawText(doc, title, CONTENT_X_IN, HEADER_HEIGHT_IN / 2, { baseline: 'middle' });

  const footerY = PAGE_HEIGHT_IN - FOOTER_HEIGHT_IN;
  doc.setFillColor(withHash(COLORS.border));
  doc.rect(0, footerY, PAGE_WIDTH_IN, FOOTER_HEIGHT_IN, 'F');

  doc.setFont(PDF_FONT_FACE, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(withHash(COLORS.footerText));
  drawText(doc, FOOTER_TEXT, CONTENT_X_IN + CONTENT_WIDTH_IN, footerY + FOOTER_HEIGHT_IN / 2, {
    align: 'right',
    baseline: 'middle',
  });
}

function drawOmittedTasksWarning(doc: jsPDF, omittedCount: number) {
  if (omittedCount <= 0) return;

  const footerY = PAGE_HEIGHT_IN - FOOTER_HEIGHT_IN;
  const taskWord = omittedCount === 1 ? 'task' : 'tasks';

  doc.setFont(PDF_FONT_FACE, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(withHash(COLORS.coral));
  drawText(doc, `+${omittedCount} ${taskWord} not shown - narrow the export timeframe to see them`, CONTENT_X_IN, footerY + FOOTER_HEIGHT_IN / 2, {
    baseline: 'middle',
    align: 'left',
  });
}

/** Painted strictly back to front, because jsPDF has no z-index — draw order
 * *is* z-order:
 *   1. the three date-grid densities (palest first)
 *   2. the bar tracks and fills
 *   3. the dependency connectors, over the bars so a bracket stub landing on
 *      a bar's edge isn't undercut by it
 *   4. every piece of text, over the connectors so a bracket crossing a row
 *      can never cut through a label, percentage or status
 * Splitting the bars into a shapes pass and a text pass is what buys step 4;
 * drawing each bar's shapes and text together would put the first bars' text
 * under the connectors again. Mirrors pptxExporter.ts's identical ordering. */
function drawOverviewSlide(doc: jsPDF, model: OverviewSlideModel, links: SlideLinks) {
  drawChrome(doc, model.title);
  drawOmittedTasksWarning(doc, model.omittedCount);

  const axisLineY = model.dateAxisY + GROUP_HEADER_HEIGHT_IN;

  if (model.gridLines.length > 0) {
    doc.setDrawColor(withHash(COLORS.border));
    doc.setLineWidth(0.01);
    doc.line(CONTENT_X_IN, axisLineY, CONTENT_X_IN + CONTENT_WIDTH_IN, axisLineY);

    // Day/week/month lines, all full height through the bar area and all
    // drawn from the one shared style table — only the weight and color
    // differ per level. Grouped by level (rather than following the model's
    // flat order) purely so jsPDF's stroke state is set three times instead
    // of once per line; palest level first either way.
    DATE_GRID_LEVELS.forEach((level) => {
      const levelLines = model.gridLines.filter((gridLine) => gridLine.level === level);
      if (levelLines.length === 0) return;

      const style = DATE_GRID_STYLES[level];
      doc.setDrawColor(withHash(style.color));
      doc.setLineWidth(style.widthPt * PT_TO_IN);
      levelLines.forEach((gridLine) => doc.line(gridLine.x, axisLineY, gridLine.x, CONTENT_BOTTOM_IN));
    });
  }

  model.bars.forEach((bar) => {
    doc.setFillColor(withHash(COLORS.border));
    doc.roundedRect(bar.barX, bar.y, bar.trackWidth, BAR_HEIGHT_IN, BAR_RADIUS_IN, BAR_RADIUS_IN, 'F');

    if (bar.fillWidth > 0) {
      doc.setFillColor(withHash(bar.color));
      doc.roundedRect(bar.barX, bar.y, bar.fillWidth, BAR_HEIGHT_IN, BAR_RADIUS_IN, BAR_RADIUS_IN, 'F');
    }
  });

  if (model.dependencyConnectors.length > 0) {
    doc.setDrawColor(withHash(COLORS.dependencyLine));
    doc.setLineWidth(DEPENDENCY_LINE_WIDTH_PT * PT_TO_IN);

    model.dependencyConnectors.forEach((connector) => {
      connector.segments.forEach((segment) => {
        doc.line(segment.x1, segment.y1, segment.x2, segment.y2);
      });
    });
  }

  // Month captions at the axis's normal size, week captions a notch smaller
  // (the model has already thinned any that would collide).
  doc.setFont(PDF_FONT_FACE, 'normal');
  doc.setTextColor(withHash(COLORS.footerText));
  model.axisLabels.forEach((label) => {
    doc.setFontSize(label.level === 'month' ? 8 : 7);
    drawText(doc, label.text, label.x, model.dateAxisY + GROUP_HEADER_HEIGHT_IN / 2, { baseline: 'middle' });
  });

  model.bars.forEach((bar) => {
    const centerY = bar.y + BAR_HEIGHT_IN / 2;

    // A bar is clickable exactly when its task has an appendix slide to open.
    // One rectangle covers the track and its label: they're contiguous
    // (labelX starts just past whichever of the track/progress text ends
    // furthest right), so the row the PPTX makes clickable across three
    // separate objects is a single annotation here.
    linkToPage(
      doc,
      links.detailSlideNumberByTaskId.get(bar.id),
      bar.barX,
      bar.y,
      bar.labelX + bar.labelWidth - bar.barX,
      BAR_HEIGHT_IN,
    );

    // Progress rides on the bar itself: centered in the fill when it fits
    // there, otherwise just past the fill on the gray track (see
    // timelineExportModel for the measured fit).
    doc.setFont(PDF_FONT_FACE, 'bold');
    doc.setFontSize(BAR_PROGRESS_FONT_SIZE_PT);
    doc.setTextColor(withHash(bar.progressColor));
    drawText(doc, bar.progressText, bar.progressX + (bar.progressInsideFill ? bar.progressWidth / 2 : 0), centerY, {
      baseline: 'middle',
      align: bar.progressInsideFill ? 'center' : 'left',
    });

    // Label sits outside the track, immediately to its right — never on top
    // of it — so it never gets split across the filled/unfilled boundary.
    // The model has already truncated it (with an ellipsis) to leave room
    // for the status text below, so no `maxWidth` here — jsPDF's own
    // wrapping would otherwise push a measurement-approximation edge case
    // onto a second line landing on top of the status text's row.
    doc.setFontSize(BAR_LABEL_FONT_SIZE_PT);
    doc.setTextColor(withHash(COLORS.navy));
    drawText(doc, bar.label, bar.labelX, centerY, { baseline: 'middle' });

    doc.setFontSize(BAR_STATUS_FONT_SIZE_PT);
    doc.setTextColor(withHash(bar.statusColor));
    drawText(doc, bar.statusText, CONTENT_X_IN + CONTENT_WIDTH_IN, centerY, {
      baseline: 'middle',
      align: 'right',
    });

    // Chevrons mark a bar clipped by the export timeframe window: "starts
    // earlier" on the left, "continues further" on the right.
    doc.setFont(PDF_FONT_FACE, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(withHash(COLORS.navy));

    if (bar.chevronLeft) {
      drawText(doc, '◀', bar.barX, centerY, { baseline: 'middle', align: 'left' });
    }

    if (bar.chevronRight) {
      drawText(doc, '▶', bar.barX + bar.trackWidth - CHEVRON_WIDTH_IN, centerY, {
        baseline: 'middle',
        align: 'left',
      });
    }
  });
}

/** Draws a real jspdf-autotable table (borders, columns, a bold header row)
 * at an arbitrary position/width — shared by a comment's markdown table
 * blocks and the dashboard's delayed/at-risk task tables, so there's exactly
 * one table renderer instead of one per caller. `pageBreak: 'avoid'` still
 * means autoTable *can* insert its own page if the table doesn't fit in the
 * remaining space — callers whose surrounding layout doesn't already
 * guarantee a fit (see drawCommentBlock's caller, which does) should guard
 * against that corrupting this file's own page bookkeeping (see
 * drawDashboardTableSlide). */
function drawTableBlock(
  doc: jsPDF,
  table: DashboardTable,
  x: number,
  y: number,
  width: number,
  fontSize: number = COMMENT_TABLE_FONT_SIZE,
) {
  autoTable(doc, {
    startY: y,
    margin: { left: x, right: PAGE_WIDTH_IN - x - width },
    tableWidth: width,
    head: [table.headers.map(toPdfSafeText)],
    body: table.rows.map((row) => row.map(toPdfSafeText)),
    theme: 'grid',
    styles: {
      font: PDF_FONT_FACE,
      fontSize,
      textColor: withHash(COLORS.navy),
      lineColor: withHash(COLORS.border),
      lineWidth: 0.01,
    },
    headStyles: { fillColor: withHash(COLORS.border), textColor: withHash(COLORS.navy), fontStyle: 'bold' },
    pageBreak: 'avoid',
  });
}

/** Renders one parsed-markdown block of a comment's body as real PDF content
 * — a heading gets bold/sized text, a paragraph wraps within the content
 * width, a list gets bullet-prefixed wrapped lines, and a table uses
 * jspdf-autotable for real borders/columns instead of a wall of "|"
 * characters. */
function drawCommentBlock(doc: jsPDF, block: CommentBlockRowModel) {
  if (block.type === 'heading') {
    doc.setFont(PDF_FONT_FACE, 'bold');
    doc.setFontSize(COMMENT_HEADING_FONT_SIZE[block.level]);
    doc.setTextColor(withHash(COLORS.navy));
    drawText(doc, block.text, COMMENT_BODY_X_IN, block.y, { baseline: 'top', maxWidth: COMMENT_BODY_WIDTH_IN });
    return;
  }

  if (block.type === 'paragraph') {
    doc.setFont(PDF_FONT_FACE, 'normal');
    doc.setFontSize(COMMENT_BODY_FONT_SIZE);
    doc.setTextColor(withHash(COLORS.navy));
    drawText(doc, block.text, COMMENT_BODY_X_IN, block.y, { baseline: 'top', maxWidth: COMMENT_BODY_WIDTH_IN });
    return;
  }

  if (block.type === 'list') {
    doc.setFont(PDF_FONT_FACE, 'normal');
    doc.setFontSize(COMMENT_BODY_FONT_SIZE);
    doc.setTextColor(withHash(COLORS.navy));

    let itemY = block.y;
    block.items.forEach((item) => {
      drawText(doc, '•', COMMENT_BODY_X_IN, itemY, { baseline: 'top' });
      const lines: string[] = doc.splitTextToSize(
        toPdfSafeText(item),
        COMMENT_BODY_WIDTH_IN - COMMENT_LIST_BULLET_INDENT_IN,
      );
      doc.text(lines, COMMENT_BODY_X_IN + COMMENT_LIST_BULLET_INDENT_IN, itemY, { baseline: 'top' });
      itemY += lines.length * COMMENT_LINE_HEIGHT_IN;
    });
    return;
  }

  // The shared slide model already decided what fits where (see
  // expandCandidateToChunks in timelineExportModel.ts), guaranteeing this
  // table always fits in the remaining space — so drawTableBlock's own
  // pageBreak:'avoid' never actually triggers a page insert here.
  drawTableBlock(doc, block, COMMENT_BODY_X_IN, block.y, COMMENT_BODY_WIDTH_IN);
}

function drawDetailSlide(doc: jsPDF, model: DetailSlideModel, links: SlideLinks) {
  drawChrome(doc, model.title);
  drawBackToOverviewLink(doc, links.overviewSlideNumber);

  model.sections.forEach((section) => {
    doc.setFont(PDF_FONT_FACE, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(withHash(COLORS.navy));
    drawText(doc, section.parentTitle, CONTENT_X_IN, section.parentTitleY, { baseline: 'top' });

    if (section.subtasksHeadingY !== undefined) {
      doc.setFont(PDF_FONT_FACE, 'bold');
      doc.setFontSize(14);
      doc.setTextColor(withHash(COLORS.navy));
      drawText(doc, 'Subtasks', CONTENT_X_IN, section.subtasksHeadingY, { baseline: 'top' });
    }

    section.subtasks.forEach((row) => {
      // The model has already truncated the label portion of row.text (with
      // an ellipsis) to leave room for the status text on the same line.
      doc.setFont(PDF_FONT_FACE, 'normal');
      doc.setFontSize(SUBTASK_TEXT_FONT_SIZE_PT);
      doc.setTextColor(withHash(COLORS.navy));
      drawText(doc, row.text, CONTENT_X_IN + DETAIL_ROW_INDENT_IN, row.y, { baseline: 'top' });

      doc.setFont(PDF_FONT_FACE, 'bold');
      doc.setFontSize(SUBTASK_STATUS_FONT_SIZE_PT);
      doc.setTextColor(withHash(row.statusColor));
      drawText(doc, row.statusText, CONTENT_X_IN + CONTENT_WIDTH_IN, row.y, {
        baseline: 'top',
        align: 'right',
      });
    });

    if (section.assigneeText !== undefined && section.assigneeY !== undefined) {
      doc.setFont(PDF_FONT_FACE, 'bold');
      doc.setFontSize(12);
      doc.setTextColor(withHash(section.assigneeMuted ? COLORS.mutedText : COLORS.navy));
      drawText(doc, section.assigneeText, CONTENT_X_IN, section.assigneeY, { baseline: 'top' });
    }

    if (section.commentsHeadingY !== undefined) {
      doc.setFont(PDF_FONT_FACE, 'bold');
      doc.setFontSize(14);
      doc.setTextColor(withHash(COLORS.navy));
      drawText(doc, section.commentsHeadingText ?? 'Comments', CONTENT_X_IN, section.commentsHeadingY, {
        baseline: 'top',
      });
    }

    section.comments.forEach((comment) => {
      if (comment.meta) {
        doc.setFont(PDF_FONT_FACE, 'italic');
        doc.setFontSize(9);
        doc.setTextColor(withHash(COLORS.footerText));
        drawText(doc, comment.meta.text, COMMENT_BODY_X_IN, comment.meta.y, { baseline: 'top' });
      }

      comment.blocks.forEach((block) => drawCommentBlock(doc, block));
    });
  });
}

const SUMMARY_BAR_HEIGHT_IN = 0.45;
const SUMMARY_LEGEND_GAP_IN = 0.25;
const SUMMARY_CHIP_SIZE_IN = 0.14;
const SUMMARY_STATS_GAP_IN = 0.55;
const SUMMARY_QR_GAP_ABOVE_IN = 0.9;
const SUMMARY_QR_SIZE_IN = 1.3;
// Each summary QR gets a fixed-width cell (wide enough for its caption on
// one line); the cells are then centered as a block, so the pair sits
// symmetrically either side of the slide's center line.
const SUMMARY_QR_CELL_WIDTH_IN = 3.0;

/** Draws the status-breakdown stacked bar + legend at an arbitrary
 * position/width, returning the Y just below the legend — jsPDF has no
 * built-in donut/pie primitive (unlike pptxgenjs's native chart engine used
 * for the same data in pptxExporter.ts), so a segmented bar is this
 * exporter's equivalent, reused by both the summary slide and the
 * dashboard's "Status breakdown" slide. */
function drawStatusBreakdown(doc: jsPDF, segments: SummarySlideModel['segments'], x: number, y: number, width: number): number {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);

  if (total > 0) {
    let cursorX = x;
    segments.forEach((segment) => {
      const segmentWidth = (segment.count / total) * width;
      doc.setFillColor(withHash(segment.color));
      doc.rect(cursorX, y, segmentWidth, SUMMARY_BAR_HEIGHT_IN, 'F');
      cursorX += segmentWidth;
    });
  } else {
    doc.setFillColor(withHash(COLORS.border));
    doc.rect(x, y, width, SUMMARY_BAR_HEIGHT_IN, 'F');
  }

  const legendY = y + SUMMARY_BAR_HEIGHT_IN + SUMMARY_LEGEND_GAP_IN;
  const legendColWidth = width / Math.max(segments.length, 1);

  doc.setFont(PDF_FONT_FACE, 'normal');
  doc.setFontSize(10);
  segments.forEach((segment, index) => {
    const itemX = x + index * legendColWidth;
    doc.setFillColor(withHash(segment.color));
    doc.rect(itemX, legendY, SUMMARY_CHIP_SIZE_IN, SUMMARY_CHIP_SIZE_IN, 'F');

    doc.setTextColor(withHash(COLORS.navy));
    drawText(doc, `${segment.label} — ${segment.count} (${segment.percent}%)`, itemX + SUMMARY_CHIP_SIZE_IN + 0.08, legendY + SUMMARY_CHIP_SIZE_IN / 2, {
      baseline: 'middle',
    });
  });

  return legendY;
}

/** Draws a QR code image with a link caption beneath, centered within a
 * column — shared by the summary slide and the dashboard slides, each
 * pointing at a different deep link. */
function drawQrWithLink(doc: jsPDF, qrCodeDataUrl: string, linkDisplay: string, x: number, width: number, y: number, size: number) {
  const imageX = x + (width - size) / 2;
  doc.addImage(qrCodeDataUrl, 'PNG', imageX, y, size, size);

  doc.setFont(PDF_FONT_FACE, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(withHash(COLORS.footerText));
  drawText(doc, linkDisplay, x + width / 2, y + size + 0.15, { align: 'center', baseline: 'top', maxWidth: width });
}

function drawSummarySlide(doc: jsPDF, model: SummarySlideModel, qrCodes: QrCodeModel[]) {
  drawChrome(doc, model.title);

  const legendY = drawStatusBreakdown(doc, model.segments, CONTENT_X_IN, CONTENT_TOP_IN, CONTENT_WIDTH_IN);
  const statsY = legendY + SUMMARY_STATS_GAP_IN;
  const statColWidth = CONTENT_WIDTH_IN / model.stats.length;

  model.stats.forEach((stat, index) => {
    const x = CONTENT_X_IN + index * statColWidth;

    doc.setFont(PDF_FONT_FACE, 'normal');
    doc.setFontSize(11);
    doc.setTextColor(withHash(COLORS.footerText));
    drawText(doc, stat.label, x, statsY, { baseline: 'top' });

    doc.setFont(PDF_FONT_FACE, 'bold');
    doc.setFontSize(22);
    doc.setTextColor(withHash(COLORS.navy));
    drawText(doc, stat.value, x, statsY + 0.3, { baseline: 'top' });
  });

  // Both QR codes sit side by side below the stats — the export link, plus a
  // deep link to the status view that used to have its own slide.
  const qrY = statsY + SUMMARY_QR_GAP_ABOVE_IN;
  const qrBlockWidth = qrCodes.length * SUMMARY_QR_CELL_WIDTH_IN;
  const qrBlockX = CONTENT_X_IN + (CONTENT_WIDTH_IN - qrBlockWidth) / 2;

  qrCodes.forEach((qr, index) => {
    drawQrWithLink(
      doc,
      qr.dataUrl,
      qr.display,
      qrBlockX + index * SUMMARY_QR_CELL_WIDTH_IN,
      SUMMARY_QR_CELL_WIDTH_IN,
      qrY,
      SUMMARY_QR_SIZE_IN,
    );
  });
}

const DASHBOARD_TABLE_QR_COLUMN_WIDTH_IN = 2.0;
const DASHBOARD_TABLE_GAP_IN = 0.4;
const DASHBOARD_TABLE_QR_SIZE_IN = 1.5;

function drawDashboardTableSlide(doc: jsPDF, model: DashboardTableSlideModel, qrCodeDataUrl: string) {
  drawChrome(doc, model.title);

  const tableWidth = CONTENT_WIDTH_IN - DASHBOARD_TABLE_QR_COLUMN_WIDTH_IN - DASHBOARD_TABLE_GAP_IN;

  if (model.table) {
    // Defense in depth: the realistic data volumes this dashboard targets
    // (a handful of delayed/at-risk tasks, see dashboardSlides.ts) always
    // fit in one page's content height, so drawTableBlock's own
    // pageBreak:'avoid' should never actually need to insert a page here —
    // but unlike the comment-table case, nothing upstream *guarantees* that
    // for an arbitrarily large task list. Neutralizing addPage for the
    // duration of the call means that even if it tried, this file's own
    // page count (and every subsequent slide's chrome) stays correct; the
    // worst case is visual overflow within this one page, never a stray
    // blank page.
    const originalAddPage = doc.addPage.bind(doc);
    doc.addPage = (() => doc) as typeof doc.addPage;
    try {
      drawTableBlock(doc, model.table, CONTENT_X_IN, CONTENT_TOP_IN, tableWidth);
    } finally {
      doc.addPage = originalAddPage;
    }
  } else {
    doc.setFont(PDF_FONT_FACE, 'normal');
    doc.setFontSize(13);
    doc.setTextColor(withHash(COLORS.footerText));
    drawText(doc, model.emptyMessage, CONTENT_X_IN, CONTENT_TOP_IN, { baseline: 'top' });
  }

  const qrX = CONTENT_X_IN + tableWidth + DASHBOARD_TABLE_GAP_IN;
  drawQrWithLink(
    doc,
    qrCodeDataUrl,
    model.qrDisplay,
    qrX,
    DASHBOARD_TABLE_QR_COLUMN_WIDTH_IN,
    CONTENT_TOP_IN,
    DASHBOARD_TABLE_QR_SIZE_IN,
  );
}

export async function exportTimelineToPdf(
  items: TimelineItem[],
  exportOptions: ExportOptions,
  comments: TaskComment[],
  fileName: string = 'timeline-export.pdf',
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

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'in',
    format: [PAGE_WIDTH_IN, PAGE_HEIGHT_IN],
  });

  // Resolved from the ordered deck up front, so a bar drawn on page 1 can
  // link forward to an appendix page that hasn't been added yet.
  const orderedSlides = orderExportSlides(slides, dashboardSlides);
  const links = buildSlideLinks(orderedSlides);

  orderedSlides.forEach((slideModel, index) => {
    if (index > 0) doc.addPage([PAGE_WIDTH_IN, PAGE_HEIGHT_IN], 'landscape');

    if (slideModel.kind === 'overview') {
      drawOverviewSlide(doc, slideModel, links);
    } else if (slideModel.kind === 'detail') {
      drawDetailSlide(doc, slideModel, links);
    } else if (slideModel.kind === 'summary') {
      drawSummarySlide(doc, slideModel, summaryQrCodes);
    } else {
      drawDashboardTableSlide(doc, slideModel, dashboardQrCodeDataUrls.get(slideModel)!);
    }
  });

  doc.save(fileName);
}
