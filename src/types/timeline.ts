export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

export type SortMode = 'date' | 'status' | 'parent' | 'progress';

export const DEFAULT_TASK_STATUS: TaskStatus = 'todo';

// Bar and marker fills. Hex without a leading '#' to match pptxgenjs's expected
// format (see export/theme.ts's COLORS); prefix with '#' for CSS/jsPDF use.
//
// Every value is a literal aicoo design-system token, so a bar means the same
// thing here as it does in the product: grey for not-started (--status-neutral),
// blue for in-flight (--kind-task), green for done (--status-active-dot), red
// for blocked (--status-inactive-dot). These read with white text on top; the
// chip palette below is the pale counterpart for text on a tinted background.
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: '9CA3AF',
  in_progress: '3B82F6',
  done: '22C55E',
  blocked: 'EF4444',
};

/** The pale chip each status wears in the UI — the product's own Kanban chip
 * colours (tokens/status-palette.css), where a status is a tinted background
 * with dark text and a 1px border, never a saturated pill. */
export const TASK_STATUS_CHIP: Record<TaskStatus, { bg: string; fg: string; border: string }> = {
  todo: { bg: '#f3f4f6', fg: '#1f2937', border: '#e5e7eb' },
  in_progress: { bg: '#dbeafe', fg: '#1e40af', border: '#bfdbfe' },
  done: { bg: '#dcfce7', fg: '#166534', border: '#bbf7d0' },
  blocked: { bg: '#fee2e2', fg: '#991b1b', border: '#fecaca' },
};

// Status words are lowercase throughout the product ("on track", "delayed",
// "done") — deliberately, unlike first-class object labels which are Title Case.
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'to do',
  in_progress: 'in progress',
  done: 'done',
  blocked: 'blocked',
};

/** Every status, in the order they're offered in a picker — one list, so a
 * new status can't reach some dropdowns and miss others. */
export const TASK_STATUS_VALUES = Object.keys(TASK_STATUS_LABELS) as TaskStatus[];

export function getTaskStatus(item: Pick<TimelineItem, 'status'>): TaskStatus {
  return item.status ?? DEFAULT_TASK_STATUS;
}

export interface TimelineItem {
  id: string;
  label: string;
  start: string; // ISO date
  end: string;
  progress?: number;
  status?: TaskStatus;
  group?: string;
  color?: string;
  dependencies?: string[];
  milestone?: boolean;
  parentId?: string;
  includeInExport?: boolean;
  assignee?: { name: string; email?: string };
  tags?: string[];
}

export interface Timeline {
  title: string;
  items: TimelineItem[];
  scale: 'days' | 'weeks' | 'months';
}

export interface TaskComment {
  id: string;
  taskId: string;
  body: string; // markdown; see src/utils/renderMarkdown.ts for rendering
  isPinned?: boolean;
  createdAt: string;
}
