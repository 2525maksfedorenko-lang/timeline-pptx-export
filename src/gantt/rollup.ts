import { getTaskStatus, type TaskStatus, type TimelineItem } from '../types/timeline';
import { dayIndexOf } from './scale';

/* What a "group" is on this screen, and what a group's own numbers are.
 *
 * The handoff models groups explicitly (`kind: "task" | "group"`, with no
 * dates, status or progress of their own — all three "derived, never
 * stored"). This app has no `kind`: an item is a group exactly when some
 * other item names it as `parentId`. Everything below turns that into the
 * handoff's three roll-ups.
 *
 * Consequence worth knowing: a parent item in this app *does* carry its own
 * start/end/status/progress, and the export slides still read them. On screen
 * those four are ignored in favour of the roll-up, which is the handoff's
 * rule. A parent whose stored dates disagree with its children's extent
 * therefore draws one span here and another on the slide.
 */

/** Direct children of `id`, in list order. */
export function childrenOf(items: TimelineItem[], id: string): TimelineItem[] {
  return items.filter((item) => item.parentId === id);
}

/** True when anything names `item` as its parent. */
export function isGroup(items: TimelineItem[], id: string): boolean {
  return items.some((item) => item.parentId === id);
}

export interface Span {
  /** Column index of the first day. */
  start: number;
  /** Days covered, at least 1. */
  len: number;
}

/** A leaf's own span, in column indices. */
function ownSpan(item: TimelineItem, minDate: Date): Span {
  const start = dayIndexOf(item.start, minDate);
  const end = dayIndexOf(item.end, minDate);
  return { start, len: Math.max(1, end - start + 1) };
}

/** A row's span: its own dates for a leaf, and for a group the extent of its
 * children — recursively, so a group of groups spans its grandchildren too.
 * A group whose children have all been filtered out of view still spans them:
 * the roll-up is a fact about the plan, not about what is on screen. */
export function spanOf(items: TimelineItem[], item: TimelineItem, minDate: Date): Span {
  const children = childrenOf(items, item.id);
  if (children.length === 0) return ownSpan(item, minDate);

  const spans = children.map((child) => spanOf(items, child, minDate));
  const start = Math.min(...spans.map((span) => span.start));
  const end = Math.max(...spans.map((span) => span.start + span.len));
  return { start, len: end - start };
}

/** A group's percentage: its children's, weighted by how long each one runs,
 * so a two-week task at 50% moves the number twice as far as a one-week task
 * at 50%. Leaves report their own. */
export function progressOf(items: TimelineItem[], item: TimelineItem, minDate: Date): number {
  const children = childrenOf(items, item.id);
  if (children.length === 0) return item.progress ?? 0;

  const weighted = children.reduce(
    (totals, child) => {
      const { len } = spanOf(items, child, minDate);
      return {
        days: totals.days + len,
        points: totals.points + len * progressOf(items, child, minDate),
      };
    },
    { days: 0, points: 0 },
  );

  return Math.round(weighted.points / (weighted.days || 1));
}

/** A group's status, in the handoff's order of precedence: one blocked child
 * blocks the group, all-done is done, anything under way is in progress, and
 * an untouched group is to do. Leaves report their own. */
export function statusOf(items: TimelineItem[], item: TimelineItem): TaskStatus {
  const children = childrenOf(items, item.id);
  if (children.length === 0) return getTaskStatus(item);

  const statuses = children.map((child) => statusOf(items, child));
  if (statuses.includes('blocked')) return 'blocked';
  if (statuses.every((status) => status === 'done')) return 'done';
  if (statuses.includes('in_progress') || children.some((child) => (child.progress ?? 0) > 0)) {
    return 'in_progress';
  }
  return 'todo';
}
