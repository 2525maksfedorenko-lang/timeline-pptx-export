import { useRef, useState } from 'react';
import { isCommittableDate } from './dateEdit';

const DATE_FIELD_STYLE: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 44,
  border: '1px solid hsl(var(--input))',
  borderRadius: 'calc(var(--radius) - 2px)',
  padding: '0 12px',
  color: 'hsl(var(--foreground))',
  background: 'transparent',
  outline: 'none',
};

interface DateFieldProps {
  id: string;
  /** The committed date — what the task stores, or what a drag is drawing. */
  value: string;
  /** The one write this field makes: the date it is holding when the edit
   * ends, if that is a date at all and not the one it started from. Not called
   * for a field nobody changed, nor for anything half-typed. */
  onSettle: (iso: string) => void;
  /** A fresh edit is starting. The panel takes the snapshot Escape puts back;
   * this field cannot take it itself, because what has to be restored is the
   * task's *pair* of dates and this field only holds one of them. */
  onEditStart: () => void;
  /** Escape. The field drops whatever it was holding; putting the pair back is
   * the panel's, for the same reason. */
  onCancel: () => void;
}

/** A date input that keeps every state but the finished one to itself.
 *
 * The panel's other controls commit as they are changed, and this one does
 * not, because a date is typed a segment at a time and the values a
 * `<input type="date">` reports along the way are not the date anyone means.
 * Selecting the year and typing 2026 walks through the years 2, 20 and 202,
 * each of them a complete date the plan would dutifully draw a canvas for; and
 * typing 11 into a September deadline passes through January on the way, which
 * `isCommittableDate` cannot tell from a January somebody meant.
 *
 * So nothing is written until the edit ends. In between, the field holds a
 * draft in the same way the name and comment fields do: the field shows what
 * is being typed, and the task keeps the date it had. Type a year badly and
 * click away and the plan never hears about it — the draft is dropped and the
 * field goes back to showing the task, rather than the task being left on a
 * value nobody chose.
 *
 * That is a change of degree, not of kind: the *pair* rule (`withStart` /
 * `withEnd`) already waited for the end of an edit rather than trusting every
 * value that passed the guard, for exactly this reason. The write it runs on
 * now waits with it, so a date reaches the task once, at the moment the person
 * typing it is done — one write, one canvas re-measure, one undoable step.
 *
 * Rendering the draft as the value is also what stops the browser clearing the
 * other segments underneath the one being typed: mid-edit the input reports
 * `''`, and handing `''` straight back is the one thing React does *not*
 * write to the DOM, because it is already what the node says.
 *
 * The end of an edit is a blur, or Enter — which a date field does nothing
 * with otherwise — or a whole date arriving without a keystroke, which is the
 * calendar picker: it hands over the date in one go and leaves the field
 * focused, so nothing else would mark that edit finished.
 *
 * Escape is the other way out, and it is not the same as a blur: a blur keeps
 * what was typed and settles it if it is a date, Escape keeps nothing. It
 * still tells the panel (`onCancel`), because the picker can have settled a
 * date earlier in the same visit to the field. */
export function DateField({ id, value, onSettle, onEditStart, onCancel }: DateFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  // Whether the value now arriving was typed. A change that was not is the
  // calendar picker handing over a whole date.
  const edit = useRef<{ typed: boolean }>({ typed: false });

  /* The draft again, as a ref, because two of the three things that end an
   * edit end it from inside another event: Enter and Escape both call `blur()`
   * on the spot, and the blur handler runs before React has re-rendered with
   * whatever they just set. Read from state, Escape's own settle would still
   * see the draft Escape had just thrown away and write it — which is the one
   * thing Escape exists not to do. The ref is the synchronous truth; the state
   * is what the input renders. */
  const draftRef = useRef<string | null>(null);
  const holdDraft = (next: string | null) => {
    draftRef.current = next;
    setDraft(next);
  };

  /** The edit is over: write the draft if it is a date this field may store
   * and is not simply the date it started from, and drop it either way. */
  const settle = () => {
    const held = draftRef.current;
    holdDraft(null);
    if (held === null || held === value || !isCommittableDate(held)) return;
    onSettle(held);
  };

  return (
    <input
      id={id}
      type="date"
      value={draft ?? value}
      onFocus={onEditStart}
      onKeyDown={(event) => {
        edit.current.typed = true;
        // Enter finishes the edit — the pair rule runs — and gives up the
        // field, which is what it does in the panel's other two. `onBlur`
        // settles again on the way out and finds nothing left to do.
        if (event.key === 'Enter') {
          settle();
          event.currentTarget.blur();
        }
        // Escape throws the edit away instead: the draft goes unwritten —
        // dropping it is what stops the blur below from settling it — and the
        // panel puts the pair back where it was, in case the picker settled a
        // date earlier in this same visit to the field.
        if (event.key === 'Escape') {
          holdDraft(null);
          onCancel();
          event.currentTarget.blur();
        }
      }}
      onChange={(event) => {
        const typed = edit.current.typed;
        edit.current.typed = false;

        const next = event.target.value;
        holdDraft(next);
        // A whole date arriving without a keystroke is the calendar picker,
        // which has nothing more to add and leaves the field focused — so this
        // change is also the end of the edit. Written from `next` in as many
        // words rather than through `settle`, because there is nothing here to
        // decide: the picker only ever hands over whole dates.
        if (!typed && next !== value && isCommittableDate(next)) {
          holdDraft(null);
          onSettle(next);
        }
      }}
      onBlur={settle}
      // The 15px this field is set in lives in the stylesheet rather than
      // here, because it is the one property that has to answer to the
      // breakpoint: under 16px Safari zooms the page on focus. See
      // .gantt-date-field.
      className="gantt-date-field"
      style={DATE_FIELD_STYLE}
    />
  );
}
