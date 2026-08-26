import { jsPDF } from 'jspdf';
import type { TextOptionsLight } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExportOptions } from '../store/timelineStore';
import type { TaskComment, TaskStatus, TimelineItem } from '../types/timeline';
import { sortItemsForExport } from '../utils/sortItemsForExport';
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
import { COLORS, EXPORT_MARK_TEXT, PDF_FONT_FACE, PDF_MONO_FONT_FACE, withHash } from './theme';
import { measureLetterSpacingWidthIn, measureTextWidthIn } from './textMetrics';
import {
  BACK_LINK_FONT_SIZE_PT,
  BACK_LINK_HEIGHT_IN,
  BACK_LINK_TEXT,
  BACK_LINK_WIDTH_IN,
  BACK_LINK_Y_IN,
  BAR_RADIUS_IN,
  CARD_BORDER_WIDTH_PT,
  CARD_BOTTOM_IN,
  CARD_HEIGHT_IN,
  CARD_RADIUS_IN,
  CARD_TOP_IN,
  CARD_WIDTH_IN,
  CARD_X_IN,
  CHEVRON_HEIGHT_IN,
  CHEVRON_WIDTH_IN,
  COLUMN_HEADER_FONT_SIZE_PT,
  COLUMN_HEADER_LINE_IN,
  COLUMN_HEADER_SUB_LINE_Y_IN,
  COLUMN_HEADER_TOP_LINE_Y_IN,
  COLUMN_HEADER_TRACKING_EM,
  COMMENT_BODY_FONT_SIZE_PT,
  COMMENT_LINE_HEIGHT_IN,
  COMMENT_TABLE_CELL_PADDING_IN,
  COMMENT_TABLE_FONT_SIZE_PT,
  CONTENT_TOP_IN,
  CONTENT_WIDTH_IN,
  CONTENT_X_IN,
  DASHBOARD_TABLE_GAP_IN,
  DASHBOARD_TABLE_QR_COLUMN_WIDTH_IN,
  DASHBOARD_TABLE_QR_SIZE_IN,
  DASHBOARD_TABLE_TOP_IN,
  DASHBOARD_TABLE_WIDTH_IN,
  DATE_LETTER_SPACING_EM,
  FOOTER_FONT_SIZE_PT,
  FOOTER_HEIGHT_IN,
  FRAME_BOTTOM_IN,
  FRAME_TOP_IN,
  LEGEND_FONT_SIZE_PT,
  LEGEND_ICON_GAP_IN,
  LEGEND_ITEM_GAP_IN,
  LEGEND_ITEMS,
  LEGEND_ROW_HEIGHT_IN,
  letterSpacingPt,
  LIST_ROW_HEIGHT_IN,
  META_FONT_SIZE_PT,
  PAGE_HEIGHT_IN,
  PAGE_WIDTH_IN,
  ROW_LABEL_HEIGHT_IN,
  ROW_RULE_ALPHA,
  ROW_RULE_WIDTH_PT,
  ROWS_AREA_TOP_IN,
  rowCenterY,
  STATUS_ICON_GEOMETRY,
  STATUS_ICON_GRID,
  STATUS_ICON_RING_RADIUS_UNITS,
  STATUS_ICON_SIZE_IN,
  STATUS_ICON_STROKE_UNITS,
  STATUS_LETTER_SPACING_EM,
  STATUS_RIGHT_PADDING_IN,
  SUBTASK_DATE_FONT_SIZE_PT,
  SUBTASK_STATUS_FONT_SIZE_PT,
  SUBTASK_TEXT_FONT_SIZE_PT,
  SUMMARY_LEGEND_STATUS_FONT_SIZE_PT,
  TASK_CELL_PAD_IN,
  TASK_NAME_FONT_SIZE_PT,
  TITLE_FONT_SIZE_PT,
  TITLE_LINE_HEIGHT_IN,
  TITLE_TRACKING_EM,
  TODAY_LINE_ALPHA,
  TODAY_LINE_WIDTH_PT,
} from './slideLayout';

/** What each status icon is stroked in — the same table the PPTX exporter
 * uses, and for the same reasons (see STATUS_ICON_GEOMETRY). */
const STATUS_ICON_COLORS: Record<TaskStatus, string> = {
  done: COLORS.textOnSurface,
  in_progress: COLORS.textOnSurface,
  todo: COLORS.iconTodo,
};

