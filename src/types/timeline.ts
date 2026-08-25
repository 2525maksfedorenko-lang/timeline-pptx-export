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
  // Each value is a design-system token, named here so the provenance is
  // visible where the value is used. They stay written as hex because the PPTX
  // exporter consumes them in exactly this form (TASK_STATUS_COLORS below
  // strips the '#' for pptxgenjs); hsl(var(--x)) would be unreadable to it.
  //                                                    the token each one is
  todo: { surface: '#F3F4F6', border: '#E5E5E5', accent: '#737373', solid: '#1F2937' },
  //     --status-neutral-bg  --border/--input  --muted-foreground  --status-neutral-fg
  in_progress: { surface: '#DBEAFE', border: '#BFDBFE', accent: '#3B82F6', solid: '#1E40AF' },
  //            --kanban-1-bg       --kanban-1-border  --kind-task        --kanban-1-fg
  done: { surface: '#DCFCE7', border: '#BBF7D0', accent: '#22C55E', solid: '#166534' },
  //     --status-done-bg     --kanban-3-border --status-active-dot --status-done-fg
  blocked: { surface: '#FEE2E2', border: '#FECACA', accent: '#EF4444', solid: '#991B1B' },
  //        --status-delayed-bg --kanban-4-border --destructive     --status-delayed-fg
};

const withoutHash = (hex: string) => hex.replace('#', '').toUpperCase();

/** Bar and marker fills, as hex without a leading '#' to match pptxgenjs's
 * expected format (see export/theme.ts's COLORS); prefix with '#' for CSS and
 * jsPDF use. The `solid` step, dark enough to carry light text. */
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

// Status words are lowercase throughout the product ("on track", "delayed",
// "done") — deliberately, unlike first-class object labels which are Title Case.
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'to do',
  in_progress: 'in progress',
  done: 'done',
  blocked: 'blocked',
};

/** Every status the model can hold, in the order they're offered — one list,
 * so a new status can't reach some dropdowns and miss others. */
export const TASK_STATUS_VALUES = Object.keys(TASK_STATUS_LABELS) as TaskStatus[];

/** The statuses a person can *choose*, which is no longer all of them.
 *
 * `blocked` is missing deliberately. It remains a value the model carries, the
 * importer produces and every colour table answers for — a task that arrives
 * blocked stays blocked, draws blocked, sorts as blocked and counts as at risk
 * — but nothing in the app sets it any more. That makes it a one-way door: a
 * blocked task can be moved to another status from the screen and cannot be
 * moved back. */
export const SELECTABLE_TASK_STATUS_VALUES: TaskStatus[] = ['todo', 'in_progress', 'done'];

/** What a picker sitting on `current` should offer: the choosable statuses,
 * plus `current` itself when it is not one of them.
 *
 * Without that second half a blocked task's control would be bound to a value
 * none of its options carry, which renders as an empty box — the task would
 * look statusless rather than blocked. It is shown, so the picker tells the
 * truth; it is not added to the list for anything else, so it cannot be
 * chosen. */
export function statusOptionsFor(current: TaskStatus): TaskStatus[] {
  return SELECTABLE_TASK_STATUS_VALUES.includes(current)
    ? SELECTABLE_TASK_STATUS_VALUES
    : [...SELECTABLE_TASK_STATUS_VALUES, current];
}

export function getTaskStatus(item: Pick<TimelineItem, 'status'>): TaskStatus {
  return item.status ?? DEFAULT_TASK_STATUS;
}

/** The export timeframe window: a task outside it is either clipped at the
 * window's edge or dropped from the overview entirely. null = the full range of
 * the included tasks. */
export interface ExportTimeframe {
  start: string; // ISO date
  end: string; // ISO date
}

export interface ExportOptions {
  theme: string;
  scale: Timeline['scale'];
  showProgress: boolean;
  showDependencies: boolean;
  commentMode: 'latest' | 'pinned' | 'all' | 'none';
  sortMode: SortMode;
  // null = use the full date range of the included tasks (no windowing).
  exportTimeframe: ExportTimeframe | null;
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
