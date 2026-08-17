import type { TimelineItem } from '../types/timeline';

/** How tall a nested task's bar is drawn relative to a top-level one. A
 * quarter shorter is enough to read as "this one sits under that one" at a
 * glance, and little enough that the bar still comfortably holds its
 * progress percentage. */
export const NESTED_BAR_HEIGHT_RATIO = 0.75;

/** Whether `item` is drawn as nested — it names a parent, and that parent is
 * part of the same drawn set.
 *
 * The second half matters: buildTaskHierarchy treats an item whose parentId
 * resolves to nothing as a root (a subtask whose parent was excluded from
 * the export, say), and a bar that is a root in the picture being drawn must
 * look like one. Judging nesting from `parentId` alone would shrink it for a
 * parent the viewer can't see. */
export function isNestedTask(items: TimelineItem[], item: TimelineItem): boolean {
  return item.parentId !== undefined && items.some((candidate) => candidate.id === item.parentId);
}

export interface BarVerticalGeometry {
  /** The bar's own height, in whatever unit `fullHeight` came in. */
  height: number;
  /** How far down from the top of the full-height slot to draw it, so the
   * shortened bar keeps the same center line. */
  offset: number;
}

/** A bar's vertical geometry within its row, unit-agnostic — px on screen,
 * inches on a slide — so both renderers shrink and re-center by exactly the
 * same rule instead of each doing its own arithmetic.
 *
 * Only two sizes, however deep the tree goes: full for top-level tasks and
 * one reduced size for everything below. Compounding the ratio per level
 * would take a third-level bar to 18px and a fourth to 13px, which stops
 * being a bar you can read a percentage on and starts being a line — and
 * depth past the first level is already carried by the label column's
 * indent and the hierarchy connectors.
 *
 * The row keeps its full height either way (see ROW_HEIGHT_PX /
 * ROW_HEIGHT_IN): every overlay's position math and the export's
 * bars-per-slide ceiling are pinned to that pitch, so it must not move. */
export function resolveBarGeometry(fullHeight: number, isNested: boolean): BarVerticalGeometry {
  const height = isNested ? fullHeight * NESTED_BAR_HEIGHT_RATIO : fullHeight;
  return { height, offset: (fullHeight - height) / 2 };
}
