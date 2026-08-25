import { useState } from 'react';
import { PanelRightOpen, Trash2, X } from 'lucide-react';
import { MultiSelect, type MultiSelectOption } from '../components/MultiSelect';
import { AssigneeSelect, NEW_PERSON_OPTION } from '../components/AssigneeSelect';
import { buttonBaseClass, buttonClass, CHECKBOX_CLASS, INPUT_SHELL_CLASS } from '../components/systemUi';
import { usePeopleStore } from '../store/peopleStore';
import { useTimelineStore } from '../store/timelineStore';
import { getTaskStatus, TASK_STATUS_VALUES, type TaskStatus, type TimelineItem } from '../types/timeline';
import { progressForStatus } from '../utils/progressForStatus';
import { toHtml } from '../utils/renderMarkdown';
import { PANEL_WIDE_WIDTH_PX, PANEL_WIDTH_PX } from './geometry';
import { childrenOf, type Span } from './rollup';
import { isoAtIndex } from './scale';
import { STATUS_LABEL } from './tone';
import { useGanttViewStore } from './viewStore';

interface EditTaskPanelProps {
  item: TimelineItem;
  minDate: Date;
  spans: Map<string, Span>;
}

/** The tag vocabulary the handoff offers. Widened at render time with
 * whatever tags the plan already carries, so a tag typed before this screen
 * existed is still selectable rather than quietly unrepresentable. */
const HANDOFF_TAGS = ['phase', 'frontend', 'backend', 'design', 'qa', 'blocked'];

/** A panel field: its label above its control, the pair 8px apart.
 *
 * A real `<label for>` rather than the prototype's bare `<span>` — it looks
 * identical and it is the only thing giving these controls a name, since the
 * panel has no placeholder text to fall back on. */
function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label htmlFor={htmlFor} style={{ fontSize: 16, fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

/** A section heading. Four of these stack up as the body scrolls, each
 * sticking under the one before it — which is what the descending z-index is
 * for: a band that scrolled up must pass *under* the bands still above it,
 * not over them. */
function Band({ label, zIndex, topBorder }: { label: string; zIndex: number; topBorder: boolean }) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex,
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        height: 34,
        padding: '0 16px',
        background: 'var(--gantt-band)',
        borderTop: topBorder ? '1px solid hsl(var(--border))' : undefined,
        borderBottom: '1px solid hsl(var(--border))',
      }}
    >
      <span style={{ width: 3, height: 13, borderRadius: 2, background: 'var(--gantt-text-muted)' }} />
      <span className="text-muted-foreground" style={{ fontSize: 12, letterSpacing: '.05em' }}>
        {label}
      </span>
    </div>
  );
}

const SECTION_STYLE: React.CSSProperties = {
  padding: '18px 16px 22px',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
};

/** The panel's own field box: 44px tall at 15px type, on the design system's
 * input border and radius. */
const PANEL_FIELD_CLASS = `${INPUT_SHELL_CLASS} h-11 text-[15px]`;

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

/** Everything about one work item, in a column beside the plan.
 *
 * Opens on a bar click and on a list-row click, and every control commits as
 * it is changed — there is no Save. Four sections in the order a task is
 * usually reasoned about: what it is, when it happens, how it is labelled,
 * and what has been said about it.
 */
