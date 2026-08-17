import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getTaskStatus, type TaskStatus, type TimelineItem } from '../types/timeline';
import { StatusSelect } from './StatusSelect';
import { buildNewTask, isCompleteTask, type NewTaskFields } from '../utils/newTask';

/** Where the menu opens, in viewport coordinates — the point the pointer
 * was released at. */
export interface MenuAnchor {
  x: number;
  y: number;
}

interface BarActionMenuProps {
  item: TimelineItem;
  anchor: MenuAnchor;
  onChangeStatus: (status: TaskStatus) => void;
  onAddSubtask: (task: TimelineItem) => void;
  onClose: () => void;
}

const MENU_WIDTH_PX = 260;
// The menu is clamped to stay on screen; this is what the clamp assumes it
// might grow to (the subtask form is the tall state), and the panel scrolls
// if it somehow exceeds it.
const MENU_MAX_HEIGHT_PX = 340;
const VIEWPORT_MARGIN_PX = 8;

const FIELD_CLASS =
  'rounded-md border border-[#E5E5E1] px-2 py-1 text-sm text-[#1E2B38] focus:border-[#2A9D90] focus:outline-none';
const FIELD_LABEL_CLASS = 'text-xs font-medium text-slate-500';

/** The small menu a click on a task's bar opens: change the status right
 * there, or add a subtask under it.
 *
 * Portaled to <body> and positioned `fixed` at the release point, because
 * the chart's scroll container clips its own overflow — a menu rendered in
 * the row would be cut off at the bottom of the chart and at its right
 * edge. Closing is unconditional (outside click, Escape, Cancel): the
 * subtask draft lives only as long as the menu, and the status change has
 * already been committed by the time it can be lost. */
export function BarActionMenu({ item, anchor, onChangeStatus, onAddSubtask, onClose }: BarActionMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  // A subtask starts life spanning its parent, which is both a sensible
  // default and always a valid range — the dates are editable right here
  // before it's created.
  const [draft, setDraft] = useState<NewTaskFields>({
    label: '',
    start: item.start,
    end: item.end,
    status: 'todo',
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    // Capture phase, for the same reason GanttChart's popup handler uses it:
    // the row's own icon buttons stopPropagation() their mousedown, so a
    // bubble-phase listener never hears about a click on the eye or the
    // trash and the menu would sit there open behind the action it fired.
    document.addEventListener('mousedown', handlePointerDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown, true);
    };
  }, [onClose]);

  const setField = <K extends keyof NewTaskFields>(field: K, value: NewTaskFields[K]) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const handleAdd = () => {
    if (!isCompleteTask(draft)) return;
    // parentId is what makes this a subtask; no parent picker, because the
    // bar that opened this menu is the answer.
    onAddSubtask(buildNewTask(draft, { parentId: item.id }));
    onClose();
  };

  const left = Math.min(anchor.x, window.innerWidth - MENU_WIDTH_PX - VIEWPORT_MARGIN_PX);
  const top = Math.min(anchor.y, window.innerHeight - MENU_MAX_HEIGHT_PX - VIEWPORT_MARGIN_PX);

  return createPortal(
    <div
      ref={menuRef}
      role="dialog"
      aria-label={`Actions for ${item.label}`}
      className="fixed z-50 overflow-y-auto rounded-md border border-[#E5E5E1] bg-white p-3 shadow-lg"
      style={{
        left: Math.max(VIEWPORT_MARGIN_PX, left),
        top: Math.max(VIEWPORT_MARGIN_PX, top),
        width: MENU_WIDTH_PX,
        maxHeight: MENU_MAX_HEIGHT_PX,
      }}
    >
      <p className="mb-2 truncate text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>

      <div className="flex flex-col gap-1">
        <span className={FIELD_LABEL_CLASS}>Change status</span>
        {/* The same chip as the status column and the settings list — a
            pick here commits immediately, no submit step. */}
        <StatusSelect status={getTaskStatus(item)} onChange={onChangeStatus} label={item.label} />
      </div>

      {isAddingSubtask ? (
        <div className="mt-3 flex flex-col gap-2 border-t border-[#E5E5E1] pt-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={`subtask-label-${item.id}`} className={FIELD_LABEL_CLASS}>
              Label *
            </label>
            <input
              id={`subtask-label-${item.id}`}
              autoFocus
              type="text"
              value={draft.label}
              onChange={(event) => setField('label', event.target.value)}
              placeholder="Subtask name"
              className={FIELD_CLASS}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <label htmlFor={`subtask-start-${item.id}`} className={FIELD_LABEL_CLASS}>
                Start *
              </label>
              <input
                id={`subtask-start-${item.id}`}
                type="date"
                value={draft.start}
                onChange={(event) => setField('start', event.target.value)}
                className={`${FIELD_CLASS} min-w-0`}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <label htmlFor={`subtask-end-${item.id}`} className={FIELD_LABEL_CLASS}>
                End *
              </label>
              <input
                id={`subtask-end-${item.id}`}
                type="date"
                value={draft.end}
                onChange={(event) => setField('end', event.target.value)}
                className={`${FIELD_CLASS} min-w-0`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className={FIELD_LABEL_CLASS}>Status</span>
            <StatusSelect
              status={draft.status}
              onChange={(status) => setField('status', status)}
              label="new subtask"
            />
          </div>

          <div className="mt-1 flex gap-1.5">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!isCompleteTask(draft)}
              className="rounded-md bg-[#2A9D90] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#238277] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#2A9D90]"
            >
              Add
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAddingSubtask(true)}
          className="mt-3 w-full rounded-md border border-dashed border-[#E5E5E1] px-3 py-1.5 text-sm text-slate-500 transition-colors hover:border-[#2A9D90] hover:text-[#2A9D90]"
        >
          + Add subtask
        </button>
      )}
    </div>,
    document.body,
  );
}
