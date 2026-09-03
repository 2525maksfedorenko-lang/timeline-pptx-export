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
import { BAR_HIT_ATTRIBUTE } from './useScrollPanes';

/** The narrowest bar still worth setting a name inside.
 *
 * Below the mobile breakpoint the task column is a drawer, and a drawer is
 * usually shut — so the bar is the only thing on screen saying which row it
 * belongs to. It has carried its own name all along, which answers most of it;
 * what it cannot do is carry one in 30px. Under this width the name is set
 * beside the bar instead of inside it, which is the ordinary Gantt treatment
 * for a short task and costs the chart nothing — the rest of a row is empty.
 *
 * 88px is about eleven characters at the bar's own 14px, minus its 12px of
 * padding at each end. Above it a name is at least recognisable when
 * ellipsised; below it there is nothing left of it to recognise. */
const NAMEABLE_BAR_PX = 88;

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
  /** Whether the task column is a drawer at this width. See NAMEABLE_BAR_PX. */
  isMobile: boolean;
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
 * same colour, and the status icon in the list is what tells them apart.
 *
 * **A bar is dragged with a pointer and tapped with a finger.** Below the
 * mobile breakpoint the move-drag and the two resize strips are not rendered
 * at all, and the reason is measured rather than stylistic: the way through a
 * plan on a phone is to drag the canvas, bars cover a large share of it, and
 * there is no hover to warn anyone which pixels are a bar — so a drag that
 * happened to start on one moved the task by a week instead of scrolling.
 * Dates are edited in the panel a tap opens, which is a place to see what is
 * being changed. */
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
  isMobile,
  onPointerDownBar,
  onSelect,
  onContextMenu,
}: TaskBarProps) {
  const { item, depth } = row;
  // The name on the bar carries the same weight as the name in the list, and
  // for the same reason: a top-level task is set semibold whether or not it
  // has sub-tasks yet. Reading `isGroup` here instead would leave the two
  // panes disagreeing about which rows are roots. Nothing else about the bar
  // moves with it — its fill already goes by depth, its height by nothing.
  const nameWeight = depth === 0 ? 600 : 400;
  const height = barHeight(ROW_HEIGHT_PX);
  const top = barOffsetY(ROW_HEIGHT_PX);
  const left = barLeft(span.start, columnWidth);
  const width = barWidth(span.len, columnWidth);
  const namesBeside = isMobile && width < NAMEABLE_BAR_PX;

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
        // row. It answers no press of its own, and a grab-pan started on that
        // free space has to reach the body, so it lets presses through and the
        // bar takes its own back.
        pointerEvents: 'none',
      }}
    >
      <div
        // Marks the bar as the one thing in the timeline that owns its own
        // press: a grab-pan of the canvas refuses to start anywhere inside
        // this element, so moving a bar and panning past it never both run.
        {...{ [BAR_HIT_ATTRIBUTE]: '' }}
        onPointerDown={isMobile ? undefined : (event) => onPointerDownBar(event, 'move')}
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
          cursor: isMobile ? 'pointer' : 'grab',
          border: 'none',
          pointerEvents: 'auto',
          // The only elevation on this screen: a ring in the branch's own
          // solid, at half alpha, around the selected bar.
          boxShadow: isSelected ? `0 0 0 2px color-mix(in srgb, ${barStyle.ring} 50%, transparent)` : 'none',
        }}
      >
        {!namesBeside && (
          <span
            style={{
              position: 'relative',
              zIndex: 1,
              padding: '0 12px',
              fontSize: 14,
              fontWeight: nameWeight,
              color: barStyle.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              pointerEvents: 'none',
            }}
          >
            {item.label}
          </span>
        )}

        {/* A phase has a duration of its own, so it resizes like anything
            else: the handoff hid these on a group because a group's span was
            its children's, and it no longer is. Dragging a phase moves the
            phase — its sub-tasks stay where they are.

            Absent below the breakpoint, with the move-drag. They are 11px
            strips that carry `touch-action: none`, so leaving them there would
            put two dead zones at every bar's ends where a finger cannot scroll
            the canvas — for a gesture that has no way to succeed on a touch
            screen anyway. */}
        {!isMobile && (
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

      {namesBeside && (
        <span
          // Deaf to the pointer, like every other mark on this canvas that is
          // not a bar: the row's free space is where a pan starts, and a name
          // lying in it must not be the thing that swallows the gesture. The
          // bar itself is still what is tapped to open the task.
          style={{
            position: 'absolute',
            left: left + width + 8,
            top,
            height,
            maxWidth: Math.max(0, canvasWidth - (left + width + 8) - 8),
            display: 'flex',
            alignItems: 'center',
            fontSize: 14,
            fontWeight: nameWeight,
            color: 'var(--gantt-text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            pointerEvents: 'none',
          }}
        >
          {item.label}
        </span>
      )}
    </div>
  );
}