const PT_TO_IN = 1 / 72;

// Comment blocks are indented slightly from the section's left edge, same as
// the subtask rows above them.
const COMMENT_BODY_X_IN = CONTENT_X_IN + 0.2;
const COMMENT_BODY_WIDTH_IN = CONTENT_WIDTH_IN - 0.2;
const COMMENT_HEADING_FONT_SIZE: Record<1 | 2 | 3, number> = { 1: 16, 2: 14, 3: 12 };

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
  doc.setTextColor(withHash(COLORS.link));
  drawText(
    doc,
    BACK_LINK_TEXT,
    CONTENT_X_IN + CONTENT_WIDTH_IN,
    BACK_LINK_Y_IN + BACK_LINK_HEIGHT_IN / 2,
    { align: 'right', baseline: 'middle' },
  );

  linkToPage(
    doc,
    overviewSlideNumber,
    CONTENT_X_IN + CONTENT_WIDTH_IN - BACK_LINK_WIDTH_IN,
    BACK_LINK_Y_IN,
    BACK_LINK_WIDTH_IN,
    BACK_LINK_HEIGHT_IN,
  );
}

function drawText(doc: jsPDF, text: string, x: number, y: number, options?: TextOptionsLight) {
  doc.text(toPdfSafeText(text), x, y, options);
}

/** drawText with letter-spacing, working around two jsPDF quirks.
 *
 * charSpace is sticky document state rather than a per-call option, so it's
 * reset to 0 afterwards — otherwise every later draw on the page inherits
 * the tracking. And jsPDF's own `align: 'right'` anchors using
 * getTextWidth(), which ignores charSpace entirely (verified: the emitted Td
 * is byte-identical with and without it set), so a right-aligned tracked
 * string would hang past its anchor by exactly the tracking it added — hence
 * pulling x back by that width first. */
function drawTrackedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  spacingPt: number,
  options?: TextOptionsLight,
) {
  const anchoredRight = options?.align === 'right';
  const anchorX = anchoredRight ? x - measureLetterSpacingWidthIn(text, spacingPt) : x;

  doc.setCharSpace(spacingPt / 72);
  drawText(doc, text, anchorX, y, options);
  doc.setCharSpace(0);
}

/** The frame every slide wears: a white page, the title at its top left, and
 * the deck's mark at the right of the title's line — the export handoff's
 * frame, shared by every slide of the deck so a reader never meets two
 * chromes in one file.
 *
 * The footer is *not* drawn here. It carries one thing, the coverage note, and
 * only the slides that have one draw it (drawOmittedNote).
 *
 * `markRight` is false on the appendix slides, where "Back to overview" owns
 * that end of the title's line. One slot, one occupant. */
function drawChrome(doc: jsPDF, title: string, markRight = true) {
  doc.setFillColor(withHash(COLORS.slideBg));
  doc.rect(0, 0, PAGE_WIDTH_IN, PAGE_HEIGHT_IN, 'F');

  doc.setFont(PDF_FONT_FACE, 'bold');
  doc.setFontSize(TITLE_FONT_SIZE_PT);
  doc.setTextColor(withHash(COLORS.textOnSurface));
  drawTrackedText(
    doc,
    title,
    CONTENT_X_IN,
    FRAME_TOP_IN + TITLE_LINE_HEIGHT_IN / 2,
    letterSpacingPt(TITLE_FONT_SIZE_PT, TITLE_TRACKING_EM),
    { baseline: 'middle' },
  );

  if (markRight) {
    doc.setFont(PDF_FONT_FACE, 'normal');
    doc.setFontSize(META_FONT_SIZE_PT);
    doc.setTextColor(withHash(COLORS.mutedText));
    drawText(
      doc,
      EXPORT_MARK_TEXT,
      CONTENT_X_IN + CONTENT_WIDTH_IN,
      FRAME_TOP_IN + TITLE_LINE_HEIGHT_IN / 2,
      { align: 'right', baseline: 'middle' },
    );
  }
}

/** One status glyph, drawn from primitives at `size` inches — the same
 * geometry the PPTX exporter draws, in jsPDF's own calls. */
