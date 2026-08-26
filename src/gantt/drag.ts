import type { TimelineItem } from '../types/timeline';
import type { Span } from './geometry';
import { dayIndexOf } from './scale';

/** A drag in flight. `days` is already snapped to whole columns, so the
 * preview moves a day at a time rather than following the pointer smoothly —
 * the same commitment the drop makes, shown before it is made. */
export interface DragState {
  id: string;
  mode: 'move' | 'start' | 'end';
  days: number;
}

/** How far a move can actually go: the asked-for offset, held back so the bar
 * stays on the canvas at both ends. */
function clampMove(days: number, span: Span, totalDays: number): number {
  return Math.max(-span.start, Math.min(totalDays - (span.start + span.len), days));
}

/** Every row's span for this render, with a drag in flight applied.
 *
 * One rule for every item: a span is that item's own two dates. A phase is not
 * a derived thing here — it is a task that happens to have tasks under it, and
 * it is drawn from the dates it stores exactly as they are drawn on the slide.
 *
 * So a drag moves the one bar it grabbed and nothing else: dragging a phase
 * does not carry its tasks, and moving a task does not stretch the phase over
 * it. A phase whose dates no longer cover its work draws that way, which is
 * the plan saying something true rather than the screen tidying it away. */
export function previewSpans(
  items: TimelineItem[],
  minDate: Date,
  totalDays: number,
  drag: DragState | null,
): Map<string, Span> {
  const spans = new Map<string, Span>();

  items.forEach((item) => {
    const start = dayIndexOf(item.start, minDate);
    spans.set(item.id, { start, len: Math.max(1, dayIndexOf(item.end, minDate) - start + 1) });
  });

  if (drag) {
    const span = spans.get(drag.id);
    if (span) spans.set(drag.id, dragged(span, drag, totalDays));
  }

  return spans;
}

function dragged(span: Span, drag: DragState, totalDays: number): Span {
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
