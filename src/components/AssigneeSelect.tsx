import { usePeopleStore } from '../store/peopleStore';
import { INPUT_CLASS } from './systemUi';

/** Sentinel select value for "+ Add new person", distinct from any real
 * person id (a `crypto.randomUUID()`) and from '' (nothing chosen, which
 * the caller reads as "no assignee"). */
export const NEW_PERSON_OPTION = '__new__';

interface AssigneeSelectProps {
  idPrefix: string;
  value: string;
  onChange: (value: string) => void;
  newPersonName: string;
  onNewPersonNameChange: (name: string) => void;
  placeholderLabel?: string;
  /** The field's own box. Defaults to the design system's input contract;
   * the Gantt's Edit Task panel passes the taller 44px field the handoff
   * sets every panel control at. */
  fieldClassName?: string;
}

/** A saved-people dropdown with an inline "+ Add new person" option — shared
 * by the assignee picker on a Gantt bar's comment popup and the "+ Add task"
 * form, so there's exactly one combobox implementation instead of one per
 * caller. Resolving the current (value, newPersonName) pair into an actual
 * assignee (and persisting a brand-new person, if that's what was picked)
 * happens in resolveAssignee (assigneeSelection.ts), called from each
 * caller's own save action. */
export function AssigneeSelect({
  idPrefix,
  value,
  onChange,
  newPersonName,
  onNewPersonNameChange,
  placeholderLabel = 'Select assignee…',
  fieldClassName = INPUT_CLASS,
}: AssigneeSelectProps) {
  const people = usePeopleStore((state) => state.people);

  return (
    <div className="flex flex-col gap-1">
      <select
        id={`${idPrefix}-assignee`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClassName}
      >
        <option value="">{placeholderLabel}</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
        <option value={NEW_PERSON_OPTION}>+ Add new person</option>
      </select>
      {value === NEW_PERSON_OPTION && (
        <input
          type="text"
          autoFocus
          value={newPersonName}
          onChange={(event) => onNewPersonNameChange(event.target.value)}
          placeholder="e.g. Max Fedorenko"
          className={fieldClassName}
        />
      )}
    </div>
  );
}
