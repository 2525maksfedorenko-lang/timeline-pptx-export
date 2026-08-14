import { useTimelineStore } from '../store/timelineStore';
import { getItemBar } from '../export/dateScale';
import type { TimelineItem } from '../types/timeline';
import { BAR_CENTER_Y_PX, ROW_HEIGHT_PX } from './ganttLayout';
import { buildConnectorPath } from './connectorGeometry';

interface DependencyConnectorsProps {
  // In on-screen row order (i.e. already sorted the same way as the
  // GanttRow list this overlay sits on top of) — row index doubles as each
  // item's vertical position.
  items: TimelineItem[];
  minDate: Date;
  pxPerDay: number;
  zone1Width: number;
}

const CONNECTOR_COLOR = '#8A94A0';

/** SVG overlay drawing bracket-style dependency connectors ("┐" / "└" — a
 * structural link, not a directional arrow) between task bars, absolutely
 * positioned over the Gantt rows (pointer-events: none, so it never
 * intercepts the drag-to-reschedule interaction on the bars below it).
 * Visibility is the same `showDependencies` export option that gates the
 * exported PPTX/PDF connectors. Sibling to HierarchyConnectors, which draws
 * the same bracket shape for parent→subtask structure instead — a
 * different concept (composition, not sequencing), kept as separate logic
 * on purpose even though the two share their path geometry. */
export function DependencyConnectors({ items, minDate, pxPerDay, zone1Width }: DependencyConnectorsProps) {
  const showDependencies = useTimelineStore((state) => state.exportOptions.showDependencies);

  if (!showDependencies) return null;

  const itemById = new Map(items.map((item) => [item.id, item]));
  const rowIndexById = new Map(items.map((item, index) => [item.id, index]));

  const connectors = items.flatMap((successor) => {
    const successorIndex = rowIndexById.get(successor.id)!;
    const { left: successorLeft } = getItemBar(successor, minDate, pxPerDay);

    return (successor.dependencies ?? []).flatMap((depId) => {
      const predecessor = itemById.get(depId);
      // Skip silently: an unknown id, or a predecessor hidden from export —
      // there's nothing sensible to draw a connector from/to.
      if (!predecessor || predecessor.includeInExport === false) return [];

      const predecessorIndex = rowIndexById.get(predecessor.id)!;
      const { left: predecessorLeft, width: predecessorWidth } = getItemBar(predecessor, minDate, pxPerDay);

      const x1 = zone1Width + predecessorLeft + predecessorWidth;
      const y1 = predecessorIndex * ROW_HEIGHT_PX + BAR_CENTER_Y_PX;
      const x2 = zone1Width + successorLeft;
      const y2 = successorIndex * ROW_HEIGHT_PX + BAR_CENTER_Y_PX;

      return [{ key: `${predecessor.id}->${successor.id}`, d: buildConnectorPath(x1, y1, x2, y2) }];
    });
  });

  if (connectors.length === 0) return null;

  return (
    <svg className="pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-visible" aria-hidden="true">
      {connectors.map((connector) => (
        <path key={connector.key} d={connector.d} fill="none" stroke={CONNECTOR_COLOR} strokeWidth={1} />
      ))}
    </svg>
  );
}
