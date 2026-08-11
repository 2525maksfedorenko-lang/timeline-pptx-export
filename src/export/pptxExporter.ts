import pptxgen from 'pptxgenjs';
import { useTimelineStore } from '../store/timelineStore';
import { buildExportSlides, type DetailSlideModel, type OverviewSlideModel } from './timelineExportModel';
import { COLORS, FOOTER_TEXT, PPTX_FONT_FACE } from './theme';
import {
  BAR_HEIGHT_IN,
  BAR_RADIUS_IN,
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

export function exportTimelineToPptx(): void {
  const { items, exportOptions, comments } = useTimelineStore.getState();
  const slides = buildExportSlides(items, comments, exportOptions.commentMode);

  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';

  slides.forEach((slideModel) => {
    const slide = pptx.addSlide();
    if (slideModel.kind === 'overview') {
      drawOverviewSlide(slide, slideModel);
    } else {
      drawDetailSlide(slide, slideModel);
    }
  });

  pptx.writeFile({ fileName: 'timeline-export.pptx' }).catch((error) => {
    console.error('Failed to export timeline to PowerPoint', error);
  });
}
