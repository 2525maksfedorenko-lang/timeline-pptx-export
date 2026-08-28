import { useEffect, useRef, useState } from 'react';

import { barHeight, barLeft, barWidth, ROW_HEIGHT_PX, type Span } from './geometry';
import {
  CREATE_DRAG_THRESHOLD_PX,
  CREATE_FIELD_MIN_WIDTH_PX,
  dayAtOffset,
  rowAtOffset,
  spanBetween,
} from './createSurface';
import { DragPill } from './DragPill';

interface CreateSurfaceProps {
  columnWidth: number;
  /** Columns drawn on the canvas — what a drawn edge is clamped to. */
  dayCount: number;
  canvasWidth: number;
  /** "Aug 17" for a column index, for the pill. */
  formatDay: (index: number) => string;
  /** Creates the task, at the dates drawn and beside the row drawn in. Called
   * on Enter with a name typed, and at no other moment — no gesture on this
   * surface creates anything by itself. */
  onCreate: (span: Span, rowIndex: number, name: string) => void;
}

/** The whole grid, as somewhere a task can be drawn rather than filled in.
 *
 * **Why it is the whole grid now.** It used to be one 46px strip under the
 * last row, because a press on the canvas panned it and a drag that created a
 * task anywhere would have been the identical gesture to the one that
 * scrolled. The two are no longer the same gesture: panning by drag has moved
 * to the date header, which is the ruler and the natural thing to pull time
 * along by, and the canvas keeps the wheel, the trackpad and its scrollbars.
 * That frees every free pixel of the grid to mean one thing, so a task is
 * drawn where it belongs instead of at the foot of the plan.
 *
 * **Nothing here creates a task on its own.** A drag draws a ghost, a release
 * opens a field, and only Enter over a typed name makes anything. A press that
 * never moves does nothing at all — over a whole grid a stray click is far
 * likelier than it was over one strip, and a field that opens under every
 * misplaced click is a field that gets in the way. A gesture that lands here
 * by accident costs an Escape, never a row in the plan.
 *
 * The draft lives in this component, like the add row's does in TaskList: it
 * is a keystroke's worth of text with nothing outside the surface interested
 * in it. */
