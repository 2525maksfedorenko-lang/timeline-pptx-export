import pptxgen from 'pptxgenjs';
import { useTimelineStore } from '../store/timelineStore';
import { sortItems } from '../utils/sortItems';
import {
  buildExportSlides,
  type DetailSlideModel,
  type OverviewSlideModel,
  type SummarySlideModel,
} from './timelineExportModel';
import { COLORS, FOOTER_TEXT, PPTX_FONT_FACE } from './theme';
import {
  BAR_HEIGHT_IN,
  BAR_RADIUS_IN,
  CONTENT_BOTTOM_IN,
  CONTENT_TOP_IN,
  CONTENT_WIDTH_IN,
  CONTENT_X_IN,
  FOOTER_HEIGHT_IN,
  HEADER_HEIGHT_IN,
  LIST_ROW_HEIGHT_IN,
  PAGE_HEIGHT_IN,
  PAGE_WIDTH_IN,
  ROW_LABEL_HEIGHT_IN,
} from './slideLayout';

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

  model.bars.forEach((bar) => {
    slide.addShape('roundRect', {
      x: bar.barX,
      y: bar.barY,
      w: bar.trackWidth,
      h: BAR_HEIGHT_IN,
      rectRadius: BAR_RADIUS_IN,
      fill: { color: COLORS.border },
      line: { color: COLORS.border },
    });

    if (bar.fillWidth > 0) {
      slide.addShape('roundRect', {
        x: bar.barX,
        y: bar.barY,
        w: bar.fillWidth,
        h: BAR_HEIGHT_IN,
        rectRadius: BAR_RADIUS_IN,
        fill: { color: bar.color },
        line: { color: bar.color },
      });
    }

    slide.addText(bar.label, {
      x: bar.barX,
      y: bar.labelY,
      w: CONTENT_WIDTH_IN - (bar.barX - CONTENT_X_IN),
      h: ROW_LABEL_HEIGHT_IN,
      fontSize: 11,
      bold: true,
      color: COLORS.navy,
      fontFace: PPTX_FONT_FACE,
    });

    slide.addText(bar.statusText, {
      x: CONTENT_X_IN,
      y: bar.labelY,
      w: CONTENT_WIDTH_IN,
      h: ROW_LABEL_HEIGHT_IN,
      fontSize: 9,
      bold: true,
      color: bar.statusColor,
      fontFace: PPTX_FONT_FACE,
      align: 'right',
    });
  });
}

function drawDetailSlide(slide: PptxSlide, model: DetailSlideModel) {
  drawChrome(slide, model.title);

  if (model.subtasksHeadingY !== undefined) {
    slide.addText('Subtasks', {
      x: CONTENT_X_IN,
      y: model.subtasksHeadingY,
      w: CONTENT_WIDTH_IN,
      h: ROW_LABEL_HEIGHT_IN,
      fontSize: 14,
      bold: true,
      color: COLORS.navy,
      fontFace: PPTX_FONT_FACE,
    });
  }

  model.subtasks.forEach((row) => {
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

  if (model.commentsHeadingY !== undefined) {
    slide.addText('Comments', {
      x: CONTENT_X_IN,
      y: model.commentsHeadingY,
      w: CONTENT_WIDTH_IN,
      h: ROW_LABEL_HEIGHT_IN,
      fontSize: 14,
      bold: true,
      color: COLORS.navy,
      fontFace: PPTX_FONT_FACE,
    });
  }

  model.comments.forEach((row) => {
    slide.addText(row.text, {
      x: CONTENT_X_IN + 0.2,
      y: row.y,
      w: CONTENT_WIDTH_IN - 0.2,
      h: LIST_ROW_HEIGHT_IN,
      fontSize: 11,
      color: COLORS.navy,
      fontFace: PPTX_FONT_FACE,
    });
  });
}

const SUMMARY_CHART_WIDTH_IN = 4.2;
const SUMMARY_CHART_GAP_IN = 0.4;
const SUMMARY_STAT_GAP_IN = 0.3;

function drawSummarySlide(slide: PptxSlide, model: SummarySlideModel) {
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
  const statsW = CONTENT_WIDTH_IN - SUMMARY_CHART_WIDTH_IN - SUMMARY_CHART_GAP_IN;
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
}

export function exportTimelineToPptx(): void {
  const { items, exportOptions, comments } = useTimelineStore.getState();
  const sortedItems = sortItems(items, exportOptions.sortMode);
  const slides = buildExportSlides(sortedItems, comments, exportOptions.commentMode);

  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';

  slides.forEach((slideModel) => {
    const slide = pptx.addSlide();
    if (slideModel.kind === 'overview') {
      drawOverviewSlide(slide, slideModel);
    } else if (slideModel.kind === 'detail') {
      drawDetailSlide(slide, slideModel);
    } else {
      drawSummarySlide(slide, slideModel);
    }
  });

  pptx.writeFile({ fileName: 'timeline-export.pptx' }).catch((error) => {
    console.error('Failed to export timeline to PowerPoint', error);
  });
}
