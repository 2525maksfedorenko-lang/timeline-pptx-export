import {
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  TASK_STATUS_VALUES,
  type TaskStatus,
} from '../types/timeline';
import { needsDarkText } from '../utils/colorContrast';

interface StatusSelectProps {
  status: TaskStatus;
  onChange: (status: TaskStatus) => void;
  /** What this chip belongs to, for screen readers — a task's name in a
   * list of them, so "Status: Backend" reads unambiguously. */
  label?: string;
}

/** A task's status as the control that changes it: a chip filled with the
 * status's own color, opening the four options on click and committing the
 * pick immediately.
 *
 * A native select rather than a hand-built menu — it opens on click, is
 * keyboard- and touch-operable for free, and needs no outside-click
 * handling. Shared by the Gantt row's status column and the settings
 * flyout's task list, so the two can't drift into looking like different
 * controls for the same thing. */
export function StatusSelect({ status, onChange, label }: StatusSelectProps) {
  const chipColor = `#${TASK_STATUS_COLORS[status]}`;
  const textColor = needsDarkText(chipColor) ? '#1E2B38' : '#FFFFFF';

  return (
    <div className="relative w-full">
      <select
        value={status}
        onChange={(event) => onChange(event.target.value as TaskStatus)}
        className="w-full cursor-pointer appearance-none rounded-full py-1 pl-2 pr-4 text-left text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#2A9D90]/40"
        style={{ backgroundColor: chipColor, color: textColor }}
        aria-label={label ? `Status: ${label}` : `Status: ${TASK_STATUS_LABELS[status]}`}
      >
        {TASK_STATUS_VALUES.map((value) => (
          // Options are painted by the OS menu, which inherits the select's
          // own colors — a chip-colored dropdown would leave three of the
          // four unreadable, so each option resets them.
          <option key={value} value={value} style={{ backgroundColor: '#FFFFFF', color: '#1E2B38' }}>
            {TASK_STATUS_LABELS[value]}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px]"
        style={{ color: textColor }}
        aria-hidden="true"
      >
        ▾
      </span>
    </div>
  );
}
