import type { TaskStatus, TimelineItem } from '../types/timeline';
import type { Person } from '../store/peopleStore';
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
  /** Needed only to match a search against an assignee's full name. */
  people: Person[];
}

/** Does this item survive the toolbar's search and filter?
 *
 * The status compared is the *effective* one, so filtering to Blocked keeps a
 * group whose children include a blocked task. The search reads the task's
 * name and its assignee's name — the handoff searches `people`, which in this
 * app's model is the single `assignee`. */
function matches(items: TimelineItem[], item: TimelineItem, options: RowFilter): boolean {
  if (options.filter !== 'all' && statusOf(items, item) !== options.filter) return false;

  const query = options.search.trim().toLowerCase();
  if (query === '') return true;
  if (item.label.toLowerCase().includes(query)) return true;
  return item.assignee?.name.toLowerCase().includes(query) ?? false;
}

/** The rows to draw, top to bottom.
 *
 * A group survives when any of its descendants does, or when its own name
 * matches — so searching for a phase keeps the phase even though none of its
 * tasks match, and searching for a task keeps the phase it lives under so the
 * result is not orphaned. A collapsed group keeps its own row (and so its
 * roll-up bar and percentage) and drops its children's. */
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

  const ids = new Set(items.map((item) => item.id));
  // An item whose parent was deleted is a root, exactly as buildTaskHierarchy
  // treats it — nothing is silently dropped for pointing at a missing parent.
  return items
    .filter((item) => item.parentId === undefined || !ids.has(item.parentId))
    .flatMap((item) => build(item, 0));
}
