import pptxgen from 'pptxgenjs';
import type { ExportOptions } from '../store/timelineStore';
import type { TaskComment, TimelineItem } from '../types/timeline';
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
  BAR_HEIGHT_IN,
  BAR_LABEL_FONT_SIZE_PT,
  BAR_RADIUS_IN,
  BAR_STATUS_FONT_SIZE_PT,
  AXIS_MONTH_FONT_SIZE_PT,
  AXIS_WEEK_FONT_SIZE_PT,
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
  DEPENDENCY_LINE_WIDTH_PT,
  FOOTER_HEIGHT_IN,
  GROUP_HEADER_HEIGHT_IN,
  HEADER_HEIGHT_IN,
  TITLE_FONT_SIZE_PT,
  LIST_ROW_HEIGHT_IN,
  PAGE_HEIGHT_IN,
  PAGE_WIDTH_IN,
  ROW_LABEL_HEIGHT_IN,
  SUBTASK_DATE_FONT_SIZE_PT,
  SUBTASK_STATUS_FONT_SIZE_PT,
  SUBTASK_TEXT_FONT_SIZE_PT,
  SUMMARY_LEGEND_STATUS_FONT_SIZE_PT,
  STATUS_LETTER_SPACING_EM,
  STATUS_RIGHT_PADDING_IN,
  COLUMN_HEADER_FONT_SIZE_PT,
  COLUMN_DIVIDER_WIDTH_PT,
  STATUS_CHIP_RADIUS_IN,
  STATUS_CHIP_TEXT_INSET_IN,
  STATUS_CHIP_BORDER_WIDTH_PT,
  DATE_LETTER_SPACING_EM,
  letterSpacingPt,
  TAG_PILL_FONT_SIZE_PT,
  TAG_PILL_HEIGHT_IN,
  TAG_PILL_RADIUS_IN,
} from './slideLayout';
import { DATE_GRID_STYLES } from './dateGrid';

// Comment blocks are indented slightly from the section's left edge, same as
// the subtask rows above them.
const COMMENT_BODY_X_IN = CONTENT_X_IN + 0.2;
const COMMENT_BODY_WIDTH_IN = CONTENT_WIDTH_IN - 0.2;
const COMMENT_HEADING_FONT_SIZE: Record<1 | 2 | 3, number> = { 1: 16, 2: 14, 3: 12 };

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
    fontSize: TITLE_FONT_SIZE_PT,
    bold: true,
    color: COLORS.lightText,
    fontFace: PPTX_FONT_FACE,
    valign: 'middle',
    // Explicit zero insets rather than PowerPoint's defaults (0.05in top and
    // bottom, 0.1in each side): the vertical pair ate into the clear space the
    // band is sized to give the title, and the horizontal one pushed the text
    // 0.1in right of CONTENT_X_IN — where the PDF exporter draws it, and where
    // every other left edge on the slide sits.
    margin: 0,
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

/** The model's own "not shown" note (see buildOmittedNote) — both exporters
 * draw the same sentence, so neither writes it. */
