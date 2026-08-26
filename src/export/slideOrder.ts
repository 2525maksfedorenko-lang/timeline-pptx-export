import type { DashboardSlideModel } from './dashboardSlides';
import type { ExportSlideModel } from './timelineExportModel';

/** Every slide model an exporter can draw, in the order it draws them. */
export type OrderedSlideModel = ExportSlideModel | DashboardSlideModel;

/** The deck's slide order, in one place, so the PPTX and PDF exporters can
 * never drift apart:
 *   1. overview slide(s) — one in compact mode, N in full
 *   2. the dashboard tables (delayed)
 *   3. the summary slide
 *   4. the detail slides (subtasks & comments) — an appendix at the very
 *      back, so the deck reaches its conclusion before its supporting detail
 * Selecting each group by `kind` rather than slicing keeps every group's own
 * internal order intact (overview 1/N, appendix 1/N) while making the deck
 * order readable straight off this array — and independent of whatever order
 * buildExportSlides happens to return. */
export function orderExportSlides(
  exportSlides: ExportSlideModel[],
  dashboardSlides: DashboardSlideModel[],
): OrderedSlideModel[] {
  const slidesOfKind = (kind: ExportSlideModel['kind']) =>
    exportSlides.filter((slide) => slide.kind === kind);

  return [
    ...slidesOfKind('overview'),
    ...dashboardSlides,
    ...slidesOfKind('summary'),
    ...slidesOfKind('detail'),
  ];
}
