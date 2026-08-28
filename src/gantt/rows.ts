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
   * sub-tasks and no more. */
  isSubtask: boolean;
  /** The status the row is drawn at: its own, or a group's roll-up. */
  status: TaskStatus;
}

export interface RowFilter {
  /** Group ids whose children are folded away. */
  collapsed: Record<string, boolean>;
}

/** The rows to draw, top to bottom.
 *
 * Every item in the plan gets a row: the screen shows the whole plan, and a
 * fold is the only thing that takes rows away. A collapsed group keeps its own
 * row (and so its roll-up bar and percentage) and drops its children's. */
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

  const ids = new Set(items.map((item) => item.id));
  // An item whose parent was deleted is a root, exactly as buildTaskHierarchy
  // treats it — nothing is silently dropped for pointing at a missing parent.
  return items
    .filter((item) => item.parentId === undefined || !ids.has(item.parentId))
    .flatMap((item) => build(item, 0));
}
