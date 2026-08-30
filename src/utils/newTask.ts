import type { TaskStatus, TimelineItem } from '../types/timeline';

/** What any "create a task" form collects. Assignee, parent and the rest are
 * extras a particular form may add on top — see buildNewTask. */
export interface NewTaskFields {
  label: string;
  start: string;
  end: string;
  status: TaskStatus;
}

/** A brand-new TimelineItem from a form's fields.
 *
 * The point is the defaults: a fresh id, no progress yet, and included in
 * the export. Those belong to "creating a task", not to whichever form did
 * the collecting — the toolbar's Add task and a bar's Add subtask both go
 * through here so a task made one way can't quietly differ from one made
 * the other. `extras` carries what only one caller knows: an assignee, or
 * the parentId that makes the new task a subtask. */
export function buildNewTask(fields: NewTaskFields, extras: Partial<TimelineItem> = {}): TimelineItem {
  return {
    id: crypto.randomUUID(),
    label: fields.label.trim(),
    start: fields.start,
    end: fields.end,
    status: fields.status,
    progress: 0,
    includeInExport: true,
    ...extras,
  };
}
