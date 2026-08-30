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
  /** Called with every date worth storing, as it is typed; see isCommittableDate. */
  onCommit: (iso: string) => void;
  /** Called once, with the last date this field committed, when that edit is
   * over — for the rule that ties the task's two dates together. Not called
   * for a field nobody changed. */
  onSettle: (iso: string) => void;
  /** A fresh edit is starting. The panel takes the snapshot Escape puts back;
   * this field cannot take it itself, because what has to be restored is the
   * task's *pair* of dates and this field only holds one of them. */
  onEditStart: () => void;
  /** Escape. The field drops whatever it was holding; putting the pair back is
   * the panel's, for the same reason. */
  onCancel: () => void;
}

/** A date input that keeps its half-typed states to itself.
 *
 * Every other control in the panel commits as it is changed, and this one
 * still does — but a date is typed a segment at a time, and the values a
 * `<input type="date">` reports along the way are not the date anyone means.
 * Selecting the year and typing 2026 walks through the years 2, 20 and 202,
 * each of them a complete date the plan would dutifully draw a canvas for.
 *
 * So the unfinished ones stay here, in the same way the name and comment
 * fields hold a draft: the field shows what is being typed, the task keeps the
 * date it had, and the commit happens on the first value that is a date. The
 * draft is dropped on blur, so a field left half-typed goes back to showing
 * the task rather than sitting on a value nothing stored — and dropped on
 * commit, so a drag on the chart reaches the field again.
 *
 * Rendering the draft as the value is also what stops the browser clearing the
 * other segments underneath the one being typed: mid-edit the input reports
 * `''`, and handing `''` straight back is the one thing React does *not*
 * write to the DOM, because it is already what the node says.
 *
 * A month and a day cannot be held back the same way — the first digit of a
 * two-digit one is already a whole date, and January the 3rd is not a value a
 * guard can tell apart from a date somebody meant. So this field writes its
 * own date as it goes, and says separately when the edit is over: `onSettle`,
 * which is where the rule about the *pair* of dates belongs. Typing 11 into a
 * September deadline passes through January on the way, and only the November
 * it lands on is a deadline the start date has to answer to.
 *
 * The end of an edit is a blur, or Enter — which a date field does nothing
 * with otherwise — or a whole date arriving without a keystroke, which is the
 * calendar picker: it hands over the date in one go and leaves the field
 * focused, so nothing else would mark that edit finished.
 *
 * Escape is the other way out, and it is not the same as a blur: a blur keeps
 * what was typed and settles it, Escape keeps nothing. See `onCancel`. */
export function DateField({ id, value, onCommit, onSettle, onEditStart, onCancel }: DateFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  // What has happened here since the last settle: the date this field wrote,
  // if any, and whether the value now arriving was typed.
  const edit = useRef<{ committed: string | null; typed: boolean }>({ committed: null, typed: false });

  const settle = () => {
    setDraft(null);
    const committed = edit.current.committed;
    if (committed === null) return;
    edit.current.committed = null;
    onSettle(committed);
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
        // Escape throws the edit away instead: the half-typed value goes, the
        // date this field wrote during the edit is *not* settled — clearing
        // `committed` is what stops the blur below from doing it — and the
        // panel puts the pair back where it was.
        if (event.key === 'Escape') {
          setDraft(null);
          edit.current.committed = null;
          onCancel();
          event.currentTarget.blur();
        }
      }}
      onChange={(event) => {
        const typed = edit.current.typed;
        edit.current.typed = false;

        const next = event.target.value;
        if (!isCommittableDate(next)) {
          setDraft(next);
          return;
        }
        setDraft(null);
        edit.current.committed = next;
        onCommit(next);
        if (!typed) settle();
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
