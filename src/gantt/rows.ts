import type { TaskStatus, TimelineItem } from '../types/timeline';
import { childrenOf, statusOf } from './rollup';

/** One line of the plan, list and timeline alike — they draw the same rows in
 * the same order, which is what lets the grid align them structurally rather
 * than by synchronising two scrolls. */
export interface GanttRowModel {
  item: TimelineItem;
  /** 0 for a top-level item. */
  depth: number;
  /** True when something names this item as its parent. */
  isGroup: boolean;
  /** Direct children, for the sub-task count badge. Counts every child, not
   * just the ones the current search left visible. */
  childCount: number;
  /** The status the row is drawn at: its own, or a group's roll-up. */
  status: TaskStatus;
}

export type StatusFilter = 'all' | TaskStatus;

export interface RowFilter {
  /** Group ids whose children are folded away. */
  collapsed: Record<string, boolean>;
  search: string;
  filter: StatusFilter;
  /** When set, the only rows built are this item's sub-tasks — its children
   * become the top level and the item itself is not drawn. Null is the whole
   * plan. */
  focusId?: string | null;
}

/** Does this item survive the toolbar's search and filter?
 *
 * The status compared is the *effective* one, so filtering to Blocked keeps a
 * group whose children include a blocked task. The search reads the task's own
 * name and nothing else: it used to match an assignee's name too, which now
 * that no row shows one would answer with a set of rows carrying no visible
 * reason for being there. */
function matches(items: TimelineItem[], item: TimelineItem, options: RowFilter): boolean {
  if (options.filter !== 'all' && statusOf(items, item) !== options.filter) return false;

  const query = options.search.trim().toLowerCase();
  if (query === '') return true;
  return item.label.toLowerCase().includes(query);
}

/** The rows to draw, top to bottom.
 *
 * A group survives when any of its descendants does, or when its own name
 * matches — so searching for a phase keeps the phase even though none of its
 * tasks match, and searching for a task keeps the phase it lives under so the
 * result is not orphaned. A collapsed group keeps its own row (and so its
 * roll-up bar and percentage) and drops its children's.
 *
 * Under a focus the same walk starts from one item's children instead of from
 * the plan's roots, and their depth restarts at 0 — a focused branch is drawn
 * as if it were the whole plan, which is the point of focusing on it. The
 * parent itself is left out: it is named in the focus bar above the chart,
 * and drawing its roll-up bar over its own children would put the branch's
 * full span back on a screen asked to show only the parts. */
export function visibleRows(items: TimelineItem[], options: RowFilter): GanttRowModel[] {
  const build = (item: TimelineItem, depth: number): GanttRowModel[] => {
    const children = childrenOf(items, item.id);
    const row: GanttRowModel = {
      item,
      depth,
      isGroup: children.length > 0,
      childCount: children.length,
      status: statusOf(items, item),
    };

    if (children.length === 0) return matches(items, item, options) ? [row] : [];

    const childRows = children.flatMap((child) => build(child, depth + 1));
    if (childRows.length === 0 && !matches(items, item, options)) return [];

    return options.collapsed[item.id] ? [row] : [row, ...childRows];
  };

  if (options.focusId != null) {
    return childrenOf(items, options.focusId).flatMap((child) => build(child, 0));
  }

  const ids = new Set(items.map((item) => item.id));
  // An item whose parent was deleted is a root, exactly as buildTaskHierarchy
  // treats it — nothing is silently dropped for pointing at a missing parent.
  return items
    .filter((item) => item.parentId === undefined || !ids.has(item.parentId))
    .flatMap((item) => build(item, 0));
}

/** The plan a status chip leaves, as items rather than as rows.
 *
 * The same keep-rule visibleRows applies: a task survives when its own
 * effective status matches, a group when it matches or anything under it
 * does — so a kept task always keeps the groups it hangs from, and nothing
 * comes out orphaned.
 *
 * Search, focus and folds are deliberately left out. Those describe a moment
 * of looking — a half-typed query, a branch opened to read it — while a chip
 * is a statement about which part of the plan is being worked with, and it is
 * the one the export is asked to follow (see App's handleExport).
 */
export function itemsForFilter(items: TimelineItem[], filter: StatusFilter): TimelineItem[] {
  if (filter === 'all') return items;

  const keep = (item: TimelineItem): boolean =>
    statusOf(items, item) === filter || childrenOf(items, item.id).some(keep);

  return items.filter(keep);
}
