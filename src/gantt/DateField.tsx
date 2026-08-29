import { useState } from 'react';
import { isCommittableDate } from './dateEdit';

const DATE_FIELD_STYLE: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 44,
  border: '1px solid hsl(var(--input))',
  borderRadius: 'calc(var(--radius) - 2px)',
  fontSize: 15,
  padding: '0 12px',
  color: 'hsl(var(--foreground))',
  background: 'transparent',
  outline: 'none',
};

interface DateFieldProps {
  id: string;
  /** The committed date — what the task stores, or what a drag is drawing. */
  value: string;
  /** Called only with a date worth storing; see isCommittableDate. */
  onCommit: (iso: string) => void;
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
 * write to the DOM, because it is already what the node says. */
export function DateField({ id, value, onCommit }: DateFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      id={id}
      type="date"
      value={draft ?? value}
      onChange={(event) => {
        const next = event.target.value;
        if (!isCommittableDate(next)) {
          setDraft(next);
          return;
        }
        setDraft(null);
        onCommit(next);
      }}
      onBlur={() => setDraft(null)}
      style={DATE_FIELD_STYLE}
    />
  );
}
