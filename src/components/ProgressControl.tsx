import { useState } from 'react';
import { clampProgress } from '../utils/clampProgress';

interface ProgressControlProps {
  /** The committed figure, 0-100. */
  value: number;
  /** Called with a whole percentage in 0-100 — never with anything else, so
   * callers can write it straight to the store. */
  onChange: (next: number) => void;
  /** Prefix for the field's id, so more than one of these on a screen keeps
   * its label pointing at its own input. */
  idPrefix: string;
}

// The slider moves in fives: a drag is a rough setting ("about half"), and
// five is fine enough to land on the round numbers people actually use while
// still being reachable by dragging. The number field takes any whole percent,
// which is where 37 comes from.
const SLIDER_STEP = 5;

/** A whole percentage read from typed text, or null when the text isn't a
 * number at all — which includes the empty field, and is why an empty field
 * commits nothing rather than committing 0 or NaN. */
function readTyped(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;

  // Rounded and clamped rather than rejected: 12.7 and 150 are both something
  // a person meant, and the honest answer is to take the nearest figure this
  // control can hold and show it back to them.
  return clampProgress(Math.round(parsed));
}

/** Progress as a slider and a number field, over one value.
 *
 * The two are the same control at two grains — the slider for "about there",
 * the field for an exact figure — so they share a value rather than each
 * holding one: moving the slider rewrites the field, typing moves the slider.
 *
 * Presentational: it holds no store and no task, only the number and a way to
 * report a new one, which is what lets the bar menu own the policy around it
 * (see progressForStatus) and keeps this liftable on its own. */
export function ProgressControl({ value, onChange, idPrefix }: ProgressControlProps) {
  // What the field currently reads, while that differs from the committed
  // figure — null the rest of the time, when the field simply shows `value`.
  // This is what lets someone clear the field and think better of it: the
  // emptiness lives here, never in the task.
  const [typed, setTyped] = useState<string | null>(null);

  const commit = (next: number) => {
    if (next !== value) onChange(next);
  };

  const fieldId = `${idPrefix}-progress`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-xs font-medium text-muted-foreground">
        Progress
      </label>

      <div className="flex items-center gap-2">
        {/* h-11 is the point of the row's height: the visible track stays the
            browser's own few pixels, and the 44px box around it is the part a
            thumb can actually hit. accent-primary paints the fill and the knob
            in the brand navy without replacing the native control, so keyboard
            support, focus ring and the platform's own feel all survive. */}
        <input
          type="range"
          min={0}
          max={100}
          step={SLIDER_STEP}
          value={value}
          onChange={(event) => {
            // A drag is a fresh answer, so whatever half-typed text was in the
            // field stops standing for anything.
            setTyped(null);
            commit(Number(event.target.value));
          }}
          aria-label="Progress"
          className="h-11 min-w-0 flex-1 cursor-pointer accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />

        <div className="flex flex-shrink-0 items-center gap-1">
          {/* text-base below the breakpoint, like every other field in the app:
              iOS Safari zooms the page when a field under 16px takes focus.
              The spin buttons are hidden because the slider beside it is the
              nudge control, and two of them in a 260px menu is clutter. */}
          <input
            id={fieldId}
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            step={1}
            value={typed ?? String(value)}
            onChange={(event) => {
              const text = event.target.value;
              setTyped(text);
              const parsed = readTyped(text);
              if (parsed !== null) commit(parsed);
            }}
            // Leaving the field puts the committed figure back on screen: an
            // empty field is someone who cleared it and changed their mind,
            // and "150" is a figure this control already clamped to 100 — in
            // both cases what the field should now read is the task's own
            // number, not what was left in the box.
            onBlur={() => setTyped(null)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            className="w-14 rounded-md border border-border px-2 py-1 text-sm text-foreground [appearance:textfield] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11 max-md:text-base [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span aria-hidden="true" className="text-xs text-muted-foreground">
            %
          </span>
        </div>
      </div>
    </div>
  );
}
