import pptxgen from 'pptxgenjs';
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
import { COLORS, FOOTER_TEXT, PPTX_FONT_FACE, PPTX_MONO_FONT_FACE } from './theme';
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
  COLUMN_HEADER_HEIGHT_IN,
  COLUMN_HEADER_LINE_IN,
  COLUMN_HEADER_SUB_LINE_Y_IN,
  COLUMN_HEADER_TOP_LINE_Y_IN,
  COLUMN_HEADER_TRACKING_EM,
  COMMENT_BODY_FONT_SIZE_PT,
  COMMENT_META_ROW_HEIGHT_IN,
  COMMENT_TABLE_FONT_SIZE_PT,
  CONTENT_BOTTOM_IN,
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
  TASK_COL_WIDTH_IN,
  TASK_NAME_FONT_SIZE_PT,
  TITLE_FONT_SIZE_PT,
  TITLE_LINE_HEIGHT_IN,
  TITLE_TRACKING_EM,
  TODAY_LINE_ALPHA,
  TODAY_LINE_WIDTH_PT,
} from './slideLayout';
import { measureTextWidthIn } from './textMetrics';

/** What each status icon is stroked in: the two states a reader acts on take
 * --foreground, and "to do" the muted grey the handoff sets it in. */
const STATUS_ICON_COLORS: Record<TaskStatus, string> = {
  done: COLORS.textOnSurface,
  in_progress: COLORS.textOnSurface,
  todo: COLORS.iconTodo,
};

// Comment blocks are indented slightly from the section's left edge, same as
// the subtask rows above them.
const COMMENT_BODY_X_IN = CONTENT_X_IN + 0.2;
const COMMENT_BODY_WIDTH_IN = CONTENT_WIDTH_IN - 0.2;
const COMMENT_HEADING_FONT_SIZE: Record<1 | 2 | 3, number> = { 1: 16, 2: 14, 3: 12 };


type PptxSlide = ReturnType<pptxgen['addSlide']>;

/** The frame every slide wears: a white page, the title at its top left, and
 * the footer line at the bottom. No header band any more — the export handoff
 * puts the title on the slide itself (docs/export-handoff-map.md). */
function drawChrome(slide: PptxSlide, title: string, meta?: string) {
  slide.background = { color: COLORS.slideBg };

  slide.addText(title, {
    x: CONTENT_X_IN,
    y: FRAME_TOP_IN,
    w: CONTENT_WIDTH_IN,
    h: TITLE_LINE_HEIGHT_IN,
    fontSize: TITLE_FONT_SIZE_PT,
    charSpacing: letterSpacingPt(TITLE_FONT_SIZE_PT, TITLE_TRACKING_EM),
    bold: true,
    color: COLORS.textOnSurface,
    fontFace: PPTX_FONT_FACE,
    valign: 'middle',
    align: 'left',
    margin: 0,
    // The handoff's second export trap: a shrink-to-fit box re-wraps on a
    // machine with wider metrics and lands on the row below.
    wrap: false,
  });

  if (meta) {
    slide.addText(meta, {
      x: CONTENT_X_IN,
      y: FRAME_TOP_IN,
      w: CONTENT_WIDTH_IN,
      h: TITLE_LINE_HEIGHT_IN,
      fontSize: META_FONT_SIZE_PT,
      color: COLORS.mutedText,
      fontFace: PPTX_FONT_FACE,
      valign: 'middle',
      align: 'right',
      margin: 0,
      wrap: false,
    });
  }

  const footerY = PAGE_HEIGHT_IN - FRAME_BOTTOM_IN - FOOTER_HEIGHT_IN;
  slide.addText(FOOTER_TEXT, {
    x: CONTENT_X_IN,
    y: footerY,
    w: CONTENT_WIDTH_IN,
    h: FOOTER_HEIGHT_IN,
    fontSize: FOOTER_FONT_SIZE_PT,
    color: COLORS.mutedText,
    fontFace: PPTX_FONT_FACE,
    valign: 'middle',
    align: 'right',
    margin: 0,
  });
}

