import { useEffect, useMemo, useRef, useState } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { GanttRow } from './GanttRow';
import { AddTaskForm } from './AddTaskForm';
import { DateGridLines } from './DateGridLines';
import { DependencyConnectors } from './DependencyConnectors';
import { HierarchyConnectors } from './HierarchyConnectors';
import {
  MOBILE_ZONE1_MAX_WIDTH_PX,
  MOBILE_ZONE3_WIDTH_PX,
  ZONE3_WIDTH_PX,
  computeZone1Width,
} from './ganttLayout';
import { ZoomControl } from './ZoomControl';
import { BASE_PX_PER_DAY, MS_PER_DAY, formatShortDate, getDateRange } from '../export/dateScale';
import { sortItems } from '../utils/sortItems';
import { getRelatedTreeIds } from '../utils/taskHierarchy';
import { useIsMobile } from '../utils/useIsMobile';

/** The one comment/assignee popup that may be open at a time, across every
 * row — lifted up here (instead of living in each GanttRow) so opening one
 * bar's popup is guaranteed to close any other bar's, rather than each row
 * tracking "am I open" independently and letting two show at once.
 * `initialAssigneeId` is a snapshot of what selectedAssigneeId was when the
 * popup opened, so a backdrop click can tell "untouched" apart from
 * "user actually picked something" without a second effect/ref in GanttRow. */
interface PopupDraft {
  taskId: string;
  commentText: string;
  selectedAssigneeId: string;
  newPersonName: string;
  initialAssigneeId: string;
  // Text typed into the tag input but not yet committed with Enter — unlike
  // the tags themselves (saved straight to the item on Enter, see
  // GanttRow's handleAddTag), this is real draft state: worth protecting
  // from an accidental backdrop close same as an unsent comment.
  tagInput: string;
}

