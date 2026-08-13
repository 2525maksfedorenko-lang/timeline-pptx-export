import type { Person } from '../store/peopleStore';

// Sentinel select value for "+ Add new person", distinct from any real
// person id (a crypto.randomUUID()) and from '' (a neutral "nothing chosen"
// value — the caller decides what that means: "keep the current assignee"
// in GanttRow's popup, "no assignee" in AddTaskForm).
export const NEW_PERSON_OPTION = '__new__';

/** Turns an AssigneeSelect's (value, newPersonName) pair into an actual
 * assignee, persisting a brand-new person via addPerson when that's what
 * was picked. Returns null for "no selection made" — callers treat that as
 * "leave the assignee as it is" (GanttRow) or simply "no assignee"
 * (AddTaskForm), since a freshly-created task has nothing to leave alone. */
export async function resolveAssignee(
  value: string,
  newPersonName: string,
  people: Person[],
  addPerson: (name: string) => Promise<Person>,
): Promise<{ name: string } | null> {
  if (value === NEW_PERSON_OPTION) {
    const trimmed = newPersonName.trim();
    if (trimmed === '') return null;
    const person = await addPerson(trimmed);
    return { name: person.name };
  }

  if (value !== '') {
    const person = people.find((candidate) => candidate.id === value);
    if (person) return { name: person.name };
  }

  return null;
}
