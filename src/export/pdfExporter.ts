import { jsPDF } from 'jspdf';
import type { TextOptionsLight } from 'jspdf';
import { useTimelineStore } from '../store/timelineStore';
import { buildExportSlides, type DetailSlideModel, type OverviewSlideModel } from './timelineExportModel';
import { COLORS, FOOTER_TEXT, PDF_FONT_FACE, withHash } from './theme';
import {
  BAR_HEIGHT_IN,
  BAR_RADIUS_IN,
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

export function exportTimelineToPdf(): void {
  const { items, exportOptions, comments } = useTimelineStore.getState();
  const slides = buildExportSlides(items, comments, exportOptions.commentMode);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'in',
    format: [PAGE_WIDTH_IN, PAGE_HEIGHT_IN],
  });

  slides.forEach((slideModel, index) => {
    if (index > 0) doc.addPage([PAGE_WIDTH_IN, PAGE_HEIGHT_IN], 'landscape');

    if (slideModel.kind === 'overview') {
      drawOverviewSlide(doc, slideModel);
    } else {
      drawDetailSlide(doc, slideModel);
    }
  });

  doc.save('timeline-export.pdf');
}
