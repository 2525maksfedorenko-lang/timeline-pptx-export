import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { usePeopleStore } from '../store/peopleStore';
import { getInitials } from '../utils/initials';
import { buildNewTask } from '../utils/newTask';
import { progressForStatus } from '../utils/progressForStatus';
import { useElementWidth } from '../utils/useElementWidth';
import { shiftIsoDate } from '../export/dateScale';
import type { TaskStatus } from '../types/timeline';
import {
  HEADER_HEIGHT_PX,
  LIST_WIDTH_PX,
  MIN_BODY_HEIGHT_PX,
  ADD_ROW_HEIGHT_PX,
  ROW_HEIGHT_PX,
  TODAY_SCROLL_LEAD_PX,
} from './geometry';
import {
  buildHeaderCells,
  COLUMN_WIDTH_PX,
  formatDayLabel,
  isoAtIndex,
  planRange,
  weekendStarts,
} from './scale';
import { progressOf } from './rollup';
import { visibleRows } from './rows';
import { criticalPath } from './criticalPath';
import { descendantLeafIds, groupMoveDays, previewSpans, type DragState } from './drag';
import { avatarColor, STATUS_CYCLE, STATUS_LABEL } from './tone';
import { TimelineHeader } from './TimelineHeader';
import { TaskList } from './TaskList';
import { TimelineBody } from './TimelineBody';
import { EditTaskPanel } from './EditTaskPanel';
import { useGanttViewStore } from './viewStore';
import type { BarAssignee } from './TaskBar';

/** How long after a pointerup a drag keeps suppressing the click it would
 * otherwise fire. Long enough for the click event to have been and gone,
 * short enough that the next real click lands. */
const CLICK_SUPPRESS_MS = 30;

/** The plan screen: toolbar, then one scroll container holding the task list,
 * the period header and the timeline, then the Edit Task panel.
 *
 * The scroll container is the whole of the alignment strategy. It holds a CSS
 * grid — `320px <timeline>` by `56px <body>` — with the header stuck to its
 * top, the list stuck to its left and the corner block stuck to both. A row's
 * line in the list and its bar in the timeline are the same grid row, so they
 * cannot drift apart; nothing here mirrors one scroll onto another. */
