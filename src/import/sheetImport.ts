import * as XLSX from 'xlsx';
import type { TimelineItem } from '../types/timeline';
import { groupedWarnings, type LocatedValue } from '../utils/groupedWarnings';
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

/** Which of the two table formats these bytes are. It is not cosmetic: an
 * .xlsx cell carries a number format and a .csv cell cannot, and that is the
 * whole basis on which a Progress figure is read (see readProgress). The caller
 * already knows which it is — detectImportFormat decided before the file got
 * here — so it is passed in rather than guessed at from the parsed cells. */
export type SheetSource = 'xlsx' | 'csv';

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

/** Which rule a Progress cell was read under. Carried out of readProgress
 * rather than kept private, because three of the five are worth telling the
 * person about: they are the ones where the file did not say enough and this
 * importer had to apply a rule of its own. */
type ProgressRule = 'percent-format' | 'number-format' | 'general-format' | 'per-cent-sign' | 'no-format';

interface ProgressReading {
  /** The figure as a percentage, or null when the cell says nothing usable. */
  percent: number | null;
  rule: ProgressRule;
}

/** What a cell says about itself beyond its value: the number format an .xlsx
 * cell carries, and the text the sheet would display. A CSV has no formats, but
 * SheetJS keeps the per cent sign a person typed in the displayed text — which
 * is the only record of it, since "45%" is parsed to the number 0.45. */
interface CellFacts {
  format?: string;
  text?: string;
}

/** True when a number format paints its value as a percentage — the case where
 * the stored number is a hundredth of what the sheet shows. Quoted literals and
 * escaped characters are stripped first, so a format that merely *prints* a per
 * cent sign as text (`0" %"`) is not mistaken for one. */
function isPercentFormat(format: string | undefined): boolean {
  if (format === undefined) return false;
  return format.replace(/"[^"]*"/g, '').replace(/\\./g, '').includes('%');
}

/** True when a number format says nothing about the number under it. General is
 * what a cell wears when nobody formatted it, so unlike `0.00` or `0%` it is not
 * the file stating anything — which is why the two are told apart (see the
 * summary lines in parseSheet). */
function isGeneralFormat(format: string | undefined): boolean {
  return format?.trim().toLowerCase() === 'general';
}

/** A Progress cell as a percentage, read from what the cell actually says.
 *
 * The size of the number decides nothing. A spreadsheet that formats a cell as
 * a percentage stores 0.45 for 45%, and one that does not stores 45 — so the
 * *format* is the only thing that can tell 1% from 100%, and reading `1` as a
 * fraction because it is small is exactly how a task at 1% used to arrive at
 * 100%. Where the format is there, it decides; where it cannot be, this says so
 * rather than inferring (see the summary lines in parseSheet).
 *
 *   .xlsx, percent format      0.45 -> 45%,  1 -> 100%,  0.01 -> 1%
 *   .xlsx, General               45 -> 45%,  0.45 -> 0.45%  — reported, not guessed
 *   .xlsx, any other format      45 -> 45%,  1 -> 1%,     100 -> 100%
 *   .xlsx, no format readable    45 -> 45%,  1 -> 1%   — reported, not guessed
 *   .csv, typed with a sign   "45%" -> 45%, "0.5%" -> 0.5%
 *   .csv, a bare number          45 -> 45%,  1 -> 1%,    0.45 -> 0.45%
 *   text ending in "%"        "45%" -> 45%  — whatever the source
 */
function readProgress(value: unknown, cell: CellFacts, source: SheetSource): ProgressReading {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (source === 'xlsx') {
      if (cell.format === undefined) return { percent: value, rule: 'no-format' };
      if (isPercentFormat(cell.format)) {
        // Multiplied then rounded: 0.07 * 100 is 7.000000000000001 in binary
        // floating point, and a progress figure of 7.000000000000001% would
        // travel into the plan and out into every export.
        return { percent: Math.round(value * 1000) / 10, rule: 'percent-format' };
      }
      // Read the same either way — the format decides nothing here, and that is
      // the point of telling General apart from a format that does say something.
      return { percent: value, rule: isGeneralFormat(cell.format) ? 'general-format' : 'number-format' };
    }

    // A CSV cell that was typed with a per cent sign reaches here as a number —
    // SheetJS reads "45%" as 0.45 — and the sign survives only in the text the
    // sheet would display. That text is what the person actually wrote, so it
    // decides, and the value it names is taken from it rather than multiplied
    // back up.
    const typed = cell.text?.trim();
    if (typed !== undefined && typed.endsWith('%')) {
      const parsed = Number(typed.slice(0, -1).trim());
      if (Number.isFinite(parsed)) return { percent: parsed, rule: 'per-cent-sign' };
    }

    return { percent: value, rule: 'no-format' };
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (text === '') return { percent: null, rule: 'no-format' };

    // An explicit per cent sign is the person saying it outright, and it means
    // the same thing in either format — no cell format can contradict it.
    if (text.endsWith('%')) {
      const parsed = Number(text.slice(0, -1).trim());
      return { percent: Number.isFinite(parsed) ? parsed : null, rule: 'per-cent-sign' };
    }

    const parsed = Number(text);
    if (!Number.isFinite(parsed)) return { percent: null, rule: 'no-format' };
    return { percent: parsed, rule: cell.format === undefined ? 'no-format' : 'number-format' };
  }

  return { percent: null, rule: 'no-format' };
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
    // cellNF puts each cell's number format on `.z`, which is off by default
    // and is the one thing that can tell a percent-formatted 0.45 from a plain
    // 45 (see readProgress). A CSV has none of this, by construction.
    return XLSX.read(new Uint8Array(bytes), { type: 'array', cellDates: true, cellNF: true });
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
 * `source` says which format the bytes are, because the two are read
 * differently in one place: an .xlsx Progress cell is read through its number
 * format and a .csv one cannot be, so the CSV rule is stated rather than
 * inherited (see readProgress).
 *
 * `existingItems` is what a Parent column resolves against, by id or by
 * label; rows earlier in the same file count too, so a file can bring in a
 * parent and its subtasks together. That backward-only resolution is also why
 * this parser needs no cycle check of its own (see breakParentCycles): a row
 * can only be attached to a task that already exists, and the tasks it creates
 * are new ids nothing else points at, so no loop can come out of a sheet. Two tasks may share a label — nothing
 * stops it, and a plan full of "Review" phases is normal — so an ambiguous
 * Parent is resolved to the first of them and reported (see warnings). */
