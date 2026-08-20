import type { TimelineItem } from '../types/timeline';
import { childrenOf, type Span } from './rollup';
import { dayIndexOf } from './scale';

/** A drag in flight. `days` is already snapped to whole columns, so the
 * preview moves a day at a time rather than following the pointer smoothly —
 * the same commitment the drop makes, shown before it is made. */
export interface DragState {
  id: string;
  mode: 'move' | 'start' | 'end';
  days: number;
}

const isLeaf = (items: TimelineItem[], item: TimelineItem) => childrenOf(items, item.id).length === 0;

/** Every leaf under `id`, at any depth. */
export function descendantLeafIds(items: TimelineItem[], id: string): string[] {
  return childrenOf(items, id).flatMap((child) =>
    isLeaf(items, child) ? [child.id] : descendantLeafIds(items, child.id),
  );
}

/** Groups, deepest first — the order their spans have to be derived in, so a
 * group of groups sees its children's finished spans and not their stored
 * dates. */
function groupsDeepestFirst(items: TimelineItem[]): TimelineItem[] {
  const depthOf = (item: TimelineItem): number => {
    let depth = 0;
    let current = item;
    const seen = new Set<string>([current.id]);
    while (current.parentId !== undefined) {
      const parent = items.find((candidate) => candidate.id === current.parentId);
      if (!parent || seen.has(parent.id)) break;
      seen.add(parent.id);
      current = parent;
      depth += 1;
    }
    return depth;
  };

  return items.filter((item) => !isLeaf(items, item)).sort((a, b) => depthOf(b) - depthOf(a));
}

function deriveGroupSpans(items: TimelineItem[], spans: Map<string, Span>): void {
  groupsDeepestFirst(items).forEach((group) => {
    const children = childrenOf(items, group.id)
      .map((child) => spans.get(child.id))
      .filter((span): span is Span => span !== undefined);
    if (children.length === 0) return;

    const start = Math.min(...children.map((span) => span.start));
    const end = Math.max(...children.map((span) => span.start + span.len));
    spans.set(group.id, { start, len: end - start });
  });
}

/** How far a move can actually go: the asked-for offset, held back so the bar
 * stays on the canvas at both ends. */
function clampMove(days: number, span: Span, totalDays: number): number {
  return Math.max(-span.start, Math.min(totalDays - (span.start + span.len), days));
}

/** Every row's span for this render, with a drag in flight applied.
 *
 * Leaves are laid out first and groups derived from them, which is what makes
 * dragging a group work: the drag shifts its descendant leaves and the group's
 * bar follows, because its span is nothing but their extent. It also means a
 * group can only ever be moved — the handoff hides the resize handles on a
 * group bar for the same reason: there is no group duration to resize, only
 * its children's.
 *
 * A group moves as one rigid block, clamped by the block's own edges rather
 * than leaf by leaf, so a drag that would push one end off the canvas stops
 * the whole group instead of squashing it. */
export function previewSpans(
  items: TimelineItem[],
  minDate: Date,
  totalDays: number,
  drag: DragState | null,
): Map<string, Span> {
  const spans = new Map<string, Span>();

  items
    .filter((item) => isLeaf(items, item))
    .forEach((leaf) => {
      const start = dayIndexOf(leaf.start, minDate);
      spans.set(leaf.id, { start, len: Math.max(1, dayIndexOf(leaf.end, minDate) - start + 1) });
    });
  deriveGroupSpans(items, spans);

  if (drag) {
    const dragged = items.find((item) => item.id === drag.id);
    if (dragged && !isLeaf(items, dragged) && drag.mode === 'move') {
      const groupSpan = spans.get(dragged.id);
      if (groupSpan) {
        const days = clampMove(drag.days, groupSpan, totalDays);
        descendantLeafIds(items, dragged.id).forEach((leafId) => {
          const span = spans.get(leafId);
          if (span) spans.set(leafId, { start: span.start + days, len: span.len });
        });
      }
    } else if (dragged) {
      const span = spans.get(dragged.id);
      if (span) spans.set(dragged.id, resizeLeaf(span, drag, totalDays));
    }
    deriveGroupSpans(items, spans);
  }

  return spans;
}

function resizeLeaf(span: Span, drag: DragState, totalDays: number): Span {
  if (drag.mode === 'move') {
    return { start: span.start + clampMove(drag.days, span, totalDays), len: span.len };
  }
  if (drag.mode === 'start') {
    // The right edge stays put: shortening from the left moves the start in by
    // exactly what the length lost, and a task never shrinks past one day.
    const len = Math.max(1, span.len - drag.days);
    return { start: span.start + span.len - len, len };
  }
  return { start: span.start, len: Math.max(1, span.len + drag.days) };
}

/** How far a committed group move actually shifted, so the same number can be
 * written onto every item beneath it — and onto the group's own stored dates,
 * which nothing draws but the export slides still read. */
export function groupMoveDays(
  items: TimelineItem[],
  minDate: Date,
  totalDays: number,
  drag: DragState,
): number {
  const spans = previewSpans(items, minDate, totalDays, null);
  const groupSpan = spans.get(drag.id);
  return groupSpan ? clampMove(drag.days, groupSpan, totalDays) : 0;
}