/** One status glyph, drawn from primitives at `size` inches (see
 * STATUS_ICON_GEOMETRY for why it is not an image). */
function drawStatusIcon(slide: PptxSlide, status: TaskStatus, x: number, y: number, size: number) {
  const unit = size / STATUS_ICON_GRID;
  const color = STATUS_ICON_COLORS[status];
  const strokePt = STATUS_ICON_STROKE_UNITS * unit * 72;
  const radius = STATUS_ICON_RING_RADIUS_UNITS * unit;

  slide.addShape('ellipse', {
    x: x + size / 2 - radius,
    y: y + size / 2 - radius,
    w: radius * 2,
    h: radius * 2,
    fill: { color: COLORS.cardBg },
    line: { color, width: strokePt },
  });

  const geometry = STATUS_ICON_GEOMETRY[status];

  geometry.polyline?.forEach((point, index) => {
    const next = geometry.polyline?.[index + 1];
    if (!next) return;
    const [x1, y1] = point;
    const [x2, y2] = next;
    slide.addShape('line', {
      x: x + Math.min(x1, x2) * unit,
      y: y + Math.min(y1, y2) * unit,
      w: Math.abs(x2 - x1) * unit,
      h: Math.abs(y2 - y1) * unit,
      // A pptx line runs top-left to bottom-right; a segment that climbs is
      // the same box flipped.
      flipV: y2 < y1,
      line: { color, width: strokePt },
    });
  });

  const triangle = geometry.triangle;
  if (triangle) {
    // PowerPoint's own triangle points up and turns about the centre of its
    // box, so the handoff's right-pointing glyph is that box with its width
    // and height swapped, given a quarter turn about the same centre. No
    // outline: a 1pt default line on a glyph this small is half its width
    // again, and the handoff's triangle is a fill.
    const xs = triangle.map((point) => point[0]);
    const ys = triangle.map((point) => point[1]);
    const width = (Math.max(...xs) - Math.min(...xs)) * unit;
    const height = (Math.max(...ys) - Math.min(...ys)) * unit;
    const centerX = x + ((Math.min(...xs) + Math.max(...xs)) / 2) * unit;
    const centerY = y + ((Math.min(...ys) + Math.max(...ys)) / 2) * unit;
    slide.addShape('triangle', {
      x: centerX - height / 2,
      y: centerY - width / 2,
      w: height,
      h: width,
      rotate: 90,
      fill: { color },
      line: { type: 'none' },
    });
  }
}

/** The status legend and the zoom caption, on the line under the title. */
function drawLegend(slide: PptxSlide, zoomCaption: string) {
  let x = CONTENT_X_IN;

  LEGEND_ITEMS.forEach((item) => {
    drawStatusIcon(
      slide,
      item.status,
      x,
      CONTENT_TOP_IN + (LEGEND_ROW_HEIGHT_IN - STATUS_ICON_SIZE_IN) / 2,
      STATUS_ICON_SIZE_IN,
    );
    const labelX = x + STATUS_ICON_SIZE_IN + LEGEND_ICON_GAP_IN;
    const labelWidth = measureTextWidthIn(item.label, LEGEND_FONT_SIZE_PT);
    slide.addText(item.label, {
      x: labelX,
      y: CONTENT_TOP_IN,
      w: labelWidth,
      h: LEGEND_ROW_HEIGHT_IN,
      fontSize: LEGEND_FONT_SIZE_PT,
      color: COLORS.mutedText,
      fontFace: PPTX_FONT_FACE,
      valign: 'middle',
      margin: 0,
      wrap: false,
    });
    x = labelX + labelWidth + LEGEND_ITEM_GAP_IN;
  });

  slide.addText(zoomCaption, {
    x: CONTENT_X_IN,
    y: CONTENT_TOP_IN,
    w: CONTENT_WIDTH_IN,
    h: LEGEND_ROW_HEIGHT_IN,
    fontSize: LEGEND_FONT_SIZE_PT,
    color: COLORS.mutedText,
    fontFace: PPTX_FONT_FACE,
    valign: 'middle',
    align: 'right',
    margin: 0,
    wrap: false,
  });
}

