import type { TaskStatus, TimelineItem } from '../types/timeline';
import { childrenOf, isSubtask, statusOf } from './rollup';

/** One line of the plan, list and timeline alike — they draw the same rows in
 * the same order, which is what lets the grid align them structurally rather
 * than by synchronising two scrolls. */
export interface GanttRowModel {
  item: TimelineItem;
  /** 0 for a top-level item. */
  depth: number;
  /** True when something names this item as its parent. */
  isGroup: boolean;
  /** Direct children, for the sub-task count badge. */
  childCount: number;
  /** True when this row is itself somebody's sub-task. A row that is one
   * offers no "add sub-task" control: the screen creates one level of
   * sub-tasks and no more. Not the same question as `depth`, which restarts
   * at 0 under a focus — a focused parent's children are drawn at the top
   * level and are still sub-tasks. */
  isSubtask: boolean;
  /** The status the row is drawn at: its own, or a group's roll-up. */
  status: TaskStatus;
}

export interface RowFilter {
  /** Group ids whose children are folded away. */
  collapsed: Record<string, boolean>;
  /** When set, the only rows built are this item's sub-tasks — its children
   * become the top level and the item itself is not drawn. Null is the whole
   * plan. */
  focusId?: string | null;
}

/** The rows to draw, top to bottom.
 *
 * Every item in the plan gets a row: the screen shows the whole plan, and the
 * only things that take rows away are a fold and a focus. A collapsed group
 * keeps its own row (and so its roll-up bar and percentage) and drops its
 * children's.
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
      isSubtask: isSubtask(items, item.id),
      status: statusOf(items, item),
    };

    if (children.length === 0 || options.collapsed[item.id]) return [row];

    return [row, ...children.flatMap((child) => build(child, depth + 1))];
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
