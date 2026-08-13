import type { TimelineItem } from '../types/timeline';
import {
  getAtRiskTasks,
  getDaysOverdue,
  getDelayedTasks,
  getStatusSegments,
  type StatusSegment,
} from '../utils/dashboardMetrics';
import { formatShortDate } from './dateScale';
import { EXPORT_LINK_DISPLAY, EXPORT_LINK_URL } from './qrCode';

export interface DashboardTable {
  headers: string[];
  rows: string[][];
}

export interface DashboardStatusSlideModel {
  kind: 'dashboard-status';
  title: string;
  segments: StatusSegment[];
  qrUrl: string;
  qrDisplay: string;
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

export type DashboardSlideModel = DashboardStatusSlideModel | DashboardTableSlideModel;

function dashboardDeepLink(view: 'status' | 'delayed' | 'atrisk'): { url: string; display: string } {
  const path = `/?dashboardView=${view}`;
  return { url: `${EXPORT_LINK_URL}${path}`, display: `${EXPORT_LINK_DISPLAY}${path}` };
}

function assigneeText(item: TimelineItem): string {
  return item.assignee?.name ?? '—';
}

/** Builds the 3 dashboard slides (status breakdown, delayed tasks, at-risk
 * tasks) appended after the existing summary slide — see exportTimelineToPptx
 * / exportTimelineToPdf. Reuses the exact same status/delayed/at-risk logic
 * as the on-screen Dashboard (src/components/Dashboard.tsx) via
 * utils/dashboardMetrics.ts, and is scoped to exportable items just like the
 * rest of the export pipeline (buildExportSlides). */
export function buildDashboardSlides(items: TimelineItem[], today: Date): DashboardSlideModel[] {
  const exportableItems = items.filter((item) => item.includeInExport !== false);

  const statusLink = dashboardDeepLink('status');
  const statusSlide: DashboardStatusSlideModel = {
    kind: 'dashboard-status',
    title: 'Status breakdown',
    segments: getStatusSegments(exportableItems),
    qrUrl: statusLink.url,
    qrDisplay: statusLink.display,
  };

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

  return [statusSlide, delayedSlide, atRiskSlide];
}
