import { useTimelineStore } from '../store/timelineStore';
import type { TimelineItem } from '../types/timeline';
import { getDescendantIds } from '../utils/taskHierarchy';
import { childrenOf } from './rollup';
import { useGanttViewStore } from './viewStore';

/* What deleting a task from the plan screen means: the question, and then the
 * two stores that have to hear the answer. Two controls reach it — the row's
 * context menu and the Edit Task panel's own button — and both go through
 * here so they cannot come to mean different things. */

/** The question asked before a task is deleted, in the one place it is worded.
 *
 * Two controls reach the same deletion — the row's context menu and the Edit
 * Task panel's own button — and both asked it, in the same words, from two
 * copies of the same four lines. The copies were kept in step by a comment
 * saying so ("same question, same words as the Edit Task panel's own delete"),
 * which is the arrangement that holds right up until it doesn't.
 *
 * The *cascade* is deliberately not here. `deleteTaskCascade` is the store's,
 * and what each caller does afterwards genuinely differs: the menu clears the
 * selection only when it deleted the selected row, while the panel is open on
 * the task it just removed and always clears. This function answers the
 * question and returns what was said; the caller acts on it.
 *
 * Kept out of the store for the same reason `planCsv`'s download helper is a
 * separate function from `buildPlanCsv`: `window.confirm` is the browser's,
 * and the store has to stay something a host app can drive without one. */
export function confirmTaskDeletion(items: TimelineItem[], item: TimelineItem): boolean {
  const hasSubtasks = childrenOf(items, item.id).length > 0;

  return window.confirm(
    hasSubtasks
      ? `Delete '${item.label}' and its sub-tasks? This can't be undone.`
      : `Delete '${item.label}'? This can't be undone.`,
  );
}

/** Removes a task and its whole sub-tree, and forgets what was being written
 * about any of them.
 *
 * The cascade itself is the plan store's. What it cannot do is the second half:
 * half-written comments live in the view store (`commentDrafts`), and the plan
 * store must not reach into the screen's — that is the layering this codebase
 * spent a branch straightening out. So the two are joined here, in the screen's
 * own layer, where both are already in scope.
 *
 * The *branch*, not the one task: deleting a group takes its sub-tasks with it,
 * and a draft written about one of those would otherwise be left keyed to an id
 * the plan no longer has.
 *
 * `getState()` rather than the bound hooks, because this is called from an
 * event handler and not during a render; zustand's actions are stable, so
 * there is nothing to subscribe to. */
export function deleteTaskBranch(items: TimelineItem[], id: string): void {
  const branch = [id, ...getDescendantIds(items, id)];
  useTimelineStore.getState().deleteTaskCascade(id);
  useGanttViewStore.getState().dropCommentDrafts(branch);
}
