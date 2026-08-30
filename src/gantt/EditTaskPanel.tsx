import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { buttonBaseClass, CHECKBOX_CLASS, INPUT_SHELL_CLASS } from '../components/systemUi';
import { useTimelineStore } from '../store/timelineStore';
import { useIsMobile } from '../utils/useIsMobile';
import { getTaskStatus, TASK_STATUS_VALUES, type TaskStatus, type TimelineItem } from '../types/timeline';
import { progressForStatus } from '../utils/progressForStatus';
import { toHtml } from '../utils/renderMarkdown';
import { DateField } from './DateField';
import { withEnd, withStart } from './dateEdit';
import { PANEL_WIDTH_PX, type Span } from './geometry';
import { confirmTaskDeletion } from './confirmDelete';
import { isGroup } from './rollup';
import { isoAtIndex } from './scale';
import { STATUS_LABEL } from './tone';
import { useGanttViewStore } from './viewStore';

interface EditTaskPanelProps {
  item: TimelineItem;
  minDate: Date;
  spans: Map<string, Span>;
}

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

/** A section heading. Three of these stack up as the body scrolls, each
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
 * input border and radius.
 *
 * `max-md:text-base` is the iOS Safari zoom guard the input contract already
 * carries (see INPUT_CLASS in systemUi.ts) and which this size override would
 * otherwise have dropped: below 16px Safari zooms the page when the field
 * takes focus, and on this screen that means the chart behind the panel
 * arriving at a scale nobody chose. */
const PANEL_FIELD_CLASS = `${INPUT_SHELL_CLASS} h-11 text-[15px] max-md:text-base`;

/** Everything about one work item, in a column beside the plan.
 *
 * Opens on a bar click and on a list-row click, and every control commits as
 * it is changed — there is no Save. Three sections in the order a task is
 * usually reasoned about: what it is, when it happens, and what has been said
 * about it.
 */
export function EditTaskPanel({ item, minDate, spans }: EditTaskPanelProps) {
  const items = useTimelineStore((state) => state.items);
  const comments = useTimelineStore((state) => state.comments);
  const updateItem = useTimelineStore((state) => state.updateItem);
  const addComment = useTimelineStore((state) => state.addComment);
  const deleteTaskCascade = useTimelineStore((state) => state.deleteTaskCascade);
  const toggleIncludeInExportCascade = useTimelineStore((state) => state.toggleIncludeInExportCascade);
  const select = useGanttViewStore((state) => state.select);
  const isMobile = useIsMobile();

  const [commentDraft, setCommentDraft] = useState('');

  const isBranch = isGroup(items, item.id);
  const span = spans.get(item.id);

  // The pair both date fields show: the drawn span, so a date being dragged on
  // the chart reads here as it is dropped; off a drag it is the item's own two
  // dates. With one exception — between a field's first keystroke and the end
  // of that edit the task can hold a deadline before its start (see DateField),
  // and previewSpans draws that clamped to one day. The clamp is what the plan
  // can draw, not what the task says, so there the item's own dates win and
  // each field goes on showing the date it holds.
  const drawn = span
    ? { start: isoAtIndex(minDate, span.start), end: isoAtIndex(minDate, span.start + span.len - 1) }
    : null;
  const shown = drawn && item.start <= item.end ? drawn : { start: item.start, end: item.end };
  const included = item.includeInExport !== false;
  const itemComments = comments.filter((comment) => comment.taskId === item.id);

  const handleDelete = () => {
    if (!confirmTaskDeletion(items, item)) return;
    deleteTaskCascade(item.id);
    // Unconditional, unlike the menu's: this panel is only ever open on the
    // task it just deleted.
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
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        // A 348px column beside the plan, or the whole screen over it. There
        // is no width between the two that works: at 375px the column would
        // leave the chart 27px, which is not a chart. So below the breakpoint
        // the panel stops being a column at all and becomes the screen — it
        // already has a title and a close button of its own, which is
        // everything a sheet needs to be one.
        //
        // `100dvh` rather than `100vh`: on iOS Safari the layout viewport runs
        // on under the address bar, and a panel measured against it would put
        // its last field and its Add Comment button behind that bar.
        ...(isMobile
          ? { position: 'fixed' as const, top: 0, left: 0, right: 0, height: '100dvh', zIndex: 50 }
          : {
              width: PANEL_WIDTH_PX,
              flex: 'none',
              borderLeft: '1px solid hsl(var(--border))',
            }),
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
        {/* Close is the header's only action. The handoff's other two — a
            widen toggle and a "view as JSON" `<>` button — are left out: the
            panel reads at one width, and the README lists the second as a
            stub whose behaviour is undefined. */}
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
              // Status is the one thing still rolled up: a group's own is
              // stored and exported, while the plan draws its children's — so
              // the control stays usable and says which of the two it sets.
              // Its dates, unlike its status, are simply its own.
              title={isBranch ? 'Sub-tasks decide the status shown on the plan' : undefined}
              className={PANEL_FIELD_CLASS}
            >
              {TASK_STATUS_VALUES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </Field>

        </div>

        <Band label="PLANNING" zIndex={5} topBorder />
        <div style={SECTION_STYLE}>
          {/* Each field writes its own date as it is typed, and the rule that
              ties the two together runs once the edit is over — with the date
              the field settled on, so the pair is read fresh rather than off
              this render. */}
          <Field label="Start Date" htmlFor={`panel-${item.id}-start`}>
            <DateField
              id={`panel-${item.id}-start`}
              value={shown.start}
              onCommit={(start) => updateItem(item.id, { start })}
              onSettle={(start) => updateItem(item.id, withStart(item, start))}
            />
          </Field>
          <Field label="Deadline" htmlFor={`panel-${item.id}-end`}>
            <DateField
              id={`panel-${item.id}-end`}
              value={shown.end}
              onCommit={(end) => updateItem(item.id, { end })}
              onSettle={(end) => updateItem(item.id, withEnd(item, end))}
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
                if (isBranch) toggleIncludeInExportCascade(item.id);
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

        <Band label="COMMENTS" zIndex={4} topBorder />
        <div style={{ ...SECTION_STYLE, padding: '18px 16px 28px', gap: 12 }}>
          <label htmlFor={`panel-${item.id}-comment`} style={{ fontSize: 16, fontWeight: 500 }}>
            Comments
          </label>
          <textarea
            id={`panel-${item.id}-comment`}
            value={commentDraft}
            onChange={(event) => setCommentDraft(event.target.value)}
            placeholder="Add a comment..."
            className={`${INPUT_SHELL_CLASS} min-h-[92px] text-[15px] max-md:text-base`}
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
