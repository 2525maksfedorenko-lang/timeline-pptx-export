import type { TimelineItem } from '../types/timeline';
import { getAtRiskTasks, getDaysOverdue, getDelayedTasks } from '../utils/dashboardMetrics';
import { formatShortDate } from './dateScale';
import { dashboardDeepLink } from './qrCode';
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
  qrUrl: string;
  qrDisplay: string;
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

/** "+7 more delayed tasks - scan for the full list". The QR code beside the
 * table opens exactly that list on screen, so the note points at it rather
 * than naming a number the reader can do nothing with. */
function overflowNote(omittedRowCount: number, noun: string): string | null {
  if (omittedRowCount === 0) return null;
  const plural = omittedRowCount === 1 ? '' : 's';
  return `+${omittedRowCount} more ${noun}${plural} - scan for the full list`;
}

interface TableSlideSpec {
  title: string;
  view: 'delayed' | 'atrisk';
  /** Singular noun for the overflow note ("delayed task" -> "+7 more delayed tasks"). */
  noun: string;
  emptyMessage: string;
  headers: string[];
  rows: string[][];
  dateColumnIndex: number;
}

function buildTableSlide(spec: TableSlideSpec): DashboardTableSlideModel {
  const link = dashboardDeepLink(spec.view);
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
    qrUrl: link.url,
    qrDisplay: link.display,
  };
}

/** Builds the 2 dashboard table slides (at-risk tasks, then delayed tasks),
 * which sit directly after the overview slide(s) — see slideOrder.ts for the
 * full deck order. There's deliberately no status-breakdown slide here:
 * the summary slide already shows the same segments, and links to the
 * on-screen status view via its own QR code. Reuses the exact same
 * delayed/at-risk logic as the on-screen Dashboard
 * (src/components/Dashboard.tsx) via utils/dashboardMetrics.ts, and is
 * scoped to exportable items just like the rest of the export pipeline
 * (buildExportSlides). */
export function buildDashboardSlides(items: TimelineItem[], today: Date): DashboardSlideModel[] {
  const exportableItems = items.filter((item) => item.includeInExport !== false);

  const atRiskSlide = buildTableSlide({
    title: 'At risk tasks',
    view: 'atrisk',
    noun: 'at-risk task',
    emptyMessage: 'No at-risk tasks.',
    headers: ['Task', 'End date'],
    rows: getAtRiskTasks(exportableItems).map((item) => [
      item.label,
      formatShortDate(new Date(item.end)),
    ]),
    dateColumnIndex: 1,
  });

  const delayedSlide = buildTableSlide({
    title: 'Delayed tasks',
    view: 'delayed',
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

  return [atRiskSlide, delayedSlide];
}
