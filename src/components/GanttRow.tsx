import { useMemo, useRef } from 'react';
import { getTaskStatus, TASK_STATUS_COLORS, TASK_STATUS_LABELS, type TimelineItem } from '../types/timeline';
import { useTimelineStore } from '../store/timelineStore';
import { usePeopleStore } from '../store/peopleStore';
import { TaskDetailsModal } from './TaskDetailsModal';
import { resolveAssignee } from './assigneeSelection';
import { daysBetween, getItemBar, shiftIsoDate } from '../export/dateScale';
import { clampProgress } from '../utils/clampProgress';
import { needsDarkText } from '../utils/colorContrast';
import { getInitials } from '../utils/initials';
import { measureTextWidthPx } from '../utils/measureTextWidth';
import { resolveBarColor } from '../utils/barColor';
import { getDescendantIds } from '../utils/taskHierarchy';

interface GanttRowProps {
  item: TimelineItem;
  minDate: Date;
  pxPerDay: number;
  // Zone 2's width (the whole date-scaled timeline strip) — passed down
  // from GanttChart so every row's zone 2 is pixel-identical to the day
  // header above it, regardless of any single task's own bar width.
  timelineWidth: number;
  // Zone 1's width (see computeZone1Width) — sized to the longest label
  // across all rows, so it's the same for every row and every row's label
  // fits on one line with no ellipsis (capped on a phone, where labels
  // ellipsize instead).
  zone1Width: number;
  // Zone 3's width: the four-icon desktop zone, or the single-control phone
  // one (see MOBILE_ZONE3_WIDTH_PX). Passed in rather than read from the
  // constant here so this row and the day header above it can't end up
  // reserving different amounts of space for it.
  zone3Width: number;
  // The comment/assignee popup's open/closed state and draft fields live in
  // GanttChart (see PopupDraft there), not here — that's what guarantees
  // only one row's popup can ever be open at once.
  isPopupOpen: boolean;
  popupRef: React.RefObject<HTMLDivElement | null>;
  commentText: string;
  onCommentTextChange: (value: string) => void;
  selectedAssigneeId: string;
  onSelectedAssigneeIdChange: (value: string) => void;
  newPersonName: string;
  onNewPersonNameChange: (value: string) => void;
  tagInput: string;
  onTagInputChange: (value: string) => void;
  onToggleTrigger: (initialAssigneeId: string) => void;
  onRequestClosePopup: () => void;
  // Hover-highlight of a task's structural branch, owned by GanttChart (see
  // hoveredTaskId there) since it spans rows. Two flags rather than one
  // because they drive opposite treatments on different parts of the row:
  // `isDimmed` fades a row that some *other* branch's hover excluded,
  // `isHighlighted` marks a row that belongs to the hovered branch. Both are
  // false when nothing is hovered, which is the neutral state. On-screen
  // only — the exporters never see either, the same way HierarchyConnectors
  // is screen-only.
  isDimmed: boolean;
  isHighlighted: boolean;
  // Fired for the whole row, not just its bar: a bar can be scrolled far out
  // of view horizontally while its label is always in reach (the label
  // column is sticky), so binding hover to the bar alone made deep branches
  // impossible to inspect — you had to find the bar before you could hover
  // it.
  onRowHoverChange: (isHovered: boolean) => void;
}

// One drag state shape for all three bar interactions (move + resize each
// edge) — they're mutually exclusive at any given moment (only one mousedown
// can be in flight on a bar at a time), so one ref covers all three instead
// of a separate one per interaction.
type DragMode = 'move' | 'resize-start' | 'resize-end';

