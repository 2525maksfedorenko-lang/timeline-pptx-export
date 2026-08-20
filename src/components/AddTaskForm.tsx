import { useState } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { usePeopleStore } from '../store/peopleStore';
import { AssigneeSelect } from './AssigneeSelect';
import { resolveAssignee } from './assigneeSelection';
import { TASK_STATUS_LABELS, type TaskStatus } from '../types/timeline';
import { buildNewTask, isCompleteTask } from '../utils/newTask';
import { buttonClass, INPUT_CLASS } from './systemUi';

const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = (
  Object.keys(TASK_STATUS_LABELS) as TaskStatus[]
).map((value) => ({ value, label: TASK_STATUS_LABELS[value] }));

const DEFAULT_STATUS: TaskStatus = 'todo';

export function AddTaskForm() {
  const addItem = useTimelineStore((state) => state.addItem);
  const people = usePeopleStore((state) => state.people);
  const addPerson = usePeopleStore((state) => state.addPerson);
  const [isOpen, setIsOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [status, setStatus] = useState<TaskStatus>(DEFAULT_STATUS);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [newPersonName, setNewPersonName] = useState('');

  const reset = () => {
    setLabel('');
    setStart('');
    setEnd('');
    setStatus(DEFAULT_STATUS);
    setSelectedAssigneeId('');
    setNewPersonName('');
  };

  const handleCancel = () => {
    reset();
    setIsOpen(false);
  };

  const canAdd = isCompleteTask({ label, start, end, status });

  const handleAdd = async () => {
    if (!canAdd) return;

    const assignee = await resolveAssignee(selectedAssigneeId, newPersonName, people, addPerson);

    addItem(buildNewTask({ label, start, end, status }, assignee ? { assignee } : {}));

    reset();
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonClass('outline', 'default', 'border-dashed max-md:h-11')}
      >
        + Add task
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-3 max-md:w-full max-md:flex-col max-md:items-stretch">
      <div className="flex flex-col gap-1">
        <label htmlFor="add-task-label" className="text-xs font-medium text-muted-foreground">
          Label *
        </label>
        <input
          id="add-task-label"
          autoFocus
          type="text"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Task name"
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="add-task-start" className="text-xs font-medium text-muted-foreground">
          Start *
        </label>
        <input
          id="add-task-start"
          type="date"
          value={start}
          onChange={(event) => setStart(event.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="add-task-end" className="text-xs font-medium text-muted-foreground">
          End *
        </label>
        <input
          id="add-task-end"
          type="date"
          value={end}
          onChange={(event) => setEnd(event.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="add-task-status" className="text-xs font-medium text-muted-foreground">
          Status *
        </label>
        <select
          id="add-task-status"
          value={status}
          onChange={(event) => setStatus(event.target.value as TaskStatus)}
          className={INPUT_CLASS}
        >
          {TASK_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="add-task-assignee" className="text-xs font-medium text-muted-foreground">
          Assignee
        </label>
        <AssigneeSelect
          idPrefix="add-task"
          value={selectedAssigneeId}
          onChange={setSelectedAssigneeId}
          newPersonName={newPersonName}
          onNewPersonNameChange={setNewPersonName}
          placeholderLabel="No assignee"
        />
      </div>

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={!canAdd}
          className={buttonClass('default', 'sm')}
        >
          Add
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className={buttonClass('ghost', 'sm', 'text-muted-foreground')}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
