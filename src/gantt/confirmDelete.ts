import type { TimelineItem } from '../types/timeline';
import { childrenOf } from './rollup';

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
