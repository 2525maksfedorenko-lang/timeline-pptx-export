/**
 * CSV round-trip check — fails when a plan does not survive its own export.
 *
 *   npm run check:csv
 *
 * The invariant: take a plan, write it with `buildPlanCsv`, read the bytes
 * back through the app's own import door (`detectImportFormat` + `parseSheet`,
 * exactly as prepareImport does), and the task table that comes out is the
 * task table that went in — every exportable task, in order, with the same
 * dates, progress, status, assignee, tags and parent. Compared as two lists,
 * line for line, not field by field on a task somebody chose to look at.
 *
 * Ids are the one thing deliberately not compared: the sheet importer mints a
 * fresh one per row by design, and the tree is carried by the Parent column
 * instead. That is what makes the fourth scenario below the interesting one —
 * a Parent is a *name*, and names are not unique.
 *
 * The fixture is written to be awkward on purpose: quotes, commas, semicolons
 * and a line break inside labels, Cyrillic, three levels of nesting (deeper
 * than the screen creates, which is what an imported plan looks like), tasks
 * excluded from the export — including an excluded parent with an included
 * child — and a pair of parents that share a name.
 *
 * The last two sections are not round trips: they pin the three things a cell
 * demonstrably cannot carry back (a twin name, a comma inside a tag, a padded
 * label), so each stays a known limit rather than turning into a surprise, and
 * they check that a CSV is named by the same rule as a deck.
 */
import { buildPlanCsv } from '../src/export/planCsv';
import { buildExportFilename } from '../src/export/dateScale';
import { detectImportFormat } from '../src/import/detectFormat';
import { parseSheet } from '../src/import/sheetImport';
import { getExportOverviewItems } from '../src/export/timelineExportModel';
import { buildTaskHierarchy, type TaskNode } from '../src/utils/taskHierarchy';
import type { TimelineItem } from '../src/types/timeline';

let failed = false;

function check(label: string, ok: boolean, detail: string) {
  if (!ok) failed = true;
  console.log(`   ${ok ? 'OK  ' : 'FAIL'}  ${label.padEnd(44)} ${detail}`);
}

/** One task as one line: everything a CSV is supposed to carry, and nothing
 * that identifies the task by id. Indented by depth, so the *shape* of the
 * tree is part of the line rather than a separate assertion. */
function lines(items: TimelineItem[]): string[] {
  const { roots } = buildTaskHierarchy(getExportOverviewItems(items));
  const out: string[] = [];

  const walk = (nodes: TaskNode[], parentLabel: string) => {
    nodes.forEach((node) => {
      const item = node.item;
      out.push(
        [
          `${'· '.repeat(node.depth)}${JSON.stringify(item.label)}`,
          `${item.start}..${item.end}`,
          item.progress === undefined ? '—' : `${item.progress}%`,
          item.status ?? '—',
          item.assignee?.name ?? '—',
          item.tags?.join('|') ?? '—',
          `parent=${JSON.stringify(parentLabel)}`,
        ].join('  '),
      );
      walk(node.children, item.label);
    });
  };
  walk(roots, '');

  return out;
}

/** The export → import leg, through the same two calls prepareImport makes. */
function roundTrip(items: TimelineItem[]): { items: TimelineItem[]; csv: string; warnings: string[]; errors: string[]; format: string | null } {
  const csv = buildPlanCsv(items);
  const bytes = new TextEncoder().encode(csv).buffer as ArrayBuffer;
  const format = detectImportFormat(bytes);
  const { items: parsed, errors, warnings } = parseSheet(bytes, 'csv');
  return { items: parsed, csv, warnings, errors, format };
}

/** Prints the first place two lists part company, and how far apart they are. */
function compareLists(name: string, before: string[], after: string[]) {
  const same = before.length === after.length && before.every((line, index) => line === after[index]);
  check(name, same, same ? `${before.length} rows identical` : `${before.length} in, ${after.length} out`);
  if (same) return;

  for (let index = 0; index < Math.max(before.length, after.length); index += 1) {
    if (before[index] !== after[index]) {
      console.log(`      first difference at row ${index + 1}`);
      console.log(`      in : ${before[index] ?? '(nothing)'}`);
      console.log(`      out: ${after[index] ?? '(nothing)'}`);
      return;
    }
  }
}

