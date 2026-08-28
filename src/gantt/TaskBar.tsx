import {
  barHeight,
  barLeft,
  barOffsetY,
  barWidth,
  RESIZE_HANDLE_WIDTH_PX,
  ROW_HEIGHT_PX,
  type Span,
} from './geometry';
import type { BarStyle } from './barColor';
import type { GanttRowModel } from './rows';
import type { DragState } from './drag';

interface TaskBarProps {
  row: GanttRowModel;
  span: Span;
  rowIndex: number;
  columnWidth: number;
  /** The canvas width, which the row wrapper spans so a bar can be positioned
   * anywhere along it. */
  canvasWidth: number;
  isSelected: boolean;
  /** The three CSS values of this task's branch colour — see barColor.ts. */
  barStyle: BarStyle;
  /** Human date range for the bar's tooltip, e.g. "Aug 17 – Aug 24". */
  dateRange: string;
  statusLabel: string;
  onPointerDownBar: (event: React.PointerEvent, mode: DragState['mode']) => void;
  onSelect: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
}

/** One bar, in its **branch's** colour: a root at full strength, everything
 * nested under it in the same colour lightened. The name is set on the bar in
 * whichever of the deck's two text colours reads on that fill, and a group's
 * name is set in the heavier weight.
 *
 * The colour says which branch this task belongs to — the rule the exported
 * deck has always drawn by, and now the only rule. It does *not* say what state
 * the task is in: a done task and an untouched one in the same branch are the
 * same colour, and the status icon in the list is what tells them apart. */
export function TaskBar({
  row,
  span,
  rowIndex,
  columnWidth,
  canvasWidth,
  isSelected,
  barStyle,
  dateRange,
  statusLabel,
  onPointerDownBar,
  onSelect,
  onContextMenu,
}: TaskBarProps) {
  const { item, isGroup } = row;
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
        // The wrapper spans the whole row so the bar can be placed anywhere
        // along it, which also means it lies over every free pixel of that
        // row. It answers no press of its own, and the create surface beneath
        // needs those pixels, so it lets them through and the bar takes its
        // own back.
        pointerEvents: 'none',
      }}
    >
      <div
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
          background: barStyle.fill,
          borderRadius: 5,
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          cursor: 'grab',
          border: 'none',
          pointerEvents: 'auto',
          // The only elevation on this screen: a ring in the branch's own
          // solid, at half alpha, around the selected bar.
          boxShadow: isSelected ? `0 0 0 2px color-mix(in srgb, ${barStyle.ring} 50%, transparent)` : 'none',
        }}
      >
        <span
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '0 12px',
            fontSize: 14,
            fontWeight: isGroup ? 600 : 400,
            color: barStyle.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            pointerEvents: 'none',
          }}
        >
          {item.label}
        </span>

        {/* A phase has a duration of its own, so it resizes like anything
            else: the handoff hid these on a group because a group's span was
            its children's, and it no longer is. Dragging a phase moves the
            phase — its sub-tasks stay where they are. */}
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
      </div>
    </div>
  );
}
