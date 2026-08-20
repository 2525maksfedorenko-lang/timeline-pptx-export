import type { TaskStatus } from '../types/timeline';

/** The four tones a status is drawn in on this screen: the bar's pale fill,
 * the label that sits on it, and the solid the progress overlay and the row's
 * status icon are painted with. Token names only — the values live in
 * `tokens.css`, transcribed from the handoff. */
export interface StatusTone {
  bg: string;
  text: string;
  fill: string;
}

const tone = (name: string): StatusTone => ({
  bg: `var(--gantt-${name}-bg)`,
  text: `var(--gantt-${name}-text)`,
  fill: `var(--gantt-${name}-fill)`,
});

export const STATUS_TONE: Record<TaskStatus, StatusTone> = {
  done: tone('done'),
  in_progress: tone('active'),
  todo: tone('todo'),
  blocked: tone('blocked'),
};

/** The status icon's stroke. Three of the four are the tone's solid; "to do"
 * is drawn as a bare outline circle a shade lighter than its own solid, so an
 * untouched row reads as empty rather than as grey-but-present. */
export const STATUS_ICON_COLOR: Record<TaskStatus, string> = {
  done: 'var(--gantt-done-fill)',
  in_progress: 'var(--gantt-active-fill)',
  todo: 'var(--gantt-icon-todo)',
  blocked: 'var(--gantt-blocked-fill)',
};

/** How this screen names a status. Title Case and spelled out — the
 * handoff's own labels, which differ from `TASK_STATUS_LABELS` (lowercase
 * "to do" / "in progress", the wording the export slides and the settings
 * list use). Both are kept: one screen, one vocabulary. */
export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Not started',
  in_progress: 'In progress',
  done: 'Done',
  blocked: 'Blocked',
};

/** Clicking a row's status icon walks this ring. */
export const STATUS_CYCLE: TaskStatus[] = ['todo', 'in_progress', 'done', 'blocked'];

const AVATAR_COLOR_COUNT = 6;

/** An assignee's badge colour, by their position in the saved people list, so
 * one person keeps one colour across every bar they appear on.
 *
 * The handoff's palette is six fixed colours against six fixed people. This
 * app's people list is open-ended, so the palette repeats; a name that
 * matches nobody saved (assigned before the person was removed) falls back to
 * a stable slot derived from the name itself rather than to a shared "unknown"
 * colour, which would make two such people look like one. */
export function avatarColor(peopleIndex: number, name: string): string {
  const slot =
    peopleIndex >= 0
      ? peopleIndex % AVATAR_COLOR_COUNT
      : [...name].reduce((sum, character) => sum + character.charCodeAt(0), 0) % AVATAR_COLOR_COUNT;
  return `var(--gantt-avatar-${slot + 1})`;
}
