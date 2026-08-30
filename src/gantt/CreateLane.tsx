import { useEffect, useRef, useState } from 'react';

import {
  ADD_ROW_HEIGHT_PX,
  barHeight,
  barLeft,
  barWidth,
  ROW_HEIGHT_PX,
  type Span,
} from './geometry';
import {
  CREATE_DRAG_THRESHOLD_PX,
  CREATE_FIELD_MIN_WIDTH_PX,
  dayAtOffset,
  spanBetween,
} from './createLane';
import { DragPill } from './DragPill';
import { CREATE_LANE_ATTRIBUTE } from './useScrollPanes';

interface CreateLaneProps {
  /** The lane's top edge: the foot of the last row. */
  top: number;
  columnWidth: number;
  /** Columns drawn on the canvas — what a drawn edge is clamped to. */
  dayCount: number;
  canvasWidth: number;
  /** The canvas's own height — what the date pill measures "off the chart"
   * against when it decides which side of the ghost to sit on. */
  canvasHeight: number;
  /** "Aug 17" for a column index, for the pill. */
  formatDay: (index: number) => string;
  /** Creates the task. Called on Enter with a name typed, and at no other
   * moment — no gesture on this lane creates anything by itself. */
  onCreate: (span: Span, name: string) => void;
}

/** The strip under the last row, where a task is drawn rather than filled in.
 *
 * **Why here and nowhere else.** The body is one scroller and a press on it
 * pans the canvas; that is how the whole plan is moved around. A drag that
 * created a task anywhere on the grid would be the identical gesture to the
 * one that scrolls, and the two would have to be told apart by a modifier or
 * by direction — either of which turns every mis-aimed scroll into a task.
 * So creating is given a lane of its own, and it is not an arbitrary one: the
 * task column already ends in an "Add task" row, and the timeline already
 * reserves exactly that row's height beneath the last bar. This is that row,
 * continued across the chart — the same line, doing the same job, on the half
 * of the screen where dates live. Panning is left untouched everywhere else.
 *
 * **Nothing here creates a task on its own.** A press draws a ghost, a release
 * opens a field, and only Enter over a typed name makes anything. A gesture
 * that lands here by accident costs an Escape, never a row in the plan.
 *
 * The draft lives in this component, like the add row's does in TaskList: it
 * is a keystroke's worth of text with nothing outside the lane interested in
 * it. */