interface DragState {
  mode: DragMode;
  startX: number;
  startLeft: number;
  startWidth: number;
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

// Neutral badge fill (hex without '#', matching Person.color's own
// convention) for an assignee whose name no longer matches any saved
// Person (e.g. removed from peopleStore after the task was assigned) —
// same value as theme.ts's COLORS.assigneeFallback, used for the same case
// on the exported detail slide.
const FALLBACK_ASSIGNEE_COLOR = '94A3B8';
// Solid, fully opaque so the date grid lines (drawn behind the bar in
// z-order) can never bleed through the unfilled part of the bar — an
// inline color, not the bg-slate-200 utility class, so opacity is never at
// the mercy of an inherited Tailwind CSS variable.
const BAR_TRACK_COLOR = '#E2E8F0';
// Must match how the progress text on the bar is actually styled below
// (`text-[11px] font-semibold`, app font stack), since it's what the fit
// measurement is made against.
const PROGRESS_FONT = '600 11px ui-sans-serif, system-ui, sans-serif';
const PROGRESS_PADDING_PX = 5;

// The branch-hover treatment (see isDimmed/isHighlighted), as two signals
// landing on different elements.
//
// Fading unrelated rows: applied to the *contents* of the two sticky columns,
// never to the columns themselves — their background is what stops a
// horizontally scrolled bar showing through them, and a translucent column
// would undo exactly the fix that made the labels readable while scrolling.
// A notch stronger than the bar's own opacity-30, since 12px text at 30%
// stops being legible while a 32px-tall bar at 30% is still perfectly
// readable as a shape.
const ROW_DIM_CLASS = 'opacity-40';
// Marking related rows: a solid (never translucent, same reason) pale teal
// wash across the sticky columns. This is the half of the treatment the bars
// can't provide — a related bar is often scrolled out of view, and then the
// label column is the only place the branch can be seen at all.
const branchTintClass = (isHighlighted: boolean) => (isHighlighted ? 'bg-[#F1F8F7]' : 'bg-white');

export function GanttRow({
  item,
  minDate,
  pxPerDay,
  timelineWidth,
  zone1Width,
  zone3Width,
  isPopupOpen,
  popupRef,
  commentText,
  onCommentTextChange,
  selectedAssigneeId,
  onSelectedAssigneeIdChange,
  newPersonName,
  onNewPersonNameChange,
  tagInput,
  onTagInputChange,
  onToggleTrigger,
  onRequestClosePopup,
  isDimmed,
  isHighlighted,
  onRowHoverChange,
}: GanttRowProps) {
  const items = useTimelineStore((state) => state.items);
  const updateItem = useTimelineStore((state) => state.updateItem);
  const addComment = useTimelineStore((state) => state.addComment);
  const toggleIncludeInExportCascade = useTimelineStore((state) => state.toggleIncludeInExportCascade);
  const deleteTaskCascade = useTimelineStore((state) => state.deleteTaskCascade);
  const people = usePeopleStore((state) => state.people);
  const addPerson = usePeopleStore((state) => state.addPerson);
  const barRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState | null>(null);

  // The zone-3 icons fade with the rest of an unrelated row's contents;
  // ICON_BUTTON_CLASS itself stays untouched so the sizing rules stay in one
  // place.
  const iconButtonClass = `${ICON_BUTTON_CLASS}${isDimmed ? ` ${ROW_DIM_CLASS}` : ''}`;

  const { left, width: barWidth } = getItemBar(item, minDate, pxPerDay);
  const progress = clampProgress(item.progress ?? 0);
  const status = getTaskStatus(item);
  const included = item.includeInExport !== false;

  // Matched by name, not id — a task only ever remembers its assignee's
  // name (see Person.color's doc comment in peopleStore.ts), so two people
  // sharing a name are only as distinguishable here as that lookup allows.
  // Falls back to a neutral gray for a name that no longer matches anyone
  // (e.g. removed from peopleStore after the task was assigned).
  const assigneeColor = item.assignee
    ? `#${people.find((person) => person.name === item.assignee?.name)?.color ?? FALLBACK_ASSIGNEE_COLOR}`
    : undefined;

  // Progress text rides on the bar: centered in the filled part when that
  // part is measurably wide enough to hold it, otherwise immediately after
  // the fill, in dark text on the gray track. The fit is a real measurement
  // against the fill's own pixel width — a percentage cutoff would say
  // nothing about how wide "100%" renders on a two-day bar.
  // Same rule the exporters use (see resolveBarColor): the task's own color
  // when it has one, its status color otherwise — no separate on-screen
  // default. Prefixed here because this one is going into a CSS property.
  const barColor = `#${resolveBarColor(item)}`;
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

  const toggleIncludeInExport = () => {
    if (hasSubtasks) {
      toggleIncludeInExportCascade(item.id);
    } else {
      updateItem(item.id, { includeInExport: !included });
    }
  };

  const handleToggleVisibility = (event: React.MouseEvent) => {
    event.stopPropagation();
    toggleIncludeInExport();
  };

  // Split from its click handler because the phone layout offers the same
  // two actions from inside the task modal (see zone 3) — and there, a
  // confirmed delete should also close the modal it was triggered from,
  // which is what the return value is for.
  const confirmAndDelete = () => {
    const confirmed = window.confirm(
      `Delete '${item.label}' and its ${descendantIds.length} subtasks? This can't be undone.`,
    );
    if (!confirmed) return false;
    deleteTaskCascade(item.id);
    return true;
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    confirmAndDelete();
  };

  const handleTriggerClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    // Preselect the item's current assignee if they're a known person, so
    // reopening the popup doesn't look like the assignment was lost — but
    // if there's no match (e.g. a name set before this picker existed),
    // default to "no change" rather than guessing. onToggleTrigger closes
    // the popup instead if this row's is already the one open.
    const currentAssigneeId = item.assignee
      ? people.find((person) => person.name === item.assignee?.name)?.id
      : undefined;
    onToggleTrigger(currentAssigneeId ?? '');
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

    onRequestClosePopup();
  };

