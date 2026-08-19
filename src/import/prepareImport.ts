import type { SavedPlan } from '../store/planStorage';
import type { TimelineItem } from '../types/timeline';
import { buildTaskHierarchy } from '../utils/taskHierarchy';
import {
  decodeImportText,
  detectImportFormat,
  fileExtension,
  FORMAT_LABELS,
  IMPORTABLE_EXTENSIONS,
  type ImportFormat,
} from './detectFormat';
import { parseImportedTasks } from './importTasks';
import { parsePlanJson } from './planJson';
import { parseSheet } from './sheetImport';

/** What applying an import would do to the open plan. The file's own shape
 * decides: a whole plan replaces what is open, a list of tasks joins it. */
export type ImportAction = 'replace-plan' | 'add-tasks';

export interface ImportPreview {
  fileName: string;
  format: ImportFormat;
  action: ImportAction;
  /** The plan a 'replace-plan' import would switch to. */
  plan?: SavedPlan;
  /** The tasks that parsed cleanly — what "N tasks" in the summary counts. */
  items: TimelineItem[];
  /** One line per row that will not be imported, and why. */
  skipped: string[];
  /** Imported, but worth saying out loud first — an ambiguous Parent, a
   * status spelt in a way this app doesn't know, a file whose contents don't
   * match its name. */
  warnings: string[];
  /** Earliest start to latest end across `items`; null when there are none. */
  dateRange: { start: string; end: string } | null;
  /** How deep the imported tasks nest once they land, and how many of them
   * sit at the top of it — the difference between a real hierarchy and a flat
   * list, which a task count alone cannot show. */
  levels: number;
  rootCount: number;
}

function summariseDates(items: TimelineItem[]): ImportPreview['dateRange'] {
  if (items.length === 0) return null;

  // ISO yyyy-mm-dd compares correctly as text, so no Date objects are needed
  // — and none are wanted: parsing to compare would reintroduce exactly the
  // timezone shift the sheet importer's dateOnlyIso works to avoid.
  let start = items[0].start;
  let end = items[0].end;
  items.forEach((item) => {
    if (item.start < start) start = item.start;
    if (item.end > end) end = item.end;
  });

  return { start, end };
}

/** Where the imported tasks land in the tree they are joining.
 *
 * Judged against `existingItems` too, not the imported rows alone: a subtask
 * whose parent is already in the open plan is a root among its own file and
 * a child once it arrives, and the preview has to describe what the person
 * will actually see. */
function summariseNesting(
  items: TimelineItem[],
  existingItems: TimelineItem[],
): { levels: number; rootCount: number } {
  const importedIds = new Set(items.map((item) => item.id));
  const { flat } = buildTaskHierarchy([...existingItems, ...items]);
  const imported = flat.filter((node) => importedIds.has(node.item.id));

  if (imported.length === 0) return { levels: 0, rootCount: 0 };

  return {
    levels: Math.max(...imported.map((node) => node.depth)) + 1,
    rootCount: imported.filter((node) => node.depth === 0).length,
  };
}

/** Reads one file and works out what importing it would do — without doing
 * any of it.
 *
 * Nothing here touches the store. That is the point: a file is read, judged
 * and summarised first, and only a confirmed preview is ever applied (see
 * useApplyImport), so a file that turns out to be unreadable, or readable but
 * not what the person expected, costs them nothing. Before, parsing and
 * applying were one step and a half-parsed spreadsheet had already added its
 * good rows by the time its bad ones were reported.
 *
 * Throws when the file cannot be read at all; per-row problems come back in
 * `skipped` instead, since one bad row is no reason to reject the other
 * twenty. */
export async function prepareImport(file: File, existingItems: TimelineItem[]): Promise<ImportPreview> {
  const bytes = await file.arrayBuffer();
  const format = detectImportFormat(bytes);

  if (format === null) {
    throw new Error(
      `"${file.name}" is not a plan or a task table. Expected ${IMPORTABLE_EXTENSIONS.join(', ')} — ` +
        `a JSON plan, an Excel workbook, or a table with a heading row.`,
    );
  }

  const warnings: string[] = [];
  // The contents decide, but a name that disagrees with them is worth saying:
  // it is usually a file saved from the wrong menu, and the person is about
  // to wonder why "plan.json" imported as a table.
  const extension = fileExtension(file.name);
  const expected: Record<ImportFormat, string> = { json: '.json', xlsx: '.xlsx', csv: '.csv' };
  if (extension !== expected[format]) {
    warnings.push(`Named ${extension || 'without an extension'}, read as a ${FORMAT_LABELS[format]}.`);
  }

  if (format === 'json') {
    const text = decodeImportText(bytes);

    // Which of the two JSON shapes this is, from the first character rather
    // than by trying one parser and falling back to the other: `[` can only
    // begin the bare task array, `{` only the whole-plan object, so each file
    // reaches the parser that can report properly on it.
    if (text.trimStart().startsWith('[')) {
      const { items, warnings: statusWarnings } = parseImportedTasks(text);
      return {
        fileName: file.name,
        format,
        action: 'add-tasks',
        items,
        skipped: [],
        warnings: [...warnings, ...statusWarnings],
        dateRange: summariseDates(items),
        ...summariseNesting(items, existingItems),
      };
    }

    const { plan, warnings: statusWarnings } = parsePlanJson(text);
    return {
      fileName: file.name,
      format,
      action: 'replace-plan',
      plan,
      items: plan.items,
      skipped: [],
      warnings: [...warnings, ...statusWarnings],
      dateRange: summariseDates(plan.items),
      // A plan replaces everything, so its tasks nest among themselves only.
      ...summariseNesting(plan.items, []),
    };
  }

  const { items, errors, warnings: sheetWarnings } = parseSheet(bytes, existingItems);

  return {
    fileName: file.name,
    format,
    action: 'add-tasks',
    items,
    skipped: errors,
    warnings: [...warnings, ...sheetWarnings],
    dateRange: summariseDates(items),
    ...summariseNesting(items, existingItems),
  };
}
