import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { buttonBaseClass } from '../components/systemUi';
import { ContextMenu, type ContextMenuAction } from '../components/ContextMenu';
import { useTimelineStore } from '../store/timelineStore';
import { buildNewTask } from '../utils/newTask';
import { buildBranchColors } from '../utils/branchColors';
import { buildDepthMap } from '../utils/barNesting';
import { buildBarStyles } from './barColor';
import { progressForStatus } from '../utils/progressForStatus';
import { useScrollPanes } from './useScrollPanes';
import type { TaskStatus } from '../types/timeline';
import {
  clampListWidth,
  HEADER_HEIGHT_PX,
  LIST_RESIZE_HANDLE_PX,
  MAX_LIST_WIDTH_PX,
  MIN_BODY_HEIGHT_PX,
  MIN_LIST_WIDTH_PX,
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
import { childrenOf, isSubtask } from './rollup';
import { visibleRows } from './rows';
import { previewSpans, type DragState } from './drag';
import { STATUS_CYCLE, STATUS_LABEL } from './tone';
import { TimelineHeader } from './TimelineHeader';
import { TaskList } from './TaskList';
import { TimelineBody } from './TimelineBody';
import { EditTaskPanel } from './EditTaskPanel';
import { useGanttViewStore } from './viewStore';

/** How long after a pointerup a drag keeps suppressing the click it would
 * otherwise fire. Long enough for the click event to have been and gone,
 * short enough that the next real click lands. */
const CLICK_SUPPRESS_MS = 30;

/** What a sub-task is called for the moment between being created and being
 * named. The name field opens on it immediately, so this is what stands if
 * the rename is abandoned rather than a placeholder anyone types over. */
const NEW_SUBTASK_LABEL = 'New sub-task';

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
  const deleteTaskCascade = useTimelineStore((state) => state.deleteTaskCascade);
  const toggleIncludeInExportCascade = useTimelineStore((state) => state.toggleIncludeInExportCascade);
  const createPlanFromBranch = useTimelineStore((state) => state.createPlanFromBranch);
  const activePlanId = useTimelineStore((state) => state.activePlanId);

  const scale = useGanttViewStore((state) => state.scale);
  const listWidth = useGanttViewStore((state) => state.listWidth);
  const setListWidth = useGanttViewStore((state) => state.setListWidth);
  const collapsed = useGanttViewStore((state) => state.collapsed);
  const selectedId = useGanttViewStore((state) => state.selectedId);
  const select = useGanttViewStore((state) => state.select);
  const toggleCollapsed = useGanttViewStore((state) => state.toggleCollapsed);
  const collapseBranch = useGanttViewStore((state) => state.collapseBranch);
  const beginRename = useGanttViewStore((state) => state.beginRename);
  const focusId = useGanttViewStore((state) => state.focusId);
  const setFocus = useGanttViewStore((state) => state.setFocus);

  // Resolved against the plan rather than trusted: the focused parent can be
  // deleted, or the plan switched under it, and a focus on an item that is no
  // longer there is simply no focus.
  const focusItem = focusId === null ? null : (items.find((item) => item.id === focusId) ?? null);
  const activeFocusId = focusItem?.id ?? null;

  // The row a right-click opened a menu on, and where the pointer was.
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  // Set the moment a drag snaps a whole column, and cleared shortly after the
  // pointer comes up — the flag that tells "pressed a bar" from "moved a bar",
  // so releasing after a drag doesn't also open the panel.
  const movedRef = useRef(false);

  // One "now" per mount. Re-reading the clock on every render would let the
  // today band and the canvas origin change under a drag.
  const today = useMemo(() => new Date(), []);
  const { minDate, totalDays, todayIndex, firstTaskIndex, lastTaskIndex } = useMemo(
    () => planRange(items, today),
    [items, today],
  );
  const columnWidth = COLUMN_WIDTH_PX[scale];

  const rows = useMemo(
    () => visibleRows(items, { collapsed, focusId: activeFocusId }),
    [items, collapsed, activeFocusId],
  );

  const bodyHeight = Math.max(rows.length * ROW_HEIGHT_PX + ADD_ROW_HEIGHT_PX, MIN_BODY_HEIGHT_PX);

  // The three panes and the one scroller between them. The column width is
  // all the hook needs from here: it is how it recognises a scale change.
  const panes = useScrollPanes({ columnWidth });

  // The width a drag on the seam is currently proposing, or null when no drag
  // is under way. Held here rather than written straight to the store because
  // the store is persisted: committing on pointerup is one localStorage write
  // per drag instead of one per pixel moved.
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const listResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const shownListWidth = dragWidth ?? listWidth;
  const isResizingList = dragWidth !== null;

  const beginListResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    listResizeRef.current = { startX: event.clientX, startWidth: listWidth };
    setDragWidth(listWidth);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveListResize = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = listResizeRef.current;
    if (!start) return;
    setDragWidth(clampListWidth(start.startWidth + (event.clientX - start.startX)));
  };

  const endListResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!listResizeRef.current) return;
    listResizeRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragWidth((width) => {
      if (width !== null) setListWidth(width);
      return null;
    });
  };

  // The seam is draggable without a pointer too — 16px a press, which is a
  // visible step without being a jump.
  const nudgeListResize = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowLeft' ? -16 : event.key === 'ArrowRight' ? 16 : 0;
    if (step === 0) return;
    event.preventDefault();
    setListWidth(listWidth + step);
  };

  // The drag holds the col-resize cursor across the whole window, not just the
  // 9px strip the pointer started on.
  useEffect(() => {
    if (!isResizingList) return;
    document.body.classList.add('gantt-col-resizing');
    return () => document.body.classList.remove('gantt-col-resizing');
  }, [isResizingList]);

  // How many day columns are actually drawn. At least the plan's own span,
  // and at least enough to fill the timeline zone — otherwise a plan shorter
  // than the zone leaves a bare strip beside a grid that stops in mid-air.
  // The prototype never meets this: its canvas is a fixed 133 days, wider
  // than any window it was drawn at. A canvas derived from the plan has to
  // say so itself.
  const renderedDays = Math.max(totalDays, Math.ceil(panes.viewportWidth / columnWidth));
  const canvasWidth = renderedDays * columnWidth;

  // Clamped against what is drawn rather than against the plan's own extent:
  // a bar can be dragged anywhere on the canvas the eye can see.
  const spans = useMemo(
    () => previewSpans(items, minDate, renderedDays, drag),
    [items, minDate, renderedDays, drag],
  );
  const headerCells = useMemo(
    () => buildHeaderCells(minDate, renderedDays, scale),
    [minDate, renderedDays, scale],
  );
  const weekends = useMemo(
    () => weekendStarts(minDate, renderedDays, scale),
    [minDate, renderedDays, scale],
  );

  // Colour is branch, not status — the rule the exported deck draws by, shared
  // with it through buildBranchColors so the two can't drift. Both maps are
  // built from the whole plan: depth so a focused view doesn't repaint a
  // sub-tree it promoted, colour so excluding a task from the export doesn't
  // shift the palette under its neighbours.
  const barStyleById = useMemo(
    () => buildBarStyles(buildBranchColors(items), buildDepthMap(items)),
    [items],
  );

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
    (behavior: ScrollBehavior) => panes.scrollToDay(todayIndex, columnWidth, TODAY_SCROLL_LEAD_PX, behavior),
    [panes, todayIndex, columnWidth],
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

  // Where the view opens.
  //
  // Today, when today is somewhere inside the plan — what is happening now is
  // what the view is usually opened to find. But a plan is not always around
  // today: a file can carry a root left behind in 2025 and another one out in
  // 2027, and then the canvas is two years wide with almost all of it empty.
  // Opening such a plan on today would land on bare grid, so it opens on its
  // first task instead — the first thing there is to see.
  const opensOn = todayIndex >= firstTaskIndex && todayIndex <= lastTaskIndex ? todayIndex : firstTaskIndex;
  // Once per plan, not once per mount: switching plans, or importing one over
  // the top of another, lands on a canvas of a different width where the old
  // scroll offset means a different date — usually a stretch of empty grid.
  const openedPlanRef = useRef<string | null>(null);
  useEffect(() => {
    // Waits for the zone to have been measured, since the target is worked
    // out against its width.
    if (panes.viewportWidth === 0) return;
    const planKey = activePlanId ?? '';
    if (openedPlanRef.current === planKey) return;
    openedPlanRef.current = planKey;
    panes.scrollToDay(opensOn, columnWidth, TODAY_SCROLL_LEAD_PX, 'auto');
  }, [panes, opensOn, columnWidth, activePlanId]);

  /** Writes a finished drag onto the plan.
   *
   * One path for every bar. A phase has its own two dates like any other task,
   * so it is moved and resized like any other task — and it moves alone: its
   * sub-tasks keep the dates they had, which is what makes the two editable
   * independently. */
  const commitDrag = useCallback(
    (finished: DragState) => {
      const span = spans.get(finished.id);
      if (!span) return;
      const startIso = isoAtIndex(minDate, span.start);
      const endIso = isoAtIndex(minDate, span.start + span.len - 1);

      if (finished.mode === 'move') updateItem(finished.id, { start: startIso, end: endIso });
      else if (finished.mode === 'start') updateItem(finished.id, { start: startIso });
      else updateItem(finished.id, { end: endIso });
    },
    [minDate, spans, updateItem],
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

  /** Whether the list's own add row leads anywhere. It does everywhere except
   * inside a focus on an item that is itself a sub-task — there a new task
   * would become that sub-task's sub-task, which is the one thing this screen
   * does not create. Only a plan that arrived already nested two levels deep
   * can reach that view at all; the row says why rather than disappearing. */
  const canAddTask = activeFocusId === null || !isSubtask(items, activeFocusId);

  const addTask = (name: string) => {
    const task = buildNewTask(
      {
        label: name,
        start: isoAtIndex(minDate, todayIndex),
        end: isoAtIndex(minDate, todayIndex + 4),
        status: 'todo',
      },
      // Inside a focus the list is one parent's sub-tasks, so a task added to
      // it is one of them — a new root would vanish the moment it was typed.
      activeFocusId === null ? {} : { parentId: activeFocusId },
    );
    addItem(task);
    select(task.id);
  };

  /** A sub-task under `parentId`, spanning its parent.
   *
   * The defaults are the ones the bar menu used before this screen was
   * rebuilt: the parent's own span (which is always a valid range), status
   * "not started", nothing else set. What has changed is where the naming
   * happens — the old menu collected a name, two dates and a status in a
   * popup before creating anything, and this screen has an inline name field
   * on every row already, so the task is created first and named in place.
   * The span comes from the drawn spans rather than the parent's stored pair
   * so that a sub-task created mid-drag starts where the bar is being dropped;
   * with the date roll-up gone the two are otherwise the same dates. The
   * sub-task is free to leave that span the moment it is dragged — nothing
   * pulls the parent after it. */
  const addSubtask = (parentId: string) => {
    const parent = items.find((item) => item.id === parentId);
    if (!parent) return null;
    // One level deep and no further. The controls that reach this — the row's
    // "+" and the menu's row — are already absent on a sub-task; the guard is
    // here so the rule holds at the one place a sub-task is actually made,
    // rather than in each control that offers to make one.
    if (isSubtask(items, parentId)) return null;

    const span = spans.get(parentId);
    const task = buildNewTask(
      {
        label: NEW_SUBTASK_LABEL,
        start: span ? isoAtIndex(minDate, span.start) : parent.start,
        end: span ? isoAtIndex(minDate, span.start + span.len - 1) : parent.end,
        status: 'todo',
      },
      { parentId },
    );
    addItem(task);
    // A collapsed parent would swallow the row that is about to be renamed.
    if (collapsed[parentId]) toggleCollapsed(parentId);
    beginRename(task.id, task.label);
  };

  /** The sub-task count badge's action: this row and everything under it,
   * copied into a plan of its own, which then opens.
   *
   * A copy and not a view — that is the whole difference between this and
   * "Show only sub-tasks", which is the same branch left where it is. The plan it was taken from keeps every task it had and is
   * still in the switcher; the new one is a plan like any other, so it is
   * edited, saved and exported like any other. */
  const makePlanFromBranch = (id: string) => {
    void createPlanFromBranch(id);
    // Whatever was being focused on lives in the plan being left. Clearing it
    // opens the new plan whole, which is what a plan of its own means.
    setFocus(null);
  };

  /** This item and every group under it — what "the branch" means to the
   * action that folds one away. */
  const branchGroupIds = (id: string): string[] => {
    const children = childrenOf(items, id);
    if (children.length === 0) return [];
    return [id, ...children.flatMap((child) => branchGroupIds(child.id))];
  };

  const deleteTask = (id: string) => {
    const item = items.find((candidate) => candidate.id === id);
    if (!item) return;
    // Same question, same words as the Edit Task panel's own delete — one
    // action asked about one way, wherever it is reached from.
    const descendants = childrenOf(items, id).length;
    const confirmed = window.confirm(
      descendants > 0
        ? `Delete '${item.label}' and its sub-tasks? This can't be undone.`
        : `Delete '${item.label}'? This can't be undone.`,
    );
    if (!confirmed) return;
    deleteTaskCascade(id);
    if (selectedId === id) select(null);
  };

  /** The rows a right-click offers, on the name and on the bar alike. Six at
   * most, and three of them only where they mean anything: a task with no
   * sub-tasks has no branch to fold away or to look at on its own, and a task
   * that is itself a sub-task takes no sub-tasks of its own.
   *
   * Making a plan out of a branch is not among them: it is the sub-task count
   * badge's click, and the badge is the one thing on a row that already names
   * the sub-tasks that would come along. */
  const menuActions = (id: string): ContextMenuAction[] => {
    const isGroup = childrenOf(items, id).length > 0;
    const isIncluded = items.find((candidate) => candidate.id === id)?.includeInExport !== false;
    return [
      ...(isSubtask(items, id)
        ? []
        : [
            {
              label: 'Add sub-task',
              icon: <Plus size={14} strokeWidth={2} aria-hidden="true" />,
              onSelect: () => addSubtask(id),
            },
          ]),
      {
        label: 'Rename',
        icon: <Pencil size={14} strokeWidth={2} aria-hidden="true" />,
        onSelect: () => {
          const item = items.find((candidate) => candidate.id === id);
          if (item) beginRename(item.id, item.label);
        },
      },
      ...(isGroup
        ? [
            {
              label: 'Show only sub-tasks',
              icon: <Layers size={14} strokeWidth={2} aria-hidden="true" />,
              onSelect: () => setFocus(id),
            },
            {
              label: 'Hide sub-tasks',
              icon: <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />,
              onSelect: () => collapseBranch(branchGroupIds(id)),
            },
          ]
        : []),
      {
        // Named for what it will do, not for the state it is in. The whole
        // branch travels together, because a phase in the deck without its
        // tasks — or tasks without the phase they sit under — is not a thing
        // anyone means to export.
        label: isIncluded
          ? `Exclude ${isGroup ? 'branch ' : ''}from export`
          : `Include ${isGroup ? 'branch ' : ''}in export`,
        icon: isIncluded ? (
          <EyeOff size={14} strokeWidth={2} aria-hidden="true" />
        ) : (
          <Eye size={14} strokeWidth={2} aria-hidden="true" />
        ),
        onSelect: () => toggleIncludeInExportCascade(id),
      },
      {
        label: 'Delete',
        icon: <Trash2 size={14} strokeWidth={2} aria-hidden="true" />,
        destructive: true,
        onSelect: () => deleteTask(id),
      },
    ];
  };

  const openMenu = (id: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ id, x: event.clientX, y: event.clientY });
  };

  const dragSpan = drag ? spans.get(drag.id) : undefined;
  const dragLabel = dragSpan
    ? `${formatDayLabel(minDate, dragSpan.start)} → ${formatDayLabel(minDate, dragSpan.start + dragSpan.len - 1)}  (${dragSpan.len}d)`
    : '';

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  // Resolved for the same reason the focus is: the row a menu is open on can
  // be deleted by that very menu.
  const menuItem = menu === null ? null : (items.find((item) => item.id === menu.id) ?? null);

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, background: 'var(--gantt-surface)' }}>
      {/* The plan and, above it when one is open, the bar naming the focus.
          A column, so the bar is the plan's own strip and does not run under
          the Edit Task panel beside it. */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {focusItem && (
          <div
            style={{
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              height: 38,
              padding: '0 14px',
              boxSizing: 'border-box',
              background: 'var(--gantt-band)',
              borderBottom: '1px solid var(--gantt-rule-strong)',
            }}
          >
            <button
              type="button"
              onClick={() => setFocus(null)}
              className={buttonBaseClass('ghost', 'h-7 gap-1 px-2 text-[11px] font-semibold')}
              style={{ color: 'var(--gantt-text-secondary)' }}
            >
              <ChevronLeft size={14} strokeWidth={2.2} aria-hidden="true" />
              Back to plan
            </button>
            <span className="h-4 w-px flex-none" style={{ background: 'var(--gantt-rule-strong)' }} />
            <Layers size={13} strokeWidth={2.2} aria-hidden="true" color="var(--gantt-text-secondary)" />
            {/* Says both what is on screen and what is not: a narrowed chart
                with no such line reads as a plan that has lost its other
                tasks. */}
            <span style={{ fontSize: 12, color: 'var(--gantt-text-secondary)', minWidth: 0 }}>
              Sub-tasks of{' '}
              <span
                title={focusItem.label}
                style={{
                  fontWeight: 600,
                  color: 'var(--gantt-text)',
                }}
              >
                {focusItem.label}
              </span>
            </span>
          </div>
        )}

        {/* The frame. Two tracks by two: the header's height is a constant, the
            list's width is the one the seam was last dragged to, and the
            timeline zone takes whatever is left. Nothing here scrolls — the
            frame is what the three panes inside it scroll *within*, which is
            what keeps the zone the same width at every scale and keeps the
            scrollbar in view.
            
            Widening the list narrows the body pane, and the body is what
            `useScrollPanes` measures — so the canvas's own width, and with it
            the timeline's right edge, follows the drag without being told. */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: `${shownListWidth}px minmax(0, 1fr)`,
            gridTemplateRows: `${HEADER_HEIGHT_PX}px minmax(0, 1fr)`,
            overflow: 'hidden',
          }}
        >
          {/* The seam, as a grab strip. It sits over the rule the list pane
              draws rather than replacing it: a 1px border is the right line to
              look at and the wrong one to aim at, so the target is 9px wide
              and centred on it, and stays invisible until hovered.

              A sibling of the panes rather than a child of either, because it
              spans both grid rows — the corner above and the list below — and
              because being on top is what keeps its press away from the body's
              grab-to-pan. */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize the task column"
            aria-valuenow={shownListWidth}
            aria-valuemin={MIN_LIST_WIDTH_PX}
            aria-valuemax={MAX_LIST_WIDTH_PX}
            tabIndex={0}
            className="gantt-col-resize"
            data-dragging={isResizingList}
            onPointerDown={beginListResize}
            onPointerMove={moveListResize}
            onPointerUp={endListResize}
            onPointerCancel={endListResize}
            onKeyDown={nudgeListResize}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              // Centred on the 1px border, not on the column's edge: the
              // border occupies the pixel before `shownListWidth`, so the
              // strip starts half its width plus that pixel to the left.
              left: shownListWidth - Math.ceil(LIST_RESIZE_HANDLE_PX / 2),
              width: LIST_RESIZE_HANDLE_PX,
              zIndex: 20,
              cursor: 'col-resize',
              touchAction: 'none',
            }}
          />

          {/* The corner. It follows neither axis, so it is the one pane that is
              simply a box. */}
          <div
            style={{
              gridColumn: 1,
              gridRow: 1,
              background: 'var(--gantt-surface)',
              borderRight: '1px solid var(--gantt-rule-strong)',
              borderBottom: '1px solid var(--gantt-rule-strong)',
              boxSizing: 'border-box',
            }}
          />

          {/* The header pane: follows the body sideways, never moves up or
              down. Its right padding is the width of the body's vertical
              scrollbar, so the two show the same span of days rather than the
              header running a scrollbar's width further. */}
          <div
            ref={panes.headerRef}
            style={{
              gridColumn: 2,
              gridRow: 1,
              overflow: 'hidden',
              background: 'var(--gantt-surface)',
              borderBottom: '1px solid var(--gantt-rule-strong)',
              boxSizing: 'border-box',
              paddingRight: panes.gutter.vertical,
            }}
          >
            <TimelineHeader cells={headerCells} columnWidth={columnWidth} width={canvasWidth} />
          </div>

          {/* The list pane: follows the body down, never moves sideways. Its
              bottom padding matches the body's horizontal scrollbar for the
              same reason the header's right padding matches the vertical one. */}
          <div
            ref={panes.listRef}
            style={{
              gridColumn: 1,
              gridRow: 2,
              overflow: 'hidden',
              background: 'var(--gantt-surface)',
              borderRight: '1px solid var(--gantt-rule-strong)',
              boxSizing: 'border-box',
              paddingBottom: panes.gutter.horizontal,
            }}
          >
            <TaskList
              rows={rows}
              collapsed={collapsed}
              selectedId={selectedId}
              minHeight={bodyHeight}
              canAddTask={canAddTask}
              onSelect={select}
              onToggleCollapse={toggleCollapsed}
              onCycleStatus={cycleStatus}
              onRename={(id, name) => updateItem(id, { label: name })}
              onAddTask={addTask}
              onMakePlan={makePlanFromBranch}
              onAddSubtask={addSubtask}
              onContextMenu={openMenu}
            />
          </div>

          {/* The body: the only scroller on the screen. Both bars belong to it,
              which puts the horizontal one along the bottom of the timeline and
              nowhere near the task names. `overflow-x: scroll` rather than
              `auto` so the bar is a standing part of the zone instead of
              something that appears and disappears under the pointer. */}
          <div
            ref={panes.bodyRef}
            className="gantt-scroll"
            style={{
              gridColumn: 2,
              gridRow: 2,
              overflowX: 'scroll',
              overflowY: 'auto',
              position: 'relative',
              cursor: 'grab',
            }}
          >
            <TimelineBody
              rows={rows}
              spans={spans}
              scale={scale}
              cells={headerCells}
              barStyleById={barStyleById}
              columnWidth={columnWidth}
              width={canvasWidth}
              height={bodyHeight}
              todayIndex={todayIndex}
              weekendStarts={weekends}
              dateRangeById={dateRangeById}
              statusLabelById={statusLabelById}
              selectedId={selectedId}
              drag={drag}
              dragLabel={dragLabel}
              onPointerDownBar={beginDrag}
            onContextMenuBar={openMenu}
              onSelectBar={(id) => {
                // A pan ends in a click too, and selecting a task because
                // someone dragged the canvas past it would be a surprise.
                if (!movedRef.current && !panes.isPanningRef.current) select(id);
              }}
            />
          </div>
        </div>
      </div>

      {menuItem && menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          label={menuItem.label}
          actions={menuActions(menuItem.id)}
          onClose={() => setMenu(null)}
        />
      )}

      {selectedItem && (
        <EditTaskPanel
          // Keyed on the item, so switching rows resets the panel's own
          // draft fields instead of carrying one task's half-typed
          // comment onto the next.
          key={selectedItem.id}
          item={selectedItem}
          minDate={minDate}
          spans={spans}
        />
      )}
    </div>
  );
}
