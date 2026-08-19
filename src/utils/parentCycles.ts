import type { TimelineItem } from '../types/timeline';

function withoutParent(item: TimelineItem): TimelineItem {
  const next = { ...item };
  delete next.parentId;
  return next;
}

/** The loop written out from `freed`, each task pointing at its parent. */
function describeLoop(loop: TimelineItem[], freed: TimelineItem): string {
  const byId = new Map(loop.map((item) => [item.id, item]));
  const labels: string[] = [];

  let current: TimelineItem | undefined = freed;
  do {
    labels.push(`"${current.label}"`);
    current = current.parentId === undefined ? undefined : byId.get(current.parentId);
  } while (current !== undefined && current.id !== freed.id);

  return [...labels, `"${freed.label}"`].join(' → ');
}

export interface ParentCycleRepair {
  items: TimelineItem[];
  warnings: string[];
}

/** Breaks parent loops — A's parent is B, B's parent is A — by freeing one
 * task in each loop, and says which.
 *
 * A loop is not a cosmetic problem. `buildTaskHierarchy` calls an item a root
 * only when its `parentId` matches nothing in the list, so every task in a loop
 * is somebody's child, no task in it is ever a root, and the whole loop is
 * therefore absent from `roots` — and from the pre-order `flat` walk built out
 * of them. The tasks vanish from the chart, from the export and from every
 * count taken off that tree, without a word. That is why this runs where every
 * task enters the app (see normalizePlanItems) rather than in a parser: the CSV
 * importer cannot produce a loop at all — its Parent column only resolves
 * against tasks that already exist — while a JSON file, or a plan saved before
 * anything checked, can hand one straight to the store.
 *
 * Each task has at most one parent, so loops are disjoint and simple: walking
 * up from any task either reaches a root or arrives somewhere it has already
 * been on this walk. The task freed from each loop is the one that comes first
 * in `items`, whichever task the walk happened to start from — so the same plan
 * is always repaired the same way — and freeing it keeps the rest of the loop
 * nested underneath it rather than scattering them all to the top level.
 *
 * A `parentId` naming a task that isn't here at all is left alone: that is
 * already handled, deliberately and visibly, by buildTaskHierarchy treating it
 * as a root. */
export function breakParentCycles(items: TimelineItem[]): ParentCycleRepair {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const indexById = new Map(items.map((item, index) => [item.id, index]));
  const parentOf = (item: TimelineItem) =>
    item.parentId === undefined ? undefined : itemById.get(item.parentId);

  // 'walking' = on the chain being followed right now; 'settled' = already
  // known to lead to a root or to a loop that has been dealt with.
  const state = new Map<string, 'walking' | 'settled'>();
  const freedIds = new Set<string>();
  const warnings: string[] = [];

  items.forEach((start) => {
    if (state.has(start.id)) return;

    const path: TimelineItem[] = [];
    let current: TimelineItem | undefined = start;
    while (current !== undefined && !state.has(current.id)) {
      state.set(current.id, 'walking');
      path.push(current);
      current = parentOf(current);
    }

    // Stopped on a task this same walk is already standing on: everything from
    // there to the end of the path is the loop.
    const closing = current;
    if (closing !== undefined && state.get(closing.id) === 'walking') {
      const loop = path.slice(path.findIndex((item) => item.id === closing.id));
      const freed = loop.reduce((earliest, item) =>
        (indexById.get(item.id) ?? 0) < (indexById.get(earliest.id) ?? 0) ? item : earliest,
      );

      freedIds.add(freed.id);
      warnings.push(
        loop.length === 1
          ? `"${freed.label}" is its own parent — the link is dropped and it stays a top-level task.`
          : `Circular parent links, each task pointing at its parent: ${describeLoop(loop, freed)}. ` +
            `"${freed.label}" is kept as a top-level task, so the rest still nest under it.`,
      );
    }

    path.forEach((item) => state.set(item.id, 'settled'));
  });

  if (freedIds.size === 0) return { items, warnings };

  return {
    items: items.map((item) => (freedIds.has(item.id) ? withoutParent(item) : item)),
    warnings,
  };
}