function drawStatusIcon(doc: jsPDF, status: TaskStatus, x: number, y: number, size: number) {
  const unit = size / STATUS_ICON_GRID;
  const color = withHash(STATUS_ICON_COLORS[status]);
  const radius = STATUS_ICON_RING_RADIUS_UNITS * unit;

  doc.setDrawColor(color);
  doc.setLineWidth(STATUS_ICON_STROKE_UNITS * unit);
  doc.circle(x + size / 2, y + size / 2, radius, 'S');

  const geometry = STATUS_ICON_GEOMETRY[status];

  geometry.polyline?.forEach((point, index) => {
    const next = geometry.polyline?.[index + 1];
    if (!next) return;
    doc.line(x + point[0] * unit, y + point[1] * unit, x + next[0] * unit, y + next[1] * unit);
  });

  const triangle = geometry.triangle;
  if (triangle) {
    doc.setFillColor(color);
    const [[ax, ay], [bx, by], [cx, cy]] = triangle;
    doc.triangle(
      x + ax * unit,
      y + ay * unit,
      x + bx * unit,
      y + by * unit,
      x + cx * unit,
      y + cy * unit,
      'F',
    );
  }
}

/** The status legend, on the line under the title. The zoom caption that used
 * to sit at the right of this row is gone with the per-slide window. */
function drawLegend(doc: jsPDF) {
  let x = CONTENT_X_IN;
  const centerY = rowCenterY(CONTENT_TOP_IN, LEGEND_ROW_HEIGHT_IN);

  doc.setFont(PDF_FONT_FACE, 'normal');
  doc.setFontSize(LEGEND_FONT_SIZE_PT);
  doc.setTextColor(withHash(COLORS.mutedText));

  LEGEND_ITEMS.forEach((item) => {
    drawStatusIcon(
      doc,
      item.status,
      x,
      CONTENT_TOP_IN + (LEGEND_ROW_HEIGHT_IN - STATUS_ICON_SIZE_IN) / 2,
      STATUS_ICON_SIZE_IN,
    );
    const labelX = x + STATUS_ICON_SIZE_IN + LEGEND_ICON_GAP_IN;
    doc.setTextColor(withHash(COLORS.mutedText));
    drawText(doc, item.label, labelX, centerY, { baseline: 'middle' });
    x = labelX + measureTextWidthIn(item.label, LEGEND_FONT_SIZE_PT) + LEGEND_ITEM_GAP_IN;
  });
}

/** The model's own "not shown" note (see buildOmittedNote) — both exporters
 * draw the same sentence, so neither writes it. */
function drawOmittedNote(doc: jsPDF, note: string | null) {
  if (!note) return;

  const footerY = PAGE_HEIGHT_IN - FRAME_BOTTOM_IN - FOOTER_HEIGHT_IN;
  doc.setFont(PDF_FONT_FACE, 'bold');
  doc.setFontSize(FOOTER_FONT_SIZE_PT);
  doc.setTextColor(withHash(COLORS.warning));
  drawText(doc, note, CONTENT_X_IN, footerY + FOOTER_HEIGHT_IN / 2, { baseline: 'middle' });
}

/** Runs `draw` at `alpha`, then puts the page back to opaque. jsPDF has no
 * per-shape alpha — the tinted bars, the row rules and the today line each
 * need one, and leaving it set would fade everything drawn after. */
function withAlpha(doc: jsPDF, alpha: number, draw: () => void) {
  const GState = (doc as unknown as { GState: new (options: { opacity: number }) => unknown }).GState;
  doc.setGState(new GState({ opacity: alpha }) as never);
  draw();
  doc.setGState(new GState({ opacity: 1 }) as never);
}

/** The overview slide of the export handoff, painted back to front (jsPDF has
 * no z-index — draw order is paint order): the card and its rules, then the
 * bars, then the today rule, then every icon and every word. */
