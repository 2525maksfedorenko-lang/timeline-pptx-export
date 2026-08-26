import { TASK_STATUS_VALUES, type TaskStatus } from '../types/timeline';

/* The bar's own colours are no longer here. A bar is drawn in its *branch's*
 * colour now (src/utils/branchColors.ts, shared with the exporters), so the
 * three status tones this file used to hand it — a pale fill, a matching dark
 * label, a solid — had no reader left. What survives is what still says
 * "status": the icon's stroke, and the wording.
 *
 * The --gantt-*-bg / -text / -fill tokens they read stay in tokens.css: they
 * are the handoff's transcription of its own palette, and the icon colours
 * below are two of them. */

/** The status icon's stroke. Two of the three are the tone's solid; "to do"
 * is drawn as a bare outline circle a shade lighter than its own solid, so an
 * untouched row reads as empty rather than as grey-but-present. */
export const STATUS_ICON_COLOR: Record<TaskStatus, string> = {
  done: 'var(--gantt-done-fill)',
  in_progress: 'var(--gantt-active-fill)',
  todo: 'var(--gantt-icon-todo)',
};

/** How this screen names a status. Title Case and spelled out — the
 * handoff's own labels, which differ from `TASK_STATUS_LABELS` (lowercase
 * "to do" / "in progress", the wording the export slides and the settings
 * list use). Both are kept: one screen, one vocabulary. */
export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Not started',
  in_progress: 'In progress',
  done: 'Done',
};

/** Clicking a row's status icon walks this ring — which is exactly the set a
 * picker offers, in the order a task moves through it, so the two can never
 * disagree about what can be set. */
export const STATUS_CYCLE: TaskStatus[] = [...TASK_STATUS_VALUES];
