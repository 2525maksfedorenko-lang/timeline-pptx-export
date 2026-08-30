import { getTaskStatus, type TaskStatus, type TimelineItem } from '../types/timeline';

/* What a "group" is on this screen, and what is still derived from its
 * children.
 *
 * The handoff models groups explicitly (`kind: "task" | "group"`, with no
 * dates, status or progress of their own — all three "derived, never
 * stored"). This app has no `kind`: an item is a group exactly when some
 * other item names it as `parentId`.
 *
 * Of the handoff's three roll-ups only **status** survives here. A parent's
 * dates are its own — it is a task that happens to have tasks under it, edited
 * and dragged like any other, and drawn from the same stored pair the export
 * slides read (see drag.ts's previewSpans, and the "phase" section of
 * docs/design-system-map.md for why the roll-up went). Status is different: no
 * control sets a parent's own status, so deriving it from the children states
 * something rather than overriding something.
 */

/** Direct children of `id`, in list order. */
export function childrenOf(items: TimelineItem[], id: string): TimelineItem[] {
  return items.filter((item) => item.parentId === id);
}

/** True when `id` is itself somebody's sub-task — its `parentId` names a task
 * that is actually in this plan.
 *
 * Resolved parentage, not the bare field, and for the same reason
 * buildTaskHierarchy resolves it: an item whose parent was deleted is drawn as
 * a root and behaves as one, so it is not a sub-task here either.
 *
 * This is the whole of the "one level of sub-tasks" rule, which is about
 * *creating* them: a row this returns true for offers no way to add a child.
 * It says nothing about depth already in the plan — an imported file may nest
 * as deep as it likes, and every level of it is drawn and exported as before. */
export function isSubtask(items: TimelineItem[], id: string): boolean {
  const item = items.find((candidate) => candidate.id === id);
  if (item?.parentId === undefined) return false;
  return items.some((candidate) => candidate.id === item.parentId);
}

/** A group's status, in the handoff's order of precedence: all-done is done,
 * anything under way is in progress, and an untouched group is to do. Leaves
 * report their own. */
export function statusOf(items: TimelineItem[], item: TimelineItem): TaskStatus {
  const children = childrenOf(items, item.id);
  if (children.length === 0) return getTaskStatus(item);

  const statuses = children.map((child) => statusOf(items, child));
  if (statuses.every((status) => status === 'done')) return 'done';
  if (statuses.includes('in_progress') || children.some((child) => (child.progress ?? 0) > 0)) {
    return 'in_progress';
  }
  return 'todo';
}