const task = (item: Partial<TimelineItem> & Pick<TimelineItem, 'id' | 'label'>): TimelineItem => ({
  start: '2026-01-05',
  end: '2026-01-09',
  ...item,
});

// --- 1. the awkward plan -----------------------------------------------------

const AWKWARD: TimelineItem[] = [
  task({ id: 'p1', label: 'Фаза 1: подготовка', status: 'in_progress', progress: 45 }),
  task({
    id: 'p1a',
    label: 'Design, build, test',
    parentId: 'p1',
    status: 'done',
    progress: 100,
    assignee: { name: 'Мария Иванова' },
    tags: ['ui', 'needs review'],
  }),
  task({ id: 'p1b', label: 'Q3 "final" review', parentId: 'p1', status: 'todo', progress: 0 }),
  task({ id: 'p1b1', label: 'Ship; then celebrate', parentId: 'p1b', progress: 1 }),
  task({ id: 'p1b2', label: 'Two\nlines', parentId: 'p1b', tags: ['spike', 'q3'] }),
  task({ id: 'p2', label: 'Phase 2 — long dash, en dash – and a comma', status: 'todo' }),
  task({ id: 'p2a', label: 'Tab\tseparated', parentId: 'p2', assignee: { name: 'O\'Brien, Pat' } }),
];

console.log('1. A plan full of things that break a CSV');
{
  const trip = roundTrip(AWKWARD);
  check('read back as a CSV', trip.format === 'csv', `detectImportFormat → ${trip.format}`);
  check('no rejected rows', trip.errors.length === 0, trip.errors.join(' | ') || 'none');
  check('no warnings', trip.warnings.length === 0, trip.warnings.join(' | ') || 'none');
  compareLists('the plan is the plan', lines(AWKWARD), lines(trip.items));

  const quoted = trip.csv.includes('"Q3 ""final"" review"');
  check('a quote is doubled inside quotes', quoted, quoted ? '"Q3 ""final"" review"' : 'not found');
  const semicolon = trip.csv.includes('"Ship; then celebrate"');
  check('a semicolon is quoted', semicolon, semicolon ? '"Ship; then celebrate"' : 'not found');
  const newline = trip.csv.includes('"Two\nlines"');
  check('a line break is quoted', newline, newline ? '"Two\\nlines"' : 'not found');
  check('the text opens with a BOM', trip.csv.charCodeAt(0) === 0xfeff, 'U+FEFF, for Excel');
  const cyrillic = trip.csv.includes('Фаза 1: подготовка');
  check('non-ASCII survives verbatim', cyrillic, 'Фаза 1: подготовка');
}

// --- 2. exclusions -----------------------------------------------------------

const EXCLUDED: TimelineItem[] = [
  task({ id: 'a', label: 'Kept root' }),
  task({ id: 'a1', label: 'Kept child', parentId: 'a' }),
  task({ id: 'b', label: 'Excluded root', includeInExport: false }),
  task({ id: 'b1', label: 'Excluded child', parentId: 'b', includeInExport: false }),
  // The mixed case: an excluded parent whose child is still in the export.
  task({ id: 'b2', label: 'Kept child of an excluded parent', parentId: 'b' }),
];

console.log('\n2. Tasks excluded from the export');
{
  const trip = roundTrip(EXCLUDED);
  const labels = trip.items.map((item) => item.label);
  check(
    'excluded tasks are absent',
    !labels.includes('Excluded root') && !labels.includes('Excluded child'),
    `${labels.length} rows: ${labels.join(', ')}`,
  );
  const orphan = trip.items.find((item) => item.label === 'Kept child of an excluded parent');
  check(
    'an orphan comes back as a root',
    orphan !== undefined && orphan.parentId === undefined,
    'blank Parent, exactly as the deck draws it',
  );
  compareLists('the exportable plan is the plan', lines(EXCLUDED), lines(trip.items));
}

// --- 3. order ----------------------------------------------------------------

