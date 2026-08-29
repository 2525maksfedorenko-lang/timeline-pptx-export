import type { Span } from './geometry';

/* Drawing a task's dates on the timeline: the arithmetic, apart from the
 * component that runs it.
 *
 * Kept pure and separate for the same reason drag.ts is — the rule that turns
 * two pointer positions into two whole days is worth reading and testing on
 * its own, and it is the part another codebase would want if this screen were
 * lifted into one. */

/** How far the pointer must travel before a press in the create lane counts as
 * a drag rather than a click.
 *
 * Four pixels. It is not a safety threshold — nothing is created by either
 * outcome until a name is typed — it is there so a hand that shakes on the
 * button gets the day it pressed on. At the day scale a column is 30px wide
 * and no ordinary tremor could change the answer anyway; at the month scale a
 * column is 7px, and without this a 5px twitch would silently hand back a
 * two-day task. So the number is chosen against the tightest scale, and it is
 * one pixel clear of the 3px the grab-pan uses to tell a press from a drag. */
export const CREATE_DRAG_THRESHOLD_PX = 4;

/** The narrowest the name field may be drawn. A one-day bar is 26px at the day
 * scale and 6px at the month scale, and a field that size cannot be typed in —
 * so the field takes the bar's width or this, whichever is larger, and is the
 * one thing here that is not the bar's own geometry. */
export const CREATE_FIELD_MIN_WIDTH_PX = 180;

/** The day column an offset into the canvas falls in, clamped to the columns
 * actually drawn.
 *
 * `floor`, not `round`: an offset is inside the column it is drawn over, so
 * pressing anywhere in Tuesday's column means Tuesday. Both ends of a span go
 * through here, which is what puts a drawn task on whole days — the same
 * commitment every other bar on this screen is placed with. */
export function dayAtOffset(offsetX: number, columnWidth: number, dayCount: number): number {
  return Math.max(0, Math.min(dayCount - 1, Math.floor(offsetX / columnWidth)));
}

/** The span two columns describe, in either order — the drag runs left as
 * readily as right, and the column pressed on is inside the span either way,
 * so the shortest gesture there is draws one day rather than none. */
export function spanBetween(anchorDay: number, currentDay: number): Span {
  return {
    start: Math.min(anchorDay, currentDay),
    len: Math.abs(currentDay - anchorDay) + 1,
  };
}