export function GanttScreen() {
  const items = useTimelineStore((state) => state.items);
  const updateItem = useTimelineStore((state) => state.updateItem);
  const addItem = useTimelineStore((state) => state.addItem);
  const showDependencies = useTimelineStore((state) => state.exportOptions.showDependencies);
  const people = usePeopleStore((state) => state.people);

  const scale = useGanttViewStore((state) => state.scale);
  const search = useGanttViewStore((state) => state.search);
  const filter = useGanttViewStore((state) => state.filter);
  const collapsed = useGanttViewStore((state) => state.collapsed);
  const selectedId = useGanttViewStore((state) => state.selectedId);
  const showCriticalPath = useGanttViewStore((state) => state.showCriticalPath);
  const select = useGanttViewStore((state) => state.select);
  const toggleCollapsed = useGanttViewStore((state) => state.toggleCollapsed);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  // Set the moment a drag snaps a whole column, and cleared shortly after the
  // pointer comes up — the flag that tells "pressed a bar" from "moved a bar",
  // so releasing after a drag doesn't also open the panel.
  const movedRef = useRef(false);

  // One "now" per mount. Re-reading the clock on every render would let the
  // today band and the canvas origin change under a drag.
  const today = useMemo(() => new Date(), []);
  const { minDate, totalDays, todayIndex } = useMemo(() => planRange(items, today), [items, today]);
  const columnWidth = COLUMN_WIDTH_PX[scale];

  const rows = useMemo(
    () => visibleRows(items, { collapsed, search, filter, people }),
    [items, collapsed, search, filter, people],
  );

  // How many day columns are actually drawn. At least the plan's own span,
  // and at least enough to reach the right edge of the viewport — otherwise a
  // plan shorter than the window leaves a bare strip beside a grid that stops
  // in mid-air. The prototype never meets this: its canvas is a fixed 133
  // days, wider than any window it was drawn at. A canvas derived from the
  // plan has to say so itself.
  const viewportWidth = useElementWidth(scrollRef);
  const renderedDays = Math.max(totalDays, Math.ceil((viewportWidth - LIST_WIDTH_PX) / columnWidth));
  const canvasWidth = renderedDays * columnWidth;
  const bodyHeight = Math.max(rows.length * ROW_HEIGHT_PX + ADD_ROW_HEIGHT_PX, MIN_BODY_HEIGHT_PX);

  // Clamped against what is drawn rather than against the plan's own extent:
  // a bar can be dragged anywhere on the canvas the eye can see.
  const spans = useMemo(
    () => previewSpans(items, minDate, renderedDays, drag),
    [items, minDate, renderedDays, drag],
  );
  const { critical, slackOf } = useMemo(() => criticalPath(items, minDate), [items, minDate]);
  const headerCells = useMemo(
    () => buildHeaderCells(minDate, renderedDays, scale),
    [minDate, renderedDays, scale],
  );
  const weekends = useMemo(
    () => weekendStarts(minDate, renderedDays, scale),
    [minDate, renderedDays, scale],
  );

  const progressById = useMemo(
    () => new Map(rows.map((row) => [row.item.id, progressOf(items, row.item, minDate)])),
    [rows, items, minDate],
  );

  const assigneesById = useMemo(() => {
    const entries = rows.map((row): [string, BarAssignee[]] => {
      const assignee = row.item.assignee;
      if (!assignee) return [row.item.id, []];
      const index = people.findIndex((person) => person.name === assignee.name);
      return [
        row.item.id,
        [{ name: assignee.name, initials: getInitials(assignee.name), color: avatarColor(index, assignee.name) }],
      ];
    });
    return new Map(entries);
  }, [rows, people]);

  const dateRangeById = useMemo(
    () =>
      new Map(
        rows.map((row) => {
          const span = spans.get(row.item.id);
          if (!span) return [row.item.id, ''];
          return [
            row.item.id,
            `${formatDayLabel(minDate, span.start)} – ${formatDayLabel(minDate, span.start + span.len - 1)}`,
          ];
        }),
      ),
    [rows, spans, minDate],
  );

  const statusLabelById = useMemo(
    () => new Map(rows.map((row) => [row.item.id, STATUS_LABEL[row.status]])),
    [rows],
  );

  const scrollToToday = useCallback(
    (behavior: ScrollBehavior) => {
      scrollRef.current?.scrollTo({
        left: Math.max(0, todayIndex * columnWidth - TODAY_SCROLL_LEAD_PX),
        behavior,
      });
    },
    [todayIndex, columnWidth],
  );

  // The toolbar's Today button, which lives outside this component now (see
  // requestToday). Skips the very first run so it does not fight the mount
  // scroll below with a smooth animation over the top of it.
  const todayNonce = useGanttViewStore((state) => state.todayNonce);
  const seenNonce = useRef(todayNonce);
  useEffect(() => {
    if (seenNonce.current === todayNonce) return;
    seenNonce.current = todayNonce;
    scrollToToday('smooth');
  }, [todayNonce, scrollToToday]);

  // Open on today rather than on the plan's first day: what is happening now
  // is what the view is usually opened to find.
  useEffect(() => {
    scrollToToday('auto');
    // Only on mount — re-running this on a scale change would yank the view
    // back to today every time someone switched to Month.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Writes a finished drag onto the plan. */
  const commitDrag = useCallback(
    (finished: DragState) => {
      const dragged = items.find((item) => item.id === finished.id);
      if (!dragged) return;

      const isGroup = items.some((item) => item.parentId === finished.id);
      if (isGroup) {
        // A group has no dates to move, only its children's — so the whole
        // block shifts by one offset. The group's own stored dates shift with
        // it: nothing on this screen draws them, but the export slides read
        // them, and leaving them behind would split the two views of the
        // same phase.
        if (finished.mode !== 'move') return;
        const days = groupMoveDays(items, minDate, renderedDays, finished);
        if (days === 0) return;

        [finished.id, ...descendantLeafIds(items, finished.id)].forEach((id) => {
          const target = items.find((item) => item.id === id);
          if (!target) return;
          const start = spans.get(id);
          if (id === finished.id || !start) {
            // Groups (including nested ones) keep no span of their own here,
            // so they move by day arithmetic on their stored dates.
            updateItem(id, {
              start: shiftIsoDate(target.start, days),
              end: shiftIsoDate(target.end, days),
            });
            return;
          }
          updateItem(id, {
            start: isoAtIndex(minDate, start.start),
            end: isoAtIndex(minDate, start.start + start.len - 1),
          });
        });
        return;
      }

      const span = spans.get(finished.id);
      if (!span) return;
      const startIso = isoAtIndex(minDate, span.start);
      const endIso = isoAtIndex(minDate, span.start + span.len - 1);

      if (finished.mode === 'move') updateItem(finished.id, { start: startIso, end: endIso });
      else if (finished.mode === 'start') updateItem(finished.id, { start: startIso });
      else updateItem(finished.id, { end: endIso });
    },
    [items, minDate, renderedDays, spans, updateItem],
  );

  const commitRef = useRef(commitDrag);
  commitRef.current = commitDrag;

  /** Starts a move or a resize. The pointer is followed on `window`, not on
   * the bar, so a fast drag that outruns the cursor keeps its grip. */
  const beginDrag = useCallback(
    (id: string, event: React.PointerEvent, mode: DragState['mode']) => {
      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      movedRef.current = false;
      let latest: DragState = { id, mode, days: 0 };

      const onMove = (moveEvent: PointerEvent) => {
        const days = Math.round((moveEvent.clientX - startX) / columnWidth);
        if (days !== 0) movedRef.current = true;
        latest = { id, mode, days };
        setDrag(latest);
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        if (latest.days !== 0) commitRef.current(latest);
        setDrag(null);
        window.setTimeout(() => {
          movedRef.current = false;
        }, CLICK_SUPPRESS_MS);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [columnWidth],
  );

  const cycleStatus = (id: string) => {
    const item = items.find((candidate) => candidate.id === id);
    if (!item) return;
    // A group's status is its children's; there is nothing here to cycle.
    if (items.some((candidate) => candidate.parentId === id)) return;

    const current: TaskStatus = item.status ?? 'todo';
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];
    // Done means finished and not started means untouched, so both move the
    // percentage with them; the other two say nothing about it and leave it
    // alone. One rule, shared with the panel's status field.
    updateItem(id, { status: next, progress: progressForStatus(next) ?? item.progress });
  };

  const addTask = (name: string) => {
    const task = buildNewTask({
      label: name,
      start: isoAtIndex(minDate, todayIndex),
      end: isoAtIndex(minDate, todayIndex + 4),
      status: 'todo',
    });
    addItem(task);
    select(task.id);
  };

  const dragSpan = drag ? spans.get(drag.id) : undefined;
  const dragLabel = dragSpan
    ? `${formatDayLabel(minDate, dragSpan.start)} → ${formatDayLabel(minDate, dragSpan.start + dragSpan.len - 1)}  (${dragSpan.len}d)`
    : '';

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, background: 'var(--gantt-surface)' }}>
      <div
        ref={scrollRef}
        className="gantt-scroll"
        style={{ flex: 1, minWidth: 0, overflow: 'auto', position: 'relative' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `${LIST_WIDTH_PX}px ${canvasWidth}px`,
            // The body row is at least as tall as the rows it holds, and
            // takes the rest of the viewport when there are fewer rows than
            // that — which is what the grid's own `minHeight: 100%` is for.
            // Without the minmax, a short plan would leave the grid, the
            // weekend tint and the today band stopping in mid-air with bare
            // white under them.
            gridTemplateRows: `${HEADER_HEIGHT_PX}px minmax(${bodyHeight}px, 1fr)`,
            width: LIST_WIDTH_PX + canvasWidth,
            minHeight: '100%',
          }}
        >
          {/* The corner: stuck to both edges, so it stays over the list's
              header space whichever way the canvas is scrolled. */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              left: 0,
              zIndex: 40,
              gridColumn: 1,
              gridRow: 1,
              width: LIST_WIDTH_PX,
              height: HEADER_HEIGHT_PX,
              background: 'var(--gantt-surface)',
              borderRight: '1px solid var(--gantt-rule-strong)',
              borderBottom: '1px solid var(--gantt-rule-strong)',
              boxSizing: 'border-box',
            }}
          />

          <TimelineHeader cells={headerCells} columnWidth={columnWidth} width={canvasWidth} />

          <TaskList
            rows={rows}
            progressById={progressById}
            collapsed={collapsed}
            selectedId={selectedId}
            criticalIds={critical}
            showCriticalPath={showCriticalPath}
            onSelect={select}
            onToggleCollapse={toggleCollapsed}
            onCycleStatus={cycleStatus}
            onRename={(id, name) => updateItem(id, { label: name })}
            onAddTask={addTask}
          />

          <TimelineBody
            rows={rows}
            spans={spans}
            scale={scale}
            columnWidth={columnWidth}
            width={canvasWidth}
            height={bodyHeight}
            todayIndex={todayIndex}
            weekendStarts={weekends}
            progressById={progressById}
            assigneesById={assigneesById}
            dateRangeById={dateRangeById}
            statusLabelById={statusLabelById}
            selectedId={selectedId}
            criticalIds={critical}
            showCriticalPath={showCriticalPath}
            showDependencies={showDependencies}
            drag={drag}
            dragLabel={dragLabel}
            onPointerDownBar={beginDrag}
            onSelectBar={(id) => {
              if (!movedRef.current) select(id);
            }}
          />
        </div>
      </div>

      {selectedItem && (
        <EditTaskPanel
          // Keyed on the item, so switching rows resets the panel's own
          // draft fields instead of carrying one task's half-typed
          // assignee onto the next.
          key={selectedItem.id}
          item={selectedItem}
          minDate={minDate}
          spans={spans}
          slackOf={slackOf}
          criticalIds={critical}
        />
      )}
    </div>
  );
}
