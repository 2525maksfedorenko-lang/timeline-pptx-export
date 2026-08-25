import type { TaskComment, TimelineItem } from '../types/timeline';
import type { PlanNotice } from './planNotice';
import { getDescendantIds } from './taskHierarchy';

/** One branch of a plan, lifted out as a plan of its own.
 *
 * A copy, never a view onto the original: every task and every comment gets a
 * fresh id, so editing one plan cannot reach the other. Nothing here touches
 * the plan it was taken from. */
export interface BranchCopy {
  /** The branch: the parent, which becomes a top-level task, and every
   * descendant under it to any depth, still nesting exactly as it did. */
  items: TimelineItem[];
  /** Every comment on a copied task, re-pointed at the copy. */
  comments: TaskComment[];
  /** How many dependency links named a task the branch does not contain.
   * Those cannot come along — there is nothing left for them to point at — so
   * they are dropped, and counted here for whoever has to say so. */
  droppedDependencies: number;
}

/** Copies `rootId` and everything under it into a standalone plan.
 *
 * Pure: `items` and `comments` are read, never written. Null when `rootId`
 * isn't in `items`, which callers should treat as "no branch" rather than as
 * an empty one — the same contract getRelatedTreeIds keeps. */
export function copyBranch(
  items: TimelineItem[],
  comments: TaskComment[],
  rootId: string,
): BranchCopy | null {
  if (!items.some((item) => item.id === rootId)) return null;

  const branchIds = new Set([rootId, ...getDescendantIds(items, rootId)]);
  // In the order the plan already had them. Nothing here reorders anything:
  // the tree is rebuilt from parentId wherever it is drawn, so keeping the
  // original order is what keeps sibling order the same as on screen.
  const pairs = items
    .filter((item) => branchIds.has(item.id))
    .map((item) => ({ item, copy: { ...item, id: crypto.randomUUID() } }));

  const newIdOf = new Map(pairs.map(({ item, copy }) => [item.id, copy.id]));
  let droppedDependencies = 0;

  pairs.forEach(({ item, copy }) => {
    // The parent it was hanging from is not in this plan, so it stops hanging
    // from anything: the branch's own root is the new plan's root.
    if (item.id === rootId) delete copy.parentId;
    else if (item.parentId !== undefined) copy.parentId = newIdOf.get(item.parentId);

    if (item.dependencies === undefined) return;

    // A link to a task outside the branch has nothing left to point at, so it
    // goes; one inside is re-pointed at that task's copy.
    const kept = item.dependencies.flatMap((depId) => newIdOf.get(depId) ?? []);
    droppedDependencies += item.dependencies.length - kept.length;
    if (kept.length === 0) delete copy.dependencies;
    else copy.dependencies = kept;
  });

  const copiedComments = comments
    .filter((comment) => newIdOf.has(comment.taskId))
    .map((comment) => ({
      ...comment,
      id: crypto.randomUUID(),
      taskId: newIdOf.get(comment.taskId) ?? comment.taskId,
    }));

  return {
    items: pairs.map(({ copy }) => copy),
    comments: copiedComments,
    droppedDependencies,
  };
}

/** What to call a plan named after the task it was made from, when the plan
 * library may already hold that name.
 *
 * The plain label wherever it is free, and the label with a number after it
 * where it isn't — the same thing a file manager does with a second copy. The
 * switcher lists plans by name alone, so two plans called "Design" would be
 * two rows nobody can tell apart. */
export function uniquePlanName(base: string, taken: string[]): string {
  const existing = new Set(taken);
  if (!existing.has(base)) return base;

  let suffix = 2;
  while (existing.has(`${base} ${suffix}`)) suffix += 1;
  return `${base} ${suffix}`;
}

/** What the new plan has to say for itself about the links it could not bring,
 * or nothing at all when it brought them all.
 *
 * Only the loss is reported. A copy that lost nothing is a copy that turned
 * out exactly as asked, and a card saying so on every branch anyone ever
 * lifted out would be a card nobody reads. */
export function droppedDependencyNotice(count: number, parentLabel: string): PlanNotice | null {
  if (count === 0) return null;

  return {
    headline: `Some links were dropped when this plan was made from "${parentLabel}".`,
    lines: [
      count === 1
        ? 'One dependency pointed at a task outside the branch, and this plan holds the branch and nothing else.'
        : `${count} dependencies pointed at tasks outside the branch, and this plan holds the branch and nothing else.`,
    ],
    // A fact rather than a hint: it is what says the copy cost the original
    // nothing, so it is worth its line on a phone too.
    fact: 'The plan it was copied from still has every task and every link it had.',
  };
}