export function GanttChart() {
  const items = useTimelineStore((state) => state.items);
  const sortMode = useTimelineStore((state) => state.exportOptions.sortMode);
  const zoomLevel = useTimelineStore((state) => state.ui.zoomLevel);

  const [popupDraft, setPopupDraft] = useState<PopupDraft | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  // Which bar the pointer is over, if any. useState rather than the useRef
  // the bar drags use (see GanttRow): this one *has* to re-render to show
  // anything, and it changes once per pointer crossing rather than once per
  // mousemove, so there's no render-churn reason to keep it out of state.
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  // The hovered task's structural branch (itself + ancestors + descendants);
  // null whenever nothing should be highlighted, which is what keeps "no
  // hover" from reading as "an empty branch" and dimming every bar at once.
  // A hover id that no longer resolves — the task was deleted while hovered
  // — collapses to that same null for the same reason.
  const highlightedIds = useMemo(() => {
    if (hoveredTaskId === null) return null;
    const related = getRelatedTreeIds(items, hoveredTaskId);
    return related.size > 0 ? related : null;
  }, [items, hoveredTaskId]);

  // Escape always discards and closes, no matter what's been typed.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPopupDraft((current) => (current ? null : current));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Backdrop click: closes without saving, but only when there's nothing to
  // lose (fields empty or untouched since the popup opened) — otherwise a
  // stray click outside the dialog would silently drop a half-written
  // comment. This is why the modal itself has no plain `onClick={onClose}`
  // backdrop the way ExportOverflowModal does: the decision isn't
  // unconditional. `popupRef` points at the dialog panel, so the backdrop
  // around it counts as "outside" and closes.
  //
  // Runs in the capture phase, ahead of the row buttons' own
  // stopPropagation()-ing mousedown handlers, and explicitly ignores clicks
  // on any [data-popup-trigger] icon so switching to a different bar's popup
  // (which those buttons' own onClick already does unconditionally) never
  // races with this conditional close.
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (popupRef.current?.contains(target)) return;
      if (target?.closest('[data-popup-trigger]')) return;
      setPopupDraft((current) => {
        if (!current) return current;
        const hasChanges =
          current.commentText.trim() !== '' ||
          current.newPersonName.trim() !== '' ||
          current.tagInput.trim() !== '' ||
          current.selectedAssigneeId !== current.initialAssigneeId;
        return hasChanges ? current : null;
      });
    };
    document.addEventListener('mousedown', handlePointerDown, true);
    return () => document.removeEventListener('mousedown', handlePointerDown, true);
  }, []);

  const handleToggleTaskPopup = (taskId: string, initialAssigneeId: string) => {
    setPopupDraft((current) =>
      current?.taskId === taskId
        ? null
        : {
            taskId,
            commentText: '',
            selectedAssigneeId: initialAssigneeId,
            newPersonName: '',
            initialAssigneeId,
            tagInput: '',
          },
    );
  };

  const closeTaskPopup = () => setPopupDraft(null);

  const updatePopupDraft = (taskId: string, patch: Partial<Omit<PopupDraft, 'taskId' | 'initialAssigneeId'>>) => {
    setPopupDraft((current) => (current && current.taskId === taskId ? { ...current, ...patch } : current));
  };

  // The two fixed zones are the only geometry the phone layout changes in JS
  // rather than in CSS: the row layout, the day header and the three SVG
  // overlays all position themselves against these numbers, so a width the
  // stylesheet alone knew about would leave the bars and the grid disagreeing
  // about where the timeline starts.
  const isMobile = useIsMobile();
  const pxPerDay = BASE_PX_PER_DAY * zoomLevel;
  const zone1Width = useMemo(
    () => computeZone1Width(items, isMobile ? MOBILE_ZONE1_MAX_WIDTH_PX : undefined),
    [items, isMobile],
  );
  const zone3Width = isMobile ? MOBILE_ZONE3_WIDTH_PX : ZONE3_WIDTH_PX;
  const sortedItems = useMemo(() => sortItems(items, sortMode), [items, sortMode]);

  const { minDate, days } = useMemo(() => {
    const { minDate: min, totalDays } = getDateRange(items);
    const dayList = Array.from(
      { length: totalDays },
      (_, index) => new Date(min.getTime() + index * MS_PER_DAY),
    );

    return { minDate: min, days: dayList };
  }, [items]);

  // Zone 2 (the date-scaled timeline) is whatever's left of each row after
  // the two fixed zones — matches GanttRow's own zone math exactly so bars
  // line up under the day headers below.
  const timelineWidth = days.length * pxPerDay;
  const rowWidth = zone1Width + timelineWidth + zone3Width;

  return (
    <div>
      {/* Title and controls sit on one line until there isn't room for one:
          on a phone the controls take their own full-width row underneath,
          which is also what gives the zoom buttons and the add-task form
          room to grow to thumb size. */}
      <div className="mb-3 flex items-center justify-between max-md:flex-col max-md:items-stretch max-md:gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-[#1E2B38]">Timeline</h2>
        <div className="flex items-center gap-3 max-md:flex-wrap max-md:justify-between">
          <ZoomControl />
          <AddTaskForm />
        </div>
      </div>
      <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <div style={{ width: rowWidth }}>
          <div className="flex border-b border-slate-200 bg-slate-50">
            <div
              className="sticky left-0 z-20 flex-shrink-0 border-r border-slate-200 bg-slate-50 px-2 py-2 text-xs font-medium text-slate-500"
              style={{ width: zone1Width }}
            >
              Task
            </div>
            <div className="flex flex-shrink-0" style={{ width: timelineWidth }}>
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  // The date tier: monospace, a notch smaller than before
                  // (was text-[11px] in the body face) and tracked out. Still
                  // wraps to "Aug" / "01" inside the fixed pxPerDay column
                  // exactly as it did before, since both halves are narrower
                  // than the column even at the tightest zoom.
                  className="flex-shrink-0 border-r border-slate-100 py-2 text-center font-mono text-[10px] tracking-[0.02em] text-slate-500"
                  style={{ width: pxPerDay }}
                >
                  {formatShortDate(day)}
                </div>
              ))}
            </div>
            <div
              className="sticky right-0 z-20 flex-shrink-0 border-l border-slate-200 bg-slate-50"
              style={{ width: zone3Width }}
            />
          </div>
          {/* Explicit z-stack, back to front: date grid (z-0), the connector
              overlays (z-1), the rows' bars and on-bar text (z-10 — so a
              connector crossing a row can never be drawn over its
              percentage), and finally the rows' two sticky columns (z-20),
              which the bars scroll underneath. Without the classes this
              would fall back to DOM order among positioned siblings, which
              is far too easy to break by reordering a line here. */}
          <div className="relative">
            <DateGridLines minDate={minDate} totalDays={days.length} pxPerDay={pxPerDay} zone1Width={zone1Width} />
            <HierarchyConnectors items={sortedItems} minDate={minDate} pxPerDay={pxPerDay} zone1Width={zone1Width} />
            <DependencyConnectors items={sortedItems} minDate={minDate} pxPerDay={pxPerDay} zone1Width={zone1Width} />
            {sortedItems.map((item) => {
              const isPopupOpen = popupDraft?.taskId === item.id;
              return (
                <GanttRow
                  key={item.id}
                  item={item}
                  minDate={minDate}
                  pxPerDay={pxPerDay}
                  timelineWidth={timelineWidth}
                  zone1Width={zone1Width}
                  zone3Width={zone3Width}
                  isPopupOpen={isPopupOpen}
                  popupRef={popupRef}
                  commentText={isPopupOpen ? popupDraft.commentText : ''}
                  onCommentTextChange={(value) => updatePopupDraft(item.id, { commentText: value })}
                  selectedAssigneeId={isPopupOpen ? popupDraft.selectedAssigneeId : ''}
                  onSelectedAssigneeIdChange={(value) => updatePopupDraft(item.id, { selectedAssigneeId: value })}
                  newPersonName={isPopupOpen ? popupDraft.newPersonName : ''}
                  onNewPersonNameChange={(value) => updatePopupDraft(item.id, { newPersonName: value })}
                  tagInput={isPopupOpen ? popupDraft.tagInput : ''}
                  onTagInputChange={(value) => updatePopupDraft(item.id, { tagInput: value })}
                  onToggleTrigger={(initialAssigneeId) => handleToggleTaskPopup(item.id, initialAssigneeId)}
                  onRequestClosePopup={closeTaskPopup}
                  isDimmed={highlightedIds !== null && !highlightedIds.has(item.id)}
                  onBarHoverChange={(isHovered) =>
                    // Clearing only when this row is still the hovered one:
                    // moving between two adjacent bars can deliver the new
                    // bar's mouseenter before the old bar's mouseleave, and
                    // an unconditional reset would drop the fresh hover.
                    setHoveredTaskId((current) =>
                      isHovered ? item.id : current === item.id ? null : current,
                    )
                  }
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
