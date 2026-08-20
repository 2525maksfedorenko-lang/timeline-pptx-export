/** The design system's Switch, transcribed.
 *
 * Same rule as `systemUi.ts`: `design-system/components/forms/Switch.jsx` is
 * reference material that nothing in `src/` can import, so the only way to
 * draw the system's switch is to restate it. Every value below is read from
 * that file — 36×20 track, 16px thumb, a 2px transparent border so the track
 * keeps its size under a focus ring, and `--primary` when on against
 * `--input` when off.
 */
import { FOCUS_RING } from './systemUi';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Labels the control for anyone not seeing the label beside it. */
  label: string;
  id?: string;
}

export function Switch({ checked, onCheckedChange, label, id }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={`inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent p-0 shadow-xs transition-colors ${FOCUS_RING} ${
        checked ? 'bg-primary' : 'bg-input'
      }`}
    >
      <span
        className="block h-4 w-4 rounded-full bg-background shadow-lg transition-transform"
        style={{ transform: `translateX(${checked ? 16 : 0}px)` }}
      />
    </button>
  );
}
