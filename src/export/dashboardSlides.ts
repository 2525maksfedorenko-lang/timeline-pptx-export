import type { TimelineItem } from '../types/timeline';
import { getAtRiskTasks, getDaysOverdue, getDelayedTasks } from '../utils/dashboardMetrics';
import { formatShortDate } from './dateScale';
import { dashboardDeepLink } from './qrCode';

export interface DashboardTable {
  headers: string[];
  rows: string[][];
}

export interface DashboardTableSlideModel {
  kind: 'dashboard-table';
  title: string;
  // Absent (rather than a table with zero rows) when there's nothing to
  // show, so exporters can render a friendly empty state instead of a
  // header-only table shell.
  table: DashboardTable | null;
  emptyMessage: string;
  qrUrl: string;
  qrDisplay: string;
}

export type DashboardSlideModel = DashboardTableSlideModel;

function assigneeText(item: TimelineItem): string {
  return item.assignee?.name ?? '—';
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

  const delayedLink = dashboardDeepLink('delayed');
  const delayedTasks = getDelayedTasks(exportableItems, today);
  const delayedSlide: DashboardTableSlideModel = {
    kind: 'dashboard-table',
    title: 'Delayed tasks',
    table:
      delayedTasks.length > 0
        ? {
            headers: ['Task', 'End date', 'Days overdue', 'Assignee'],
            rows: delayedTasks.map((item) => [
              item.label,
              formatShortDate(new Date(item.end)),
              `${getDaysOverdue(item, today)}`,
              assigneeText(item),
            ]),
          }
        : null,
    emptyMessage: 'No delayed tasks.',
    qrUrl: delayedLink.url,
    qrDisplay: delayedLink.display,
  };

  const atRiskLink = dashboardDeepLink('atrisk');
  const atRiskTasks = getAtRiskTasks(exportableItems);
  const atRiskSlide: DashboardTableSlideModel = {
    kind: 'dashboard-table',
    title: 'At risk tasks',
    table:
      atRiskTasks.length > 0
        ? {
            headers: ['Task', 'End date', 'Assignee'],
            rows: atRiskTasks.map((item) => [item.label, formatShortDate(new Date(item.end)), assigneeText(item)]),
          }
        : null,
    emptyMessage: 'No at-risk tasks.',
    qrUrl: atRiskLink.url,
    qrDisplay: atRiskLink.display,
  };

  return [atRiskSlide, delayedSlide];
}