console.log('\n3. Row order');
{
  // A plan whose array order puts children before their parents: the CSV has
  // to reorder them, or the importer rejects every row whose parent it has
  // not met yet.
  const SHUFFLED: TimelineItem[] = [
    task({ id: 'c1', label: 'Child first', parentId: 'c' }),
    task({ id: 'c', label: 'Parent second' }),
  ];
  const trip = roundTrip(SHUFFLED);
  const rows = trip.csv.split('\r\n');
  check(
    'a parent is written above its children',
    rows[1].startsWith('Parent second'),
    rows.slice(1, 3).map((row) => row.split(',')[0]).join(' then '),
  );
  check('no rejected rows', trip.errors.length === 0, trip.errors.join(' | ') || 'none');
  compareLists('the plan is the plan', lines(SHUFFLED), lines(trip.items));
}

// --- 4. two parents with the same name ---------------------------------------

const TWINS: TimelineItem[] = [
  task({ id: 'x', label: 'Phase' }),
  task({ id: 'x1', label: 'First phase task', parentId: 'x' }),
  task({ id: 'y', label: 'Phase' }),
  task({ id: 'y1', label: 'Second phase task', parentId: 'y' }),
];

console.log('\n4. Two parents that share a name — the limit of a Parent column');
{
  const trip = roundTrip(TWINS);
  const before = lines(TWINS);
  const after = lines(trip.items);
  const diverges = before.length !== after.length || before.some((line, index) => line !== after[index]);
  check(
    'the divergence is the known one',
    diverges,
    'a name cannot tell two tasks apart; both children land under the first "Phase"',
  );
  check(
    'and the importer says so before applying',
    trip.warnings.some((warning) => warning.includes('names 2 tasks')),
    trip.warnings[0] ?? 'no warning — which would be the real bug',
  );
  const second = trip.items.find((item) => item.label === 'Second phase task');
  const firstPhase = trip.items.find((item) => item.label === 'Phase');
  check(
    'no task is lost to it',
    trip.items.length === TWINS.length && second?.parentId === firstPhase?.id,
    `${trip.items.length} rows in, ${trip.items.length} out — the tree moves, nothing drops`,
  );
  console.log('      in :', before.join('\n           '));
  console.log('      out:', after.join('\n           '));
}

// --- 5. what a cell cannot carry back ----------------------------------------

console.log('\n5. What a cell cannot carry back');
{
  const TAGGED: TimelineItem[] = [task({ id: 't', label: 'Tagged', tags: ['a, b', 'c'] })];
  const trip = roundTrip(TAGGED);
  const tags = trip.items[0]?.tags ?? [];
  check(
    'a tag with a comma comes back as two',
    tags.join('|') === 'a|b|c',
    `["a, b", "c"] → [${tags.map((tag) => `"${tag}"`).join(', ')}] — one cell, one separator, no escape for it`,
  );
  check('the task itself is untouched', trip.items.length === 1 && trip.items[0].label === 'Tagged', 'nothing lost');

  // The file is faithful; the importer is the one with the rule.
  const PADDED: TimelineItem[] = [task({ id: 'p', label: '  padded  ' })];
  const padded = roundTrip(PADDED);
  const written = padded.csv.split('\r\n')[1].startsWith('"  padded  "');
  check('a padded label is written verbatim', written, '"  padded  " in the file');
  check(
    'and comes back trimmed',
    padded.items[0]?.label === 'padded',
    'the sheet importer trims every label, whatever wrote the file',
  );
}

// --- 6. the filename ---------------------------------------------------------

console.log('\n6. The filename, by the same rule as the deck');
{
  const noTimeframe = buildExportFilename(null, 'csv');
  check('no timeframe', noTimeframe === 'timeline-export.csv', noTimeframe);
  const sameYear = buildExportFilename({ start: '2026-06-01', end: '2026-09-30' }, 'csv');
  check('a timeframe inside one year', sameYear === 'June-September_2026_aicoo.csv', sameYear);
  const acrossYears = buildExportFilename({ start: '2026-11-01', end: '2027-02-28' }, 'csv');
  check('a timeframe across two', acrossYears === 'November_2026-February_2027_aicoo.csv', acrossYears);
}

console.log(
  failed
    ? '\nFAILED'
    : '\nPASSED — a plan survives its own CSV, and every case a cell cannot carry is a reported one',
);
process.exit(failed ? 1 : 0);
