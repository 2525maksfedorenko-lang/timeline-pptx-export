/**
 * Date-field commit check — fails when a half-typed date could reach a task.
 *
 *   npm run check:dates
 *
 * The invariant: nothing the Edit Task panel's date fields report while a date
 * is being typed is ever written onto an item, and whatever is written leaves
 * the task's two dates in order.
 *
 * This is worth a check because the failure is a hang rather than a wrong
 * pixel. `<input type="date">` fires a change per keystroke, and a year being
 * retyped passes through the years 2, 20 and 202 — all of them complete,
 * parseable dates. The plan screen draws one column per day between its
 * earliest and latest date, one Date and one toLocaleString each, so
 * committing one of those asks it for a canvas tens of thousands of columns
 * wide and the tab stops answering. The last section below measures that
 * canvas, so the cost of the values being held back is stated rather than
 * asserted.
 */
import { isCommittableDate, withEnd, withStart, type DatePair } from '../src/gantt/dateEdit';
import { planRange } from '../src/gantt/scale';
import type { TimelineItem } from '../src/types/timeline';

/** The values a date input reports as a selected year segment is erased and
 * retyped digit by digit. The empty string is what it reports with no year at
 * all — mid-edit an incomplete date has no value. */
function yearKeystrokes(typed: string, monthDay: string): string[] {
  const steps = ['']; // the year segment, emptied
  for (let digits = 1; digits <= typed.length; digits += 1) {
    steps.push(`${typed.slice(0, digits).padStart(4, '0')}-${monthDay}`);
  }
  return steps;
}

const failures: string[] = [];

function expect(condition: boolean, what: string) {
  if (!condition) failures.push(what);
}

// 1. Typing a year: only the finished value commits.
for (const [typed, monthDay] of [
  ['2026', '05-10'],
  ['1999', '12-31'],
  ['2100', '01-01'],
]) {
  const steps = yearKeystrokes(typed, monthDay);
  const committed = steps.filter(isCommittableDate);
  const finished = `${typed}-${monthDay}`;
  expect(
    committed.length === 1 && committed[0] === finished,
    `typing ${typed}: committed [${committed.join(', ')}], expected only ${finished}`,
  );
  console.log(
    `   ${committed.length === 1 && committed[0] === finished ? 'OK  ' : 'FAIL'}  ` +
      `${typed}-${monthDay}  held ${steps.length - 1}: ${steps.slice(0, -1).map((step) => step || "''").join(' ')}`,
  );
}

// 2. What else a field must not pass on: the calendar's own non-dates, and
//    years outside the window a plan is written in.
for (const value of ['', '2026-02-31', '2026-13-01', '2026-00-10', '0002-05-10', '0999-05-10', '2101-01-01', '1899-12-31']) {
  expect(!isCommittableDate(value), `${value || "''"} should not be committable`);
}
for (const value of ['1900-01-01', '2024-02-29', '2026-05-10', '2100-12-31']) {
  expect(isCommittableDate(value), `${value} should be committable`);
}

// 3. A committed date never leaves the pair inverted — the edited end wins and
//    the other follows to a one-day task.
const pair: DatePair = { start: '2026-05-10', end: '2026-05-20' };
const cases: [string, DatePair, DatePair][] = [
  ['start before deadline', withStart(pair, '2026-05-12'), { start: '2026-05-12', end: '2026-05-20' }],
  ['start past deadline', withStart(pair, '2026-06-01'), { start: '2026-06-01', end: '2026-06-01' }],
  ['deadline after start', withEnd(pair, '2026-05-25'), { start: '2026-05-10', end: '2026-05-25' }],
  ['deadline before start', withEnd(pair, '2026-04-01'), { start: '2026-04-01', end: '2026-04-01' }],
];
for (const [what, got, want] of cases) {
  const ok = got.start === want.start && got.end === want.end;
  expect(ok, `${what}: got ${got.start}…${got.end}, expected ${want.start}…${want.end}`);
  console.log(`   ${ok ? 'OK  ' : 'FAIL'}  ${what.padEnd(22)} ${got.start} … ${got.end}`);
}

// 4. Why: the canvas a held-back value would have asked for.
//
// Two-digit years read as 1900s inside Date.UTC, which is what the canvas
// padding uses — so a year-2 start lands the canvas in 1902 rather than in
// the year 2. That makes the picture wrong as well as enormous, and it is
// still a plan screen asked to lay out more than a century of days.
const today = new Date('2026-05-10T00:00:00Z');
const task = (start: string, end: string): TimelineItem[] => [
  { id: 't', label: 'T', start, end, progress: 0, includeInExport: true } as TimelineItem,
];
const sane = planRange(task('2026-05-10', '2026-05-20'), today).totalDays;
const typo = planRange(task('0002-05-10', '2026-05-20'), today).totalDays;
console.log(
  `\n   a plan in 2026 draws ${sane} columns; the same plan with a year-2 start draws ` +
    `${typo.toLocaleString('en-US')} — ${Math.round(typo / sane)}× as many`,
);
expect(typo > 100 * sane, 'the year-2 canvas should be the runaway this check exists for');

if (failures.length > 0) {
  console.log(`\nFAILED — ${failures.length} rule(s) broken`);
  failures.forEach((failure) => console.log(`   ${failure}`));
  process.exit(1);
}
console.log('\nPASSED — half-typed dates stay in the field, committed pairs stay in order');