export function CreateLane({
  top,
  columnWidth,
  dayCount,
  canvasWidth,
  canvasHeight,
  formatDay,
  onCreate,
}: CreateLaneProps) {
  // The gesture in flight, in whole columns — the same commitment the drop
  // makes, shown before it is made, exactly as a bar drag does it.
  const [gesture, setGesture] = useState<{ anchorDay: number; currentDay: number } | null>(null);
  // The span a finished gesture drew, held while it waits for a name.
  const [draft, setDraft] = useState<Span | null>(null);
  const [name, setName] = useState('');
  const fieldRef = useRef<HTMLInputElement | null>(null);

  const closeDraft = () => {
    setDraft(null);
    setName('');
  };

  // A press anywhere but the field puts the draft away.
  //
  // `onBlur` alone does not cover this: the canvas's grab-pan calls
  // preventDefault on its pointerdown to stop the press selecting text, and
  // that also cancels the focus change — so clicking the chart left the field
  // sitting open with the caret still in it. Nothing was ever created by it,
  // but a field that will not go away when you click past it is not a field
  // anyone trusts.
  useEffect(() => {
    if (!draft) return;
    const onDown = (event: PointerEvent) => {
      if (event.target !== fieldRef.current) closeDraft();
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [draft]);

  const commitDraft = () => {
    const trimmed = name.trim();
    // Enter over an empty field cancels, the same rule the list's add row
    // follows. Enter and Escape then agree about an untouched field, and an
    // abandoned gesture cannot leave a nameless bar behind.
    if (draft && trimmed !== '') onCreate(draft, trimmed);
    closeDraft();
  };

  const beginCreate = (event: React.PointerEvent<HTMLDivElement>) => {
    // The primary button and nothing else. A wheel and a two-finger trackpad
    // scroll are not pointer events at all and never reach this; a right-click
    // and a second finger are turned away here.
    if (event.button !== 0 || !event.isPrimary) return;

    const lane = event.currentTarget;
    const { pointerId } = event;
    const originX = event.clientX;
    // Read fresh on every move rather than captured once: the canvas can
    // scroll under a drag, and a stale left edge would shift the dates.
    const dayAt = (clientX: number) =>
      dayAtOffset(clientX - lane.getBoundingClientRect().left, columnWidth, dayCount);

    const anchorDay = dayAt(originX);
    let currentDay = anchorDay;
    let moved = false;

    closeDraft();
    setGesture({ anchorDay, currentDay });
    // Stops the press starting a text selection across the rows.
    event.preventDefault();

    // Followed on `window`, not on the lane, so a fast drag that outruns the
    // cursor keeps its grip — the same arrangement a bar drag uses.
    const detach = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };

    const onMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      if (!moved && Math.abs(moveEvent.clientX - originX) < CREATE_DRAG_THRESHOLD_PX) return;
      moved = true;
      currentDay = dayAt(moveEvent.clientX);
      setGesture({ anchorDay, currentDay });
    };

    const onUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      detach();
      setGesture(null);
      // A press that never crossed the threshold is a click, and a click draws
      // the one day it was made on.
      setDraft(spanBetween(anchorDay, moved ? currentDay : anchorDay));
    };

    const onCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId !== pointerId) return;
      detach();
      setGesture(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  };

  // The ghost stands through both halves of the gesture: it follows the drag,
  // and it stays under the field so the dates being named are still on screen.
  const shown = gesture ? spanBetween(gesture.anchorDay, gesture.currentDay) : draft;

  const ghostHeight = barHeight(ROW_HEIGHT_PX);
  const fieldWidth = draft
    ? Math.max(barWidth(draft.len, columnWidth), CREATE_FIELD_MIN_WIDTH_PX)
    : 0;
  // Held on the canvas at the right-hand end, so a task drawn against the last
  // column is still named in a field that is all there.
  const fieldLeft = draft
    ? Math.min(barLeft(draft.start, columnWidth), Math.max(0, canvasWidth - fieldWidth - 2))
    : 0;

  return (
    <>
      <div
        // Marks the lane as owning its own press: the grab-pan refuses to
        // start here, so drawing a task and scrolling the canvas can never
        // both run on one gesture.
        {...{ [CREATE_LANE_ATTRIBUTE]: '' }}
        className="gantt-create-lane"
        onPointerDown={beginCreate}
        title="Drag to create a task"
        style={{
          position: 'absolute',
          left: 0,
          top,
          width: canvasWidth,
          height: ADD_ROW_HEIGHT_PX,
          // The same rule that separates the add row in the task column, so
          // the line runs unbroken across the seam and the two halves read as
          // one row.
          borderTop: '1px solid var(--gantt-rule-soft)',
          boxSizing: 'border-box',
          zIndex: 5,
          cursor: 'crosshair',
          touchAction: 'none',
        }}
      >
        {shown && (
          <div
            style={{
              position: 'absolute',
              left: barLeft(shown.start, columnWidth),
              width: barWidth(shown.len, columnWidth),
              top: (ADD_ROW_HEIGHT_PX - ghostHeight) / 2,
              height: ghostHeight,
              // The bar's own shape in the palette's flattest grey: a bar that
              // belongs to no branch yet, which is exactly what it is.
              //
              // The fill is the rule colour rather than the muted wash the
              // todo tone uses, because that wash is the lane's own hover
              // colour — the two are the same value, and a ghost filled with
              // it read as an empty field cut into the strip instead of a
              // solid bar lying on it.
              background: 'var(--gantt-rule-strong)',
              border: '1px solid var(--gantt-todo-fill)',
              borderRadius: 5,
              boxSizing: 'border-box',
              pointerEvents: 'none',
            }}
          />
        )}

        {draft && (
          <input
            ref={fieldRef}
            type="text"
            autoFocus
            placeholder="Task name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitDraft();
              if (event.key === 'Escape') closeDraft();
            }}
            // Clicking away discards the draft, as the add row's field does.
            onBlur={closeDraft}
            aria-label="New task name"
            className="gantt-field"
            style={{
              position: 'absolute',
              left: fieldLeft,
              width: fieldWidth,
              top: (ADD_ROW_HEIGHT_PX - 30) / 2,
              height: 30,
              boxSizing: 'border-box',
              border: '1px solid var(--gantt-edit-focus)',
              borderRadius: 6,
              background: 'var(--gantt-surface)',
              padding: '0 10px',
              outline: 'none',
              color: 'var(--gantt-text)',
              cursor: 'text',
            }}
          />
        )}
      </div>

      {/* Anchored on the ghost, which is what the dates describe — and which
          is also where the name field sits once the gesture is released. The
          pill clearing the ghost is the same thing as the pill clearing the
          field, so there is one rule rather than two. */}
      {shown && (
        <DragPill
          left={barLeft(shown.start, columnWidth)}
          anchorTop={top + (ADD_ROW_HEIGHT_PX - ghostHeight) / 2}
          anchorHeight={ghostHeight}
          canvasHeight={canvasHeight}
          label={`${formatDay(shown.start)} → ${formatDay(shown.start + shown.len - 1)}  (${shown.len}d)`}
        />
      )}
    </>
  );
}
