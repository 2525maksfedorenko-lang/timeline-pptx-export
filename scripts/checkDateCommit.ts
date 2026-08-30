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

// 3. Settling never leaves the pair inverted — the edited end wins and the
//    other follows to a one-day task.
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

// 4. Typing a two-digit month or day: the date nobody touched stays put.
//
// These segments cannot be held back the way a year is — the first digit of 11
// is January the 3rd, a date this check would have to pass. So they commit as
// they come, and the pair rule runs once the edit is over instead. Applying it
// per keystroke is the failure: January carries the start date with it, and
// the second keystroke only fixes the deadline it was typed into.
function typedInto(pair: DatePair, field: 'start' | 'end', reported: string[], settle: 'per key' | 'at the end'): DatePair {
  let held = pair;
  for (const value of reported) {
    if (!isCommittableDate(value)) continue;
    held = field === 'start' ? { ...held, start: value } : { ...held, end: value };
    if (settle === 'per key') held = field === 'start' ? withStart(held, value) : withEnd(held, value);
  }
  return field === 'start' ? withStart(held, held.start) : withEnd(held, held.end);
}

const segments: [string, DatePair, 'start' | 'end', string[], DatePair][] = [
  // Deadline September → November: the month passes through January.
  ['deadline month 09 → 11', { start: '2026-08-30', end: '2026-09-03' }, 'end',
    ['2026-01-03', '2026-11-03'], { start: '2026-08-30', end: '2026-11-03' }],
  // Deadline the 25th → the 13th, inside one month: the day passes through the 1st.
  ['deadline day 25 → 13', { start: '2026-09-10', end: '2026-09-25' }, 'end',
    ['2026-09-01', '2026-09-13'], { start: '2026-09-10', end: '2026-09-13' }],
  // Start August → December, past the deadline: the deadline follows, once.
  ['start month 08 → 12', { start: '2026-08-30', end: '2026-09-03' }, 'start',
    ['2026-01-30', '2026-12-30'], { start: '2026-12-30', end: '2026-12-30' }],
  // A deadline that really is earlier: settling still pulls the start back.
  ['deadline year 2026 → 2025', { start: '2026-08-30', end: '2026-09-03' }, 'end',
    ['2025-09-03'], { start: '2025-09-03', end: '2025-09-03' }],
];
for (const [what, pairBefore, field, reported, want] of segments) {
  const got = typedInto(pairBefore, field, reported, 'at the end');
  const ok = got.start === want.start && got.end === want.end;
  expect(ok, `${what}: got ${got.start}…${got.end}, expected ${want.start}…${want.end}`);
  const perKey = typedInto(pairBefore, field, reported, 'per key');
  const cost = perKey.start === got.start && perKey.end === got.end ? '' : `  (per keystroke: ${perKey.start} … ${perKey.end})`;
  console.log(`   ${ok ? 'OK  ' : 'FAIL'}  ${what.padEnd(25)} ${got.start} … ${got.end}${cost}`);
}

// 5. Why the year is held back at all: the canvas a half-typed one would ask for.
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
