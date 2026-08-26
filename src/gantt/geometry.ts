/* The plan screen's geometry, as the handoff measures it.
 *
 * Separate from `src/components/ganttLayout.ts`, which holds the *export*
 * surface's row/bar ladder and is what `npm run check:export` compares the
 * slides against. The two describe different pictures now and are kept apart
 * rather than reconciled — see the note in docs/design-system-map.md.
 */

/** Row height. The handoff carries three densities (compact 40 / regular 52 /
 * roomy 62) behind a prop; only the default is built, since nothing in this
 * app offers the switch. Every other vertical number derives from it. */
export const ROW_HEIGHT_PX = 52;

/** The timeline header strip, and the empty corner block above the list. */
export const HEADER_HEIGHT_PX = 56;

/** The task list column. Fixed — it is `position: sticky; left: 0` inside the
 * one scroll container, so the bars slide under it. */
export const LIST_WIDTH_PX = 320;

/** The inline "add task" row at the foot of the list. */
export const ADD_ROW_HEIGHT_PX = 46;

/** The canvas never draws shorter than this, so a two-task plan still has a
 * grid under it rather than a strip. */
export const MIN_BODY_HEIGHT_PX = 360;

/** A bar's height at a given row height: 34px, or whatever leaves 8px of
 * clearance above and below when the row is shorter than 50. */
export function barHeight(rowHeight: number): number {
  return Math.min(34, rowHeight - 16);
}

/** Where a bar sits vertically inside its row — centred. */
export function barOffsetY(rowHeight: number): number {
  return (rowHeight - barHeight(rowHeight)) / 2;
}

/** A bar is inset 2px at each end of its date span, so two touching tasks
 * read as two bars rather than one. `left = start × cw + 2`, `width = span ×
 * cw − 4`, and never narrower than the 10px a single day at the month scale
 * would otherwise collapse to. */
export function barLeft(startIndex: number, columnWidth: number): number {
  return startIndex * columnWidth + 2;
}

export function barWidth(spanDays: number, columnWidth: number): number {
  return Math.max(spanDays * columnWidth, 10) - 4;
}

/** The grab strips at each end of a bar. */
export const RESIZE_HANDLE_WIDTH_PX = 11;

/** The Edit Task panel's width. */
export const PANEL_WIDTH_PX = 348;

/** How far left of today the view opens — on mount and on the Today button,
 * so today lands a comfortable way into the viewport rather than against its
 * left edge. */
export const TODAY_SCROLL_LEAD_PX = 300;

/** A list row's left padding. Groups start hard against the edge because
 * their caret occupies that space; a top-level task has no caret and starts
 * where the caret would have ended; a child starts 2px further in again.
 *
 * The handoff describes exactly two levels, so it names exactly these three
 * numbers. Deeper nesting — which this app's `parentId` allows and the
 * handoff's `parent` never produces — reuses the child's indent rather than
 * extrapolating a ladder the handoff does not specify; depth reads from the
 * caret and the group treatment instead. */
export function rowPaddingLeft(depth: number, isGroup: boolean): number {
  if (isGroup) return 6;
  return depth === 0 ? 24 : 26;
}
