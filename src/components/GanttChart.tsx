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
  STATUS_ZONE_WIDTH_PX,
  ZONE3_WIDTH_PX,
  computeZone1Width,
} from './ganttLayout';
import { ZoomControl } from './ZoomControl';
import { BASE_PX_PER_DAY, MS_PER_DAY, formatShortDate, getDateRange } from '../export/dateScale';
import { MAX_VISIBLE_DAYS_FOR_DAY_LINES } from '../export/dateGrid';
import { sortItems } from '../utils/sortItems';
import { getRelatedTreeIds } from '../utils/taskHierarchy';
import { useElementWidth } from '../utils/useElementWidth';
import { useIsMobile } from '../utils/useIsMobile';

/** The one comment/assignee popup that may be open at a time, across every
 * row — lifted up here (instead of living in each GanttRow) so opening one
 * bar's popup is guaranteed to close any other bar's, rather than each row
 * tracking "am I open" independently and letting two show at once.
 * `initialAssigneeId` is a snapshot of what selectedAssigneeId was when the
 * popup opened, so a backdrop click can tell "untouched" apart from
 * "user actually picked something" without a second effect/ref in GanttRow. */
// Roughly the width of "Aug" at the header's 10px monospace size, plus
// breathing room — the point below which per-day captions start colliding.
const MIN_DAY_CAPTION_WIDTH_PX = 22;

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
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Which row the pointer is over, if any. useState rather than the useRef
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
  // Zone 0 exists on a desktop only: on a 375px phone it would take 112 of
  // the ~200px the timeline has left after the other two fixed zones, so
  // there the status stays a colored dot in zone 1 and stays editable from
  // the export settings list.
  const statusZoneWidth = isMobile ? 0 : STATUS_ZONE_WIDTH_PX;
  // Where zone 2 begins: the fixed zones ahead of it, added up once here so
  // the rows, the day header and all three SVG overlays can't disagree.
  const timelineStartX = statusZoneWidth + zone1Width;
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
  const rowWidth = timelineStartX + timelineWidth + zone3Width;

  // How much time the chart shows at once: the scroll viewport's own width
  // divided by the current pixels-per-day. This is what makes the zoom
  // control drive the grid — zooming out fits more days on screen, and past
  // 90 of them the daily lines stop being a grid and become a smear (see
  // getVisibleGridLevels). Before the first measurement lands, fall back to
  // the whole plan, which errs toward the coarser grid rather than painting
  // one dense frame.
  const viewportWidth = useElementWidth(scrollRef);
  const visibleDays = viewportWidth > 0 ? (viewportWidth - timelineStartX - zone3Width) / pxPerDay : days.length;

  // Day captions in the header thin out as the columns narrow, for the same
  // reason the grid does: "Aug" needs about 22px, so below that only every
  // Nth column is captioned instead of every column overlapping its
  // neighbours. At the default zoom (32px/day) the stride is 1 — every day
  // captioned, exactly as before.
  const dayCaptionStride = Math.max(1, Math.ceil(MIN_DAY_CAPTION_WIDTH_PX / pxPerDay));
  // The header's per-day separators come and go with the daily grid lines
  // below them, so the two strips never disagree about how fine this range
  // is: once the body shows weeks, a comb of day borders in the header is
  // the same visual noise the grid just dropped.
  const showDayCellBorders = visibleDays <= MAX_VISIBLE_DAYS_FOR_DAY_LINES;

  return (
    <div>
      {/* Title and controls sit on one line until there isn't room for one:
          on a phone the controls take their own full-width row underneath,
          which is also what gives the zoom buttons and the add-task form
          room to grow to thumb size. */}
      <div className="mb-3 flex items-center justify-end max-md:flex-col max-md:items-stretch max-md:gap-2">
        <div className="flex items-center gap-3 max-md:flex-wrap max-md:justify-between">
          <ZoomControl />
          <AddTaskForm />
        </div>
      </div>
      <div ref={scrollRef} className="w-full overflow-x-auto rounded-lg border border-border bg-card">
        <div style={{ width: rowWidth }}>
          <div className="flex border-b border-border bg-muted/50">
            {!isMobile && (
              <div
                className="sticky left-0 z-20 flex-shrink-0 border-r border-border bg-muted/50 px-2 py-2 text-xs font-medium text-muted-foreground"
                style={{ width: statusZoneWidth }}
              >
                Status
              </div>
            )}
            <div
              className="sticky z-20 flex-shrink-0 border-r border-border bg-muted/50 px-2 py-2 text-xs font-medium text-muted-foreground"
              style={{ width: zone1Width, left: statusZoneWidth }}
            >
              Task
            </div>
            <div className="flex flex-shrink-0" style={{ width: timelineWidth }}>
              {days.map((day, index) => (
                <div
                  key={day.toISOString()}
                  // The date tier: monospace, a notch smaller than before
                  // (was text-[11px] in the body face) and tracked out. Still
                  // wraps to "Aug" / "01" inside the fixed pxPerDay column
                  // exactly as it did before, since both halves are narrower
                  // than the column even at the tightest zoom.
                  className={`flex-shrink-0 py-2 text-center font-mono text-[10px] tracking-[0.02em] text-muted-foreground ${
                    showDayCellBorders ? 'border-r border-border' : ''
                  }`}
                  style={{ width: pxPerDay }}
                >
                  {index % dayCaptionStride === 0 ? formatShortDate(day) : ''}
                </div>
              ))}
            </div>
            <div
              className="sticky right-0 z-20 flex-shrink-0 border-l border-border bg-muted/50"
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
            <DateGridLines
              minDate={minDate}
              totalDays={days.length}
              pxPerDay={pxPerDay}
              timelineStartX={timelineStartX}
              visibleDays={visibleDays}
            />
            <HierarchyConnectors items={sortedItems} minDate={minDate} pxPerDay={pxPerDay} timelineStartX={timelineStartX} />
            <DependencyConnectors items={sortedItems} minDate={minDate} pxPerDay={pxPerDay} timelineStartX={timelineStartX} />
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
                  statusZoneWidth={statusZoneWidth}
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
                  isHighlighted={highlightedIds !== null && highlightedIds.has(item.id)}
                  onRowHoverChange={(isHovered) =>
                    // Clearing only when this row is still the hovered one:
                    // moving between two adjacent rows can deliver the new
                    // row's mouseenter before the old row's mouseleave, and
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