function drawOmittedNote(slide: PptxSlide, note: string | null) {
  if (!note) return;

  const footerY = PAGE_HEIGHT_IN - FOOTER_HEIGHT_IN;

  slide.addText(note, {
    x: CONTENT_X_IN,
    y: footerY,
    w: CONTENT_WIDTH_IN - 1.8,
    h: FOOTER_HEIGHT_IN,
    fontSize: 8,
    bold: true,
    color: COLORS.warning,
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
    color: COLORS.link,
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
 *   2. the dependency connectors
 *   3. the bar tracks and fills, over the connectors — the same order the
 *      on-screen chart uses (connectors z-1, bars z-10; see GanttChart), so
 *      a line passing a row it has no business in disappears behind that
 *      row's bar instead of being drawn across it. The connectors are
 *      anchored on bar edges besides (see buildDependencyConnectors), so
 *      what this hides is incidental crossings, not their own endpoints.
 *   4. every piece of text, over both, so nothing can cut through a label,
 *      percentage or status
 * Splitting the bars into a shapes pass and a text pass is what buys step 4;
 * drawing each bar's shapes and text together would put the first bars' text
 * under the later bars again. */
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
  drawOmittedNote(slide, model.omittedNote);

  const axisLineY = model.dateAxisY + GROUP_HEADER_HEIGHT_IN;

  // "Status" and "Task", on the axis row so they share one line with the month
  // captions, at the same size (COLUMN_HEADER_FONT_SIZE_PT) in the same muted
  // colour — sans rather than the dates' mono, since they are words.
  model.columnHeaders.forEach((header) => {
    slide.addText(header.text, {
      x: header.x,
      y: model.dateAxisY,
      w: header.width,
      h: GROUP_HEADER_HEIGHT_IN,
      fontSize: COLUMN_HEADER_FONT_SIZE_PT,
      bold: true,
      color: COLORS.footerText,
      fontFace: PPTX_FONT_FACE,
      valign: 'middle',
      margin: 0,
      wrap: false,
    });
  });

  // The vertical rule between the columns and the timeline, matching the
  // border the on-screen chart draws in the same place.
  if (model.dividerX !== null) {
    slide.addShape('line', {
      x: model.dividerX,
      y: model.dividerTop,
      w: 0,
      h: model.dividerBottom - model.dividerTop,
      line: { color: COLORS.border, width: COLUMN_DIVIDER_WIDTH_PT },
    });
  }

  // The hairline under the whole header row — both columns and the axis, not
  // just the timeline zone.
  if (model.headerRuleY !== null) {
    slide.addShape('line', {
      x: CONTENT_X_IN,
      y: model.headerRuleY,
      w: CONTENT_WIDTH_IN,
      h: 0,
      line: { color: COLORS.border, width: 0.75 },
    });
  }

  if (model.gridLines.length > 0) {

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

  model.bars.forEach((bar) => {
    // barJump() is called per object rather than shared between the two
    // shapes: pptxgenjs stamps its own `_rId` onto whatever hyperlink object
    // it's handed, so reusing one would leave both shapes rendering the
    // second one's relationship.
    // One solid rectangle per task, spanning the days it runs.
    slide.addShape('roundRect', {
      x: bar.barX,
      y: bar.barY,
      w: bar.barWidth,
      h: bar.barHeight,
      rectRadius: BAR_RADIUS_IN,
      fill: { color: bar.color },
      line: { color: bar.color },
      ...barJump(bar),
    });
  });

  // Month captions at the axis's normal size, week captions a notch smaller
  // (the model has already thinned any that would collide). Monospace, like
  // every other date: sizes stay as they were because these are already the
  // smallest text on the slide and shrinking them further would cost more
  // legibility than the extra tier is worth — the face change alone is what
  // marks them as dates. Still comfortably inside AXIS_LABEL_MIN_PITCH_IN
  // (0.5in) at the widest: "Aug 01" is 6 glyphs * 0.6em * 8pt = 0.4in.
  model.axisLabels.forEach((label) => {
    const fontSize = label.level === 'month' ? AXIS_MONTH_FONT_SIZE_PT : AXIS_WEEK_FONT_SIZE_PT;
    slide.addText(label.text, {
      x: label.x,
      y: model.dateAxisY,
      w: 1,
      h: GROUP_HEADER_HEIGHT_IN,
      fontSize,
      charSpacing: letterSpacingPt(fontSize, DATE_LETTER_SPACING_EM),
      color: COLORS.footerText,
      fontFace: PPTX_MONO_FONT_FACE,
      valign: 'middle',
    });
  });

  model.bars.forEach((bar) => {
    // The name sits in the Task column, at the same x on every row — it no
    // longer tracks the bar at all. The model has already truncated it to the
    // column's width, so `wrap: false` keeps it on the one line that width was
    // measured against instead of PowerPoint wrapping a measurement-
    // approximation edge case onto a second line.
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
      // Like every other piece of text on this slide, and unlike this one
      // until now: without it pptxgenjs's default 0.05in inset started the
      // name that far right of the labelX the model resolved, so the PPTX
      // column did not line up with the PDF's, with its own "Task" heading, or
      // with the tag pills measured from that same x.
      margin: 0,
      wrap: false,
      ...barJump(bar),
    });

    // Mini gray pills for item.tags, right after the label (which the model
    // has already truncated to leave room for them) — same mini-pill
    // pattern as the bar/track itself (a filled roundRect), just much
    // smaller, with the tag text centered on top.
    bar.tags.forEach((tag) => {
      slide.addShape('roundRect', {
        x: tag.x,
        y: bar.y + (BAR_HEIGHT_IN - TAG_PILL_HEIGHT_IN) / 2,
        w: tag.width,
        h: TAG_PILL_HEIGHT_IN,
        rectRadius: TAG_PILL_RADIUS_IN,
        fill: { color: COLORS.border },
        line: { color: COLORS.border },
      });
      slide.addText(tag.text, {
        x: tag.x,
        y: bar.y,
        w: tag.width,
        h: BAR_HEIGHT_IN,
        fontSize: TAG_PILL_FONT_SIZE_PT,
        bold: true,
        color: COLORS.navy,
        fontFace: PPTX_FONT_FACE,
        align: 'center',
        valign: 'middle',
        // Zero inset for the same reason the name above it has one: the box is
        // the pill, measured to the glyph, and pptxgenjs's default 0.05in would
        // be a third of a 7pt pill's own padding.
        margin: 0,
        wrap: false,
      });
    });

    // The status chip in the Status column: the app's own chip — pale surface,
    // hairline border, dark text, lowercase — and no dropdown chevron, which
    // would promise an interaction a slide can't honour.
    slide.addShape('roundRect', {
      x: bar.statusChipX,
      y: bar.statusChipY,
      w: bar.statusChipWidth,
      h: bar.statusChipHeight,
      rectRadius: STATUS_CHIP_RADIUS_IN,
      fill: { color: bar.statusChipBg },
      line: { color: bar.statusChipBorder, width: STATUS_CHIP_BORDER_WIDTH_PT },
    });
    slide.addText(bar.statusText, {
      x: bar.statusChipX + STATUS_CHIP_TEXT_INSET_IN,
      y: bar.y,
      w: bar.statusChipWidth - STATUS_CHIP_TEXT_INSET_IN * 2,
      h: BAR_HEIGHT_IN,
      margin: 0,
      fontSize: BAR_STATUS_FONT_SIZE_PT,
      charSpacing: letterSpacingPt(BAR_STATUS_FONT_SIZE_PT, STATUS_LETTER_SPACING_EM),
      bold: true,
      color: bar.statusColor,
      fontFace: PPTX_FONT_FACE,
      align: 'left',
      valign: 'middle',
      wrap: false,
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
        x: bar.barX + bar.barWidth - CHEVRON_WIDTH_IN,
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