/** The model's own "not shown" note (see buildOmittedNote) — both exporters
 * draw the same sentence, so neither writes it. */
function drawOmittedNote(slide: PptxSlide, note: string | null) {
  if (!note) return;

  slide.addText(note, {
    x: CONTENT_X_IN,
    y: PAGE_HEIGHT_IN - FRAME_BOTTOM_IN - FOOTER_HEIGHT_IN,
    w: CONTENT_WIDTH_IN - 2.4,
    h: FOOTER_HEIGHT_IN,
    fontSize: FOOTER_FONT_SIZE_PT,
    bold: true,
    color: COLORS.warning,
    fontFace: PPTX_FONT_FACE,
    valign: 'middle',
    align: 'left',
    margin: 0,
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
 * same place. */
function drawBackToOverviewLink(slide: PptxSlide, overviewSlideNumber: number | null) {
  if (!overviewSlideNumber) return;

  slide.addText(BACK_LINK_TEXT, {
    x: CONTENT_X_IN + CONTENT_WIDTH_IN - BACK_LINK_WIDTH_IN,
    y: BACK_LINK_Y_IN,
    w: BACK_LINK_WIDTH_IN,
    h: BACK_LINK_HEIGHT_IN,
    fontSize: BACK_LINK_FONT_SIZE_PT,
    bold: true,
    color: COLORS.link,
    fontFace: PPTX_FONT_FACE,
    valign: 'middle',
    align: 'right',
    margin: 0,
    wrap: false,
    ...slideJump(overviewSlideNumber, 'Back to the timeline overview'),
  });
}

/** The overview slide of the export handoff, painted back to front (pptxgenjs
 * has no z-index — shape order *is* z-order):
 *   1. the card, then its column header and the rules of its grid
 *   2. the bars, over the grid
 *   3. the "today" rule, over the bars
 *   4. every piece of text and every icon, over all of it
 */
function drawOverviewSlide(slide: PptxSlide, model: OverviewSlideModel, links: SlideLinks) {
  const barJump = (bar: OverviewSlideModel['bars'][number]) =>
    slideJump(links.detailSlideNumberByTaskId.get(bar.id), 'Open subtasks & comments');

  drawChrome(slide, model.title, model.meta);
  drawOmittedNote(slide, model.omittedNote);
  drawLegend(slide, model.zoomCaption);

  // The card: one white surface with a hairline border, holding everything
  // below it.
  slide.addShape('roundRect', {
    x: CARD_X_IN,
    y: CARD_TOP_IN,
    w: CARD_WIDTH_IN,
    h: CARD_HEIGHT_IN,
    rectRadius: CARD_RADIUS_IN,
    fill: { color: COLORS.cardBg },
    line: { color: COLORS.border, width: CARD_BORDER_WIDTH_PT },
  });

  slide.addText('TASK', {
    x: CARD_X_IN + TASK_CELL_PAD_IN,
    y: CARD_TOP_IN,
    w: TASK_COL_WIDTH_IN,
    h: COLUMN_HEADER_HEIGHT_IN,
    fontSize: COLUMN_HEADER_FONT_SIZE_PT,
    charSpacing: letterSpacingPt(COLUMN_HEADER_FONT_SIZE_PT, COLUMN_HEADER_TRACKING_EM),
    color: COLORS.mutedText,
    fontFace: PPTX_FONT_FACE,
    valign: 'bottom',
    margin: 0,
    wrap: false,
  });

  model.columns.forEach((column) => {
    slide.addText(column.top, {
      x: column.x,
      y: CARD_TOP_IN + COLUMN_HEADER_TOP_LINE_Y_IN,
      w: column.width,
      h: COLUMN_HEADER_LINE_IN,
      fontSize: COLUMN_HEADER_FONT_SIZE_PT,
      bold: true,
      color: COLORS.textOnSurface,
      fontFace: PPTX_FONT_FACE,
      align: 'center',
      valign: 'middle',
      margin: 0,
      wrap: false,
    });
    slide.addText(column.sub, {
      x: column.x,
      y: CARD_TOP_IN + COLUMN_HEADER_SUB_LINE_Y_IN,
      w: column.width,
      h: COLUMN_HEADER_LINE_IN,
      fontSize: COLUMN_HEADER_FONT_SIZE_PT,
      color: COLORS.mutedText,
      fontFace: PPTX_FONT_FACE,
      align: 'center',
      valign: 'middle',
      margin: 0,
      wrap: false,
    });
  });

  if (model.headerRuleY !== null) {
    slide.addShape('line', {
      x: CARD_X_IN,
      y: model.headerRuleY,
      w: CARD_WIDTH_IN,
      h: 0,
      line: { color: COLORS.border, width: CARD_BORDER_WIDTH_PT },
    });
  }

  // The column rules, and the divider that separates the task column from the
  // zone — one hairline each, the whole height of the card, exactly as the
  // handoff's per-cell borders read once they are stacked.
  const columnRuleTop = CARD_TOP_IN;
  const columnRuleHeight = CARD_BOTTOM_IN - columnRuleTop;
  if (model.dividerX !== null) {
    slide.addShape('line', {
      x: model.dividerX,
      y: columnRuleTop,
      w: 0,
      h: columnRuleHeight,
      line: { color: COLORS.border, width: CARD_BORDER_WIDTH_PT },
    });
  }
  model.gridLines.forEach((gridLine) => {
    slide.addShape('line', {
      x: gridLine.x,
      y: columnRuleTop,
      w: 0,
      h: columnRuleHeight,
      line: { color: COLORS.border, width: CARD_BORDER_WIDTH_PT },
    });
  });

  // A hairline under every row but the last, at 0.6 of the border's strength.
  model.bars.slice(0, -1).forEach((bar) => {
    slide.addShape('line', {
      x: CARD_X_IN,
      y: bar.y + bar.rowHeight,
      w: CARD_WIDTH_IN,
      h: 0,
      line: {
        color: COLORS.border,
        width: ROW_RULE_WIDTH_PT,
        transparency: Math.round((1 - ROW_RULE_ALPHA) * 100),
      },
    });
  });

  model.bars.forEach((bar) => {
    slide.addShape('roundRect', {
      x: bar.barX,
      y: bar.barY,
      w: bar.barWidth,
      h: bar.barHeight,
      rectRadius: BAR_RADIUS_IN,
      fill: { color: bar.color, transparency: Math.round((1 - bar.fillAlpha) * 100) },
      line: { color: bar.color, transparency: Math.round((1 - bar.fillAlpha) * 100) },
      ...barJump(bar),
    });

    // Chevrons mark a bar the export timeframe clipped: "starts earlier" on
    // the left, "continues further" on the right. Triangles, not characters.
    const chevronY = bar.barY + (bar.barHeight - CHEVRON_HEIGHT_IN) / 2;
    if (bar.chevronLeft) {
      slide.addShape('triangle', {
        x: bar.barX,
        y: chevronY,
        w: CHEVRON_WIDTH_IN,
        h: CHEVRON_HEIGHT_IN,
        rotate: 270,
        fill: { color: COLORS.textOnSurface },
        line: { color: COLORS.textOnSurface },
      });
    }
    if (bar.chevronRight) {
      slide.addShape('triangle', {
        x: bar.barX + bar.barWidth - CHEVRON_WIDTH_IN,
        y: chevronY,
        w: CHEVRON_WIDTH_IN,
        h: CHEVRON_HEIGHT_IN,
        rotate: 90,
        fill: { color: COLORS.textOnSurface },
        line: { color: COLORS.textOnSurface },
      });
    }
  });

  if (model.todayX !== null) {
    slide.addShape('line', {
      x: model.todayX,
      y: ROWS_AREA_TOP_IN,
      w: 0,
      h: CARD_BOTTOM_IN - ROWS_AREA_TOP_IN,
      line: {
        color: COLORS.today,
        width: TODAY_LINE_WIDTH_PT,
        transparency: Math.round((1 - TODAY_LINE_ALPHA) * 100),
      },
    });
  }

  model.bars.forEach((bar) => {
    if (bar.icon !== null) {
      drawStatusIcon(
        slide,
        bar.icon,
        bar.iconX,
        bar.y + (bar.rowHeight - STATUS_ICON_SIZE_IN) / 2,
        STATUS_ICON_SIZE_IN,
      );
    }

    slide.addText(bar.label, {
      x: bar.labelX,
      y: bar.y,
      w: bar.labelWidth,
      h: bar.rowHeight,
      fontSize: TASK_NAME_FONT_SIZE_PT,
      bold: bar.labelBold,
      color: COLORS.textOnSurface,
      fontFace: PPTX_FONT_FACE,
      valign: 'middle',
      margin: 0,
      wrap: false,
      ...barJump(bar),
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
  fontSize: number = COMMENT_TABLE_FONT_SIZE_PT,
) {
  const colCount = Math.max(table.headers.length, 1);
  const colW = width / colCount;

  slide.addTable(
    [
      table.headers.map((header) => ({
        text: header,
        options: { bold: true, fill: { color: COLORS.border }, color: COLORS.navy },
      })),
      // Per-cell faces: the date column monospace, the first column (the
      // task name in both dashboard tables) medium-weight as the row's
      // content anchor. Everything else inherits the table's own options.
      ...table.rows.map((row) =>
        row.map((cell, columnIndex) =>
          columnIndex === table.dateColumnIndex
            ? {
                text: cell,
                options: {
                  fontFace: PPTX_MONO_FONT_FACE,
                  fontSize: fontSize - 1,
                  charSpacing: letterSpacingPt(fontSize - 1, DATE_LETTER_SPACING_EM),
                  color: COLORS.footerText,
                },
              }
            : { text: cell, options: columnIndex === 0 ? { bold: true } : {} },
        ),
      ),
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
      fontSize: COMMENT_BODY_FONT_SIZE_PT,
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
        fontSize: COMMENT_BODY_FONT_SIZE_PT,
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

  // Every single-line row on this slide is centered in a box of its own row
  // height (see rowCenterY in slideLayout.ts) rather than hung from the box's
  // top, and drawn with no inset so its x is exactly the one the model
  // resolved. `margin: 0` matters as much as `valign` here: pptxgenjs's
  // default 0.05in inset would otherwise shift each piece of a row right by
  // an amount the model never measured.
  const rowText = (fontSizePt: number, heightIn: number) => ({
    h: heightIn,
    fontSize: fontSizePt,
    fontFace: PPTX_FONT_FACE,
    valign: 'middle' as const,
    margin: 0,
  });

  model.sections.forEach((section) => {
    slide.addText(section.parentTitle, {
      ...rowText(16, ROW_LABEL_HEIGHT_IN),
      x: CONTENT_X_IN,
      y: section.parentTitleY,
      w: CONTENT_WIDTH_IN,
      bold: true,
      color: COLORS.navy,
    });

    if (section.subtasksHeadingY !== undefined) {
      slide.addText('Subtasks', {
        ...rowText(14, ROW_LABEL_HEIGHT_IN),
        x: CONTENT_X_IN,
        y: section.subtasksHeadingY,
        w: CONTENT_WIDTH_IN,
        bold: true,
        color: COLORS.navy,
      });
    }

    section.subtasks.forEach((row) => {
      // Four typographic tiers on one line, each its own textbox at an x the
      // model resolved: bold task name, monospace dates,
      // tracked-out status. Four *sizes* on one line is exactly why they're
      // vertically centered rather than top-aligned — a shared top edge puts
      // the four baselines at four different heights, which is what made
      // this row look broken after the sizes stopped matching.
      //
      // `wrap: false` throughout for the same reason as the overview bar's
      // label — the model measured each piece against one line, so
      // PowerPoint must not re-flow any of them onto a second.
      slide.addText(row.label, {
        ...rowText(SUBTASK_TEXT_FONT_SIZE_PT, LIST_ROW_HEIGHT_IN),
        x: row.labelX,
        y: row.y,
        w: CONTENT_X_IN + CONTENT_WIDTH_IN - row.labelX,
        bold: true,
        color: COLORS.navy,
        wrap: false,
      });

      slide.addText(row.dateText, {
        ...rowText(SUBTASK_DATE_FONT_SIZE_PT, LIST_ROW_HEIGHT_IN),
        x: row.dateX,
        y: row.y,
        w: CONTENT_X_IN + CONTENT_WIDTH_IN - row.dateX,
        charSpacing: letterSpacingPt(SUBTASK_DATE_FONT_SIZE_PT, DATE_LETTER_SPACING_EM),
        color: COLORS.footerText,
        fontFace: PPTX_MONO_FONT_FACE,
        wrap: false,
      });

      slide.addText(row.statusText, {
        ...rowText(SUBTASK_STATUS_FONT_SIZE_PT, LIST_ROW_HEIGHT_IN),
        x: CONTENT_X_IN,
        y: row.y,
        w: CONTENT_WIDTH_IN - STATUS_RIGHT_PADDING_IN,
        charSpacing: letterSpacingPt(SUBTASK_STATUS_FONT_SIZE_PT, STATUS_LETTER_SPACING_EM),
        bold: true,
        color: row.statusColor,
        align: 'right',
      });
    });

    if (section.commentsHeadingY !== undefined) {
      slide.addText(section.commentsHeadingText ?? 'Comments', {
        ...rowText(14, ROW_LABEL_HEIGHT_IN),
        x: CONTENT_X_IN,
        y: section.commentsHeadingY,
        w: CONTENT_WIDTH_IN,
        bold: true,
        color: COLORS.navy,
      });
    }

    section.comments.forEach((comment) => {
      if (comment.meta) {
        // A comment's meta line is its date (optionally pin-prefixed), so it
        // takes the date face. Italic drops off with the switch — the
        // monospace face is now what sets it apart from the body text.
        slide.addText(comment.meta.text, {
          x: COMMENT_BODY_X_IN,
          y: comment.meta.y,
          w: COMMENT_BODY_WIDTH_IN,
          h: COMMENT_META_ROW_HEIGHT_IN,
          fontSize: 8,
          charSpacing: letterSpacingPt(8, DATE_LETTER_SPACING_EM),
          fontFace: PPTX_MONO_FONT_FACE,
          color: COLORS.footerText,
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
      // The legend items are status names, so they take the status tier's
      // smaller size. Only the size: this is pptxgenjs's native chart
      // legend, which exposes no per-item weight or charSpacing, so the
      // tracking the other status renderings get can't be applied here.
      legendFontSize: SUMMARY_LEGEND_STATUS_FONT_SIZE_PT,
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

function drawDashboardTableSlide(slide: PptxSlide, model: DashboardTableSlideModel, qrCodeDataUrl: string) {
  drawChrome(slide, model.title);
  // The model cut this table to the rows that fit the slide; the note is how
  // the slide says so — the same footer line the overview announces its own
  // omissions on, so a reader learns "there is more" in one place per deck.
  drawOmittedNote(slide, model.note);

  const tableWidth = DASHBOARD_TABLE_WIDTH_IN;

  if (model.table) {
    drawTableBlock(slide, model.table, CONTENT_X_IN, DASHBOARD_TABLE_TOP_IN, tableWidth);
  } else {
    slide.addText(model.emptyMessage, {
      x: CONTENT_X_IN,
      y: DASHBOARD_TABLE_TOP_IN,
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
    DASHBOARD_TABLE_TOP_IN,
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

  const pptx = new pptxgen();
  // PowerPoint's own 16:9 page, which is what the export handoff's 1920x1080
  // is at 144 pixels to the inch (see PX_PER_IN in slideLayout).
  pptx.defineLayout({ name: 'HANDOFF_16x9', width: PAGE_WIDTH_IN, height: PAGE_HEIGHT_IN });
  pptx.layout = 'HANDOFF_16x9';

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
