import type { OrderedSlideModel } from './slideOrder';

/** Where a click can take the reader inside an exported deck.
 *
 * Slide numbers are 1-based positions in the *final* deck order — which is
 * exactly how both engines address an internal jump (pptxgenjs's
 * `hyperlink: { slide }`, jsPDF's `link(..., { pageNumber })`). They're
 * therefore derived from the ordered array itself rather than from any
 * builder's own output order, so adding/reordering slide groups in
 * slideOrder.ts can never leave a link pointing at the wrong slide. */
export interface SlideLinks {
  /** The slide every "Back to overview" button returns to: the first
   * overview slide, since 'full' mode can produce several. Null only if a
   * deck somehow has no overview slide at all. */
  overviewSlideNumber: number | null;
  /** Parent task id → the slide holding its Subtasks & Comments section.
   *
   * Only tasks that actually got such a section are keys here, which is
   * precisely the set of overview bars that should be clickable: a task with
   * neither subtasks nor comments never becomes a detail candidate (see
   * buildExportSlides), so it's absent and its bar is left inert. A parent
   * whose content spilled across "(continued)" slides maps to the first of
   * them — the one carrying its subtasks and assignee. */
  detailSlideNumberByTaskId: ReadonlyMap<string, number>;
}

export function buildSlideLinks(orderedSlides: OrderedSlideModel[]): SlideLinks {
  let overviewSlideNumber: number | null = null;
  const detailSlideNumberByTaskId = new Map<string, number>();

  orderedSlides.forEach((slideModel, index) => {
    const slideNumber = index + 1;

    if (slideModel.kind === 'overview') {
      overviewSlideNumber ??= slideNumber;
    } else if (slideModel.kind === 'detail') {
      slideModel.sections.forEach((section) => {
        // First slide wins, so a "(continued)" section never overwrites the
        // link to where that parent's detail actually starts.
        if (!detailSlideNumberByTaskId.has(section.taskId)) {
          detailSlideNumberByTaskId.set(section.taskId, slideNumber);
        }
      });
    }
  });

  return { overviewSlideNumber, detailSlideNumberByTaskId };
}
