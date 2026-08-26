import {
  barHeight,
  barLeft,
  barOffsetY,
  barWidth,
  EDGE_DOT_SIZE_PX,
  RESIZE_HANDLE_WIDTH_PX,
  ROW_HEIGHT_PX,
} from './geometry';
import type { Span } from './rollup';
import type { GanttRowModel } from './rows';
import { STATUS_TONE } from './tone';
import type { DragState } from './drag';
import { BAR_HIT_ATTRIBUTE } from './useScrollPanes';

interface TaskBarProps {
  row: GanttRowModel;
  span: Span;
  rowIndex: number;
  columnWidth: number;
  /** The canvas width, which the row wrapper spans so a bar can be positioned
   * anywhere along it. */
  canvasWidth: number;
  isSelected: boolean;
  /** Human date range for the bar's tooltip, e.g. "Aug 17 – Aug 24". */
  dateRange: string;
  statusLabel: string;
  onPointerDownBar: (event: React.PointerEvent, mode: DragState['mode']) => void;
  onSelect: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
}

/** One bar: a pale block in its status' tint, with its own name set on it in
 * the matching dark tone. A group's name is set in the heavier weight.
 *
 * The dot on the right edge is drawn as a sibling of the bar, not a child: it
 * hangs half outside the rounded rectangle and would be clipped by the
 * `overflow: hidden` that keeps the label inside the radius. */
export function TaskBar({
  row,
  span,
  rowIndex,
  columnWidth,
  canvasWidth,
  isSelected,
  dateRange,
  statusLabel,
  onPointerDownBar,
  onSelect,
  onContextMenu,
}: TaskBarProps) {
  const { item, isGroup, status } = row;
  const tone = STATUS_TONE[status];
  const height = barHeight(ROW_HEIGHT_PX);
  const top = barOffsetY(ROW_HEIGHT_PX);
  const left = barLeft(span.start, columnWidth);
  const width = barWidth(span.len, columnWidth);

  const handleStyle = (side: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute',
    top: 0,
    bottom: 0,
    [side]: 0,
    width: RESIZE_HANDLE_WIDTH_PX,
    zIndex: 3,
    cursor: 'ew-resize',
    touchAction: 'none',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: rowIndex * ROW_HEIGHT_PX,
        height: ROW_HEIGHT_PX,
        width: canvasWidth,
        zIndex: 5,
      }}
    >
      <div
        // Marks the bar as the one thing in the timeline that owns its own
        // press: a grab-pan of the canvas refuses to start anywhere inside
        // this element, so moving a bar and panning past it never both run.
        {...{ [BAR_HIT_ATTRIBUTE]: '' }}
        onPointerDown={(event) => onPointerDownBar(event, 'move')}
        onClick={onSelect}
        onContextMenu={onContextMenu}
        title={`${item.label} · ${dateRange} · ${statusLabel}`}
        style={{
          position: 'absolute',
          left,
          width,
          top,
          height,
          background: tone.bg,
          borderRadius: 5,
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          cursor: 'grab',
          border: 'none',
          // The only elevation on this screen: a ring in the status' own
          // solid, at half alpha, around the selected bar.
          boxShadow: isSelected ? `0 0 0 2px color-mix(in srgb, ${tone.fill} 50%, transparent)` : 'none',
        }}
      >
        <span
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '0 12px',
            fontSize: 14,
            fontWeight: isGroup ? 600 : 400,
            color: tone.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            pointerEvents: 'none',
          }}
        >
          {item.label}
        </span>

        {/* A group has no duration of its own to resize — its span is its
            children's — so it gets no handles, only the whole-block move. */}
        {!isGroup && (
          <>
            <div
              onPointerDown={(event) => onPointerDownBar(event, 'start')}
              title="Drag to change the start date"
              className="gantt-handle gantt-handle-left"
              style={handleStyle('left')}
            />
            <div
              onPointerDown={(event) => onPointerDownBar(event, 'end')}
              title="Drag to change the deadline"
              className="gantt-handle gantt-handle-right"
              style={handleStyle('right')}
            />
          </>
        )}
      </div>

      {!isGroup && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: left + width - 4,
            top: top - 4,
            width: EDGE_DOT_SIZE_PX,
            height: EDGE_DOT_SIZE_PX,
            borderRadius: 999,
            background: 'var(--gantt-edge-dot)',
            border: '1.5px solid var(--gantt-edge-dot-ring)',
            zIndex: 6,
          }}
        />
      )}

    </div>
  );
}
