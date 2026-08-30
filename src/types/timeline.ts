export type TaskStatus = 'todo' | 'in_progress' | 'done';

/** The four orders an older export settings panel could put a deck in. Nothing
 * offers the choice now — every deck is drawn in the one order
 * (`sortItemsForExport`, docs/export-sort.md) — and this type exists to give
 * `ExportOptions.sortMode` a name. Kept with that field; see the note on it. */
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
};

const withoutHash = (hex: string) => hex.replace('#', '').toUpperCase();

/** Bar and marker fills, as hex without a leading '#' to match pptxgenjs's
 * expected format (see export/theme.ts's COLORS); prefix with '#' for CSS and
 * jsPDF use. The `solid` step, dark enough to carry light text. */
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: withoutHash(TASK_STATUS_SCALE.todo.solid),
  in_progress: withoutHash(TASK_STATUS_SCALE.in_progress.solid),
  done: withoutHash(TASK_STATUS_SCALE.done.solid),
};

// Status words are lowercase throughout the product ("on track", "delayed",
// "done") — deliberately, unlike first-class object labels which are Title Case.
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'to do',
  in_progress: 'in progress',
  done: 'done',
};

/** Every status the model can hold, in the order they're offered — one list,
 * so a new status can't reach some dropdowns and miss others.
 *
 * All three are choosable. There used to be a second, shorter list here and a
 * `statusOptionsFor` helper beside it, because `blocked` was a value the model
 * carried but no control could set; with `blocked` gone the two lists were the
 * same list, and a picker offers this one. */
export const TASK_STATUS_VALUES = Object.keys(TASK_STATUS_LABELS) as TaskStatus[];

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
  // Four fields nothing reads any more. Progress and dependency connectors
  // were taken off both the screen and the slides; the comment mode and the
  // sort order were taken out of the export settings panel, and the deck now
  // always draws the latest comment (EXPORT_COMMENT_MODE) in one fixed order
  // (sortItemsForExport, docs/export-sort.md).
  //
  // All four stay in the shape because they are part of the plan *file* — one
  // written by an older build, by hand or by another tool still carries them,
  // and normalizeExportOptions still has to answer for a malformed one rather
  // than a plan failing to open. A plan that stored `sortMode: "date"` keeps
  // storing it; its deck is drawn in the one order like every other.
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
  status?: TaskStatus;
  parentId?: string;
  color?: string;
  includeInExport?: boolean;

  // ── Six fields no control on this screen sets. Kept on purpose; see below.
  //
  // Do not delete these because a call graph says nothing reads them. They are
  // part of the plan *file*, and this app is not the only thing that writes
  // one: a spreadsheet import fills three of them, an older build filled the
  // rest, and `exportPlanToJsonFile` writes back whatever came in.
  // `validateTimelineItem` casts rather than picks fields, so a key this
  // interface stopped declaring would still ride along in memory and out to
  // the file — which is exactly why "nothing reads it" is the wrong test.
  //
  // What each one is actually worth, as of the phase-1 audit
  // (docs/cleanup-audit.md, category C):

  /** Written by the status control (`progressForStatus`), the spreadsheet's
   * Progress column and JSON import. Read by the group status roll-up — a
   * parent with a child over 0% is in progress — and by the CSV's Progress
   * column, which `check:csv` round-trips. No slider sets it any more. */
  progress?: number;

  /** Written by the spreadsheet's Assignee/Owner column and by JSON import,
   * read by the CSV's Assignee column and round-tripped by `check:csv`. The
   * picker that used to set it went with the people store. */
  assignee?: { name: string; email?: string };

  /** Written by the spreadsheet's Tags column and by JSON import, read by the
   * CSV's Tags column and round-tripped by `check:csv`. Never had a control. */
  tags?: string[];

  /** Never drawn — the links switch and the dependency connectors are gone
   * from the chart. Still *maintained*: `deleteTaskCascade` prunes links to
   * deleted tasks, and `copyBranch` remaps them when a branch becomes its own
   * plan and reports what it had to drop as a plan notice. Removing the field
   * removes that message, which is behaviour, not clutter. */
  dependencies?: string[];

  /** Read by nothing at all. It survives because `validateTimelineItem`
   * rejects a non-boolean one with a message, and a file that says
   * `"milestone": "yes"` being accepted in silence is a worse answer than the
   * one given today. */
  milestone?: boolean;

  /** Read by nothing at all, and superseded by `parentId` — this predates it.
   * Kept for the same reason as `milestone`: old files carry it, and the
   * validator still has something to say about a malformed one. */
  group?: string;
}

/** The shape a whole timeline would have as a standalone document.
 *
 * Nothing constructs one: this app's unit is `SavedPlan` (see
 * `store/planStorage.ts`), which carries the same items with a name, an id and
 * two timestamps. What keeps this interface alive is one field —
 * `ExportOptions.scale` is typed `Timeline['scale']`, so the three zoom names a
 * plan file may store are declared here and nowhere else. Kept rather than
 * inlined so that pair stays one definition. */
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
