import { useEffect, useMemo, useRef, useState } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { GanttRow } from './GanttRow';
import { AddTaskForm } from './AddTaskForm';
import { DateGridLines } from './DateGridLines';
import { DependencyConnectors } from './DependencyConnectors';
import { HierarchyConnectors } from './HierarchyConnectors';
import { ZONE3_WIDTH_PX, computeZone1Width } from './ganttLayout';
import { ZoomControl } from './ZoomControl';
import { BASE_PX_PER_DAY, MS_PER_DAY, formatShortDate, getDateRange } from '../export/dateScale';
import { sortItems } from '../utils/sortItems';

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
}

export function GanttChart() {
  const items = useTimelineStore((state) => state.items);
  const sortMode = useTimelineStore((state) => state.exportOptions.sortMode);
  const zoomLevel = useTimelineStore((state) => state.ui.zoomLevel);

  const [popupDraft, setPopupDraft] = useState<PopupDraft | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

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
  // stray click elsewhere on the page would silently drop a half-written
  // comment. Runs in the capture phase, ahead of the row buttons' own
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
        : { taskId, commentText: '', selectedAssigneeId: initialAssigneeId, newPersonName: '', initialAssigneeId },
    );
  };

  const closeTaskPopup = () => setPopupDraft(null);

  const updatePopupDraft = (taskId: string, patch: Partial<Omit<PopupDraft, 'taskId' | 'initialAssigneeId'>>) => {
    setPopupDraft((current) => (current && current.taskId === taskId ? { ...current, ...patch } : current));
  };

  const pxPerDay = BASE_PX_PER_DAY * zoomLevel;
  const zone1Width = useMemo(() => computeZone1Width(items), [items]);
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
  const rowWidth = zone1Width + timelineWidth + ZONE3_WIDTH_PX;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#1E2B38]">Timeline</h2>
        <div className="flex items-center gap-3">
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
                  className="flex-shrink-0 border-r border-slate-100 py-2 text-center text-[11px] text-slate-500"
                  style={{ width: pxPerDay }}
                >
                  {formatShortDate(day)}
                </div>
              ))}
            </div>
            <div
              className="sticky right-0 z-20 flex-shrink-0 border-l border-slate-200 bg-slate-50"
              style={{ width: ZONE3_WIDTH_PX }}
            />
          </div>
          {/* Explicit z-stack, back to front: date grid, then the connector
              overlays, then the rows — whose bars and on-bar text carry z-10
              (see GanttRow) so a connector crossing a row can never be drawn
              over its percentage. Without the classes this would fall back to
              DOM order among positioned siblings, which is far too easy to
              break by reordering a line here. */}
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
                  isPopupOpen={isPopupOpen}
                  popupRef={popupRef}
                  commentText={isPopupOpen ? popupDraft.commentText : ''}
                  onCommentTextChange={(value) => updatePopupDraft(item.id, { commentText: value })}
                  selectedAssigneeId={isPopupOpen ? popupDraft.selectedAssigneeId : ''}
                  onSelectedAssigneeIdChange={(value) => updatePopupDraft(item.id, { selectedAssigneeId: value })}
                  newPersonName={isPopupOpen ? popupDraft.newPersonName : ''}
                  onNewPersonNameChange={(value) => updatePopupDraft(item.id, { newPersonName: value })}
                  onToggleTrigger={(initialAssigneeId) => handleToggleTaskPopup(item.id, initialAssigneeId)}
                  onRequestClosePopup={closeTaskPopup}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
