import { MS_PER_DAY } from '../export/dateScale';
import {
  getTaskStatus,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  type TaskStatus,
  type TimelineItem,
} from '../types/timeline';

export interface StatusSegment {
  status: TaskStatus;
  label: string;
  color: string;
  count: number;
  percent: number;
}

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'done'];

/** Status breakdown (count + percent per status present in `items`) — the
 * single source of truth for the donut/summary-chart data shown on both the
 * on-screen Dashboard and the exported summary/dashboard slides, so they
 * never drift from each other. */
export function getStatusSegments(items: TimelineItem[]): StatusSegment[] {
  const counts: Record<TaskStatus, number> = { todo: 0, in_progress: 0, done: 0 };
  items.forEach((item) => {
    counts[getTaskStatus(item)] += 1;
  });

  const total = items.length;
  return STATUS_ORDER.filter((status) => counts[status] > 0).map((status) => ({
    status,
    label: TASK_STATUS_LABELS[status],
    color: TASK_STATUS_COLORS[status],
    count: counts[status],
    percent: total > 0 ? Math.round((counts[status] / total) * 100) : 0,
  }));
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Overdue: not done, and past its end date. `today` is injected (rather
 * than read internally via `new Date()`) so the on-screen Dashboard and the
 * export pipeline can both pass the exact same instant. */
export function getDelayedTasks(items: TimelineItem[], today: Date): TimelineItem[] {
  const todayTime = startOfDay(today).getTime();
  return items.filter((item) => getTaskStatus(item) !== 'done' && new Date(item.end).getTime() < todayTime);
}

/** Whole days between an item's end date and `today` — always >= 1 for a
 * task returned by getDelayedTasks (0 would mean it ends today, i.e. not
 * yet overdue). */
export function getDaysOverdue(item: TimelineItem, today: Date): number {
  const todayTime = startOfDay(today).getTime();
  const endTime = startOfDay(new Date(item.end)).getTime();
  return Math.max(0, Math.round((todayTime - endTime) / MS_PER_DAY));
}

export interface DashboardKpis {
  total: number;
  completed: number;
  completedPercent: number;
  delayed: number;
}

/** The 3 KPI numbers shown on the Dashboard's top cards, derived from the
 * same delayed/status functions used everywhere else — so a KPI card's count
 * always matches the corresponding table's row count.
 *
 * There used to be a fourth, "At risk", whose whole definition was "status is
 * blocked". With that status gone the number could only ever be zero, so the
 * card, its table and its slide went with it. "Delayed" is untouched — it is
 * a fact about dates, not about a status. */
export function getDashboardKpis(items: TimelineItem[], today: Date): DashboardKpis {
  const total = items.length;
  const completed = items.filter((item) => getTaskStatus(item) === 'done').length;

  return {
    total,
    completed,
    completedPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
    delayed: getDelayedTasks(items, today).length,
  };
}
