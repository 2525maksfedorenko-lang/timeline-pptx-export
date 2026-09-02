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

/** `id` itself, plus every ancestor up the parentId chain, plus every
 * descendant down it — the whole structural branch a task sits on.
 *
 * Deliberately ignores `dependencies`: those are task *sequencing* ("what
 * this comes after"), a different relation from the parent/child
 * *composition* this walks. Nothing draws them any more — the field is still
 * on `TimelineItem` and still survives an import — so the distinction is now
 * only kept here, which is the reason to keep saying it. Empty when `id` isn't
 * in `items`, which callers should treat as "no branch" rather than "an empty
 * branch". */
export function getRelatedTreeIds(items: TimelineItem[], id: string): Set<string> {
  const itemById = new Map(items.map((item) => [item.id, item]));
  if (!itemById.has(id)) return new Set();

  const ids = new Set<string>([id, ...getDescendantIds(items, id)]);

  // Ancestors: walk parentId links upward. The already-seen check doubles as
  // a cycle guard — malformed data (a's parent is b, b's parent is a) stops
  // the walk instead of looping forever.
  let current = itemById.get(id);
  while (current?.parentId !== undefined) {
    const parent = itemById.get(current.parentId);
    if (!parent || ids.has(parent.id)) break;
    ids.add(parent.id);
    current = parent;
  }

  return ids;
}

/** All descendant ids of `id` (children, grandchildren, ...), not including
 * `id` itself. Empty if `id` isn't in `items` or has no subtasks — the same
 * "has subtasks" check the cascade toggle/delete actions and the Gantt row's
 * eye/trash icons rely on. */
export function getDescendantIds(items: TimelineItem[], id: string): string[] {
  const { flat } = buildTaskHierarchy(items);
  const node = flat.find((candidate) => candidate.item.id === id);
  if (!node) return [];

  const ids: string[] = [];
  function collect(nodes: TaskNode[]) {
    nodes.forEach((child) => {
      ids.push(child.item.id);
      collect(child.children);
    });
  }
  collect(node.children);

  return ids;
}
