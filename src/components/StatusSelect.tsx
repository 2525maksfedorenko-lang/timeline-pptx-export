import { ChevronDown } from 'lucide-react';
import { COLORS, withHash } from '../export/theme';
import {
  statusOptionsFor,
  TASK_STATUS_CHIP,
  TASK_STATUS_LABELS,
  type TaskStatus,
} from '../types/timeline';

// The OS paints the option list and inherits the select's own colours, so a
// tinted dropdown would leave the others looking mislabelled. Both come from
// the token file rather than being written inline.
const OPTION_BG = withHash(COLORS.optionBg);
const OPTION_FG = withHash(COLORS.textOnSurface);

interface StatusSelectProps {
  status: TaskStatus;
  onChange: (status: TaskStatus) => void;
  /** What this chip belongs to, for screen readers — a task's name in a
   * list of them, so "Status: Backend" reads unambiguously. */
  label?: string;
}

/** A task's status as the control that changes it: the product's status chip —
 * a tinted background with dark text and a hairline border — opening its
 * options on click and committing the pick immediately.
 *
 * A native select rather than a hand-built menu — it opens on click, is
 * keyboard- and touch-operable for free, and needs no outside-click
 * handling. Shared by the Gantt row's status column and the settings
 * flyout's task list, so the two can't drift into looking like different
 * controls for the same thing. */
export function StatusSelect({ status, onChange, label }: StatusSelectProps) {
  const chip = TASK_STATUS_CHIP[status];

  return (
    <div className="relative w-full">
      <select
        value={status}
        onChange={(event) => onChange(event.target.value as TaskStatus)}
        className="w-full cursor-pointer appearance-none rounded-md border py-1 pl-2 pr-6 text-left text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        style={{ backgroundColor: chip.bg, color: chip.fg, borderColor: chip.border }}
        aria-label={label ? `Status: ${label}` : `Status: ${TASK_STATUS_LABELS[status]}`}
      >
        {statusOptionsFor(status).map((value) => (
          // Options are painted by the OS menu, which inherits the select's
          // own colors — a tinted dropdown would leave the rest looking
          // mislabelled, so each option resets them.
          <option key={value} value={value} style={{ backgroundColor: OPTION_BG, color: OPTION_FG }}>
            {TASK_STATUS_LABELS[value]}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        strokeWidth={2}
        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 opacity-50"
        style={{ color: chip.fg }}
        aria-hidden="true"
      />
    </div>
  );
}