export function EditTaskPanel({ item, minDate, spans }: EditTaskPanelProps) {
  const items = useTimelineStore((state) => state.items);
  const comments = useTimelineStore((state) => state.comments);
  const updateItem = useTimelineStore((state) => state.updateItem);
  const addComment = useTimelineStore((state) => state.addComment);
  const deleteTaskCascade = useTimelineStore((state) => state.deleteTaskCascade);
  const toggleIncludeInExportCascade = useTimelineStore((state) => state.toggleIncludeInExportCascade);
  const people = usePeopleStore((state) => state.people);
  const addPerson = usePeopleStore((state) => state.addPerson);

  const panelWide = useGanttViewStore((state) => state.panelWide);
  const togglePanelWide = useGanttViewStore((state) => state.togglePanelWide);
  const select = useGanttViewStore((state) => state.select);

  const [assigneeValue, setAssigneeValue] = useState(
    () => people.find((person) => person.name === item.assignee?.name)?.id ?? '',
  );
  const [newPersonName, setNewPersonName] = useState('');
  const [commentDraft, setCommentDraft] = useState('');

  const isGroup = childrenOf(items, item.id).length > 0;
  const span = spans.get(item.id);
  const included = item.includeInExport !== false;
  const itemComments = comments.filter((comment) => comment.taskId === item.id);

  const tagOptions: MultiSelectOption[] = [
    ...new Set([...HANDOFF_TAGS, ...items.flatMap((candidate) => candidate.tags ?? [])]),
  ].map((tag) => ({ value: tag, label: tag }));

  const predecessorOptions: MultiSelectOption[] = items
    .filter((candidate) => candidate.id !== item.id)
    .map((candidate) => ({ value: candidate.id, label: candidate.label }));

  /** Picking someone already saved, or clearing the field. */
  const commitAssignee = (value: string) => {
    if (value === '') {
      updateItem(item.id, { assignee: undefined });
      return;
    }
    const person = people.find((candidate) => candidate.id === value);
    if (person) updateItem(item.id, { assignee: { name: person.name } });
  };

  /** Saving a name nobody in the list has yet. The select lands on the new
   * person rather than back on the placeholder, so the field says who the
   * task now belongs to instead of looking as if nothing was saved. */
  const commitNewPerson = async () => {
    const trimmed = newPersonName.trim();
    if (trimmed === '') return;
    const person = await addPerson(trimmed);
    updateItem(item.id, { assignee: { name: person.name } });
    setAssigneeValue(person.id);
    setNewPersonName('');
  };

  const handleDelete = () => {
    const descendants = childrenOf(items, item.id).length;
    const confirmed = window.confirm(
      descendants > 0
        ? `Delete '${item.label}' and its sub-tasks? This can't be undone.`
        : `Delete '${item.label}'? This can't be undone.`,
    );
    if (!confirmed) return;
    deleteTaskCascade(item.id);
    select(null);
  };

  const handleAddComment = () => {
    const body = commentDraft.trim();
    if (body === '') return;
    addComment({
      id: crypto.randomUUID(),
      taskId: item.id,
      body,
      createdAt: new Date().toISOString(),
    });
    setCommentDraft('');
  };

  return (
    <div
      className="bg-card text-card-foreground"
      style={{
        width: panelWide ? PANEL_WIDE_WIDTH_PX : PANEL_WIDTH_PX,
        flex: 'none',
        borderLeft: '1px solid hsl(var(--border))',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          height: 56,
          padding: '0 8px 0 18px',
          borderBottom: '1px solid hsl(var(--border))',
        }}
      >
        <span style={{ flex: 1, minWidth: 0, fontSize: 18, fontWeight: 500, letterSpacing: '-.01em' }}>
          Edit Task
        </span>
        {/* The handoff's third header action — a "view as JSON" `<>` button —
            is left out: its own README lists it as a stub whose behaviour is
            undefined, and a button that does nothing is worse than no button. */}
        <button
          type="button"
          onClick={togglePanelWide}
          title={panelWide ? 'Collapse panel' : 'Expand panel'}
          aria-label={panelWide ? 'Collapse panel' : 'Expand panel'}
          className={buttonBaseClass('ghost', 'h-8 w-8 shrink-0 text-muted-foreground')}
        >
          <PanelRightOpen size={17} strokeWidth={1.7} />
        </button>
        <button
          type="button"
          onClick={() => select(null)}
          title="Close"
          aria-label="Close"
          className={buttonBaseClass('ghost', 'h-8 w-8 shrink-0 text-muted-foreground')}
        >
          <X size={17} strokeWidth={1.7} />
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        <Band label="DETAILS" zIndex={6} topBorder={false} />
        <div style={SECTION_STYLE}>
          <Field label="Name" htmlFor={`panel-${item.id}-name`}>
            <input
              id={`panel-${item.id}-name`}
              value={item.label}
              onChange={(event) => updateItem(item.id, { label: event.target.value })}
              className={PANEL_FIELD_CLASS}
            />
          </Field>

          <Field label="Status" htmlFor={`panel-${item.id}-status`}>
            <select
              id={`panel-${item.id}-status`}
              value={getTaskStatus(item)}
              onChange={(event) => {
                const next = event.target.value as TaskStatus;
                updateItem(item.id, { status: next, progress: progressForStatus(next) ?? item.progress });
              }}
              // A group's own status is stored and exported, but the plan
              // draws its children's roll-up — so the control stays usable
              // and says which of the two it is changing.
              title={isGroup ? 'Sub-tasks decide the status shown on the plan' : undefined}
              className={PANEL_FIELD_CLASS}
            >
              {TASK_STATUS_VALUES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </Field>

          {/* One assignee, not the handoff's list of them: a task in this app
              remembers a single person. */}
          <Field label="Assignee" htmlFor={`panel-${item.id}-assignee`}>
            <AssigneeSelect
              idPrefix={`panel-${item.id}`}
              value={assigneeValue}
              onChange={(value) => {
                setAssigneeValue(value);
                if (value !== NEW_PERSON_OPTION) commitAssignee(value);
              }}
              newPersonName={newPersonName}
              onNewPersonNameChange={setNewPersonName}
              placeholderLabel="Select assignee"
              fieldClassName={PANEL_FIELD_CLASS}
            />
            {assigneeValue === NEW_PERSON_OPTION && (
              <button
                type="button"
                onClick={() => void commitNewPerson()}
                disabled={newPersonName.trim() === ''}
                className={buttonClass('secondary', 'sm', 'self-start')}
              >
                Add person
              </button>
            )}
          </Field>
        </div>

        <Band label="PLANNING" zIndex={5} topBorder />
        <div style={SECTION_STYLE}>
          <Field label="Start Date" htmlFor={`panel-${item.id}-start`}>
            <input
              id={`panel-${item.id}-start`}
              type="date"
              value={span ? isoAtIndex(minDate, span.start) : item.start}
              disabled={isGroup}
              onChange={(event) => {
                if (!event.target.value) return;
                // Moving the start keeps the deadline where it is, so the
                // task's length is what changes.
                updateItem(item.id, { start: event.target.value });
              }}
              style={{ ...DATE_FIELD_STYLE, opacity: isGroup ? 0.5 : 1 }}
            />
          </Field>
          <Field label="Deadline" htmlFor={`panel-${item.id}-end`}>
            <input
              id={`panel-${item.id}-end`}
              type="date"
              value={span ? isoAtIndex(minDate, span.start + span.len - 1) : item.end}
              disabled={isGroup}
              onChange={(event) => {
                if (!event.target.value) return;
                updateItem(item.id, { end: event.target.value });
              }}
              style={{ ...DATE_FIELD_STYLE, opacity: isGroup ? 0.5 : 1 }}
            />
          </Field>

          <Field label="Predecessors" htmlFor={`panel-${item.id}-predecessors`}>
            <MultiSelect
              options={predecessorOptions}
              value={item.dependencies ?? []}
              onValueChange={(value) => updateItem(item.id, { dependencies: value })}
              placeholder="Select predecessors"
              ariaLabel="Predecessors"
              id={`panel-${item.id}-predecessors`}
              className="min-h-11 text-[15px]"
            />
          </Field>

          {/* The handoff's "Archived" flag has no counterpart in this app's
              model; the flag a task here actually carries is whether it
              reaches the deck. Same control, the meaning this plan has. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              id={`panel-export-${item.id}`}
              type="checkbox"
              checked={included}
              onChange={() => {
                if (isGroup) toggleIncludeInExportCascade(item.id);
                else updateItem(item.id, { includeInExport: !included });
              }}
              className={`${CHECKBOX_CLASS} h-5 w-5`}
            />
            <label
              htmlFor={`panel-export-${item.id}`}
              className="text-[15px] font-normal text-muted-foreground"
            >
              Include in export
            </label>
          </div>

          {/* Why a group's dates are not editable here. A leaf needs no such
              line: its fields say what they are by being usable. */}
          {isGroup && (
            <span className="text-muted-foreground" style={{ fontSize: 12 }}>
              Rolled up from sub-tasks
            </span>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleDelete}
              title="Delete task"
              aria-label="Delete task"
              className={buttonBaseClass(
                'outline',
                'h-12 w-[68px] border-destructive/40 text-destructive hover:bg-destructive/10',
              )}
            >
              <Trash2 size={19} strokeWidth={1.7} />
            </button>
          </div>
        </div>

        <Band label="TAGS" zIndex={4} topBorder />
        <div style={{ ...SECTION_STYLE, gap: 8 }}>
          <label htmlFor={`panel-${item.id}-tags`} style={{ fontSize: 16, fontWeight: 500 }}>
            Tags
          </label>
          <MultiSelect
            id={`panel-${item.id}-tags`}
            options={tagOptions}
            value={item.tags ?? []}
            onValueChange={(value) => updateItem(item.id, { tags: value })}
            placeholder="Select tags"
            ariaLabel="Tags"
            className="min-h-11 text-[15px]"
          />
        </div>

        <Band label="COMMENTS" zIndex={3} topBorder />
        <div style={{ ...SECTION_STYLE, padding: '18px 16px 28px', gap: 12 }}>
          <label htmlFor={`panel-${item.id}-comment`} style={{ fontSize: 16, fontWeight: 500 }}>
            Comments
          </label>
          <textarea
            id={`panel-${item.id}-comment`}
            value={commentDraft}
            onChange={(event) => setCommentDraft(event.target.value)}
            placeholder="Add a comment..."
            className={`${INPUT_SHELL_CLASS} min-h-[92px] text-[15px]`}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleAddComment}
              disabled={commentDraft.trim() === ''}
              className={buttonBaseClass('secondary', 'h-11 gap-2 px-4 text-[15px] font-medium')}
            >
              + Add Comment
            </button>
          </div>

          {itemComments.length === 0 ? (
            <span className="text-muted-foreground" style={{ fontSize: 15 }}>
              No comments yet
            </span>
          ) : (
            itemComments.map((comment) => (
              <div
                key={comment.id}
                style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: '1px solid hsl(var(--border))' }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  {/* The handoff heads each comment with its author and an
                      avatar of their initials. A comment in this app records
                      no author, so the date carries the line alone rather
                      than a name being invented for it. */}
                  <span className="text-muted-foreground" style={{ fontSize: 12.5, fontWeight: 600 }}>
                    {new Date(comment.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span
                    style={{ fontSize: 14, lineHeight: 1.45, overflowWrap: 'break-word' }}
                    className="[&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                    dangerouslySetInnerHTML={{ __html: toHtml(comment.body) }}
                  />
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
