import { getTaskStatus, type SortMode, type TaskStatus, type TimelineItem } from '../types/timeline';

const STATUS_ORDER: Record<TaskStatus, number> = {
  todo: 0,
  in_progress: 1,
  blocked: 2,
  done: 3,
};

function byStart(a: TimelineItem, b: TimelineItem) {
  return new Date(a.start).getTime() - new Date(b.start).getTime();
}

function sortByParent(items: TimelineItem[]): TimelineItem[] {
  const childrenByParent = new Map<string, TimelineItem[]>();
  const topLevel: TimelineItem[] = [];

  items.forEach((item) => {
    if (item.parentId === undefined) {
      topLevel.push(item);
      return;
    }
    const siblings = childrenByParent.get(item.parentId) ?? [];
    siblings.push(item);
    childrenByParent.set(item.parentId, siblings);
  });

  childrenByParent.forEach((children) => children.sort(byStart));

  const result: TimelineItem[] = [];
  const claimedParentIds = new Set<string>();

  topLevel.forEach((parent) => {
    result.push(parent);
    claimedParentIds.add(parent.id);
    const children = childrenByParent.get(parent.id);
    if (children) result.push(...children);
  });

  // Children whose parent isn't part of this list (e.g. filtered out
  // upstream) would otherwise be silently dropped — keep them, appended
  // in their original relative order.
  childrenByParent.forEach((children, parentId) => {
    if (!claimedParentIds.has(parentId)) result.push(...children);
  });

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
