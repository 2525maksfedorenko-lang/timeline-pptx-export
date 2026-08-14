import { useMemo } from 'react';
import { buildDateGrid, DATE_GRID_LEVELS, DATE_GRID_STYLES } from '../export/dateGrid';
import { MS_PER_DAY } from '../export/dateScale';

interface DateGridLinesProps {
  minDate: Date;
  totalDays: number;
  pxPerDay: number;
  zone1Width: number;
}

/** SVG overlay drawing the day/week/month date lines behind the Gantt bars,
 * from the same marks and the same style table the exported overview slides
 * use (see dateGrid.ts) — so the on-screen rhythm and the exported one are
 * the same picture at two scales, not two implementations that agree by
 * coincidence.
 *
 * One line per calendar day is a lot of lines on a long range, and that's
 * the point: at 0.3px in the palest tone they read as texture behind the
 * bars, with the weekly and monthly lines standing out of it. Sits at the
 * bottom of the row area's z-stack, under the connector overlays and well
 * under the bars themselves. */
export function DateGridLines({ minDate, totalDays, pxPerDay, zone1Width }: DateGridLinesProps) {
  const grid = useMemo(
    () => buildDateGrid(minDate, new Date(minDate.getTime() + (totalDays - 1) * MS_PER_DAY)),
    [minDate, totalDays],
  );

  return (
    <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden="true">
      {DATE_GRID_LEVELS.map((level) => (
        <g
          key={level}
          stroke={`#${DATE_GRID_STYLES[level].color}`}
          strokeWidth={DATE_GRID_STYLES[level].widthPx}
        >
          {grid[level].map((mark) => {
            const x = zone1Width + mark.dayOffset * pxPerDay;
            return <line key={mark.dayOffset} x1={x} x2={x} y1={0} y2="100%" />;
          })}
        </g>
      ))}
    </svg>
  );
}
