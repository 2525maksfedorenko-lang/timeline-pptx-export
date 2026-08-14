import type { DashboardSlideModel } from './dashboardSlides';
import type { ExportSlideModel } from './timelineExportModel';

/** Every slide model an exporter can draw, in the order it draws them. */
export type OrderedSlideModel = ExportSlideModel | DashboardSlideModel;

/** The deck's slide order, in one place, so the PPTX and PDF exporters can
 * never drift apart:
 *   1. overview slide(s) — one in compact mode, N in full
 *   2. the dashboard tables (at risk, then delayed)
 *   3. the detail slides (subtasks & comments)
 *   4. the summary slide
 * buildExportSlides already returns 1/3/4 in that relative order and always
 * leads with its overview slides, so this only has to splice the dashboard
 * slides in right after the last of them. */
export function orderExportSlides(
  exportSlides: ExportSlideModel[],
  dashboardSlides: DashboardSlideModel[],
): OrderedSlideModel[] {
  const overviewCount = exportSlides.filter((slide) => slide.kind === 'overview').length;

  return [
    ...exportSlides.slice(0, overviewCount),
    ...dashboardSlides,
    ...exportSlides.slice(overviewCount),
  ];
}
