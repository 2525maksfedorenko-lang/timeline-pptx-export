import * as XLSX from 'xlsx';
import type { TimelineItem } from '../types/timeline';
import {
  normalizeTaskStatus,
  unknownStatusWarnings,
  type UnknownStatus,
} from '../utils/normalizeStatus';
import { validateTimelineItem } from './importTasks';

/** Which task field each accepted column heading feeds. Headings are matched
 * case-insensitively with runs of spaces/underscores collapsed, so "Parent
 * ID", "parent_id" and "PARENT id" are one column. */
const COLUMN_ALIASES: Record<string, keyof ColumnIndex> = {
  label: 'label',
  task: 'label',
  'task name': 'label',
  start: 'start',
  'start date': 'start',
  end: 'end',
  'end date': 'end',
  progress: 'progress',
  status: 'status',
  assignee: 'assignee',
  owner: 'assignee',
  parent: 'parent',
  'parent id': 'parent',
};

interface ColumnIndex {
  label?: number;
  start?: number;
  end?: number;
  progress?: number;
  status?: number;
  assignee?: number;
  parent?: number;
}

export interface SheetImportResult {
  /** The rows that parsed cleanly, ready to hand to addItem. */
  items: TimelineItem[];
  /** One message per rejected row, naming the spreadsheet row number. Rows
   * are independent: a bad one is reported and skipped, never a reason to
   * throw away the good ones — which is the whole difference from the JSON
   * importer, where a malformed entry means the file itself is wrong. */
  errors: string[];
  /** Things that were imported, but not necessarily as the file's author
   * meant them — an ambiguous Parent, a Status spelt in a way this app
   * doesn't know. Unlike `errors` these cost no rows, so they are worth
   * showing before the import is applied rather than after it. */
  warnings: string[];
}

// Excel's day 0 in the 1900 date system, as a UTC timestamp. Serial numbers
// only turn up for cells the sheet never formatted as dates; anything
// formatted as one arrives as a Date, since the workbook is read with
// cellDates.
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeHeading(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, ' ');
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** A Date that stands for a calendar day, as yyyy-mm-dd.
 *
 * Which end of the Date to read is not a matter of taste: a date-only value
 * is midnight in *whichever zone built it*, and the two sources disagree.
 * SheetJS returns UTC midnight for a real .xlsx date cell, and local
 * midnight for a date string it parsed out of a CSV — so reading UTC parts
 * turns a CSV's 20 Sep into 19 Sep east of Greenwich, and reading local
 * parts does the same to an .xlsx west of it. Taking whichever reading
 * actually lands on midnight is right for both, and for a cell that carries
 * a real time of day it falls through to the local reading, which is the
 * one that matches what the sheet shows. */
