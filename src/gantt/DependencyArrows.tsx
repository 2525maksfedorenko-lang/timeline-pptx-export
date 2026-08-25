import { ROW_HEIGHT_PX } from './geometry';
import type { Span } from './rollup';
import type { GanttRowModel } from './rows';

interface DependencyArrowsProps {
  rows: GanttRowModel[];
  spans: Map<string, Span>;
  columnWidth: number;
  width: number;
}

/** The links between a task and the tasks it waits on: an elbow out of the
 * predecessor's right edge, along to the successor's left edge, and an
 * arrowhead on the end.
 *
 * Drawn only between rows that are both on screen — a link to a task hidden
 * by a collapsed group or a filter has no second end to point at, so it is
 * left out rather than aimed at where the row would have been.
 *
 * The elbow's turn is `max(x1 + 10, x2 - 12)`: far enough past the
 * predecessor to leave the corner visible, and far enough short of the
 * successor to leave room for the arrowhead — whichever of those two the
 * gap allows. When a successor starts before its predecessor ends, that
 * resolves to the first, and the path doubles back on itself, which is the
 * shape a plan in that state should look like. */
export function DependencyArrows({
  rows,
  spans,
  columnWidth,
  width,
}: DependencyArrowsProps) {
  const rowIndexById = new Map(rows.map((row, index) => [row.item.id, index]));

  const links = rows.flatMap((row) =>
    (row.item.dependencies ?? []).flatMap((dependencyId) => {
      const from = spans.get(dependencyId);
      const to = spans.get(row.item.id);
      const fromRow = rowIndexById.get(dependencyId);
      const toRow = rowIndexById.get(row.item.id);
      if (!from || !to || fromRow === undefined || toRow === undefined) return [];

      const x1 = (from.start + from.len) * columnWidth - 2;
      const y1 = fromRow * ROW_HEIGHT_PX + ROW_HEIGHT_PX / 2;
      const x2 = to.start * columnWidth;
      const y2 = toRow * ROW_HEIGHT_PX + ROW_HEIGHT_PX / 2;
      const turn = Math.max(x1 + 10, x2 - 12);
      return [
        {
          key: `${dependencyId}->${row.item.id}`,
          d: `M${x1} ${y1} H${turn} V${y2} H${x2 - 6}`,
          arrow: `${x2 - 6},${y2 - 3.5} ${x2},${y2} ${x2 - 6},${y2 + 3.5}`,
          color: 'var(--gantt-link)',
          width: 1.1,
        },
      ];
    }),
  );

  if (links.length === 0) return null;

  return (
    <svg
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width,
        height: '100%',
        overflow: 'visible',
        pointerEvents: 'none',
        zIndex: 4,
      }}
    >
      {links.map((link) => (
        <path
          key={link.key}
          d={link.d}
          fill="none"
          stroke={link.color}
          strokeWidth={link.width}
          strokeLinejoin="round"
        />
      ))}
      {links.map((link) => (
        <polygon key={`${link.key}-head`} points={link.arrow} fill={link.color} />
      ))}
    </svg>
  );
}
