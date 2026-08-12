import { jsPDF } from 'jspdf';
import type { TextOptionsLight } from 'jspdf';
import { useTimelineStore } from '../store/timelineStore';
import { sortItems } from '../utils/sortItems';
import {
  buildExportSlides,
  type DetailSlideModel,
  type OverviewSlideModel,
  type SummarySlideModel,
} from './timelineExportModel';
import { COLORS, FOOTER_TEXT, PDF_FONT_FACE, withHash } from './theme';
import {
  BAR_HEIGHT_IN,
  BAR_RADIUS_IN,
  CONTENT_TOP_IN,
  CONTENT_WIDTH_IN,
  CONTENT_X_IN,
  FOOTER_HEIGHT_IN,
  HEADER_HEIGHT_IN,
  PAGE_HEIGHT_IN,
  PAGE_WIDTH_IN,
} from './slideLayout';

// jsPDF's built-in standard fonts (helvetica/times/courier) only support the
// WinAnsi character set, so any richer Unicode punctuation must be swapped
// for a plain-ASCII equivalent before rendering, or glyphs render as garbage.
function toPdfSafeText(text: string): string {
  return text
    .replace(/→/g, '->')
    .replace(/[–—]/g, '-')
    .replace(/\u{1F4CC}/gu, '[pinned] ');
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

  model.bars.forEach((bar) => {
    doc.setFillColor(withHash(COLORS.border));
    doc.roundedRect(bar.barX, bar.barY, bar.trackWidth, BAR_HEIGHT_IN, BAR_RADIUS_IN, BAR_RADIUS_IN, 'F');

    if (bar.fillWidth > 0) {
      doc.setFillColor(withHash(bar.color));
      doc.roundedRect(bar.barX, bar.barY, bar.fillWidth, BAR_HEIGHT_IN, BAR_RADIUS_IN, BAR_RADIUS_IN, 'F');
    }

    doc.setFont(PDF_FONT_FACE, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(withHash(COLORS.navy));
    drawText(doc, bar.label, bar.barX, bar.labelY, { baseline: 'top' });

    doc.setFontSize(9);
    doc.setTextColor(withHash(bar.statusColor));
    drawText(doc, bar.statusText, CONTENT_X_IN + CONTENT_WIDTH_IN, bar.labelY, {
      baseline: 'top',
      align: 'right',
    });
  });
}

function drawDetailSlide(doc: jsPDF, model: DetailSlideModel) {
  drawChrome(doc, model.title);

  if (model.subtasksHeadingY !== undefined) {
    doc.setFont(PDF_FONT_FACE, 'bold');
    doc.setFontSize(14);
    doc.setTextColor(withHash(COLORS.navy));
    drawText(doc, 'Subtasks', CONTENT_X_IN, model.subtasksHeadingY, { baseline: 'top' });
  }

  model.subtasks.forEach((row) => {
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

  if (model.commentsHeadingY !== undefined) {
    doc.setFont(PDF_FONT_FACE, 'bold');
    doc.setFontSize(14);
    doc.setTextColor(withHash(COLORS.navy));
    drawText(doc, 'Comments', CONTENT_X_IN, model.commentsHeadingY, { baseline: 'top' });
  }

  model.comments.forEach((row) => {
    doc.setFont(PDF_FONT_FACE, 'normal');
    doc.setFontSize(11);
    doc.setTextColor(withHash(COLORS.navy));
    drawText(doc, row.text, CONTENT_X_IN + 0.2, row.y, {
      baseline: 'top',
      maxWidth: CONTENT_WIDTH_IN - 0.2,
    });
  });
}

const SUMMARY_BAR_HEIGHT_IN = 0.45;
const SUMMARY_LEGEND_GAP_IN = 0.25;
const SUMMARY_CHIP_SIZE_IN = 0.14;
const SUMMARY_STATS_GAP_IN = 0.55;

function drawSummarySlide(doc: jsPDF, model: SummarySlideModel) {
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
}

export function exportTimelineToPdf(): void {
  const { items, exportOptions, comments } = useTimelineStore.getState();
  const sortedItems = sortItems(items, exportOptions.sortMode);
  const slides = buildExportSlides(sortedItems, comments, exportOptions.commentMode);

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
      drawSummarySlide(doc, slideModel);
    }
  });

  doc.save('timeline-export.pdf');
}