export function CreateSurface({
  columnWidth,
  dayCount,
  canvasWidth,
  formatDay,
  onCreate,
}: CreateSurfaceProps) {
  // The gesture in flight, in whole columns and one row — the same commitment
  // the drop makes, shown before it is made, exactly as a bar drag does it.
  const [gesture, setGesture] = useState<{ anchorDay: number; currentDay: number; row: number } | null>(
    null,
  );
  // What a finished gesture drew, held while it waits for a name.
  const [draft, setDraft] = useState<{ span: Span; row: number } | null>(null);
  const [name, setName] = useState('');
  // The row under the pointer, which is lit while nothing is being drawn. The
  // strip used to say "you can draw here" with a hover fill of its own; a fill
  // over the whole chart would say nothing, so the row says it instead.
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const fieldRef = useRef<HTMLInputElement | null>(null);

  const closeDraft = () => {
    setDraft(null);
    setName('');
  };

  // A press anywhere but the field puts the draft away.
  //
  // `onBlur` alone does not cover this: a press elsewhere on the canvas calls
  // preventDefault to stop the press selecting text, and that also cancels the
  // focus change — so clicking the chart left the field sitting open with the
  // caret still in it. Nothing was ever created by it, but a field that will
  // not go away when you click past it is not a field anyone trusts.
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
    if (draft && trimmed !== '') onCreate(draft.span, draft.row, trimmed);
    closeDraft();
  };

  const beginCreate = (event: React.PointerEvent<HTMLDivElement>) => {
    // The primary button and nothing else. A wheel and a two-finger trackpad
    // scroll are not pointer events at all and never reach this; a right-click
    // and a second finger are turned away here.
    if (event.button !== 0 || !event.isPrimary) return;

    const surface = event.currentTarget;
    const { pointerId } = event;
    const originX = event.clientX;
    // Read fresh on every move rather than captured once: the canvas can
    // scroll under a drag, and a stale left edge would shift the dates.
    const dayAt = (clientX: number) =>
      dayAtOffset(clientX - surface.getBoundingClientRect().left, columnWidth, dayCount);

    // Fixed at the press. A task occupies one row, so the row it is drawn in
    // is the row it was started in — moving up or down mid-drag changes the
    // dates and nothing else, which is what a bar drag does too.
    const row = rowAtOffset(event.clientY - surface.getBoundingClientRect().top, ROW_HEIGHT_PX);
    const anchorDay = dayAt(originX);
    let currentDay = anchorDay;
    let moved = false;

    closeDraft();
    // Stops the press starting a text selection across the rows.
    event.preventDefault();

    // Followed on `window`, not on the surface, so a fast drag that outruns
    // the cursor keeps its grip — the same arrangement a bar drag uses.
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
      setGesture({ anchorDay, currentDay, row });
    };

    const onUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      detach();
      setGesture(null);
      // A press that never crossed the threshold is a click, and a click on
      // the chart is not a request for anything. The strip under the plan
      // could afford to read one as a one-day task, because landing on a 46px
      // lane was already a deliberate act; over the whole grid it would mean
      // every stray click opened a name field.
      if (moved) setDraft({ span: spanBetween(anchorDay, currentDay), row });
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
  const shown = gesture
    ? { span: spanBetween(gesture.anchorDay, gesture.currentDay), row: gesture.row }
    : draft;

  const ghostHeight = barHeight(ROW_HEIGHT_PX);
  const ghostTop = shown ? shown.row * ROW_HEIGHT_PX + (ROW_HEIGHT_PX - ghostHeight) / 2 : 0;
  const fieldWidth = draft
    ? Math.max(barWidth(draft.span.len, columnWidth), CREATE_FIELD_MIN_WIDTH_PX)
    : 0;
  // Held on the canvas at the right-hand end, so a task drawn against the last
  // column is still named in a field that is all there.
  const fieldLeft = draft
    ? Math.min(barLeft(draft.span.start, columnWidth), Math.max(0, canvasWidth - fieldWidth - 2))
    : 0;

  return (
    <>
      <div
        onPointerDown={beginCreate}
        onPointerMove={(event) => {
          const top = event.currentTarget.getBoundingClientRect().top;
          setHoverRow(rowAtOffset(event.clientY - top, ROW_HEIGHT_PX));
        }}
        onPointerLeave={() => setHoverRow(null)}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: canvasWidth,
          bottom: 0,
          // Under the bars, which are drawn at 5 and keep their own presses,
          // and over the two washes below, which are decoration and let every
          // press through to here.
          zIndex: 3,
          cursor: 'crosshair',
          touchAction: 'none',
        }}
      >
        {hoverRow !== null && !shown && (
          <div
            className="gantt-create-row"
            style={{
              position: 'absolute',
              left: 0,
              top: hoverRow * ROW_HEIGHT_PX,
              width: canvasWidth,
              height: ROW_HEIGHT_PX,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* The ghost and the field are drawn over the bars rather than under
          them: a task can now be drawn in a row that already has one, and a
          name field half-hidden behind a bar is not a field. */}
      {shown && (
        <div
          style={{
            position: 'absolute',
            left: barLeft(shown.span.start, columnWidth),
            width: barWidth(shown.span.len, columnWidth),
            top: ghostTop,
            height: ghostHeight,
            // The bar's own shape in the palette's flattest grey: a bar that
            // belongs to no branch yet, which is exactly what it is.
            //
            // The fill is the rule colour rather than the muted wash the todo
            // tone uses, because that wash is the row's own hover colour — the
            // two are the same value, and a ghost filled with it read as an
            // empty field cut into the grid instead of a solid bar lying on it.
            background: 'var(--gantt-rule-strong)',
            border: '1px solid var(--gantt-todo-fill)',
            borderRadius: 5,
            boxSizing: 'border-box',
            pointerEvents: 'none',
            zIndex: 7,
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
          style={{
            position: 'absolute',
            left: fieldLeft,
            width: fieldWidth,
            top: draft.row * ROW_HEIGHT_PX + (ROW_HEIGHT_PX - 30) / 2,
            height: 30,
            boxSizing: 'border-box',
            border: '1px solid var(--gantt-edit-focus)',
            borderRadius: 6,
            background: 'var(--gantt-surface)',
            fontSize: 14,
            padding: '0 10px',
            outline: 'none',
            color: 'var(--gantt-text)',
            cursor: 'text',
            zIndex: 8,
          }}
        />
      )}

      {shown && (
        <DragPill
          left={barLeft(shown.span.start, columnWidth)}
          top={Math.max(0, shown.row * ROW_HEIGHT_PX - 22)}
          label={`${formatDay(shown.span.start)} → ${formatDay(shown.span.start + shown.span.len - 1)}  (${shown.span.len}d)`}
        />
      )}
    </>
  );
}
