import { getTaskStatus, TASK_STATUS_LABELS, type TimelineItem } from '../types/timeline';
import { buildTaskHierarchy, type TaskNode } from '../utils/taskHierarchy';
import { getExportOverviewItems } from './timelineExportModel';

/** The plan as a task table — the third thing the Export menu makes, and the
 * only one that can be read back in.
 *
 * The columns are the spreadsheet importer's own (see COLUMN_ALIASES in
 * src/import/sheetImport.ts), in the order it describes them, so a file this
 * writes is a file that app can open. That is the whole design rule here: this
 * is not a report like the deck, it is the plan in the shape the import door
 * already accepts, and every decision below is made by asking what that door
 * does with the cell.
 *
 * What a CSV cannot carry, and why it is not attempted:
 *
 *   comments   a task has none or twenty, each with its own date, its pinned
 *              flag and a markdown body of its own. One cell would have to
 *              hold all of them and no importer reads it back; a row per
 *              comment would break the one-row-per-task shape every column
 *              here assumes. Comments already have a surface built for prose —
 *              the deck's appendix — so they stay there.
 *   ids        the importer mints a fresh id per row, by design (a sheet is
 *              hand-kept and its ids would collide). The tree is carried by
 *              the Parent column instead, which is a name.
 *   the rest   `group`, `color`, `dependencies`, `milestone` have no column in
 *              the importer, and an assignee's e-mail no cell of its own. Use
 *              the JSON plan export where an exact copy is what is wanted.
 *
 * Two things a *name* cannot carry, both pinned by `npm run check:csv` so they
 * stay known rather than becoming surprises:
 *
 *   - Parent names a task, and two tasks may share a name. Where they do, a
 *     re-import attaches the children of both to the first of them, and says
 *     so in the import dialog before anything is applied. Nothing is lost —
 *     the branch moves.
 *   - Tags share one cell, comma-separated, which is how a person writes them
 *     in a spreadsheet; a tag with a comma inside it therefore comes back as
 *     two tags. The cell has one separator and no escape for it.
 */

/** The heading row, and with it the field order of every row below. */
const COLUMNS = ['Label', 'Start', 'End', 'Progress', 'Status', 'Assignee', 'Parent', 'Tags'] as const;

/** When a value has to be wrapped in quotes.
 *
 * RFC 4180 asks for the comma, the quote and the line breaks. The semicolon,
 * the tab and the leading/trailing space are ours: SheetJS reads a CSV by
 * *guessing* its separator among comma, semicolon, tab and pipe, and a plan
 * whose labels are full of semicolons would otherwise hand it a file where the
 * wrong guess is the likelier one. Inside quotes none of them can end a field
 * whatever it guesses. */
const NEEDS_QUOTING = /["\r\n,;\t|]|^ | $/;

function field(value: string): string {
  if (value === '') return '';
  if (!NEEDS_QUOTING.test(value)) return value;
  // A quote inside a quoted field is written twice — the only escape RFC 4180
  // has, and the one SheetJS reads back.
  return `"${value.replace(/"/g, '""')}"`;
}

/** A task's progress with the per cent sign on it, or an empty cell when it
 * has none.
 *
 * The sign is not decoration. A CSV carries no cell formats, so a bare `1` is
 * a figure the importer has to guess at — and it says so, in a warning that
 * ends "Write it as "45%" to be explicit". This writes what that warning asks
 * for, and a plan round-trips without raising it. */
function progressCell(item: TimelineItem): string {
  return item.progress === undefined ? '' : `${item.progress}%`;
}

/** The status as the app spells it on screen ("in progress"), which is one of
 * the spellings normalizeTaskStatus accepts.
 *
 * Empty when the task carries no status of its own. `getTaskStatus` would
 * answer "to do" for it, and writing that would hand back a task with a status
 * the original did not have. */
function statusCell(item: TimelineItem): string {
  return item.status === undefined ? '' : TASK_STATUS_LABELS[getTaskStatus(item)];
}

/** The plan as CSV text: a heading row, then one row per exportable task.
 *
 * Three things decide what the file says:
 *
 * **Who is in it.** `getExportOverviewItems` — the same predicate the slides
 * use, so "Exclude from export" means one thing in all three files. The filter
 * runs *before* the tree is built, which is what gives an included task under
 * an excluded parent the right Parent cell: an empty one. It becomes a
 * top-level task, exactly as the deck draws it (buildTaskHierarchy calls an
 * item whose parent is not in the set a root), rather than pointing at a name
 * the file does not contain — which the importer would reject the row over.
 *
 * **What order.** Depth-first, parents before their children, because the
 * importer resolves a Parent against the rows *above* it only: a child written
 * above its parent is a rejected row, not a re-ordered one. The plan's own
 * order is kept within each level. The deck's sort mode deliberately does not
 * apply — it sorts the flat list for two of its four modes, which would put
 * children above parents.
 *
 * **What a cell says.** The importer reads Label, Start, End, Progress,
 * Status, Assignee, Parent and Tags, so those are written the way it reads
 * them; anything the task does not carry is an empty cell rather than a
 * default, so the round trip adds nothing the original did not have.
 *
 * The text opens with a BOM and ends its lines with CRLF: that is what Excel
 * needs to read UTF-8 (a plan written in Cyrillic is mojibake without it), and
 * SheetJS strips the BOM before it reads the headings, so the file still
 * imports here. */
export function buildPlanCsv(items: TimelineItem[]): string {
  const { roots } = buildTaskHierarchy(getExportOverviewItems(items));
  const lines = [COLUMNS.join(',')];

  const walk = (nodes: TaskNode[], parentLabel: string) => {
    nodes.forEach((node) => {
      const { item } = node;
      lines.push(
        [
          item.label,
          item.start,
          item.end,
          progressCell(item),
          statusCell(item),
          item.assignee?.name ?? '',
          parentLabel,
          // Comma-separated in one cell — what a person types into a Tags
          // column, and what the importer splits on.
          item.tags?.join(', ') ?? '',
        ]
          .map(field)
          .join(','),
      );
      walk(node.children, item.label);
    });
  };
  walk(roots, '');

  return `﻿${lines.join('\r\n')}\r\n`;
}

/** Triggers a browser download of the plan as a CSV file — the same shape of
 * handoff `exportPlanToJsonFile` makes for a JSON plan. */
export function downloadPlanCsv(items: TimelineItem[], fileName: string): void {
  const blob = new Blob([buildPlanCsv(items)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}