export function parseSheet(
  bytes: ArrayBuffer,
  source: SheetSource,
  existingItems: TimelineItem[] = [],
): SheetImportResult {
  const workbook = readWorkbook(bytes);
  const sheetName = workbook.SheetNames[0];
  if (sheetName === undefined) throw new Error('The file contains no sheets.');

  const sheet = workbook.Sheets[sheetName];
  // sheet_to_json hands back values with the formats left behind, so the cell
  // itself is looked up again for those. Addresses are offset by the sheet's
  // own origin rather than assumed to start at A1.
  const origin = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1').s;
  const cellFacts = (rowIndex: number, columnIndex: number): CellFacts => {
    const cell = sheet[XLSX.utils.encode_cell({ r: origin.r + rowIndex, c: origin.c + columnIndex })];
    return {
      format: typeof cell?.z === 'string' ? cell.z : undefined,
      text: typeof cell?.w === 'string' ? cell.w : undefined,
    };
  };

  // blankrows kept on purpose: dropping them here would renumber everything
  // below the gap, and a row number that doesn't match the one in the
  // spreadsheet is worse than no row number. They're skipped per row below.
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
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
  // Progress figures this importer could not use, and the ones it could only
  // read by applying a rule the file didn't state — split by what the file
  // failed to say, since that is what each line has to explain. All three are
  // collected rather than reported row by row, for the same reason statuses are.
  const droppedProgress: LocatedValue[] = [];
  const assumedProgress: LocatedValue[] = [];
  const unstatedProgress: LocatedValue[] = [];
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

      // Progress reads like Status: a cell this importer cannot use costs the
      // row its progress figure, not its place in the plan (see F). What it
      // costs is said out loud, and so is any rule applied that the file itself
      // did not state.
      const rawProgress = cell('progress');
      const hasProgress = rawProgress !== undefined && String(rawProgress).trim() !== '';
      let progress: number | null = null;
      if (hasProgress) {
        const reading = readProgress(
          rawProgress,
          columns.progress === undefined ? {} : cellFacts(index + 1, columns.progress),
          source,
        );
        const value = String(rawProgress).trim();
        if (reading.percent === null || reading.percent < 0 || reading.percent > 100) {
          droppedProgress.push({ location: `Row ${rowNumber}`, value });
        } else {
          progress = reading.percent;
          // Said where the file left the question open, and only there. A cell
          // this importer could not read a format from is abnormal and is
          // always reported. A CSV having no formats is not abnormal — it is
          // what a CSV is — so it is reported only for a number in the range
          // where a person might have meant a fraction, which is exactly the
          // range the old size-based guess used to claim. `45` needs no note;
          // `0.45` does.
          //
          // General is the same silence in .xlsx clothing: the cell carries a
          // format, but the one a cell wears when nobody formatted it, so it
          // states no more about 0.45 than a CSV does — hence the same (0, 1]
          // range. A format that does state something (`0.00`, `0%`) is the
          // file speaking, and is taken at its word without a note.
          const ambiguous = typeof rawProgress === 'number' && rawProgress > 0 && rawProgress <= 1;
          const read = { location: `Row ${rowNumber}`, value: `${value} -> ${reading.percent}%` };
          if (typeof rawProgress === 'number') {
            if (reading.rule === 'no-format' && (source === 'xlsx' || ambiguous)) {
              assumedProgress.push(read);
            } else if (reading.rule === 'general-format' && ambiguous) {
              unstatedProgress.push(read);
            }
          }
        }
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
  warnings.push(
    ...groupedWarnings(
      droppedProgress,
      (value, where) =>
        `"${value}" is not a progress figure from 0 to 100 (${where}) — imported without one.`,
    ),
  );
  warnings.push(
    ...groupedWarnings(
      unstatedProgress,
      (value, where) =>
        `Progress ${value}, read as a plain percentage (${where}) — that cell's format is General, so the ` +
        `file didn't say whether it holds a fraction or the figure itself. Format the column as a ` +
        `percentage if it holds fractions, or write "45%".`,
    ),
  );
  warnings.push(
    ...groupedWarnings(assumedProgress, (value, where) =>
      source === 'csv'
        ? `Progress ${value}, read as a plain percentage (${where}) — a CSV carries no cell formats, so a ` +
          `number is taken as the percentage itself. Write it as "45%" to be explicit.`
        : `Progress ${value}, read as a plain percentage (${where}) — that cell carries no number format, ` +
          `so nothing said it holds a fraction. Format the column as a percentage, or write "45%".`,
    ),
  );

  if (items.length === 0 && errors.length === 0) {
    throw new Error('The sheet has no task rows under its headings.');
  }

  return { items, errors, warnings };
}
