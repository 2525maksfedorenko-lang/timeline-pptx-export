import { useMemo, useRef, useState } from 'react';
import { getTaskStatus, TASK_STATUS_COLORS, TASK_STATUS_LABELS, type TimelineItem } from '../types/timeline';
import { useTimelineStore } from '../store/timelineStore';
import { usePeopleStore } from '../store/peopleStore';
import { AssigneeSelect } from './AssigneeSelect';
import { resolveAssignee } from './assigneeSelection';
import { ZONE1_WIDTH_PX, ZONE3_WIDTH_PX } from './ganttLayout';
import { getItemBar, shiftIsoDate } from '../export/dateScale';
import { clampProgress } from '../utils/clampProgress';
import { needsDarkText } from '../utils/colorContrast';
import { getInitials } from '../utils/initials';
import { measureTextWidthPx } from '../utils/measureTextWidth';
import { getDescendantIds } from '../utils/taskHierarchy';

interface GanttRowProps {
  item: TimelineItem;
  minDate: Date;
  pxPerDay: number;
  // Zone 2's width (the whole date-scaled timeline strip) — passed down
  // from GanttChart so every row's zone 2 is pixel-identical to the day
  // header above it, regardless of any single task's own bar width.
  timelineWidth: number;
}

interface DragState {
  startX: number;
  startLeft: number;
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.7 18.7 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

/** Plain outline "person" glyph shown as the assignee control when a task
 * has no assignee yet — visible and clickable (opens the same picker as a
 * set assignee's badge), never hidden, so there's always something in that
 * slot of zone 3 to click. */
function PersonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20.5c0-4.7 3.6-7.5 8-7.5s8 2.8 8 7.5" />
    </svg>
  );
}

const ICON_BUTTON_CLASS = 'flex h-4 w-4 flex-shrink-0 items-center justify-center';

const DEFAULT_BAR_COLOR = '#3b82f6';
// Must match how the progress text on the bar is actually styled below
// (`text-[11px] font-semibold`, app font stack), since it's what the fit
// measurement is made against.
const PROGRESS_FONT = '600 11px ui-sans-serif, system-ui, sans-serif';
const PROGRESS_PADDING_PX = 5;

