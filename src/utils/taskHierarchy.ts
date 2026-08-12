import type { TimelineItem } from '../types/timeline';

export interface TaskNode {
  item: TimelineItem;
  depth: number;
  children: TaskNode[];
}

export interface TaskHierarchy {
  /** Top-level items, in their original relative order. An item is a root
   * either because it has no parentId, or because its parentId doesn't
   * match any item in this list (e.g. the real parent was filtered out
   * upstream) — so nothing is ever silently dropped. */
  roots: TaskNode[];
  /** Pre-order flattening of `roots`: every parent immediately followed by
   * all of its descendants, in original relative order. */
  flat: TaskNode[];
}

/** Groups items by parentId into a tree, preserving the input array's
 * relative order at every level. Pure — does not mutate `items`. Shared by
 * the Gantt chart, the export settings list, and the export slide builder
 * so "what is this task's parent/children" is defined exactly once. */
export function buildTaskHierarchy(items: TimelineItem[]): TaskHierarchy {
  const itemIds = new Set(items.map((item) => item.id));
  const childrenByParent = new Map<string, TimelineItem[]>();
  const rootItems: TimelineItem[] = [];

  items.forEach((item) => {
    if (item.parentId !== undefined && itemIds.has(item.parentId)) {
      const siblings = childrenByParent.get(item.parentId) ?? [];
      siblings.push(item);
      childrenByParent.set(item.parentId, siblings);
    } else {
      rootItems.push(item);
    }
  });

  function buildNode(item: TimelineItem, depth: number): TaskNode {
    const children = (childrenByParent.get(item.id) ?? []).map((child) => buildNode(child, depth + 1));
    return { item, depth, children };
  }

  const roots = rootItems.map((item) => buildNode(item, 0));

  const flat: TaskNode[] = [];
  function collect(nodes: TaskNode[]) {
    nodes.forEach((node) => {
      flat.push(node);
      collect(node.children);
    });
  }
  collect(roots);

  return { roots, flat };
}
