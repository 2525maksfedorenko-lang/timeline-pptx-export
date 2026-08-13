import pptxgen from 'pptxgenjs';
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
import { COLORS, FOOTER_TEXT, PPTX_FONT_FACE } from './theme';
import {
  BAR_HEIGHT_IN,
  BAR_LABEL_PADDING_IN,
  BAR_RADIUS_IN,
  COMMENT_META_ROW_HEIGHT_IN,
  CONTENT_BOTTOM_IN,
  CONTENT_TOP_IN,
  CONTENT_WIDTH_IN,
  CONTENT_X_IN,
  DIMENSION_LABEL_HEIGHT_IN,
  DIMENSION_LINE_WIDTH_PT,
  DIMENSION_TICK_MARK_HEIGHT_IN,
  FOOTER_HEIGHT_IN,
  GROUP_HEADER_HEIGHT_IN,
  HEADER_HEIGHT_IN,
  LIST_ROW_HEIGHT_IN,
  PAGE_HEIGHT_IN,
  PAGE_WIDTH_IN,
  ROW_LABEL_HEIGHT_IN,
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

function drawOverviewSlide(slide: PptxSlide, model: OverviewSlideModel) {
  drawChrome(slide, model.title);

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
    slide.addShape('line', {
      x: CONTENT_X_IN,
      y: model.dateAxisY + GROUP_HEADER_HEIGHT_IN,
      w: CONTENT_WIDTH_IN,
      h: 0,
      line: { color: COLORS.border, width: 0.75 },
    });
  }

  model.bars.forEach((bar) => {
    // Dimension line above the bar, technical-drawing style: a small date
    // label, a thin extent line spanning the bar's drawn width, and short
    // tick marks at both ends.
    slide.addText(bar.dimensionLabel, {
      x: bar.barX,
      y: bar.dimensionLabelY,
      w: bar.trackWidth,
      h: DIMENSION_LABEL_HEIGHT_IN,
      fontSize: 7,
      color: COLORS.footerText,
      fontFace: PPTX_FONT_FACE,
      align: 'center',
      valign: 'middle',
    });

    slide.addShape('line', {
      x: bar.barX,
      y: bar.dimensionLineY,
      w: bar.trackWidth,
      h: 0,
      line: { color: COLORS.footerText, width: DIMENSION_LINE_WIDTH_PT },
    });

    [bar.barX, bar.barX + bar.trackWidth].forEach((tickX) => {
      slide.addShape('line', {
        x: tickX,
        y: bar.dimensionLineY - DIMENSION_TICK_MARK_HEIGHT_IN / 2,
        w: 0,
        h: DIMENSION_TICK_MARK_HEIGHT_IN,
        line: { color: COLORS.footerText, width: DIMENSION_LINE_WIDTH_PT },
      });
    });

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

    // Label sits outside the track, immediately to its right — never on top
    // of it — so it never gets split across the filled/unfilled boundary.
    slide.addText(bar.label, {
      x: bar.barX + bar.trackWidth + BAR_LABEL_PADDING_IN,
      y: bar.y,
      w: CONTENT_WIDTH_IN - (bar.barX + bar.trackWidth - CONTENT_X_IN) - BAR_LABEL_PADDING_IN,
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
    const colCount = Math.max(block.headers.length, 1);
    const colW = COMMENT_BODY_WIDTH_IN / colCount;

    slide.addTable(
      [
        block.headers.map((header) => ({
          text: header,
          options: { bold: true, fill: { color: COLORS.border }, color: COLORS.navy },
        })),
        ...block.rows.map((row) => row.map((cell) => ({ text: cell }))),
      ],
      {
        x: COMMENT_BODY_X_IN,
        y: block.y,
        w: COMMENT_BODY_WIDTH_IN,
        colW: Array(colCount).fill(colW),
        fontSize: COMMENT_TABLE_FONT_SIZE,
        fontFace: PPTX_FONT_FACE,
        color: COLORS.navy,
        border: { type: 'solid', color: COLORS.border, pt: 0.5 },
        autoPage: false,
      },
    );
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
        color: COLORS.navy,
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

const SUMMARY_CHART_WIDTH_IN = 3.6;
const SUMMARY_CHART_GAP_IN = 0.3;
const SUMMARY_STAT_GAP_IN = 0.3;
const SUMMARY_STATS_WIDTH_IN = 3.0;
const SUMMARY_QR_GAP_IN = 0.3;
const SUMMARY_QR_SIZE_IN = 1.4;

function drawSummarySlide(slide: PptxSlide, model: SummarySlideModel, qrCodeDataUrl: string) {
  drawChrome(slide, model.title);

  const chartH = CONTENT_BOTTOM_IN - CONTENT_TOP_IN;

  if (model.segments.length > 0) {
    slide.addChart(
      'doughnut',
      [
        {
          name: 'Status',
          labels: model.segments.map((segment) => segment.label),
          values: model.segments.map((segment) => segment.count),
        },
      ],
      {
        x: CONTENT_X_IN,
        y: CONTENT_TOP_IN,
        w: SUMMARY_CHART_WIDTH_IN,
        h: chartH,
        chartColors: model.segments.map((segment) => segment.color),
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

  const qrX = statsX + statsW + SUMMARY_QR_GAP_IN;
  const qrColumnWidth = CONTENT_X_IN + CONTENT_WIDTH_IN - qrX;
  const qrImageX = qrX + (qrColumnWidth - SUMMARY_QR_SIZE_IN) / 2;

  slide.addImage({
    data: qrCodeDataUrl,
    x: qrImageX,
    y: CONTENT_TOP_IN,
    w: SUMMARY_QR_SIZE_IN,
    h: SUMMARY_QR_SIZE_IN,
  });

  slide.addText(EXPORT_LINK_DISPLAY, {
    x: qrX,
    y: CONTENT_TOP_IN + SUMMARY_QR_SIZE_IN + 0.1,
    w: qrColumnWidth,
    h: 0.3,
    fontSize: 8,
    color: COLORS.footerText,
    fontFace: PPTX_FONT_FACE,
    align: 'center',
  });
}

export async function exportTimelineToPptx(
  items: TimelineItem[],
  exportOptions: ExportOptions,
  comments: TaskComment[],
): Promise<void> {
  const sortedItems = sortItems(items, exportOptions.sortMode);
  const slides = buildExportSlides(sortedItems, comments, exportOptions.commentMode, exportOptions.exportTimeframe);
  const qrCodeDataUrl = await getExportQrCodeDataUrl();

  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';

  slides.forEach((slideModel) => {
    const slide = pptx.addSlide();
    if (slideModel.kind === 'overview') {
      drawOverviewSlide(slide, slideModel);
    } else if (slideModel.kind === 'detail') {
      drawDetailSlide(slide, slideModel);
    } else {
      drawSummarySlide(slide, slideModel, qrCodeDataUrl);
    }
  });

  await pptx.writeFile({ fileName: 'timeline-export.pptx' }).catch((error) => {
    console.error('Failed to export timeline to PowerPoint', error);
  });
}