  // Tags save straight to the item on Enter — unlike the comment/assignee
  // above, there's no Save button gating them, so each one shows up on the
  // bar immediately rather than waiting on an unrelated field to be filled.
  const handleTagInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const trimmed = tagInput.trim();
    if (trimmed === '') return;
    if (!(item.tags ?? []).includes(trimmed)) {
      updateItem(item.id, { tags: [...(item.tags ?? []), trimmed] });
    }
    onTagInputChange('');
  };

  const handleRemoveTag = (tag: string) => {
    updateItem(item.id, { tags: (item.tags ?? []).filter((existing) => existing !== tag) });
  };

  // Shared by all three bar interactions — dragging the bar's middle moves
  // both dates together (mode 'move'), dragging either edge's resize handle
  // changes just that one date (see the two narrow handles rendered inside
  // the bar below). stopPropagation matters here specifically for the two
  // resize handles: they're children of the bar's own onMouseDown="move"
  // element, so without it a mousedown on a handle would also bubble up and
  // start a move at the same time.
  const beginBarInteraction = (event: React.MouseEvent, mode: DragMode) => {
    event.preventDefault();
    event.stopPropagation();
    dragState.current = { mode, startX: event.clientX, startLeft: left, startWidth: barWidth };

    // How many days this bar currently spans (daysBetween, not the +1
    // getItemBar renders a track at) — the room a resize has to shrink
    // into before the edge being dragged would reach, and then pass, the
    // other edge. 0 for an already single-day task, i.e. that edge can't
    // shrink any further.
    const durationDays = daysBetween(new Date(item.start), new Date(item.end));

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const drag = dragState.current;
      if (!drag || !barRef.current) return;
      const rawDeltaX = moveEvent.clientX - drag.startX;

      if (drag.mode === 'move') {
        barRef.current.style.left = `${drag.startLeft + rawDeltaX}px`;
        return;
      }

      if (drag.mode === 'resize-start') {
        // Clamped in pixel space (not just at commit time) so the bar
        // itself never visually shrinks past the one-day-duration floor
        // while dragging, not only once the mouse is released.
        const deltaX = Math.min(rawDeltaX, pxPerDay * durationDays);
        barRef.current.style.left = `${drag.startLeft + deltaX}px`;
        barRef.current.style.width = `${drag.startWidth - deltaX}px`;
        return;
      }

      const deltaX = Math.max(rawDeltaX, -(pxPerDay * durationDays));
      barRef.current.style.width = `${drag.startWidth + deltaX}px`;
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      const drag = dragState.current;
      dragState.current = null;
      if (!drag) return;

      const rawDeltaX = upEvent.clientX - drag.startX;

      if (drag.mode === 'move') {
        const deltaDays = Math.round(rawDeltaX / pxPerDay);
        if (deltaDays !== 0) {
          updateItem(item.id, {
            start: shiftIsoDate(item.start, deltaDays),
            end: shiftIsoDate(item.end, deltaDays),
          });
        } else if (barRef.current) {
          barRef.current.style.left = `${left}px`;
        }
        return;
      }

      if (drag.mode === 'resize-start') {
        const deltaDays = Math.round(Math.min(rawDeltaX, pxPerDay * durationDays) / pxPerDay);
        if (deltaDays !== 0) {
          updateItem(item.id, { start: shiftIsoDate(item.start, deltaDays) });
        } else if (barRef.current) {
          barRef.current.style.left = `${left}px`;
          barRef.current.style.width = `${barWidth}px`;
        }
        return;
      }

      const deltaDays = Math.round(Math.max(rawDeltaX, -(pxPerDay * durationDays)) / pxPerDay);
      if (deltaDays !== 0) {
        updateItem(item.id, { end: shiftIsoDate(item.end, deltaDays) });
      } else if (barRef.current) {
        barRef.current.style.width = `${barWidth}px`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDown = (event: React.MouseEvent) => beginBarInteraction(event, 'move');
  const handleResizeStartMouseDown = (event: React.MouseEvent) => beginBarInteraction(event, 'resize-start');
  const handleResizeEndMouseDown = (event: React.MouseEvent) => beginBarInteraction(event, 'resize-end');

  return (
    <div
      className="flex h-10 border-b border-slate-100"
      style={{ opacity: included ? 1 : 0.5 }}
      onMouseEnter={() => onRowHoverChange(true)}
      onMouseLeave={() => onRowHoverChange(false)}
    >
      {/* Zone 1: status dot + label (+ tags, if any). Fixed width,
          independent of the bar — a label is exactly as visible on a 1-day
          task as a 3-month one. overflow-hidden is the hard guarantee that
          tags wrapping onto a second line never bleed into the row below —
          the zone's own height still comes from the row's fixed h-10 (see
          ROW_HEIGHT_PX in ganttLayout.ts, which every other overlay's
          position math assumes is constant across rows), not from content,
          so tags that don't fit even wrapped are clipped rather than
          growing the row.

          z-20 — above zone 2 (z-10), not merely equal to it: this column is
          `sticky left-0`, so on a horizontally scrolled chart the bars slide
          underneath it, and with both zones at the same z-index the tie
          would break on DOM order and paint the bars *over* the labels. The
          opaque bg-white is the other half of that: sticky only reserves the
          space, it doesn't hide what scrolls beneath it. */}
      <div
        className={`sticky left-0 z-20 flex flex-shrink-0 items-center gap-1.5 overflow-hidden border-r border-slate-100 px-2 ${branchTintClass(isHighlighted)}`}
        style={{ width: zone1Width }}
      >
        <span
          className={`h-2 w-2 flex-shrink-0 rounded-full ${isDimmed ? ROW_DIM_CLASS : ''}`}
          style={{ backgroundColor: `#${TASK_STATUS_COLORS[status]}` }}
          title={TASK_STATUS_LABELS[status]}
        />
        {/* On a phone the label column is capped (MOBILE_ZONE1_MAX_WIDTH_PX),
            so the label ellipsizes instead of setting the column's width, and
            the tag pills drop out of the row entirely — they'd take the space
            the label needs, and they're still on the bar's own popup and in
            every export. */}
        <div
          className={`flex min-w-0 flex-1 flex-wrap content-center items-center gap-x-1.5 gap-y-0.5 transition-opacity ${
            isDimmed ? ROW_DIM_CLASS : ''
          }`}
        >
          <span className="whitespace-nowrap text-xs font-medium text-slate-900 max-md:min-w-0 max-md:truncate">
            {item.label}
          </span>
          {item.tags?.map((tag) => (
            <span
              key={tag}
              className="whitespace-nowrap rounded bg-slate-100 px-1 text-[9px] font-medium leading-[14px] text-slate-600 max-md:hidden"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Zone 2: the timeline itself. The bar, plus the one piece of text
          that belongs on it — the progress percentage. Both live inside the
          same dragged element so they move together, which is also why the
          z-index sits here on the zone rather than on the text alone: the
          percentage can't be lifted out of the dragged element to be layered
          separately. z-10 puts the whole zone over the date grid (z-0) and
          the dependency/hierarchy connectors (z-1), so a bracket crossing
          this row is never drawn across its percentage — matching the
          shapes-then-text order the exporters use for the same reason — and
          under the two sticky columns (z-20) either side of it. */}
      <div className="relative z-10 flex-shrink-0" style={{ width: timelineWidth }}>
        {/* The dim is a class, not a `style` entry, on purpose: this
            element's style attribute is written to imperatively during a
            drag/resize (see beginBarInteraction), so anything React also
            drives through `style` here risks fighting those writes. */}
        <div
          ref={barRef}
          onMouseDown={handleMouseDown}
          className={`absolute top-1 h-8 cursor-grab select-none transition-opacity active:cursor-grabbing ${
            isDimmed ? 'opacity-30' : ''
          }`}
          style={{ left, width: barWidth }}
        >
          <div
            className="h-full overflow-hidden rounded-md shadow-sm"
            style={{ backgroundColor: BAR_TRACK_COLOR, opacity: 1 }}
          >
            <div className="h-full" style={{ width: `${progress}%`, backgroundColor: barColor, opacity: 1 }} />
          </div>

          {progressText && (
            <span
              className="pointer-events-none absolute top-0 flex h-full items-center whitespace-nowrap text-[11px] font-semibold"
              style={progressTextStyle}
            >
              {progressText}
            </span>
          )}

          {/* Resize handles: invisible strips at each edge, drawn after (so
              stacked above) the fill/progress-text — grabbing one of these
              narrow zones changes just that end's date instead of moving
              the whole bar, which is what the wider middle area (still
              plain cursor-grab, still handleMouseDown="move") continues to
              do. Width is a class rather than an inline style purely so the
              phone layout can widen it: w-1.5 is the same 6px a cursor
              wants, max-md:w-6 the 24px a fingertip does, and the 33% cap
              keeps both handles off a short bar's move area rather than
              swallowing it whole. */}
          <div
            onMouseDown={handleResizeStartMouseDown}
            className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize max-md:w-6 max-md:max-w-[33%]"
          />
          <div
            onMouseDown={handleResizeEndMouseDown}
            className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize max-md:w-6 max-md:max-w-[33%]"
          />
        </div>
      </div>

      {/* Zone 3: assignee, comment, eye, trash. Fixed width and fixed set of
          slots (trash reserves its slot even when hidden) so every row's
          zone 3 is pixel-identical, never overlapping the row above or below
          it. Sticky and z-20 for the same reason as zone 1, mirrored: bars
          scroll under it, never across it.

          On a phone only the assignee badge survives here, grown to fill the
          row's height as one real touch target. It already opens the task
          modal (same handleTriggerClick as the comment icon), so nothing is
          lost by dropping that icon; the eye and the trash move *into* that
          modal rather than disappearing — four 16px icons in a 104px column
          is a mouse-only proposition. */}
      <div
        className={`sticky right-0 z-20 flex flex-shrink-0 items-center gap-1.5 border-l border-slate-100 px-2 max-md:justify-center max-md:px-1.5 ${branchTintClass(isHighlighted)}`}
        style={{ width: zone3Width }}
      >
        <button
          type="button"
          data-popup-trigger
          onMouseDown={(event) => event.stopPropagation()}
          onClick={handleTriggerClick}
          className={`${iconButtonClass} rounded-full max-md:h-10 max-md:w-10 ${item.assignee ? '' : 'text-slate-400 hover:text-slate-600'}`}
          style={assigneeColor ? { backgroundColor: assigneeColor } : undefined}
          title={item.assignee ? item.assignee.name : 'Set assignee'}
          aria-label={item.assignee ? `Assignee: ${item.assignee.name}` : 'Set assignee'}
        >
          {item.assignee && assigneeColor ? (
            <span
              className="text-[9px] font-semibold max-md:text-xs"
              style={{ color: needsDarkText(assigneeColor) ? '#1E2B38' : '#FFFFFF' }}
            >
              {getInitials(item.assignee.name)}
            </span>
          ) : (
            <PersonIcon />
          )}
        </button>

        <button
          type="button"
          data-popup-trigger
          onMouseDown={(event) => event.stopPropagation()}
          onClick={handleTriggerClick}
          className={`${iconButtonClass} text-slate-700/70 hover:text-slate-900 max-md:hidden`}
          title="Add comment / assignee"
          aria-label="Add comment / assignee"
        >
          <CommentIcon />
        </button>

        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={handleToggleVisibility}
          className={`${iconButtonClass} text-slate-700/70 hover:text-slate-900 max-md:hidden`}
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
            className={`${iconButtonClass} text-slate-700/70 hover:text-red-600 max-md:hidden`}
            title="Delete task and subtasks"
            aria-label="Delete task and subtasks"
          >
            <TrashIcon />
          </button>
        ) : (
          <span className={`${iconButtonClass} max-md:hidden`} aria-hidden="true" />
        )}

        {isPopupOpen && (
          <TaskDetailsModal
            item={item}
            panelRef={popupRef}
            commentText={commentText}
            onCommentTextChange={onCommentTextChange}
            selectedAssigneeId={selectedAssigneeId}
            onSelectedAssigneeIdChange={onSelectedAssigneeIdChange}
            newPersonName={newPersonName}
            onNewPersonNameChange={onNewPersonNameChange}
            tagInput={tagInput}
            onTagInputChange={onTagInputChange}
            onTagInputKeyDown={handleTagInputKeyDown}
            onRemoveTag={handleRemoveTag}
            canSave={canSaveNote}
            onSave={() => void handleSaveNote()}
            onClose={onRequestClosePopup}
            includedInExport={included}
            onToggleIncludeInExport={toggleIncludeInExport}
            onDelete={
              hasSubtasks
                ? () => {
                    if (confirmAndDelete()) onRequestClosePopup();
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
