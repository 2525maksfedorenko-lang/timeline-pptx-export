export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

export type SortMode = 'date' | 'status' | 'parent' | 'progress';

export const DEFAULT_TASK_STATUS: TaskStatus = 'todo';

/** The scale every status is drawn from. Four steps, because a status has to
 * appear on four different kinds of surface and one colour cannot serve them:
 *
 *   surface  the palest step — a chip background, meant to sit *under* dark
 *            text. Never used as a fill with text on top of it.
 *   border   the chip's hairline, one step up from its background.
 *   accent   the mid step, for small non-text marks (the status dot). Too
 *            light to carry text at WCAG AA — that is what `solid` is for.
 *   solid    the darkest step, for fills that carry light text (Gantt bars)
 *            and for status words set as text on a light background (the
 *            export slides). Doubles as the chip's own text colour.
 *
 * Every value is a literal token from the vendored design system rather than a
 * derived one — the scale the product's Kanban chips are built from already has
 * a dark step, so nothing here is invented. See docs/status-color-scale.md for
 * the token paths and the measured contrast of every pair.
 */
export const TASK_STATUS_SCALE: Record<
  TaskStatus,
  { surface: string; border: string; accent: string; solid: string }
> = {
  todo: { surface: '#F3F4F6', border: '#E5E5E5', accent: '#737373', solid: '#1F2937' },
  in_progress: { surface: '#DBEAFE', border: '#BFDBFE', accent: '#3B82F6', solid: '#1E40AF' },
  done: { surface: '#DCFCE7', border: '#BBF7D0', accent: '#22C55E', solid: '#166534' },
  blocked: { surface: '#FEE2E2', border: '#FECACA', accent: '#EF4444', solid: '#991B1B' },
};

const withoutHash = (hex: string) => hex.replace('#', '').toUpperCase();

/** Bar and marker fills, as hex without a leading '#' to match pptxgenjs's
 * expected format (see export/theme.ts's COLORS); prefix with '#' for CSS and
 * jsPDF use. The `solid` step, so the percentage drawn inside a bar clears
 * 4.5:1 against it. */
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: withoutHash(TASK_STATUS_SCALE.todo.solid),
  in_progress: withoutHash(TASK_STATUS_SCALE.in_progress.solid),
  done: withoutHash(TASK_STATUS_SCALE.done.solid),
  blocked: withoutHash(TASK_STATUS_SCALE.blocked.solid),
};

/** The pale chip each status wears in the app's left column — the product's
 * own Kanban chip: a tinted background with dark text and a 1px border. */
export const TASK_STATUS_CHIP: Record<TaskStatus, { bg: string; fg: string; border: string }> = {
  todo: {
    bg: TASK_STATUS_SCALE.todo.surface,
    fg: TASK_STATUS_SCALE.todo.solid,
    border: TASK_STATUS_SCALE.todo.border,
  },
  in_progress: {
    bg: TASK_STATUS_SCALE.in_progress.surface,
    fg: TASK_STATUS_SCALE.in_progress.solid,
    border: TASK_STATUS_SCALE.in_progress.border,
  },
  done: {
    bg: TASK_STATUS_SCALE.done.surface,
    fg: TASK_STATUS_SCALE.done.solid,
    border: TASK_STATUS_SCALE.done.border,
  },
  blocked: {
    bg: TASK_STATUS_SCALE.blocked.surface,
    fg: TASK_STATUS_SCALE.blocked.solid,
    border: TASK_STATUS_SCALE.blocked.border,
  },
};

/** The small status dot, which carries no text and so takes the mid step. */
export const TASK_STATUS_DOT: Record<TaskStatus, string> = {
  todo: TASK_STATUS_SCALE.todo.accent,
  in_progress: TASK_STATUS_SCALE.in_progress.accent,
  done: TASK_STATUS_SCALE.done.accent,
  blocked: TASK_STATUS_SCALE.blocked.accent,
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
