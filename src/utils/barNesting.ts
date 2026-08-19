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
 *
 * What the ladder no longer has to reserve room for is the progress percentage:
 * a bar too short to hold it legibly moves the label outside itself rather than
 * shrinking less — see progressLabelFitsInBar. */
export const BAR_HEIGHT_RATIO_BY_DEPTH: readonly number[] = [1, 0.7, 0.55];

/** One indent step, as a fraction of the surface's full bar height — the same
 * base the height ladder above is expressed against, so a surface only has to
 * know one number about itself. Half a bar height reads as a clear step without
 * eating a column that is only ~160px wide on screen. */
export const LABEL_INDENT_RATIO = 0.5;

/** How many indent steps a label gets before the indent stops growing. The Task
 * column is a fixed width on a slide (2.35in) and only ~160px on screen, so an
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

/** The shortest bar that can still carry its progress percentage *inside* it,
 * as a multiple of that label's own text height.
 *
 * Roughly twice the text: half a text height clear above it and half below.
 * Under that the percentage stops sitting on the bar and starts being jammed
 * between its two edges, which is the failure this exists to prevent — a bar
 * short enough to need the label outside is short precisely because the label
 * no longer has room in it.
 *
 * Expressed against the text rather than against the row (or, worse, against
 * depth) because "can this hold the label" is a question about the label. The
 * two surfaces set the percentage at very different sizes relative to their
 * bars — 11px on a 32px screen bar, 9pt on a 0.28in slide bar — so the same
 * bar rung is a different amount of room on each, and only a rule measured
 * against the text can tell them apart correctly.
 *
 * The exact figure is where the measurements put it, not a round number chosen
 * first. Bar height over text height comes out at 2.24 (slide) and 2.91
 * (screen) for a full-height bar, 1.57 and 2.04 one rung down, 1.23 and 1.60
 * two rungs down. 2.1 is the one band where both surfaces answer every rung the
 * same way — a full-height bar holds its label, every shortened one hands it
 * out — and checkBarHeightParity in the export check fails if a later change to
 * either surface's text size or the ladder breaks that agreement. */
export const PROGRESS_LABEL_MIN_BAR_HEIGHT_RATIO = 2.1;

/** Whether a bar of `barHeight` can hold its progress label inside it, given
 * that label's own `textHeight`. Both arguments in the caller's own unit — px
 * on screen, inches on a slide — so the one rule serves both.
 *
 * This is the *only* place either surface decides that, and it is deliberately
 * a question about the drawn height rather than about depth: a bar shortened
 * for any other reason gets the same answer, and the two surfaces cannot drift
 * into disagreeing about which levels put their percentage outside. */
export function progressLabelFitsInBar(barHeight: number, textHeight: number): boolean {
  return barHeight >= textHeight * PROGRESS_LABEL_MIN_BAR_HEIGHT_RATIO;
}

/** The horizontal band a progress label may be placed in, in the caller's own
 * unit: the timeline zone's two edges, and the clear space the label keeps
 * between itself and the bar. */
export interface ProgressLabelBounds {
  zoneStart: number;
  zoneEnd: number;
  padding: number;
}

/** Where a bar too short to hold its progress label puts it instead: clear of
 * the bar, and never outside the timeline zone. Returns an x in the same space
 * and unit `barStart` was given in.
 *
 * Right of the bar first — the percentage reads as the end of the thing it
 * measures, and that is the side the bar's own fill grows towards. A bar
 * reaching the zone's right edge has no room there, so the label flips to the
 * bar's left rather than being pushed out of the zone: same row, still touching
 * its own bar, and the only other side there is. A bar spanning the whole zone
 * leaves neither, and then the label is held at the zone's edge — overlapping
 * the tail of its own bar is a far smaller failure than leaving the zone, and it
 * takes a task spanning the entire window at the second nesting level to reach.
 *
 * Nothing this returns can collide with another bar: it only ever moves a label
 * along one row's own center line, and a row has exactly one bar.
 *
 * Shared rather than solved twice because the screen and a slide have the same
 * three cases and only different edges — and a label that stays in the zone on
 * one surface and not on the other is exactly the drift this module exists to
 * prevent. */
export function progressLabelXOutsideBar(
  barStart: number,
  barWidth: number,
  textWidth: number,
  { zoneStart, zoneEnd, padding }: ProgressLabelBounds,
): number {
  const rightOfBar = barStart + barWidth + padding;
  if (rightOfBar + textWidth <= zoneEnd) return rightOfBar;

  const leftOfBar = barStart - padding - textWidth;
  if (leftOfBar >= zoneStart) return leftOfBar;

  return Math.max(zoneStart, zoneEnd - textWidth);
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
