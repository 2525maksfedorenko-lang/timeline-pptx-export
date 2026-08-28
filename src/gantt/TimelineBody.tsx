import { useMemo } from 'react';

import { ROW_HEIGHT_PX, type Span } from './geometry';
import { periodRuleLayer, type HeaderCell, type TimeScale } from './scale';
import { FALLBACK_BAR_STYLE, type BarStyle } from './barColor';
import type { GanttRowModel } from './rows';
import type { DragState } from './drag';
import { TaskBar } from './TaskBar';
import { CreateSurface } from './CreateSurface';
import { DragPill } from './DragPill';

interface TimelineBodyProps {
  rows: GanttRowModel[];
  spans: Map<string, Span>;
  scale: TimeScale;
  /** The header's cells — the grid's period lines are ruled at their edges,
   * so the two can't drift apart. */
  cells: HeaderCell[];
  /** Each task's branch colour, resolved to CSS. */
  barStyleById: Map<string, BarStyle>;
  columnWidth: number;
  width: number;
  height: number;
  todayIndex: number;
  /** Column indices that start a Saturday. */
  weekendStarts: number[];
  /** "Aug 17 – Aug 24" per row, for the bar tooltips. */
  dateRangeById: Map<string, string>;
  statusLabelById: Map<string, string>;
  selectedId: string | null;
  drag: DragState | null;
  /** The pill's text while a drag is in flight, e.g. "Aug 13 → Aug 18  (6d)". */
  dragLabel: string;
  onPointerDownBar: (id: string, event: React.PointerEvent, mode: DragState['mode']) => void;
  onContextMenuBar: (id: string, event: React.MouseEvent) => void;
  onSelectBar: (id: string) => void;
  /** Columns drawn on the canvas — what a drawn edge is clamped to. */
  dayCount: number;
  /** "Aug 17" for a column index. */
  formatDay: (index: number) => string;
  /** A task drawn on the grid, named and confirmed: its dates, and the row it
   * was drawn in. */
  onCreateTask: (span: Span, rowIndex: number, name: string) => void;
}

/** The timeline half of the canvas: the ruled grid, the three washes that
 * mark time on it, the links, and the bars.
 *
 * The grid is painted, not drawn — layered gradients rather than an element
 * per line, so a two-year plan at the day scale costs the same as a two-week
 * one. Each rule is 1px on the last pixel of its period: faint day lines
 * (week scale only, where a day is too narrow to rule strongly), strong
 * period lines on the header's own cell edges, and soft row lines.
 *
 * Everything above the grid is stacked deliberately: weekend tint (0), the
 * today band (2), the create surface (3), the bars (5) with their edge dots
 * (6), and a drawn task's ghost, field and pill over all of it.
 *
 * That stack is also the hit-test order, and it is the whole of how drawing a
 * task and moving one are told apart. The create surface covers the entire
 * canvas, so the two washes below it are marked `pointer-events: none` — they
 * are decoration and have no press of their own to answer — while the bars
 * above it keep theirs. A press therefore lands on a bar if there is one under
 * it and on the create surface otherwise, with nothing to arbitrate in JS. */
export function TimelineBody({
  rows,
  spans,
  scale,
  cells,
  barStyleById,
  columnWidth,
  width,
  height,
  todayIndex,
  weekendStarts,
  dateRangeById,
  statusLabelById,
  selectedId,
  drag,
  dragLabel,
  onPointerDownBar,
  onContextMenuBar,
  onSelectBar,
  dayCount,
  formatDay,
  onCreateTask,
}: TimelineBodyProps) {
  // Day rules appear only at the week scale: the day scale already rules
  // every column as its period, and at the month scale 7px columns would
  // fill in solid.
  const dayLine = scale === 'week' ? columnWidth : 0;

  const periodLayer = useMemo(() => periodRuleLayer(cells, columnWidth), [cells, columnWidth]);

  const gridLayers = [
    dayLine
      ? `repeating-linear-gradient(to right, transparent 0 ${dayLine - 1}px, var(--gantt-rule-faint) ${dayLine - 1}px ${dayLine}px)`
      : '',
    periodLayer,
    `repeating-linear-gradient(to bottom, transparent 0 ${ROW_HEIGHT_PX - 1}px, var(--gantt-rule-soft) ${ROW_HEIGHT_PX - 1}px ${ROW_HEIGHT_PX}px)`,
  ].filter(Boolean);

  const dragRowIndex = drag ? rows.findIndex((row) => row.item.id === drag.id) : -1;
  const dragSpan = drag ? spans.get(drag.id) : undefined;

  return (
    <div
      style={{
        position: 'relative',
        width,
        minHeight: height,
        height: '100%',
        background: gridLayers.join(','),
      }}
    >
      {weekendStarts.map((index) => (
        <div
          key={`weekend-${index}`}
          style={{
            position: 'absolute',
            left: index * columnWidth,
            top: 0,
            width: columnWidth * 2,
            bottom: 0,
            background: 'var(--gantt-weekend)',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />
      ))}

      <div
        style={{
          position: 'absolute',
          left: todayIndex * columnWidth,
          top: 0,
          // At the month scale a day is 7px, which would read as a hairline
          // rather than a band, so the band keeps a 6px floor.
          width: Math.max(columnWidth, 6),
          bottom: 0,
          background: 'var(--gantt-today-fill)',
          borderLeft: '1px solid var(--gantt-today-edge)',
          borderRight: '1px solid var(--gantt-today-edge)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />

      {rows.map((row, index) => {
        const span = spans.get(row.item.id);
        if (!span) return null;
        return (
          <TaskBar
            key={row.item.id}
            row={row}
            span={span}
            rowIndex={index}
            columnWidth={columnWidth}
            canvasWidth={width}
            isSelected={selectedId === row.item.id}
            barStyle={barStyleById.get(row.item.id) ?? FALLBACK_BAR_STYLE}
            dateRange={dateRangeById.get(row.item.id) ?? ''}
            statusLabel={statusLabelById.get(row.item.id) ?? ''}
            onPointerDownBar={(event, mode) => onPointerDownBar(row.item.id, event, mode)}
            onSelect={() => onSelectBar(row.item.id)}
            onContextMenu={(event) => onContextMenuBar(row.item.id, event)}
          />
        );
      })}

      {drag && dragSpan && dragRowIndex >= 0 && (
        <DragPill
          left={dragSpan.start * columnWidth}
          top={Math.max(0, dragRowIndex * ROW_HEIGHT_PX - 22)}
          label={dragLabel}
        />
      )}

      {/* Every free pixel of the canvas: a drag anywhere the bars are not
          draws a task's dates. Panning by drag lives on the date header now,
          which is what makes one gesture enough here. */}
      <CreateSurface
        columnWidth={columnWidth}
        dayCount={dayCount}
        canvasWidth={width}
        formatDay={formatDay}
        onCreate={onCreateTask}
      />
    </div>
  );
}
