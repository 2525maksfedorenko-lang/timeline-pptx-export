import { ROW_HEIGHT_PX } from './geometry';
import { PERIOD_DAYS, type TimeScale } from './scale';
import type { Span } from './rollup';
import type { GanttRowModel } from './rows';
import type { DragState } from './drag';
import { TaskBar } from './TaskBar';

interface TimelineBodyProps {
  rows: GanttRowModel[];
  spans: Map<string, Span>;
  scale: TimeScale;
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
}

/** The timeline half of the canvas: the ruled grid, the three washes that
 * mark time on it, the links, and the bars.
 *
 * The grid is painted, not drawn — three layered repeating gradients rather
 * than a line per day, so a two-year plan at the day scale costs the same as
 * a two-week one. Each rule is 1px on the last pixel of its period: faint day
 * lines (week scale only, where a day is too narrow to rule strongly), strong
 * period lines at whatever the scale groups by, and soft row lines.
 *
 * Everything above the grid is stacked deliberately: weekend tint (0), the
 * pink after a blocked task's deadline (1), the today band (2), the links (4),
 * the bars (5) with their edge dots (6), and the drag pill over all of it. */
export function TimelineBody({
  rows,
  spans,
  scale,
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
}: TimelineBodyProps) {
  const period = columnWidth * PERIOD_DAYS[scale];
  // Day rules appear only at the week scale: the day scale already rules
  // every column as its period, and at the month scale 7px columns would
  // fill in solid.
  const dayLine = scale === 'week' ? columnWidth : 0;

  const gridLayers = [
    dayLine
      ? `repeating-linear-gradient(to right, transparent 0 ${dayLine - 1}px, var(--gantt-rule-faint) ${dayLine - 1}px ${dayLine}px)`
      : '',
    `repeating-linear-gradient(to right, transparent 0 ${period - 1}px, var(--gantt-rule-strong) ${period - 1}px ${period}px)`,
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
          }}
        />
      ))}

      {/* Everything a blocked task overruns into: the days after its deadline,
          fading out to the right of the row it belongs to. */}
      {rows.map((row, index) => {
        if (row.status !== 'blocked') return null;
        const span = spans.get(row.item.id);
        if (!span) return null;
        const from = (span.start + span.len) * columnWidth;
        return (
          <div
            key={`overrun-${row.item.id}`}
            style={{
              position: 'absolute',
              left: from,
              top: index * ROW_HEIGHT_PX,
              width: Math.max(0, width - from),
              height: ROW_HEIGHT_PX,
              background: 'var(--gantt-out-of-range)',
              zIndex: 1,
            }}
          />
        );
      })}

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
            dateRange={dateRangeById.get(row.item.id) ?? ''}
            statusLabel={statusLabelById.get(row.item.id) ?? ''}
            onPointerDownBar={(event, mode) => onPointerDownBar(row.item.id, event, mode)}
            onSelect={() => onSelectBar(row.item.id)}
            onContextMenu={(event) => onContextMenuBar(row.item.id, event)}
          />
        );
      })}

      {drag && dragSpan && dragRowIndex >= 0 && (
        <div
          style={{
            position: 'absolute',
            left: dragSpan.start * columnWidth,
            top: Math.max(0, dragRowIndex * ROW_HEIGHT_PX - 22),
            zIndex: 20,
            background: 'var(--gantt-drag-pill-bg)',
            color: 'var(--gantt-drag-pill-fg)',
            fontSize: 10.5,
            fontWeight: 600,
            padding: '4px 8px',
            borderRadius: 5,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {dragLabel}
        </div>
      )}
    </div>
  );
}
