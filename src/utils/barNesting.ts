import { buildTaskHierarchy } from './taskHierarchy';
import type { TimelineItem } from '../types/timeline';

/** How a task's nesting depth is drawn.
 *
 * Two things live here, and they have different audiences. `buildDepthMap` is
 * the genuinely shared one — the screen, both exporters and two checks all ask
 * it the same question, "how deep is this task in the plan", and must get the
 * same answer. `labelIndent` is the deck's: the slides indent a label by depth,
 * and so does the export settings panel, which draws the deck's own task list.
 * The plan screen indents by `rowPaddingLeft` in `gantt/geometry.ts` instead.
 *
 * The indent is a *ratio*, never a measurement: the screen works in DOM pixels
 * and a slide in inches, so an absolute number could not be shared. The caller
 * passes its own full bar height and gets an indent in its own unit.
 *
 * There used to be a bar-height ladder here as well — `[1, 0.7, 0.55]` by depth
 * — shared the same way. The slides stopped using it when the overview went to
 * two flat heights (`OVERVIEW_BAR_HEIGHT_IN` / `OVERVIEW_NESTED_BAR_HEIGHT_IN`
 * in `export/slideLayout.ts`) and the screen stopped when it took its own
 * `barHeight` from the Gantt handoff. It is gone rather than kept for a third
 * surface that does not exist.
 */

/** One indent step, as a fraction of the surface's full bar height, so a
 * surface only has to know one number about itself. Half a bar height reads as
 * a clear step without eating a column that is only 2.60in wide on a slide. */
const LABEL_INDENT_RATIO = 0.5;

/** How many indent steps a label gets before the indent stops growing. The Task
 * column is a fixed 2.60in on a slide, so an unbounded indent would eventually
 * eat the name it is meant to qualify. */
export const MAX_LABEL_INDENT_STEPS = 3;

/** A label's left indent for `depth`, in whatever unit `fullBarHeight` came in.
 * The slides pass inches; the export settings panel, which lists the same tasks
 * on screen, passes the same ladder's reference height in px. One rule, two
 * units. */
export function labelIndent(fullBarHeight: number, depth: number): number {
  const steps = Math.min(Math.max(depth, 0), MAX_LABEL_INDENT_STEPS);
  return fullBarHeight * LABEL_INDENT_RATIO * steps;
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
