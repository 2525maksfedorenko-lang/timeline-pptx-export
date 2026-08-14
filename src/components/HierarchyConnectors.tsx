import { useTimelineStore } from '../store/timelineStore';
import { getItemBar } from '../export/dateScale';
import type { TimelineItem } from '../types/timeline';
import { BAR_CENTER_Y_PX, ROW_HEIGHT_PX, ZONE1_WIDTH_PX } from './ganttLayout';
import { buildConnectorPath } from './connectorGeometry';

interface HierarchyConnectorsProps {
  // In on-screen row order — same list GanttChart renders rows from, so a
  // parent and its subtasks are simply whichever two rows a `parentId` link
  // points between, adjacent or not.
  items: TimelineItem[];
  minDate: Date;
  pxPerDay: number;
}

const CONNECTOR_COLOR = '#C7CDD4';

/** SVG overlay drawing bracket-style connectors from a parent task's bar to
 * each of its subtasks' bars — task *composition* ("what this task is made
 * of"), a different concept from DependencyConnectors' task *sequencing*
 * ("what this task comes after"). Deliberately kept as separate logic from
 * that component even though both share the same bracket path geometry
 * (connectorGeometry.ts) and rendering approach. On-screen only: unlike
 * showDependencies, showHierarchyLines never reaches the PPTX/PDF exporters
 * — the exported detail slides already show this structure their own way,
 * see CLAUDE.md's scope-discipline note against duplicating it there. */
export function HierarchyConnectors({ items, minDate, pxPerDay }: HierarchyConnectorsProps) {
  const showHierarchyLines = useTimelineStore((state) => state.exportOptions.showHierarchyLines);

  if (!showHierarchyLines) return null;

  const itemById = new Map(items.map((item) => [item.id, item]));
  const rowIndexById = new Map(items.map((item, index) => [item.id, index]));

  const connectors = items.flatMap((child) => {
    if (!child.parentId) return [];

    const parent = itemById.get(child.parentId);
    if (!parent) return [];

    const parentIndex = rowIndexById.get(parent.id)!;
    const childIndex = rowIndexById.get(child.id)!;

    const { left: parentLeft, width: parentWidth } = getItemBar(parent, minDate, pxPerDay);
    const { left: childLeft } = getItemBar(child, minDate, pxPerDay);

    const x1 = ZONE1_WIDTH_PX + parentLeft + parentWidth;
    const y1 = parentIndex * ROW_HEIGHT_PX + BAR_CENTER_Y_PX;
    const x2 = ZONE1_WIDTH_PX + childLeft;
    const y2 = childIndex * ROW_HEIGHT_PX + BAR_CENTER_Y_PX;

    return [{ key: `${parent.id}=>${child.id}`, d: buildConnectorPath(x1, y1, x2, y2) }];
  });

  if (connectors.length === 0) return null;

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      {connectors.map((connector) => (
        <path key={connector.key} d={connector.d} fill="none" stroke={CONNECTOR_COLOR} strokeWidth={0.75} />
      ))}
    </svg>
  );
}
