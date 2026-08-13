import { useMemo, useRef, useState } from 'react';
import { getTaskStatus, TASK_STATUS_COLORS, TASK_STATUS_LABELS, type TimelineItem } from '../types/timeline';
import { useTimelineStore } from '../store/timelineStore';
import { getItemBar, shiftIsoDate } from '../export/dateScale';
import { clampProgress } from '../utils/clampProgress';
import { getInitials } from '../utils/initials';
import { getDescendantIds } from '../utils/taskHierarchy';

interface GanttRowProps {
  item: TimelineItem;
  minDate: Date;
  pxPerDay: number;
}

interface DragState {
  startX: number;
  startLeft: number;
}

// Real pixel dimensions of the icon-group controls (eye/comment/trash
// buttons + assignee badge), matching their actual Tailwind sizes (h-4 w-4
// = 16px, gap-1 = 4px) — used to decide whether they fit inside a bar's
// real pixel width, never a "narrow bar" percentage guess (see
// iconsOverflow below).
const ICON_BUTTON_SIZE_PX = 16;
const ICON_GROUP_GAP_PX = 4;
const ICON_GROUP_EDGE_PADDING_PX = 4;
// Gap between the bar's right edge and the icon group when it's moved
// outside the bar.
const OUTSIDE_ICON_GROUP_GAP_PX = 6;

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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function GanttRow({ item, minDate, pxPerDay }: GanttRowProps) {
  const items = useTimelineStore((state) => state.items);
  const updateItem = useTimelineStore((state) => state.updateItem);
  const addComment = useTimelineStore((state) => state.addComment);
  const toggleIncludeInExportCascade = useTimelineStore((state) => state.toggleIncludeInExportCascade);
  const deleteTaskCascade = useTimelineStore((state) => state.deleteTaskCascade);
  const barRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState | null>(null);

  const [isNotePopupOpen, setIsNotePopupOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [assigneeName, setAssigneeName] = useState('');

  const { left, width } = getItemBar(item, minDate, pxPerDay);
  const progress = clampProgress(item.progress ?? 0);
  const status = getTaskStatus(item);
  const included = item.includeInExport !== false;

  const descendantIds = useMemo(() => getDescendantIds(items, item.id), [items, item.id]);
  const hasSubtasks = descendantIds.length > 0;

  // eye + comment are always present; trash and the assignee badge only
  // join the group when applicable — count them the same way whether they
  // end up rendered inside the bar or moved outside it.
  const iconCount = 2 + (hasSubtasks ? 1 : 0) + (item.assignee ? 1 : 0);
  const iconGroupWidth =
    iconCount * ICON_BUTTON_SIZE_PX + (iconCount - 1) * ICON_GROUP_GAP_PX + ICON_GROUP_EDGE_PADDING_PX;
  const iconsOverflow = width < iconGroupWidth;

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
    setIsNotePopupOpen(true);
  };

  const closeNotePopup = () => {
    setIsNotePopupOpen(false);
    setCommentText('');
    setAssigneeName('');
  };

  const canSaveNote = commentText.trim() !== '';

  const handleSaveNote = () => {
    if (!canSaveNote) return;

    const trimmedAssignee = assigneeName.trim();
    if (trimmedAssignee !== '') {
      updateItem(item.id, { assignee: { name: trimmedAssignee } });
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

  // When the icon group doesn't fit inside the bar, it's rendered once as a
  // sibling to the right of the bar instead of absolutely-positioned inside
  // it — same buttons/handlers either way, only the wrapping position
  // changes, so each control is built once here and placed in exactly one
  // of the two spots below.
  const assigneeBadge = item.assignee && (
    <span
      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#2A9D90] text-[9px] font-semibold text-white ${iconsOverflow ? '' : 'ml-1'}`}
      title={item.assignee.name}
    >
      {getInitials(item.assignee.name)}
    </span>
  );

  const insideIconClass = (position: string) =>
    `absolute ${position} top-1/2 z-10 flex h-4 w-4 -translate-y-1/2 items-center justify-center`;
  const outsideIconClass = 'flex h-4 w-4 flex-shrink-0 items-center justify-center';

  const trashButton = hasSubtasks && (
    <button
      type="button"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={handleDelete}
      className={`${iconsOverflow ? outsideIconClass : insideIconClass('right-11')} text-slate-700/70 hover:text-red-600`}
      title="Delete task and subtasks"
      aria-label="Delete task and subtasks"
    >
      <TrashIcon />
    </button>
  );

  const commentButton = (
    <button
      type="button"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={handleOpenNotePopup}
      className={`${iconsOverflow ? outsideIconClass : insideIconClass('right-6')} text-slate-700/70 hover:text-slate-900`}
      title="Add comment / assignee"
      aria-label="Add comment / assignee"
    >
      <CommentIcon />
    </button>
  );

  const eyeButton = (
    <button
      type="button"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={handleToggleVisibility}
      className={`${iconsOverflow ? outsideIconClass : insideIconClass('right-1')} text-slate-700/70 hover:text-slate-900`}
      title={included ? 'Exclude from export' : 'Include in export'}
      aria-label={included ? 'Exclude from export' : 'Include in export'}
    >
      {included ? <EyeIcon /> : <EyeOffIcon />}
    </button>
  );

  const labelPaddingClass = iconsOverflow ? 'pr-2' : hasSubtasks ? 'pr-16' : 'pr-12';

  return (
    <div className="relative h-10 border-b border-slate-100">
      <div
        ref={barRef}
        onMouseDown={handleMouseDown}
        className="absolute top-1 h-8 cursor-grab select-none overflow-hidden rounded-md bg-slate-200 shadow-sm active:cursor-grabbing"
        style={{ left, width, opacity: included ? 1 : 0.4 }}
      >
        <div
          className="h-full"
          style={{ width: `${progress}%`, backgroundColor: item.color ?? '#3b82f6' }}
        />
        <span
          className={`absolute inset-0 flex items-center gap-1 truncate pl-2 text-xs font-medium text-slate-900 ${labelPaddingClass}`}
        >
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: `#${TASK_STATUS_COLORS[status]}` }}
            title={TASK_STATUS_LABELS[status]}
          />
          {item.label}
          {item.progress != null && <span className="text-slate-600">({item.progress}%)</span>}
          {!iconsOverflow && assigneeBadge}
        </span>
        {!iconsOverflow && trashButton}
        {!iconsOverflow && commentButton}
        {!iconsOverflow && eyeButton}
      </div>

      {iconsOverflow && (
        <div
          className="absolute top-1 flex h-8 items-center gap-1"
          style={{ left: left + width + OUTSIDE_ICON_GROUP_GAP_PX }}
        >
          {assigneeBadge}
          {trashButton}
          {commentButton}
          {eyeButton}
        </div>
      )}

      {isNotePopupOpen && (
        <div
          className="absolute top-full z-20 mt-1 w-64 rounded-md border border-[#E5E5E1] bg-white p-3 shadow-lg"
          style={{ left }}
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
            <label htmlFor={`assignee-${item.id}`} className="text-xs font-medium text-slate-500">
              Assignee name
            </label>
            <input
              id={`assignee-${item.id}`}
              type="text"
              value={assigneeName}
              onChange={(event) => setAssigneeName(event.target.value)}
              placeholder="e.g. Max Fedorenko"
              className="rounded-md border border-[#E5E5E1] px-2 py-1 text-sm text-[#1E2B38] focus:border-[#2A9D90] focus:outline-none"
            />
          </div>

          <div className="mt-3 flex gap-1.5">
            <button
              type="button"
              onClick={handleSaveNote}
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
  );
}