export function GanttRow({ item, minDate, pxPerDay, timelineWidth }: GanttRowProps) {
  const items = useTimelineStore((state) => state.items);
  const updateItem = useTimelineStore((state) => state.updateItem);
  const addComment = useTimelineStore((state) => state.addComment);
  const toggleIncludeInExportCascade = useTimelineStore((state) => state.toggleIncludeInExportCascade);
  const deleteTaskCascade = useTimelineStore((state) => state.deleteTaskCascade);
  const people = usePeopleStore((state) => state.people);
  const addPerson = usePeopleStore((state) => state.addPerson);
  const barRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState | null>(null);

  const [isNotePopupOpen, setIsNotePopupOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  // '' = no change (keep the item's current assignee, if any); a person's
  // id = switch to them; NEW_PERSON_OPTION (see AssigneeSelect) = show the
  // "add new person" field.
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [newPersonName, setNewPersonName] = useState('');

  const { left, width: barWidth } = getItemBar(item, minDate, pxPerDay);
  const progress = clampProgress(item.progress ?? 0);
  const status = getTaskStatus(item);
  const included = item.includeInExport !== false;

  // Progress text rides on the bar: centered in the filled part when that
  // part is measurably wide enough to hold it, otherwise immediately after
  // the fill, in dark text on the gray track. The fit is a real measurement
  // against the fill's own pixel width — a percentage cutoff would say
  // nothing about how wide "100%" renders on a two-day bar.
  const barColor = item.color ?? DEFAULT_BAR_COLOR;
  const progressText = item.progress != null ? `${progress}%` : '';
  const fillWidth = (barWidth * progress) / 100;
  const progressInsideFill =
    progressText !== '' &&
    fillWidth >= measureTextWidthPx(progressText, PROGRESS_FONT) + PROGRESS_PADDING_PX * 2;

  const progressTextStyle: React.CSSProperties = progressInsideFill
    ? {
        left: 0,
        width: fillWidth,
        justifyContent: 'center',
        color: needsDarkText(barColor) ? '#1E2B38' : '#FFFFFF',
      }
    : { left: fillWidth + PROGRESS_PADDING_PX, color: '#334155' };

  const descendantIds = useMemo(() => getDescendantIds(items, item.id), [items, item.id]);
  const hasSubtasks = descendantIds.length > 0;

  const handleToggleVisibility = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (hasSubtasks) {
      toggleIncludeInExportCascade(item.id);
    } else {
      updateItem(item.id, { includeInExport: !included });
    }
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    const confirmed = window.confirm(
      `Delete '${item.label}' and its ${descendantIds.length} subtasks? This can't be undone.`,
    );
    if (!confirmed) return;
    deleteTaskCascade(item.id);
  };

  const handleOpenNotePopup = (event: React.MouseEvent) => {
    event.stopPropagation();
    // Preselect the item's current assignee if they're a known person, so
    // reopening the popup doesn't look like the assignment was lost — but
    // if there's no match (e.g. a name set before this picker existed),
    // default to "no change" rather than guessing.
    const currentAssigneeId = item.assignee
      ? people.find((person) => person.name === item.assignee?.name)?.id
      : undefined;
    setSelectedAssigneeId(currentAssigneeId ?? '');
    setNewPersonName('');
    setIsNotePopupOpen(true);
  };

  const closeNotePopup = () => {
    setIsNotePopupOpen(false);
    setCommentText('');
    setSelectedAssigneeId('');
    setNewPersonName('');
  };

  const canSaveNote = commentText.trim() !== '';

  const handleSaveNote = async () => {
    if (!canSaveNote) return;

    const assignee = await resolveAssignee(selectedAssigneeId, newPersonName, people, addPerson);
    if (assignee) {
      updateItem(item.id, { assignee });
    }

    addComment({
      id: crypto.randomUUID(),
      taskId: item.id,
      body: commentText.trim(),
      createdAt: new Date().toISOString(),
    });

    closeNotePopup();
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    dragState.current = { startX: event.clientX, startLeft: left };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const drag = dragState.current;
      if (!drag || !barRef.current) return;
      const deltaX = moveEvent.clientX - drag.startX;
      barRef.current.style.left = `${drag.startLeft + deltaX}px`;
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      const drag = dragState.current;
      dragState.current = null;
      if (!drag) return;

      const deltaX = upEvent.clientX - drag.startX;
      const deltaDays = Math.round(deltaX / pxPerDay);

      if (deltaDays !== 0) {
        updateItem(item.id, {
          start: shiftIsoDate(item.start, deltaDays),
          end: shiftIsoDate(item.end, deltaDays),
        });
      } else if (barRef.current) {
        barRef.current.style.left = `${left}px`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="flex h-10 border-b border-slate-100" style={{ opacity: included ? 1 : 0.5 }}>
      {/* Zone 1: status dot + label. Fixed width, independent of the bar —
          a label is exactly as visible on a 1-day task as a 3-month one. */}
      <div
        className="sticky left-0 z-10 flex flex-shrink-0 items-center gap-1.5 border-r border-slate-100 bg-white px-2"
        style={{ width: ZONE1_WIDTH_PX }}
      >
        <span
          className="h-2 w-2 flex-shrink-0 rounded-full"
          style={{ backgroundColor: `#${TASK_STATUS_COLORS[status]}` }}
          title={TASK_STATUS_LABELS[status]}
        />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-900" title={item.label}>
          {item.label}
        </span>
      </div>

      {/* Zone 2: the timeline itself. The bar, plus the one piece of text
          that belongs on it — the progress percentage. Both live inside the
          same dragged element so they move together. */}
      <div className="relative flex-shrink-0" style={{ width: timelineWidth }}>
        <div
          ref={barRef}
          onMouseDown={handleMouseDown}
          className="absolute top-1 h-8 cursor-grab select-none active:cursor-grabbing"
          style={{ left, width: barWidth }}
        >
          <div className="h-full overflow-hidden rounded-md bg-slate-200 shadow-sm">
            <div className="h-full" style={{ width: `${progress}%`, backgroundColor: barColor }} />
          </div>

          {progressText && (
            <span
              className="pointer-events-none absolute top-0 flex h-full items-center whitespace-nowrap text-[11px] font-semibold"
              style={progressTextStyle}
            >
              {progressText}
            </span>
          )}
        </div>
      </div>

      {/* Zone 3: assignee, comment, eye, trash. Fixed width and fixed set of
          slots (trash reserves its slot even when hidden) so every row's
          zone 3 is pixel-identical, never overlapping the row above or below
          it. */}
      <div
        className="sticky right-0 z-10 flex flex-shrink-0 items-center gap-1.5 border-l border-slate-100 bg-white px-2"
        style={{ width: ZONE3_WIDTH_PX }}
      >
        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={handleOpenNotePopup}
          className={`${ICON_BUTTON_CLASS} rounded-full ${item.assignee ? '' : 'text-slate-400 hover:text-slate-600'}`}
          style={item.assignee ? { backgroundColor: '#2A9D90' } : undefined}
          title={item.assignee ? item.assignee.name : 'Set assignee'}
          aria-label={item.assignee ? `Assignee: ${item.assignee.name}` : 'Set assignee'}
        >
          {item.assignee ? (
            <span className="text-[9px] font-semibold text-white">{getInitials(item.assignee.name)}</span>
          ) : (
            <PersonIcon />
          )}
        </button>

        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={handleOpenNotePopup}
          className={`${ICON_BUTTON_CLASS} text-slate-700/70 hover:text-slate-900`}
          title="Add comment / assignee"
          aria-label="Add comment / assignee"
        >
          <CommentIcon />
        </button>

        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={handleToggleVisibility}
          className={`${ICON_BUTTON_CLASS} text-slate-700/70 hover:text-slate-900`}
          title={included ? 'Exclude from export' : 'Include in export'}
          aria-label={included ? 'Exclude from export' : 'Include in export'}
        >
          {included ? <EyeIcon /> : <EyeOffIcon />}
        </button>

        {hasSubtasks ? (
          <button
            type="button"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={handleDelete}
            className={`${ICON_BUTTON_CLASS} text-slate-700/70 hover:text-red-600`}
            title="Delete task and subtasks"
            aria-label="Delete task and subtasks"
          >
            <TrashIcon />
          </button>
        ) : (
          <span className={ICON_BUTTON_CLASS} aria-hidden="true" />
        )}

        {isNotePopupOpen && (
          <div
            className="absolute right-0 top-full z-20 mt-1 w-64 rounded-md border border-[#E5E5E1] bg-white p-3 text-left shadow-lg"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col gap-1">
              <label htmlFor={`comment-${item.id}`} className="text-xs font-medium text-slate-500">
                Comment *
              </label>
              <textarea
                id={`comment-${item.id}`}
                autoFocus
                rows={3}
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Add a note about this task…"
                className="resize-none rounded-md border border-[#E5E5E1] px-2 py-1 text-sm text-[#1E2B38] focus:border-[#2A9D90] focus:outline-none"
              />
            </div>

            <div className="mt-2 flex flex-col gap-1">
              <label htmlFor={`row-${item.id}-assignee`} className="text-xs font-medium text-slate-500">
                Assignee
              </label>
              <AssigneeSelect
                idPrefix={`row-${item.id}`}
                value={selectedAssigneeId}
                onChange={setSelectedAssigneeId}
                newPersonName={newPersonName}
                onNewPersonNameChange={setNewPersonName}
                placeholderLabel={item.assignee ? `Keep: ${item.assignee.name}` : 'Select assignee…'}
              />
            </div>

            <div className="mt-3 flex gap-1.5">
              <button
                type="button"
                onClick={() => void handleSaveNote()}
                disabled={!canSaveNote}
                className="rounded-md bg-[#2A9D90] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#238277] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#2A9D90]"
              >
                Save
              </button>
              <button
                type="button"
                onClick={closeNotePopup}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
