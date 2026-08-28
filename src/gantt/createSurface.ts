import type { Span } from './geometry';

/* Drawing a task on the timeline: the arithmetic, apart from the component
 * that runs it.
 *
 * Kept pure and separate for the same reason drag.ts is — the rules that turn
 * a pointer position into two whole days and one whole row are worth reading
 * and testing on their own, and they are the part another codebase would want
 * if this screen were lifted into one. */

/** How far the pointer must travel before a press on the grid counts as a drag
 * rather than a click.
 *
 * Four pixels. It does two jobs. A hand that shakes on the button still gets
 * the day it pressed on — at the day scale a column is 30px and no ordinary
 * tremor could change the answer, but at the month scale a column is 7px and
 * without this a 5px twitch would silently hand back a two-day task, so the
 * number is chosen against the tightest scale. And since the grid is now one
 * whole create surface, this is also what separates a drag from a click: a
 * press that never crosses it draws nothing and opens nothing. */
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

/** The row an offset down the canvas falls in.
 *
 * The same `floor` rule `dayAtOffset` uses, in the other axis: a press is
 * inside the row it is drawn over. There is no upper clamp because there is no
 * upper edge to clamp to — the canvas keeps drawing its grid past the last
 * task (see MIN_BODY_HEIGHT_PX), and a task drawn down there is as valid as
 * one drawn beside an existing bar. It simply lands at the end of the plan,
 * which is where the row it was drawn in already is. */
export function rowAtOffset(offsetY: number, rowHeight: number): number {
  return Math.max(0, Math.floor(offsetY / rowHeight));
}
