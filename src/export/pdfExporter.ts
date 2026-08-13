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
  type OverviewSlideModel,
  type SummarySlideModel,
} from './timelineExportModel';
import { EXPORT_LINK_DISPLAY, getExportQrCodeDataUrl } from './qrCode';
import { COLORS, FOOTER_TEXT, PDF_FONT_FACE, withHash } from './theme';
import {
  BAR_HEIGHT_IN,
  BAR_LABEL_PADDING_IN,
  BAR_RADIUS_IN,
  COMMENT_LINE_HEIGHT_IN,
  CONTENT_TOP_IN,
  CONTENT_WIDTH_IN,
  CONTENT_X_IN,
  DIMENSION_LINE_WIDTH_PT,
  DIMENSION_TICK_MARK_HEIGHT_IN,
  FOOTER_HEIGHT_IN,
  GROUP_HEADER_HEIGHT_IN,
  HEADER_HEIGHT_IN,
  PAGE_HEIGHT_IN,
  PAGE_WIDTH_IN,
} from './slideLayout';

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
    .replace(/▶/g, '>');
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

function drawOverviewSlide(doc: jsPDF, model: OverviewSlideModel) {
  drawChrome(doc, model.title);

  doc.setFont(PDF_FONT_FACE, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(withHash(COLORS.footerText));
  model.dateTicks.forEach((tick) => {
    drawText(doc, tick.label, tick.x, model.dateAxisY + GROUP_HEADER_HEIGHT_IN / 2, { baseline: 'middle' });
  });

  if (model.dateTicks.length > 0) {
    doc.setDrawColor(withHash(COLORS.border));
    doc.setLineWidth(0.01);
    const axisLineY = model.dateAxisY + GROUP_HEADER_HEIGHT_IN;
    doc.line(CONTENT_X_IN, axisLineY, CONTENT_X_IN + CONTENT_WIDTH_IN, axisLineY);
  }

  model.bars.forEach((bar) => {
    // Dimension line above the bar, technical-drawing style: a small date
    // label, a thin extent line spanning the bar's drawn width, and short
    // tick marks at both ends.
    doc.setFont(PDF_FONT_FACE, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(withHash(COLORS.footerText));
    drawText(doc, bar.dimensionLabel, bar.barX + bar.trackWidth / 2, bar.dimensionLabelY, {
      baseline: 'top',
      align: 'center',
    });

    doc.setDrawColor(withHash(COLORS.footerText));
    doc.setLineWidth(DIMENSION_LINE_WIDTH_PT * PT_TO_IN);
    doc.line(bar.barX, bar.dimensionLineY, bar.barX + bar.trackWidth, bar.dimensionLineY);
    [bar.barX, bar.barX + bar.trackWidth].forEach((tickX) => {
      doc.line(
        tickX,
        bar.dimensionLineY - DIMENSION_TICK_MARK_HEIGHT_IN / 2,
        tickX,
        bar.dimensionLineY + DIMENSION_TICK_MARK_HEIGHT_IN / 2,
      );
    });

    doc.setFillColor(withHash(COLORS.border));
    doc.roundedRect(bar.barX, bar.y, bar.trackWidth, BAR_HEIGHT_IN, BAR_RADIUS_IN, BAR_RADIUS_IN, 'F');

    if (bar.fillWidth > 0) {
      doc.setFillColor(withHash(bar.color));
      doc.roundedRect(bar.barX, bar.y, bar.fillWidth, BAR_HEIGHT_IN, BAR_RADIUS_IN, BAR_RADIUS_IN, 'F');
    }

    // Label sits outside the track, immediately to its right — never on top
    // of it — so it never gets split across the filled/unfilled boundary.
    const centerY = bar.y + BAR_HEIGHT_IN / 2;

    doc.setFont(PDF_FONT_FACE, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(withHash(COLORS.navy));
    const labelX = bar.barX + bar.trackWidth + BAR_LABEL_PADDING_IN;
    const labelMaxWidth = CONTENT_X_IN + CONTENT_WIDTH_IN - labelX;
    drawText(doc, bar.label, labelX, centerY, { baseline: 'middle', maxWidth: labelMaxWidth });

    doc.setFontSize(9);
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

  autoTable(doc, {
    startY: block.y,
    margin: { left: COMMENT_BODY_X_IN, right: PAGE_WIDTH_IN - COMMENT_BODY_X_IN - COMMENT_BODY_WIDTH_IN },
    tableWidth: COMMENT_BODY_WIDTH_IN,
    head: [block.headers.map(toPdfSafeText)],
    body: block.rows.map((row) => row.map(toPdfSafeText)),
    theme: 'grid',
    styles: {
      font: PDF_FONT_FACE,
      fontSize: COMMENT_TABLE_FONT_SIZE,
      textColor: withHash(COLORS.navy),
      lineColor: withHash(COLORS.border),
      lineWidth: 0.01,
    },
    headStyles: { fillColor: withHash(COLORS.border), textColor: withHash(COLORS.navy), fontStyle: 'bold' },
    // The shared slide model already decided what fits where (see
    // expandCandidateToChunks in timelineExportModel.ts) — autoTable must
    // never add its own page mid-table, which would desync every block
    // drawn after it from the model's precomputed Y positions.
    pageBreak: 'avoid',
  });
}

function drawDetailSlide(doc: jsPDF, model: DetailSlideModel) {
  drawChrome(doc, model.title);

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
      doc.setFont(PDF_FONT_FACE, 'normal');
      doc.setFontSize(12);
      doc.setTextColor(withHash(COLORS.navy));
      drawText(doc, row.text, CONTENT_X_IN + 0.2, row.y, { baseline: 'top' });

      doc.setFont(PDF_FONT_FACE, 'bold');
      doc.setFontSize(10);
      doc.setTextColor(withHash(row.statusColor));
      drawText(doc, row.statusText, CONTENT_X_IN + CONTENT_WIDTH_IN, row.y, {
        baseline: 'top',
        align: 'right',
      });
    });

    if (section.assigneeText !== undefined && section.assigneeY !== undefined) {
      doc.setFont(PDF_FONT_FACE, 'bold');
      doc.setFontSize(12);
      doc.setTextColor(withHash(COLORS.navy));
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

function drawSummarySlide(doc: jsPDF, model: SummarySlideModel, qrCodeDataUrl: string) {
  drawChrome(doc, model.title);

  const barY = CONTENT_TOP_IN;
  const total = model.segments.reduce((sum, segment) => sum + segment.count, 0);

  if (total > 0) {
    let cursorX = CONTENT_X_IN;
    model.segments.forEach((segment) => {
      const segmentWidth = (segment.count / total) * CONTENT_WIDTH_IN;
      doc.setFillColor(withHash(segment.color));
      doc.rect(cursorX, barY, segmentWidth, SUMMARY_BAR_HEIGHT_IN, 'F');
      cursorX += segmentWidth;
    });
  } else {
    doc.setFillColor(withHash(COLORS.border));
    doc.rect(CONTENT_X_IN, barY, CONTENT_WIDTH_IN, SUMMARY_BAR_HEIGHT_IN, 'F');
  }

  const legendY = barY + SUMMARY_BAR_HEIGHT_IN + SUMMARY_LEGEND_GAP_IN;
  const legendColWidth = CONTENT_WIDTH_IN / Math.max(model.segments.length, 1);

  doc.setFont(PDF_FONT_FACE, 'normal');
  doc.setFontSize(10);
  model.segments.forEach((segment, index) => {
    const itemX = CONTENT_X_IN + index * legendColWidth;
    doc.setFillColor(withHash(segment.color));
    doc.rect(itemX, legendY, SUMMARY_CHIP_SIZE_IN, SUMMARY_CHIP_SIZE_IN, 'F');

    doc.setTextColor(withHash(COLORS.navy));
    drawText(doc, `${segment.label} — ${segment.count} (${segment.percent}%)`, itemX + SUMMARY_CHIP_SIZE_IN + 0.08, legendY + SUMMARY_CHIP_SIZE_IN / 2, {
      baseline: 'middle',
    });
  });

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

  const qrY = statsY + SUMMARY_QR_GAP_ABOVE_IN;
  const qrX = CONTENT_X_IN + (CONTENT_WIDTH_IN - SUMMARY_QR_SIZE_IN) / 2;
  doc.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, SUMMARY_QR_SIZE_IN, SUMMARY_QR_SIZE_IN);

  doc.setFont(PDF_FONT_FACE, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(withHash(COLORS.footerText));
  drawText(doc, EXPORT_LINK_DISPLAY, CONTENT_X_IN + CONTENT_WIDTH_IN / 2, qrY + SUMMARY_QR_SIZE_IN + 0.15, {
    align: 'center',
    baseline: 'top',
  });
}

export async function exportTimelineToPdf(
  items: TimelineItem[],
  exportOptions: ExportOptions,
  comments: TaskComment[],
): Promise<void> {
  const sortedItems = sortItems(items, exportOptions.sortMode);
  const slides = buildExportSlides(sortedItems, comments, exportOptions.commentMode, exportOptions.exportTimeframe);
  const qrCodeDataUrl = await getExportQrCodeDataUrl();

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'in',
    format: [PAGE_WIDTH_IN, PAGE_HEIGHT_IN],
  });

  slides.forEach((slideModel, index) => {
    if (index > 0) doc.addPage([PAGE_WIDTH_IN, PAGE_HEIGHT_IN], 'landscape');

    if (slideModel.kind === 'overview') {
      drawOverviewSlide(doc, slideModel);
    } else if (slideModel.kind === 'detail') {
      drawDetailSlide(doc, slideModel);
    } else {
      drawSummarySlide(doc, slideModel, qrCodeDataUrl);
    }
  });

  doc.save('timeline-export.pdf');
}
