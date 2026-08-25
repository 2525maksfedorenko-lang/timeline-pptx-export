import {
  AVATAR_GAP_PX,
  AVATAR_OVERLAP_PX,
  AVATAR_SIZE_PX,
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

export interface BarAssignee {
  name: string;
  initials: string;
  color: string;
}

interface TaskBarProps {
  row: GanttRowModel;
  span: Span;
  rowIndex: number;
  columnWidth: number;
  /** The canvas width, which the row wrapper spans so a bar can be positioned
   * anywhere along it. */
  canvasWidth: number;
  progress: number;
  isSelected: boolean;
  /** On the critical path *and* the toolbar's switch is on. */
  isCritical: boolean;
  assignees: BarAssignee[];
  /** Human date range for the bar's tooltip, e.g. "Aug 17 – Aug 24". */
  dateRange: string;
  statusLabel: string;
  onPointerDownBar: (event: React.PointerEvent, mode: DragState['mode']) => void;
  onSelect: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
}

/** One bar: a pale block in its status' tint, its own name set on it in the
 * matching dark tone, and the percentage shown as a translucent wash filling
 * it from the left rather than as a number.
 *
 * A group's wash is stronger (.35 against .18) because a group's bar is the
 * one bar on the row that has no label competing with it for contrast — its
 * name is set in the heavier weight for the same reason.
 *
 * The dot on the right edge and the assignee badges past it are drawn as
 * siblings of the bar, not children: both sit *outside* its rounded rectangle
 * and would be clipped by the `overflow: hidden` that keeps the progress wash
 * inside the radius. */
export function TaskBar({
  row,
  span,
  rowIndex,
  columnWidth,
  canvasWidth,
  progress,
  isSelected,
  isCritical,
  assignees,
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
        title={`${item.label} · ${dateRange} · ${progress}% · ${statusLabel}`}
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
          border: isCritical ? '1.5px solid var(--gantt-link-critical)' : 'none',
          // The only elevation on this screen: a ring in the status' own
          // solid, at half alpha, around the selected bar.
          boxShadow: isSelected ? `0 0 0 2px color-mix(in srgb, ${tone.fill} 50%, transparent)` : 'none',
        }}
      >
        {progress > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${progress}%`,
              background: tone.fill,
              opacity: isGroup ? 0.35 : 0.18,
            }}
          />
        )}
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
            background: `var(${status === 'blocked' ? '--gantt-edge-dot-blocked' : '--gantt-edge-dot'})`,
            border: '1.5px solid var(--gantt-edge-dot-ring)',
            zIndex: 6,
          }}
        />
      )}

      {!isGroup && assignees.length > 0 && (
        <span
          style={{
            position: 'absolute',
            left: left + width + AVATAR_GAP_PX,
            top: 0,
            height: ROW_HEIGHT_PX,
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          {assignees.map((assignee, index) => (
            <span
              key={assignee.name}
              title={assignee.name}
              style={{
                width: AVATAR_SIZE_PX,
                height: AVATAR_SIZE_PX,
                borderRadius: 999,
                background: assignee.color,
                color: 'var(--gantt-avatar-ring)',
                fontSize: 8.5,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid var(--gantt-avatar-ring)',
                marginLeft: index === 0 ? 0 : AVATAR_OVERLAP_PX,
                flex: 'none',
              }}
            >
              {assignee.initials}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
