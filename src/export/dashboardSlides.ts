import type { TimelineItem } from '../types/timeline';
import { getDaysOverdue, getDelayedTasks } from '../utils/dashboardMetrics';
import { formatShortDate } from '../utils/dates';
import {
  DASHBOARD_TABLE_MAX_HEIGHT_IN,
  DASHBOARD_TABLE_WIDTH_IN,
  tableColumnTextWidthIn,
  tableRowHeightIn,
} from './slideLayout';

export interface DashboardTable {
  headers: string[];
  rows: string[][];
  /** Index of the column holding dates, so a renderer can give that column
   * the monospace date face. Set here, by the code that actually places the
   * dates into `rows`, rather than sniffed from header text downstream.
   * Undefined for tables with no date column — e.g. the markdown tables in
   * a comment body, which share this renderer. */
  dateColumnIndex?: number;
}

export interface DashboardTableSlideModel {
  kind: 'dashboard-table';
  title: string;
  // Absent (rather than a table with zero rows) when there's nothing to
  // show, so exporters can render a friendly empty state instead of a
  // header-only table shell.
  table: DashboardTable | null;
  /** Rows the slide had no room for — the table above holds the ones that
   * fit, in the plan's own order. See fitTableRows. */
  omittedRowCount: number;
  /** Footer note announcing `omittedRowCount`, or null when the whole list is
   * on the slide. Drawn by both exporters through the same footer note the
   * overview's own "+N tasks not shown" uses. */
  note: string | null;
  emptyMessage: string;
}

export type DashboardSlideModel = DashboardTableSlideModel;

/** Cuts a table down to the rows that fit on its slide, and counts the rest.
 *
 * Neither engine paginates a table, and the PDF is explicitly stopped from
 * trying, because a page jspdf-autotable inserts has no slide model behind it
 * and shifts every hyperlink after it (see withoutPageBreaks in pdfExporter,
 * and docs/export-coverage.md). Uncut, a long list was simply drawn past the
 * bottom edge of the slide.
 *
 * Rows are filled in order and stop at the first one that doesn't fit — they
 * are not re-sorted by severity first. The order here is the plan's own: both
 * exporters build these slides from sortItemsForExport's output, which walks
 * the tree depth-first, so the table reads root by root exactly as the
 * on-screen Dashboard's does and the rows kept are the ones at the top of that
 * same list. Which is exactly why the count that goes with them is not
 * optional: what's cut is "the rest of the list", not "the least important". */
function fitTableRows(headers: string[], rows: string[][]): { rows: string[][]; omittedRowCount: number } {
  const columnTextWidth = tableColumnTextWidthIn(DASHBOARD_TABLE_WIDTH_IN, headers.length);
  let height = tableRowHeightIn(headers, columnTextWidth);
  const fitted: string[][] = [];

  for (const row of rows) {
    const rowHeight = tableRowHeightIn(row, columnTextWidth);
    if (height + rowHeight > DASHBOARD_TABLE_MAX_HEIGHT_IN) break;
    height += rowHeight;
    fitted.push(row);
  }

  return { rows: fitted, omittedRowCount: rows.length - fitted.length };
}

/** "+7 more delayed tasks not shown".
 *
 * The note used to end "- scan for the full list", pointing at a QR code
 * beside the table that opened the same list on screen. Both are gone, and
 * with them any way to reach the rest from the slide — so the note now says
 * only what is true: this many rows exist and are not here. Naming a number
 * the reader can do nothing with is still worth it; a table that quietly
 * stops at the bottom of the slide reads as the whole list. */
function overflowNote(omittedRowCount: number, noun: string): string | null {
  if (omittedRowCount === 0) return null;
  const plural = omittedRowCount === 1 ? '' : 's';
  return `+${omittedRowCount} more ${noun}${plural} not shown`;
}

interface TableSlideSpec {
  title: string;
  /** Singular noun for the overflow note ("delayed task" -> "+7 more delayed tasks"). */
  noun: string;
  emptyMessage: string;
  headers: string[];
  rows: string[][];
  dateColumnIndex: number;
}

function buildTableSlide(spec: TableSlideSpec): DashboardTableSlideModel {
  const { rows, omittedRowCount } = fitTableRows(spec.headers, spec.rows);

  return {
    kind: 'dashboard-table',
    title: spec.title,
    table:
      spec.rows.length > 0
        ? { headers: spec.headers, rows, dateColumnIndex: spec.dateColumnIndex }
        : null,
    omittedRowCount,
    note: overflowNote(omittedRowCount, spec.noun),
    emptyMessage: spec.emptyMessage,
  };
}

/** Builds the dashboard table slide (delayed tasks), which sits directly
 * after the overview slide(s) — see slideOrder.ts for the full deck order.
 * There's deliberately no status-breakdown slide here: the summary slide
 * already shows the same segments. Reuses the exact same delayed logic as the
 * on-screen Dashboard (src/components/Dashboard.tsx) via
 * utils/dashboardMetrics.ts, and is scoped to exportable items just like the
 * rest of the export pipeline (buildExportSlides).
 *
 * An "At risk tasks" slide used to lead this group. Its rows were the blocked
 * tasks and nothing else, so it left with that status. */
export function buildDashboardSlides(items: TimelineItem[], today: Date): DashboardSlideModel[] {
  const exportableItems = items.filter((item) => item.includeInExport !== false);

  const delayedSlide = buildTableSlide({
    title: 'Delayed tasks',
    noun: 'delayed task',
    emptyMessage: 'No delayed tasks.',
    headers: ['Task', 'End date', 'Days overdue'],
    rows: getDelayedTasks(exportableItems, today).map((item) => [
      item.label,
      formatShortDate(new Date(item.end)),
      `${getDaysOverdue(item, today)}`,
    ]),
    dateColumnIndex: 1,
  });

  return [delayedSlide];
}