function drawOverviewSlide(doc: jsPDF, model: OverviewSlideModel, links: SlideLinks) {
  drawChrome(doc, model.title);
  drawOmittedNote(doc, model.omittedNote);
  drawLegend(doc);

  doc.setFillColor(withHash(COLORS.cardBg));
  doc.setDrawColor(withHash(COLORS.border));
  doc.setLineWidth(CARD_BORDER_WIDTH_PT * PT_TO_IN);
  doc.roundedRect(
    CARD_X_IN,
    CARD_TOP_IN,
    CARD_WIDTH_IN,
    CARD_HEIGHT_IN,
    CARD_RADIUS_IN,
    CARD_RADIUS_IN,
    'FD',
  );

  doc.setFont(PDF_FONT_FACE, 'normal');
  doc.setFontSize(COLUMN_HEADER_FONT_SIZE_PT);
  doc.setTextColor(withHash(COLORS.mutedText));
  drawTrackedText(
    doc,
    'TASK',
    CARD_X_IN + TASK_CELL_PAD_IN,
    CARD_TOP_IN + COLUMN_HEADER_SUB_LINE_Y_IN + COLUMN_HEADER_LINE_IN / 2,
    letterSpacingPt(COLUMN_HEADER_FONT_SIZE_PT, COLUMN_HEADER_TRACKING_EM),
    { baseline: 'middle' },
  );

  model.columns.forEach((column) => {
    const centerX = column.x + column.width / 2;
    doc.setFont(PDF_FONT_FACE, 'bold');
    doc.setTextColor(withHash(COLORS.textOnSurface));
    drawText(
      doc,
      column.top,
      centerX,
      CARD_TOP_IN + COLUMN_HEADER_TOP_LINE_Y_IN + COLUMN_HEADER_LINE_IN / 2,
      { align: 'center', baseline: 'middle' },
    );
    doc.setFont(PDF_FONT_FACE, 'normal');
    doc.setTextColor(withHash(COLORS.mutedText));
    drawText(
      doc,
      column.sub,
      centerX,
      CARD_TOP_IN + COLUMN_HEADER_SUB_LINE_Y_IN + COLUMN_HEADER_LINE_IN / 2,
      { align: 'center', baseline: 'middle' },
    );
  });

  doc.setDrawColor(withHash(COLORS.border));
  doc.setLineWidth(CARD_BORDER_WIDTH_PT * PT_TO_IN);
  if (model.headerRuleY !== null) {
    doc.line(CARD_X_IN, model.headerRuleY, CARD_X_IN + CARD_WIDTH_IN, model.headerRuleY);
  }
  if (model.dividerX !== null) {
    doc.line(model.dividerX, CARD_TOP_IN, model.dividerX, CARD_BOTTOM_IN);
  }
  model.gridLines.forEach((gridLine) => {
    doc.line(gridLine.x, CARD_TOP_IN, gridLine.x, CARD_BOTTOM_IN);
  });

  doc.setLineWidth(ROW_RULE_WIDTH_PT * PT_TO_IN);
  withAlpha(doc, ROW_RULE_ALPHA, () => {
    model.bars.slice(0, -1).forEach((bar) => {
      const ruleY = bar.y + bar.rowHeight;
      doc.line(CARD_X_IN, ruleY, CARD_X_IN + CARD_WIDTH_IN, ruleY);
    });
  });

  model.bars.forEach((bar) => {
    doc.setFillColor(withHash(bar.color));
    const drawBar = () =>
      doc.roundedRect(bar.barX, bar.barY, bar.barWidth, bar.barHeight, BAR_RADIUS_IN, BAR_RADIUS_IN, 'F');
    if (bar.fillAlpha >= 1) drawBar();
    else withAlpha(doc, bar.fillAlpha, drawBar);

    // Chevrons mark a bar the export timeframe clipped. Triangles, not
    // characters — glyph icons are the handoff's first export trap.
    const chevronTop = bar.barY + (bar.barHeight - CHEVRON_HEIGHT_IN) / 2;
    doc.setFillColor(withHash(COLORS.textOnSurface));
    if (bar.chevronLeft) {
      doc.triangle(
        bar.barX,
        chevronTop + CHEVRON_HEIGHT_IN / 2,
        bar.barX + CHEVRON_WIDTH_IN,
        chevronTop,
        bar.barX + CHEVRON_WIDTH_IN,
        chevronTop + CHEVRON_HEIGHT_IN,
        'F',
      );
    }
    if (bar.chevronRight) {
      const right = bar.barX + bar.barWidth;
      doc.triangle(
        right,
        chevronTop + CHEVRON_HEIGHT_IN / 2,
        right - CHEVRON_WIDTH_IN,
        chevronTop,
        right - CHEVRON_WIDTH_IN,
        chevronTop + CHEVRON_HEIGHT_IN,
        'F',
      );
    }
  });

  const todayX = model.todayX;
  if (todayX !== null) {
    doc.setDrawColor(withHash(COLORS.today));
    doc.setLineWidth(TODAY_LINE_WIDTH_PT * PT_TO_IN);
    withAlpha(doc, TODAY_LINE_ALPHA, () => {
      doc.line(todayX, ROWS_AREA_TOP_IN, todayX, CARD_BOTTOM_IN);
    });
  }

  model.bars.forEach((bar) => {
    if (bar.icon !== null) {
      drawStatusIcon(
        doc,
        bar.icon,
        bar.iconX,
        bar.y + (bar.rowHeight - STATUS_ICON_SIZE_IN) / 2,
        STATUS_ICON_SIZE_IN,
      );
    }

    const centerY = rowCenterY(bar.y, bar.rowHeight);
    const detailPage = links.detailSlideNumberByTaskId.get(bar.id);
    linkToPage(doc, detailPage, bar.labelX, bar.y, bar.labelWidth, bar.rowHeight);
    linkToPage(doc, detailPage, bar.barX, bar.barY, bar.barWidth, bar.barHeight);

    doc.setFont(PDF_FONT_FACE, bar.labelBold ? 'bold' : 'normal');
    doc.setFontSize(TASK_NAME_FONT_SIZE_PT);
    doc.setTextColor(withHash(COLORS.textOnSurface));
    drawText(doc, bar.label, bar.labelX, centerY, { baseline: 'middle' });
  });
}

