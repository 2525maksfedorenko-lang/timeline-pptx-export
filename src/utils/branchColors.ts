import type { TimelineItem } from '../types/timeline';
import { buildTaskHierarchy, type TaskNode } from './taskHierarchy';

/**
 * What a bar's colour means, in the one place the screen and the exporters both
 * read it from.
 *
 * The rule is **colour is branch, not status**: a root takes a colour and its
 * whole subtree inherits it, so the colour answers "what does this belong to".
 * Status is the icon beside the name — on a slide and on screen alike, which is
 * why `done` and `todo` are drawn in the same colour.
 *
 * This used to live in `src/export/theme.ts` and describe the slides only,
 * while the plan screen coloured its bars by status out of `src/gantt/tone.ts`.
 * The two disagreed on what a colour was *for*, so the same plan read as one
 * thing on screen and another in the deck. The palette moved here — a module
 * neither side owns — rather than being copied into the second one.
 */

export interface BranchColor {
  /** Hex without '#', pptxgenjs's format. `withHash()` in export/theme.ts and
   * `branchColorCss()` below are the two ways it reaches an API that wants one. */
  solid: string;
  /** The alpha a *nested* bar's fill is drawn at, over white. A root is drawn
   * at full strength; everything under it is the same colour, lightened, so
   * depth reads without introducing a second hue. */
  tintAlpha: number;
}

// The four phase colours of the export handoff, in its own order, each with the
// alpha its nested bars are tinted at. The handoff names four phases (Discovery
// / Design / Build / Validation); our model has no phases, it has a tree, so
// they are used as a cycle instead.
const TEAL: BranchColor = { solid: '0F9488', tintAlpha: 0.28 };
const VIOLET: BranchColor = { solid: '7C3AED', tintAlpha: 0.24 };
const BLUE: BranchColor = { solid: '2F7FED', tintAlpha: 0.24 };
const AMBER: BranchColor = { solid: 'E08706', tintAlpha: 0.26 };

export const PHASE_PALETTE: readonly BranchColor[] = [TEAL, VIOLET, BLUE, AMBER];

/** What a plan with no hierarchy at all is drawn in.
 *
 * The palette cycles per *root*, so in a plan where every task is a root it
 * would hand out four colours that distinguish nothing — task 5 is teal and
 * task 6 is violet for no reason a reader could name. One colour says the true
 * thing instead: there are no branches here. Blue because it is the palette's
 * own, so a flat plan and a nested one are still visibly the same product. */
export const FLAT_PLAN_COLOR: BranchColor = BLUE;

/** The tint for a colour that did not come from the palette — a task carrying
 * its own `color`. The middle of the handoff's 0.24–0.28 range, since it gives
 * no rule for a colour it never named. */
export const CUSTOM_COLOR_TINT_ALPHA = 0.26;

/** Whether any task in the plan is a sub-task of another.
 *
 * "No sub-tasks" is judged on *resolved* parentage, not on whether a `parentId`
 * field is present: an item pointing at an id that isn't in the plan is a root
 * (that is what `buildTaskHierarchy` makes it, and what the screen and the deck
 * both draw it as), so a plan full of dangling parent links is flat and gets
 * the flat plan's one colour. */
export function planHasSubtasks(items: TimelineItem[]): boolean {
  return buildTaskHierarchy(items).roots.length !== items.length;
}

/** The colour a root's whole branch is drawn in: its own if it has one, else
 * the plan's palette. `rootIndex` is the root's position in the plan's own
 * order, so the same plan always produces the same colours. */
export function branchColorFor(
  rootIndex: number,
  ownColor: string | undefined,
  flatPlan: boolean,
): BranchColor {
  if (ownColor) {
    return { solid: ownColor.replace('#', '').toUpperCase(), tintAlpha: CUSTOM_COLOR_TINT_ALPHA };
  }
  if (flatPlan) return FLAT_PLAN_COLOR;
  return PHASE_PALETTE[rootIndex % PHASE_PALETTE.length];
}

/** Every task's colour, keyed by id.
 *
 * Built from the **whole plan**, never from a subset. The colours are a cycle
 * over the roots, so a subset shifts them: exclude the first root from the
 * export and every remaining root moves one place up the palette, and the same
 * task is teal on screen and violet on the slide. Passing the whole plan here
 * and looking colours up by id is what keeps the two the same picture — and it
 * also means toggling a task's export flag never repaints anything. */
export function buildBranchColors(items: TimelineItem[]): Map<string, BranchColor> {
  const { roots } = buildTaskHierarchy(items);
  const flatPlan = roots.length === items.length;
  const colors = new Map<string, BranchColor>();

  roots.forEach((root, index) => {
    const color = branchColorFor(index, root.item.color?.trim() || undefined, flatPlan);
    const paint = (node: TaskNode) => {
      colors.set(node.item.id, color);
      node.children.forEach(paint);
    };
    paint(root);
  });

  return colors;
}

/** The alpha a bar at this depth is filled at: a root at full strength, and
 * every level under it at the branch's tint. One tint for all depths, not a
 * ramp — the handoff draws a phase and its contents, not five shades. */
export function branchFillAlpha(depth: number, color: BranchColor): number {
  return depth === 0 ? 1 : color.tintAlpha;
}