function dateOnlyIso(date: Date): string {
  const isUtcMidnight =
    date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;

  return isUtcMidnight
    ? `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
    : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A cell's value as a yyyy-mm-dd string, or null if it isn't a date at all. */
function toIsoDate(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : dateOnlyIso(value);
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return dateOnlyIso(new Date(EXCEL_EPOCH_MS + value * MS_PER_DAY));
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (text === '') return null;
    // Already the target format: taken at face value, never round-tripped
    // through Date, which would reintroduce exactly the shift above.
    if (ISO_DATE.test(text)) return text;

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) return dateOnlyIso(parsed);
  }

  return null;
}

/** A cell's value as a 0-100 progress figure. Accepts a bare number, a
 * numeric string, "45%", and the fraction a percent-formatted cell actually
 * stores (0.45), which would otherwise import as 0%. */
function toProgress(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 0 && value <= 1 ? Math.round(value * 100) : value;
  }

  if (typeof value === 'string') {
    const text = value.trim().replace('%', '');
    if (text === '') return null;
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isBlankRow(row: unknown[]): boolean {
  return row.every((cell) => cell === undefined || cell === null || String(cell).trim() === '');
}

/** Hands the already-read bytes to SheetJS.
 *
 * Bytes rather than a File because the caller has to read the file anyway to
 * work out what it *is* (see detectImportFormat), and reading it twice would
 * leave the sniffer and the parser looking at two separate reads of the same
 * thing. It also keeps this module free of FileReader, so it can be exercised
 * without a browser.
 *
 * SheetJS reads a CSV through the same entry point as a workbook, guessing
 * the separator among comma/semicolon/tab/pipe, honouring RFC-4180 quoting
 * (so a quoted field may contain the separator, or newlines — which is how a
 * markdown comment survives a round trip through a spreadsheet), and
 * accepting CRLF. The BOM Excel writes is the one thing it does not strip,
 * which is why decodeImportText exists. */
function readWorkbook(bytes: ArrayBuffer): XLSX.WorkBook {
  try {
    return XLSX.read(new Uint8Array(bytes), { type: 'array', cellDates: true });
  } catch {
    throw new Error('The file could not be read as a spreadsheet.');
  }
}

/** Parses an .xlsx or .csv file of tasks — one row per task, the first row
 * naming the columns.
 *
 * Row-level problems are collected rather than thrown: a spreadsheet is
 * hand-kept and one bad row shouldn't cost the other twenty. Problems with
 * the *file* (no sheet, no recognizable columns) do throw, since there's
 * nothing to import at all. Field rules aren't restated here — a parsed row
 * goes through validateTimelineItem, the same gate the JSON importer uses.
 *
 * `existingItems` is what a Parent column resolves against, by id or by
 * label; rows earlier in the same file count too, so a file can bring in a
 * parent and its subtasks together. Two tasks may share a label — nothing
 * stops it, and a plan full of "Review" phases is normal — so an ambiguous
 * Parent is resolved to the first of them and reported (see warnings). */
export function parseSheet(bytes: ArrayBuffer, existingItems: TimelineItem[] = []): SheetImportResult {
  const workbook = readWorkbook(bytes);
  const sheetName = workbook.SheetNames[0];
  if (sheetName === undefined) throw new Error('The file contains no sheets.');

  // blankrows kept on purpose: dropping them here would renumber everything
  // below the gap, and a row number that doesn't match the one in the
  // spreadsheet is worse than no row number. They're skipped per row below.
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    blankrows: true,
  });
  const headingRow = rows[0];
  if (!Array.isArray(headingRow)) throw new Error('The first row must name the columns (Label, Start, End…).');

  const columns: ColumnIndex = {};
  headingRow.forEach((heading, index) => {
    const field = COLUMN_ALIASES[normalizeHeading(heading)];
    // First match wins, so a duplicated heading can't silently redirect a
    // column halfway through the file.
    if (field !== undefined && columns[field] === undefined) columns[field] = index;
  });

  const missing = (['label', 'start', 'end'] as const).filter((field) => columns[field] === undefined);
  if (missing.length > 0) {
    throw new Error(
      `The sheet is missing required column${missing.length > 1 ? 's' : ''}: ${missing
        .map((field) => (field === 'label' ? 'Label (or Task)' : field === 'start' ? 'Start' : 'End'))
        .join(', ')}.`,
    );
  }

  const items: TimelineItem[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  // Collected rather than reported row by row, so one column of "WIP" is one
  // line in the import dialog (see unknownStatusWarnings).
  const unknownStatuses: UnknownStatus[] = [];
  // Parent lookups: existing tasks first, then whatever this file has
  // already produced. First registration wins, so which task a Parent names
  // doesn't depend on how far down the file the row sits.
  const idByLabel = new Map<string, string>();
  const knownIds = new Set<string>();
  const rememberLabel = (label: string, id: string) => {
    const key = label.trim().toLowerCase();
    if (!idByLabel.has(key)) idByLabel.set(key, id);
  };
  existingItems.forEach((item) => {
    rememberLabel(item.label, item.id);
    knownIds.add(item.id);
  });

  // How many tasks each label names, counted across the open plan *and* every
  // row of this file before a single Parent is resolved. Counting as we go
  // would call a label unambiguous right up until its twin appears further
  // down, so the same file would warn or not depending on row order.
  const labelCount = new Map<string, number>();
  const countLabel = (label: string) => {
    const key = label.trim().toLowerCase();
    if (key !== '') labelCount.set(key, (labelCount.get(key) ?? 0) + 1);
  };
  existingItems.forEach((item) => countLabel(item.label));
  rows.slice(1).forEach((row) => {
    const cells = Array.isArray(row) ? row : [];
    const at = columns.label;
    if (at !== undefined) countLabel(String(cells[at] ?? ''));
  });
  const ambiguousReported = new Set<string>();

  rows.slice(1).forEach((row, index) => {
    // +2: spreadsheets are 1-based and the first row is the headings, so
    // this is the row number the person is looking at.
    const rowNumber = index + 2;
    const cells = Array.isArray(row) ? row : [];
    if (isBlankRow(cells)) return;

    const cell = (field: keyof ColumnIndex) => {
      const at = columns[field];
      return at === undefined ? undefined : cells[at];
    };

    try {
      const label = String(cell('label') ?? '').trim();
      if (label === '') throw new Error(`Row ${rowNumber} is missing a valid "Label" field.`);

      const start = toIsoDate(cell('start'));
      if (start === null) throw new Error(`Row ${rowNumber} has an invalid "Start" date.`);

      const end = toIsoDate(cell('end'));
      if (end === null) throw new Error(`Row ${rowNumber} has an invalid "End" date.`);

      // An unrecognized Status costs the row its status, not its place in the
      // plan: the label, the dates and the hierarchy in that row are all still
      // good, and dropping them over one misspelt word loses more than it
      // protects. The task imports as "to do" and the spelling is reported.
      const rawStatus = cell('status');
      const hasStatus = rawStatus !== undefined && String(rawStatus).trim() !== '';
      const status = hasStatus ? (normalizeTaskStatus(rawStatus) ?? undefined) : undefined;
      if (hasStatus && status === undefined) {
        unknownStatuses.push({ location: `Row ${rowNumber}`, value: String(rawStatus).trim() });
      }

      const rawProgress = cell('progress');
      const hasProgress = rawProgress !== undefined && String(rawProgress).trim() !== '';
      const progress = hasProgress ? toProgress(rawProgress) : null;
      if (hasProgress && (progress === null || progress < 0 || progress > 100)) {
        throw new Error(`Row ${rowNumber} has an invalid "Progress" (expected a number from 0 to 100).`);
      }

      const assigneeName = String(cell('assignee') ?? '').trim();

      const parentText = String(cell('parent') ?? '').trim();
      let parentId: string | undefined;
      if (parentText !== '') {
        const parentKey = parentText.toLowerCase();
        parentId = knownIds.has(parentText) ? parentText : idByLabel.get(parentKey);

        // Named a label that more than one task answers to. The link is kept
        // — dropping it would flatten a hierarchy the file clearly describes
        // — but which task it points at is a guess, so it is said out loud
        // once per label rather than once per row.
        const count = labelCount.get(parentKey) ?? 0;
        if (parentId !== undefined && count > 1 && !ambiguousReported.has(parentKey)) {
          ambiguousReported.add(parentKey);
          warnings.push(
            `"${parentText}" names ${count} tasks — rows with that Parent are attached to the first of them.`,
          );
        }
        // Reported rather than imported flat: dropping the link silently
        // would produce a different plan than the file describes, and the
        // row number says exactly where to fix it.
        if (parentId === undefined) {
          throw new Error(`Row ${rowNumber} names a "Parent" that doesn't exist here: "${parentText}".`);
        }
      }

      const item = validateTimelineItem(
        {
          id: crypto.randomUUID(),
          label,
          start,
          end,
          includeInExport: true,
          ...(status !== undefined ? { status } : {}),
          ...(progress !== null ? { progress } : {}),
          ...(assigneeName !== '' ? { assignee: { name: assigneeName } } : {}),
          ...(parentId !== undefined ? { parentId } : {}),
        },
        `Row ${rowNumber}`,
      );

      items.push(item);
      rememberLabel(item.label, item.id);
      knownIds.add(item.id);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Row ${rowNumber} could not be read.`);
    }
  });

  warnings.push(...unknownStatusWarnings(unknownStatuses));

  if (items.length === 0 && errors.length === 0) {
    throw new Error('The sheet has no task rows under its headings.');
  }

  return { items, errors, warnings };
}