/** Runs `draw` with `doc.addPage` disabled.
 *
 * This file owns its own pagination: it walks a pre-built slide model and adds
 * exactly one page per slide, and every draw call after that assumes the
 * current page is the one the model computed coordinates for. A plugin that
 * inserts a page of its own puts a chrome-less, model-less sheet into the deck
 * and shifts every slide after it — which also silently invalidates every
 * internal hyperlink, since those address slides by number.
 *
 * jspdf-autotable does exactly that: `pageBreak: 'avoid'` means "move the whole
 * table to a fresh page if it doesn't fit here", not "never break". Both table
 * callers are wrapped, so a table that outgrows its reserved space is at worst
 * a local visual overflow on the right slide, never a stray page. */
function withoutPageBreaks(doc: jsPDF, draw: () => void) {
  const addPage = doc.addPage.bind(doc);
  doc.addPage = (() => doc) as typeof doc.addPage;
  try {
    draw();
  } finally {
    doc.addPage = addPage;
  }
}

/** Draws a real jspdf-autotable table (borders, columns, a bold header row)
 * at an arbitrary position/width — shared by a comment's markdown table
 * blocks and the dashboard's delayed/at-risk task tables, so there's exactly
 * one table renderer instead of one per caller.
 *
 * Cell padding and font size come from slideLayout rather than from
 * autoTable's defaults, so a row is exactly as tall as the model reserved for
 * it (COMMENT_TABLE_ROW_HEIGHT_IN) instead of ~18% taller. */
function drawTableBlock(
  doc: jsPDF,
  table: DashboardTable,
  x: number,
  y: number,
  width: number,
  fontSize: number = COMMENT_TABLE_FONT_SIZE_PT,
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
      cellPadding: COMMENT_TABLE_CELL_PADDING_IN,
      textColor: withHash(COLORS.navy),
      lineColor: withHash(COLORS.border),
      lineWidth: 0.01,
    },
    headStyles: { fillColor: withHash(COLORS.border), textColor: withHash(COLORS.navy), fontStyle: 'bold' },
    // Per-column faces, matching the PPTX table: the date column monospace,
    // the first column (the task name in both dashboard tables) bold as the
    // row's content anchor. No columnStyles entry at all when the table has
    // no date column — a comment's markdown table reuses this renderer.
    columnStyles: {
      0: { fontStyle: 'bold' },
      ...(table.dateColumnIndex !== undefined
        ? {
            [table.dateColumnIndex]: {
              font: PDF_MONO_FONT_FACE,
              fontSize: fontSize - 1,
              textColor: withHash(COLORS.footerText),
            },
          }
        : {}),
    },
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
    doc.setFontSize(COMMENT_BODY_FONT_SIZE_PT);
    doc.setTextColor(withHash(COLORS.navy));
    drawText(doc, block.text, COMMENT_BODY_X_IN, block.y, { baseline: 'top', maxWidth: COMMENT_BODY_WIDTH_IN });
    return;
  }

  if (block.type === 'list') {
    doc.setFont(PDF_FONT_FACE, 'normal');
    doc.setFontSize(COMMENT_BODY_FONT_SIZE_PT);
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

  // The shared slide model reserves this table's measured height (see
  // estimateBlockHeight in timelineExportModel.ts), so it fits where it is
  // drawn. withoutPageBreaks is the belt to that braces: a mis-measured table
  // must not be able to insert a page and desync the rest of the deck.
  withoutPageBreaks(doc, () => {
    drawTableBlock(doc, block, COMMENT_BODY_X_IN, block.y, COMMENT_BODY_WIDTH_IN);
  });
}

