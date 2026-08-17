export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

export type SortMode = 'date' | 'status' | 'parent' | 'progress';

export const DEFAULT_TASK_STATUS: TaskStatus = 'todo';

// Hex values are stored without a leading '#' to match pptxgenjs's expected
// format (see export/theme.ts's COLORS); prefix with '#' for CSS/jsPDF use.
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: '94A3B8',
  in_progress: 'F2C14E',
  done: '2A9D90',
  blocked: 'E76E50',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
  blocked: 'Blocked',
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
