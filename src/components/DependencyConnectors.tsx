import { useId } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { getItemBar } from '../export/dateScale';
import type { TimelineItem } from '../types/timeline';
import { BAR_CENTER_Y_PX, ROW_HEIGHT_PX, ZONE1_WIDTH_PX } from './ganttLayout';

interface DependencyConnectorsProps {
  // In on-screen row order (i.e. already sorted the same way as the
  // GanttRow list this overlay sits on top of) — row index doubles as each
  // item's vertical position.
  items: TimelineItem[];
  minDate: Date;
  pxPerDay: number;
}

const CONNECTOR_COLOR = '#94A3B8';
const CONNECTOR_JOG_PX = 10;

/** Elbow path from a predecessor bar's right edge to a successor bar's left
 * edge: right a few px, down/up to the successor row, then right to the bar
 * — or a straight line when both are on the same row. */
function buildPath(x1: number, y1: number, x2: number, y2: number): string {
  if (y1 === y2) return `M ${x1} ${y1} L ${x2} ${y2}`;
  const jogX = x1 + CONNECTOR_JOG_PX;
  return `M ${x1} ${y1} L ${jogX} ${y1} L ${jogX} ${y2} L ${x2} ${y2}`;
}

/** SVG overlay drawing Гshaped dependency connectors between task bars,
 * absolutely positioned over the Gantt rows (pointer-events: none, so it
 * never intercepts the drag-to-reschedule interaction on the bars below
 * it). Visibility is the same `showDependencies` export option that gates
 * the exported PPTX/PDF connectors. */
export function DependencyConnectors({ items, minDate, pxPerDay }: DependencyConnectorsProps) {
  const showDependencies = useTimelineStore((state) => state.exportOptions.showDependencies);
  const markerId = useId();

  if (!showDependencies) return null;

  const itemById = new Map(items.map((item) => [item.id, item]));
  const rowIndexById = new Map(items.map((item, index) => [item.id, index]));

  const connectors = items.flatMap((successor) => {
    const successorIndex = rowIndexById.get(successor.id)!;
    const { left: successorLeft } = getItemBar(successor, minDate, pxPerDay);

    return (successor.dependencies ?? []).flatMap((depId) => {
      const predecessor = itemById.get(depId);
      // Skip silently: an unknown id, or a predecessor hidden from export —
      // there's nothing sensible to draw an arrow from/to.
      if (!predecessor || predecessor.includeInExport === false) return [];

      const predecessorIndex = rowIndexById.get(predecessor.id)!;
      const { left: predecessorLeft, width: predecessorWidth } = getItemBar(predecessor, minDate, pxPerDay);

      const x1 = ZONE1_WIDTH_PX + predecessorLeft + predecessorWidth;
      const y1 = predecessorIndex * ROW_HEIGHT_PX + BAR_CENTER_Y_PX;
      const x2 = ZONE1_WIDTH_PX + successorLeft;
      const y2 = successorIndex * ROW_HEIGHT_PX + BAR_CENTER_Y_PX;

      return [{ key: `${predecessor.id}->${successor.id}`, d: buildPath(x1, y1, x2, y2) }];
    });
  });

  if (connectors.length === 0) return null;

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={CONNECTOR_COLOR} />
        </marker>
      </defs>
      {connectors.map((connector) => (
        <path
          key={connector.key}
          d={connector.d}
          fill="none"
          stroke={CONNECTOR_COLOR}
          strokeWidth={1.5}
          markerEnd={`url(#${markerId})`}
        />
      ))}
    </svg>
  );
}
