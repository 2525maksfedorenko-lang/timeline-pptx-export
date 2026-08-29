/* What the panel's two date fields are allowed to write onto a task.
 *
 * Both rules are here rather than in the markup because both are about the
 * *pair* of dates a task carries, not about how a field looks: which values
 * are finished enough to store, and how the other end follows when one of
 * them moves past it.
 */

/** Years a plan is written in.
 *
 * The plan screen draws one column per calendar day between its earliest and
 * its latest date, and today is always inside that range (see planRange) — so
 * a date far outside this window is not a plan that scrolls a long way, it is
 * a canvas of hundreds of thousands of columns built from a typo. Two
 * centuries is already further than the screen can usefully draw. */
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

/** Whether a date field's value is finished being typed — the only thing the
 * panel commits.
 *
 * `<input type="date">` fires a change on every keystroke, and while a year is
 * being typed the value it reports is a *complete* date with a partial year:
 * erase 2026 and type it back and the field says `0002-05-10`, then
 * `0020-05-10`, then `0202-05-10` before it says `2026-05-10`. Those three are
 * real dates as far as `Date` is concerned, which is exactly why they can't be
 * told apart by parsing alone — and committing the first of them asks the plan
 * to draw every day since the year 2.
 *
 * So: four digits of year inside the window above, and a date the calendar
 * actually has. The round-trip through `toISOString` is what checks the last
 * part — `new Date('2026-02-31')` doesn't fail, it rolls forward to 3 March. */
export function isCommittableDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const year = Number(value.slice(0, 4));
  if (year < MIN_YEAR || year > MAX_YEAR) return false;

  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** A task's two dates. */
export interface DatePair {
  start: string;
  end: string;
}

/* Both rules below compare ISO dates as strings, which is what YYYY-MM-DD is
 * for: fixed-width fields, biggest first, so `<` on the text is `<` on the
 * calendar. No parsing, no timezone.
 *
 * The field being edited always wins and the other end follows, which is the
 * same bargain a drag on the chart already strikes: a resize never shrinks a
 * bar past one day, it stops. Here the pair is written so that what the panel
 * shows and what the task stores agree — the alternative, storing a deadline
 * before its start, leaves the bar drawing one day (previewSpans clamps it)
 * while the field claims something else. */

/** The pair after Start Date is set to `start`. Moving the start keeps the
 * deadline where it is, so the task's length is what changes — until the start
 * passes the deadline, where the deadline comes with it as a one-day task. */
export function withStart(pair: DatePair, start: string): DatePair {
  return { start, end: pair.end < start ? start : pair.end };
}

/** The pair after Deadline is set to `end` — the mirror of withStart. */
export function withEnd(pair: DatePair, end: string): DatePair {
  return { start: end < pair.start ? end : pair.start, end };
}
