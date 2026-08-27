import { getTaskStatus, type TaskStatus, type TimelineItem } from '../types/timeline';
import { buildTaskHierarchy, type TaskNode } from './taskHierarchy';

/** Top-to-bottom status order on the exported slides. Change this one line to
 * reorder them; nothing about the slide layout depends on it.
 *
 * Deliberately not the on-screen order (see sortItems.ts, which runs
 * todo-first): a deck is read as a report of what is finished, so it leads with
 * `done`, while the app is a working view that leads with what is still open. */
export const STATUS_SORT_ORDER: TaskStatus[] = ['done', 'in_progress', 'todo'];

const statusRank = (item: TimelineItem): number => {
  const rank = STATUS_SORT_ORDER.indexOf(getTaskStatus(item));
  // A status missing from the array sorts last rather than first, which is what
  // indexOf's -1 would otherwise do.
  return rank === -1 ? STATUS_SORT_ORDER.length : rank;
};

/** Status, then start date, then label — and `id` as a final guard.
 *
 * The guard is what makes two runs on the same data produce the same slide even
 * if the items arrive in a different array order (a store reload, a re-import):
 * without it, items agreeing on all three keys would keep whatever order the
 * input happened to have, and regression screenshots would be comparing noise. */
function compare(a: TimelineItem, b: TimelineItem): number {
  const byStatus = statusRank(a) - statusRank(b);
  if (byStatus !== 0) return byStatus;

  const byStart = new Date(a.start).getTime() - new Date(b.start).getTime();
  if (byStart !== 0) return byStart;

  const byLabel = a.label.localeCompare(b.label);
  if (byLabel !== 0) return byLabel;

  return a.id.localeCompare(b.id);
}

/** Sorts one level of the tree, then each of its children's levels, so the
 * ordering applies at every depth rather than only at the roots. */
function sortLevel(nodes: TaskNode[]): TaskNode[] {
  return [...nodes]
    .sort((a, b) => compare(a.item, b.item))
    .map((node) => ({ ...node, children: sortLevel(node.children) }));
}

/** Orders items for the exported slides, without mutating the input.
 *
 * The deck's one order, and no longer a choice. The export settings used to
 * offer four — status, start date, parent group, progress — of which only this
 * one rebuilt the tree; the other three sorted the flat list, which scatters a
 * subtask away from the parent whose bar it belongs under. With the control
 * gone this is what every deck is drawn in, and `ExportOptions.sortMode` is a
 * field the plan file still carries that nothing reads (see the note on it in
 * types/timeline.ts). docs/export-sort.md is the written version.
 *
 * Hierarchical, not flat: the tree is rebuilt from `parentId`, each level is
 * sorted, and the result is flattened depth-first — so a parent carries its
 * whole subtree with it, a child can never rise above its own parent, and a
 * child can never land between another parent's children.
 *
 * A parent is ranked by its *own* status, never by its children's: a parent's
 * status is a fact about the parent that the user set, and deriving it would
 * silently overrule them. That does mean a `done` parent leads the slide while
 * carrying an open child directly beneath it — see the note in
 * docs/export-sort.md for why that reads correctly rather than as a
 * contradiction.
 *
 * Pure: no store, no DOM, no dates beyond the items' own — which is what lets
 * both exporters share it.
 */
export function sortItemsForExport(items: TimelineItem[]): TimelineItem[] {
  const { roots } = buildTaskHierarchy(items);
  const flattened: TimelineItem[] = [];

  const visit = (node: TaskNode) => {
    flattened.push(node.item);
    node.children.forEach(visit);
  };
  sortLevel(roots).forEach(visit);

  return flattened;
}
