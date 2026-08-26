import type { TaskStatus } from '../types/timeline';

/** The progress a *hand-picked* status implies, or null when that status says
 * nothing about it.
 *
 * "done" means the work is finished and "to do" means it hasn't started, so
 * picking either in the UI moves the figure to match rather than leaving a
 * task marked done at 30%. Both stay editable afterwards — the rule sets a
 * value, it doesn't own one, which is what lets someone mark a task done and
 * then pull it back to 80% because a tail is left. "in progress" says nothing
 * about how far along the work is, so it leaves the figure alone.
 *
 * There is deliberately no rule the other way: typing 100 does not mark a task
 * done. A status is a decision someone makes, and it should not follow from a
 * slider being dragged to its end.
 *
 * **This is an interface rule, not a model one.** It belongs to manual editing
 * and only there: an importer must never apply it, because a file with "done"
 * against 0% is what someone wrote down, and rewriting it silently would
 * replace their data with our inference (see the note in importTasks). Nothing
 * in src/import or src/export calls this, and nothing should.
 */
export function progressForStatus(status: TaskStatus): number | null {
  if (status === 'done') return 100;
  if (status === 'todo') return 0;
  return null;
}
