import type { TimelineItem } from '../types/timeline';
import { childrenOf, spanOf } from './rollup';

export interface CriticalPath {
  /** Ids of the leaf tasks with no slack. */
  critical: Set<string>;
  /** Days of float before a task starts pushing the plan's end date out.
   * 0 for anything not in the calculation. */
  slackOf: (id: string) => number;
}

/** Critical-path method over the plan's leaf tasks, using their scheduled
 * dates — the handoff's own two passes.
 *
 * Forward: each task's finish is the last day it covers. Backward: a task's
 * late finish is the earliest late start among its successors, less a day, or
 * the project's end when it has none. Slack is late finish minus finish, and
 * a task with none to spare is critical.
 *
 * Groups take no part: they have no dates of their own here (their span is
 * their children's), so a dependency naming a group registers no successor
 * and simply drops out of the calculation — which is what the handoff does
 * with `if (succ[d])`.
 *
 * The backward pass memoises as it goes and marks ids while they are being
 * resolved, so a dependency cycle in the data settles on the project end
 * instead of recursing forever. The handoff assumes a DAG and would hang. */
export function criticalPath(items: TimelineItem[], minDate: Date): CriticalPath {
  const leaves = items.filter((item) => childrenOf(items, item.id).length === 0);
  if (leaves.length === 0) return { critical: new Set(), slackOf: () => 0 };

  const spans = new Map(leaves.map((leaf) => [leaf.id, spanOf(items, leaf, minDate)]));
  const finish = new Map([...spans].map(([id, span]) => [id, span.start + span.len - 1]));
  const successors = new Map<string, string[]>(leaves.map((leaf) => [leaf.id, []]));

  leaves.forEach((leaf) => {
    (leaf.dependencies ?? []).forEach((dependencyId) => {
      successors.get(dependencyId)?.push(leaf.id);
    });
  });

  const projectEnd = Math.max(...finish.values());
  const lateFinish = new Map<string, number>();
  const resolving = new Set<string>();

  const lateFinishOf = (id: string): number => {
    const known = lateFinish.get(id);
    if (known !== undefined) return known;
    if (resolving.has(id)) return projectEnd;

    resolving.add(id);
    const next = successors.get(id) ?? [];
    const value = next.length
      ? Math.min(...next.map((successorId) => lateFinishOf(successorId) - (spans.get(successorId)?.len ?? 0)))
      : projectEnd;
    resolving.delete(id);

    lateFinish.set(id, value);
    return value;
  };

  const critical = new Set<string>();
  leaves.forEach((leaf) => {
    if (lateFinishOf(leaf.id) - (finish.get(leaf.id) ?? 0) <= 0) critical.add(leaf.id);
  });

  return {
    critical,
    slackOf: (id) => {
      const late = lateFinish.get(id);
      return late === undefined ? 0 : late - (finish.get(id) ?? 0);
    },
  };
}
