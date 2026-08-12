import { useState } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { TASK_STATUS_LABELS, type TaskStatus } from '../types/timeline';

const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = (
  Object.keys(TASK_STATUS_LABELS) as TaskStatus[]
).map((value) => ({ value, label: TASK_STATUS_LABELS[value] }));

const DEFAULT_STATUS: TaskStatus = 'todo';

export function AddTaskForm() {
  const addItem = useTimelineStore((state) => state.addItem);
  const [isOpen, setIsOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [status, setStatus] = useState<TaskStatus>(DEFAULT_STATUS);

  const reset = () => {
    setLabel('');
    setStart('');
    setEnd('');
    setStatus(DEFAULT_STATUS);
  };

  const handleCancel = () => {
    reset();
    setIsOpen(false);
  };

  const canAdd = label.trim() !== '' && start !== '' && end !== '';

  const handleAdd = () => {
    if (!canAdd) return;

    addItem({
      id: crypto.randomUUID(),
      label: label.trim(),
      start,
      end,
      status,
      progress: 0,
      includeInExport: true,
    });

    reset();
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-md border border-dashed border-[#E5E5E1] px-3 py-1.5 text-sm text-slate-500 transition-colors hover:border-[#2A9D90] hover:text-[#2A9D90]"
      >
        + Add task
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border border-[#E5E5E1] bg-white p-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="add-task-label" className="text-xs font-medium text-slate-500">
          Label *
        </label>
        <input
          id="add-task-label"
          autoFocus
          type="text"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Task name"
          className="rounded-md border border-[#E5E5E1] px-2 py-1 text-sm text-[#1E2B38] focus:border-[#2A9D90] focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="add-task-start" className="text-xs font-medium text-slate-500">
          Start *
        </label>
        <input
          id="add-task-start"
          type="date"
          value={start}
          onChange={(event) => setStart(event.target.value)}
          className="rounded-md border border-[#E5E5E1] px-2 py-1 text-sm text-[#1E2B38] focus:border-[#2A9D90] focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="add-task-end" className="text-xs font-medium text-slate-500">
          End *
        </label>
        <input
          id="add-task-end"
          type="date"
          value={end}
          onChange={(event) => setEnd(event.target.value)}
          className="rounded-md border border-[#E5E5E1] px-2 py-1 text-sm text-[#1E2B38] focus:border-[#2A9D90] focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="add-task-status" className="text-xs font-medium text-slate-500">
          Status *
        </label>
        <select
          id="add-task-status"
          value={status}
          onChange={(event) => setStatus(event.target.value as TaskStatus)}
          className="rounded-md border border-[#E5E5E1] px-2 py-1 text-sm text-[#1E2B38] focus:border-[#2A9D90] focus:outline-none"
        >
          {TASK_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="rounded-md bg-[#2A9D90] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#238277] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#2A9D90]"
        >
          Add
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
