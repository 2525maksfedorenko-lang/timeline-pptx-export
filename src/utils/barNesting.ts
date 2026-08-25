import { buildTaskHierarchy } from './taskHierarchy';
import type { TimelineItem } from '../types/timeline';

/** How a task's nesting depth is drawn, shared by the on-screen chart and both
 * exporters so the three cannot drift.
 *
 * Everything here is a *ratio*, never a measurement: the screen works in DOM
 * pixels and a slide in inches, so an absolute number could not be shared. Each
 * surface passes in its own base unit — its full bar height, its own indent step
 * — and gets back a value in that same unit.
 */

/** Bar height as a fraction of the surface's full bar height, indexed by depth.
 * Root 1.0, first level 0.7, second 0.55, and no smaller however deep the tree
 * goes.
 *
 * The steps are wide on purpose. The old 1 / 0.85 / 0.75 ladder stepped 15 then
 * 10 points, which on a 0.28in slide bar is 0.042in and then 0.028in — the
 * levels were distinguishable from the root and not from each other. Stepping 30
 * then 15 makes the second-to-third gap as big as the whole first step used to
 * be, and the first step twice that.
 *
 * The floor is where it is because a shorter bar stops being a bar: at 0.55 a
 * 0.28in slide bar is 0.154in, still a solid shape at print size, while a fourth
 * rung would be thinner than the rounded corner it is drawn with. Depth past the
 * second level is carried by the label indent and the hierarchy connectors
 * instead.
 */
export const BAR_HEIGHT_RATIO_BY_DEPTH: readonly number[] = [1, 0.7, 0.55];

/** One indent step, as a fraction of the surface's full bar height — the same
 * base the height ladder above is expressed against, so a surface only has to
 * know one number about itself. Half a bar height reads as a clear step without
 * eating a column that is only ~160px wide on screen. */
export const LABEL_INDENT_RATIO = 0.5;

/** How many indent steps a label gets before the indent stops growing. The Task
 * column is a fixed width on a slide (2.60in) and only ~160px on screen, so an
 * unbounded indent would eventually eat the name it is meant to qualify. */
export const MAX_LABEL_INDENT_STEPS = 3;

/** The height ratio for `depth`, clamped to the last rung of the ladder. */
export function barHeightRatio(depth: number): number {
  const index = Math.min(Math.max(depth, 0), BAR_HEIGHT_RATIO_BY_DEPTH.length - 1);
  return BAR_HEIGHT_RATIO_BY_DEPTH[index];
}

/** A label's left indent for `depth`, in whatever unit `fullBarHeight` came in —
 * px on screen, inches on a slide. Both surfaces pass their own full bar height
 * and get an indent in their own unit, from one shared rule. */
export function labelIndent(fullBarHeight: number, depth: number): number {
  const steps = Math.min(Math.max(depth, 0), MAX_LABEL_INDENT_STEPS);
  return fullBarHeight * LABEL_INDENT_RATIO * steps;
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
 * Takes a depth rather than an is-nested flag: a boolean cannot tell the second
 * level from the third, which is the whole thing depth is supposed to signal.
 *
 * The row keeps its full height either way (see ROW_HEIGHT_PX / ROW_HEIGHT_IN):
 * every overlay's position math, the date grid and the export's bars-per-slide
 * ceiling are pinned to that pitch, so it must not move — only the bar inside it
 * shrinks, and it stays centered on the same line. */
export function resolveBarGeometry(fullHeight: number, depth: number): BarVerticalGeometry {
  const height = fullHeight * barHeightRatio(depth);
  return { height, offset: (fullHeight - height) / 2 };
}

/** Depth per task id, computed once from the tree.
 *
 * Depth comes from the built hierarchy, not from whether `parentId` is set:
 * `parentId` is a yes/no that collapses every level below the first into one, and
 * buildTaskHierarchy already resolves the case that makes a boolean wrong anyway
 * — an item whose parent is not part of the drawn set is a root *here*, and must
 * be drawn like one, however deep it is in the full plan.
 *
 * One map per render, handed to the renderers, rather than each row asking "am I
 * nested?" and scanning the whole list to find out. */
export function buildDepthMap(items: TimelineItem[]): Map<string, number> {
  const { flat } = buildTaskHierarchy(items);
  return new Map(flat.map((node) => [node.item.id, node.depth]));
}