function drawDetailSlide(doc: jsPDF, model: DetailSlideModel, links: SlideLinks) {
  drawChrome(doc, model.title, false);
  drawBackToOverviewLink(doc, links.overviewSlideNumber);

  model.sections.forEach((section) => {
    // Single-line rows are drawn on their row box's center line (see
    // rowCenterY in slideLayout.ts), which is what `valign: 'middle'` means
    // on the PPTX side — top-aligning text of four different sizes puts four
    // different baselines on what should read as one line.
    doc.setFont(PDF_FONT_FACE, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(withHash(COLORS.navy));
    drawText(doc, section.parentTitle, CONTENT_X_IN, rowCenterY(section.parentTitleY, ROW_LABEL_HEIGHT_IN), {
      baseline: 'middle',
    });

    if (section.subtasksHeadingY !== undefined) {
      doc.setFont(PDF_FONT_FACE, 'bold');
      doc.setFontSize(14);
      doc.setTextColor(withHash(COLORS.navy));
      drawText(doc, 'Subtasks', CONTENT_X_IN, rowCenterY(section.subtasksHeadingY, ROW_LABEL_HEIGHT_IN), {
        baseline: 'middle',
      });
    }

    section.subtasks.forEach((row) => {
      // Three typographic tiers on one line, each drawn at an x the model
      // resolved against the face and size used here (see SubtaskRowModel):
      // bold task name, monospace dates, tracked-out status.
      const centerY = rowCenterY(row.y, LIST_ROW_HEIGHT_IN);

      doc.setFont(PDF_FONT_FACE, 'bold');
      doc.setFontSize(SUBTASK_TEXT_FONT_SIZE_PT);
      doc.setTextColor(withHash(COLORS.navy));
      drawText(doc, row.label, row.labelX, centerY, { baseline: 'middle' });

      doc.setFont(PDF_MONO_FONT_FACE, 'normal');
      doc.setFontSize(SUBTASK_DATE_FONT_SIZE_PT);
      doc.setTextColor(withHash(COLORS.footerText));
      drawTrackedText(
        doc,
        row.dateText,
        row.dateX,
        centerY,
        letterSpacingPt(SUBTASK_DATE_FONT_SIZE_PT, DATE_LETTER_SPACING_EM),
        { baseline: 'middle' },
      );

      doc.setFont(PDF_FONT_FACE, 'bold');
      doc.setFontSize(SUBTASK_STATUS_FONT_SIZE_PT);
      doc.setTextColor(withHash(row.statusColor));
      drawTrackedText(
        doc,
        row.statusText,
        CONTENT_X_IN + CONTENT_WIDTH_IN - STATUS_RIGHT_PADDING_IN,
        centerY,
        letterSpacingPt(SUBTASK_STATUS_FONT_SIZE_PT, STATUS_LETTER_SPACING_EM),
        { baseline: 'middle', align: 'right' },
      );
    });

    if (section.commentsHeadingY !== undefined) {
      doc.setFont(PDF_FONT_FACE, 'bold');
      doc.setFontSize(14);
      doc.setTextColor(withHash(COLORS.navy));
      drawText(
        doc,
        section.commentsHeadingText ?? 'Comments',
        CONTENT_X_IN,
        rowCenterY(section.commentsHeadingY, ROW_LABEL_HEIGHT_IN),
        { baseline: 'middle' },
      );
    }

    section.comments.forEach((comment) => {
      if (comment.meta) {
        // A comment's meta line is its date (optionally pin-prefixed), so it
        // takes the date face. Italic drops off with the switch — the
        // monospace face is now what sets it apart from the body text.
        doc.setFont(PDF_MONO_FONT_FACE, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(withHash(COLORS.footerText));
        drawTrackedText(
          doc,
          comment.meta.text,
          COMMENT_BODY_X_IN,
          comment.meta.y,
          letterSpacingPt(8, DATE_LETTER_SPACING_EM),
          { baseline: 'top' },
        );
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

  // The legend's status name and its figures are two tiers, so they're two
  // draws rather than one joined string: the status smaller/bold/tracked
  // like every other status, the count in the plain body face after it. The
  // count's x follows the status's measured width (tracking included, since
  // jsPDF's own metrics ignore it) instead of a fixed offset.
  const statusSpacingPt = letterSpacingPt(SUMMARY_LEGEND_STATUS_FONT_SIZE_PT, STATUS_LETTER_SPACING_EM);
  segments.forEach((segment, index) => {
    const itemX = x + index * legendColWidth;
    const textY = legendY + SUMMARY_CHIP_SIZE_IN / 2;
    const labelX = itemX + SUMMARY_CHIP_SIZE_IN + 0.08;

    doc.setFillColor(withHash(segment.color));
    doc.rect(itemX, legendY, SUMMARY_CHIP_SIZE_IN, SUMMARY_CHIP_SIZE_IN, 'F');

    doc.setTextColor(withHash(COLORS.navy));
    doc.setFont(PDF_FONT_FACE, 'bold');
    doc.setFontSize(SUMMARY_LEGEND_STATUS_FONT_SIZE_PT);
    drawTrackedText(doc, segment.label, labelX, textY, statusSpacingPt, { baseline: 'middle' });

    const countX =
      labelX +
      measureTextWidthIn(segment.label, SUMMARY_LEGEND_STATUS_FONT_SIZE_PT) +
      measureLetterSpacingWidthIn(segment.label, statusSpacingPt) +
      0.06;

    doc.setFont(PDF_FONT_FACE, 'normal');
    doc.setFontSize(10);
    drawText(doc, `${segment.count} (${segment.percent}%)`, countX, textY, { baseline: 'middle' });
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

function drawDashboardTableSlide(doc: jsPDF, model: DashboardTableSlideModel, qrCodeDataUrl: string) {
  drawChrome(doc, model.title);
  // The model cut this table to the rows that fit the slide; the note is how
  // the slide says so — the same footer line the overview announces its own
  // omissions on, so a reader learns "there is more" in one place per deck.
  drawOmittedNote(doc, model.note);

  const tableWidth = DASHBOARD_TABLE_WIDTH_IN;

  if (model.table) {
    // How many rows fit is settled upstream (fitTableRows), measured against
    // the same row height this renderer draws with. withoutPageBreaks is the
    // belt to that braces: a table that outgrows its slide anyway overflows
    // this one page rather than inserting others.
    const table = model.table;
    withoutPageBreaks(doc, () => {
      drawTableBlock(doc, table, CONTENT_X_IN, DASHBOARD_TABLE_TOP_IN, tableWidth);
    });
  } else {
    doc.setFont(PDF_FONT_FACE, 'normal');
    doc.setFontSize(13);
    doc.setTextColor(withHash(COLORS.footerText));
    drawText(doc, model.emptyMessage, CONTENT_X_IN, DASHBOARD_TABLE_TOP_IN, { baseline: 'top' });
  }

  const qrX = CONTENT_X_IN + tableWidth + DASHBOARD_TABLE_GAP_IN;
  drawQrWithLink(
    doc,
    qrCodeDataUrl,
    model.qrDisplay,
    qrX,
    DASHBOARD_TABLE_QR_COLUMN_WIDTH_IN,
    DASHBOARD_TABLE_TOP_IN,
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
  const sortedItems = sortItemsForExport(items, exportOptions.sortMode);
  // One clock reading for the whole deck: the overview's today rule and the
  // dashboard's overdue counts have to agree about what day it is.
  const now = new Date();
  const slides = buildExportSlides(
    sortedItems,
    comments,
    exportOptions.commentMode,
    exportOptions.exportTimeframe,
    exportMode,
    now,
  );
  const dashboardSlides = buildDashboardSlides(sortedItems, now);
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
