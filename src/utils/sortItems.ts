import { getTaskStatus, type SortMode, type TaskStatus, type TimelineItem } from '../types/timeline';
import { buildTaskHierarchy, type TaskNode } from './taskHierarchy';

const STATUS_ORDER: Record<TaskStatus, number> = {
  todo: 0,
  in_progress: 1,
  done: 2,
};

function byStart(a: TimelineItem, b: TimelineItem) {
  return new Date(a.start).getTime() - new Date(b.start).getTime();
}

/** Sorts each level's children by start date, recursively. */
function sortChildrenByStart(nodes: TaskNode[]): TaskNode[] {
  return [...nodes]
    .sort((a, b) => byStart(a.item, b.item))
    .map((node) => ({ ...node, children: sortChildrenByStart(node.children) }));
}

function sortByParent(items: TimelineItem[]): TimelineItem[] {
  const { roots } = buildTaskHierarchy(items);
  const result: TimelineItem[] = [];

  // Roots keep their original relative order; only each parent's children
  // (at every depth) are reordered by start date.
  function visit(node: TaskNode) {
    result.push(node.item);
    sortChildrenByStart(node.children).forEach(visit);
  }
  roots.forEach(visit);

  return result;
}

/** Orders items for both the on-screen Gantt chart and export slides,
 * without mutating the input array. */
export function sortItems(items: TimelineItem[], mode: SortMode): TimelineItem[] {
  switch (mode) {
    case 'date':
      return [...items].sort(byStart);
    case 'progress':
      return [...items].sort((a, b) => (a.progress ?? 0) - (b.progress ?? 0));
    case 'parent':
      return sortByParent(items);
    case 'status':
    default:
      return [...items].sort((a, b) => {
        const statusDiff = STATUS_ORDER[getTaskStatus(a)] - STATUS_ORDER[getTaskStatus(b)];
        return statusDiff !== 0 ? statusDiff : byStart(a, b);
      });
  }
}
