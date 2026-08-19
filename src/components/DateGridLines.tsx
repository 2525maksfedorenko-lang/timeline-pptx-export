import { useMemo } from 'react';
import {
  buildDateGrid,
  DATE_GRID_LEVELS,
  DATE_GRID_MIN_GAP_PX,
  DATE_GRID_STYLES,
  resolveGridStrokes,
} from '../export/dateGrid';
import { MS_PER_DAY } from '../export/dateScale';

interface DateGridLinesProps {
  minDate: Date;
  totalDays: number;
  pxPerDay: number;
  // Where zone 2 (the timeline) starts, in px from the row's left edge —
  // the fixed zones before it added up. Passed in rather than derived here
  // so every overlay and the rows themselves share one number.
  timelineStartX: number;
  // Days visible in the scroll viewport at the current zoom — not the plan's
  // length. Passed down (rather than derived here) because only GanttChart
  // measures the viewport; see getVisibleGridLevels for what it decides.
  visibleDays: number;
}

/** SVG overlay drawing the day/week/month date lines behind the Gantt bars,
 * from the same marks and the same style table the exported overview slides
 * use (see dateGrid.ts) — so the on-screen rhythm and the exported one are
 * the same picture at two scales, not two implementations that agree by
 * coincidence.
 *
 * One line per calendar day is a lot of lines on a short range, and that's
 * the point: at 0.5px in the palest tone they read as texture behind the
 * bars, with the weekly and monthly lines standing out of it. Which levels
 * are drawn at all depends on how much time is on screen (`visibleDays`), so
 * zooming out drops the daily lines and then the weekly ones instead of
 * packing them into a solid block — the same rule the exported slides use
 * for their own width. Sits at the bottom of the row area's z-stack, under
 * the connector overlays and well under the bars themselves. */
export function DateGridLines({ minDate, totalDays, pxPerDay, timelineStartX, visibleDays }: DateGridLinesProps) {
  // One stroke per position, resolved by the same shared rule the slides use
  // (resolveGridStrokes) and in this surface's own unit: a Monday that is also
  // a 1st is one month-weight line here too, not a week line with a month line
  // stacked on it.
  const strokes = useMemo(() => {
    const grid = buildDateGrid(minDate, new Date(minDate.getTime() + (totalDays - 1) * MS_PER_DAY), visibleDays);
    return resolveGridStrokes(grid, (mark) => timelineStartX + mark.dayOffset * pxPerDay, DATE_GRID_MIN_GAP_PX);
  }, [minDate, totalDays, visibleDays, timelineStartX, pxPerDay]);

  return (
    <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden="true">
      {DATE_GRID_LEVELS.map((level) => (
        <g
          key={level}
          stroke={`#${DATE_GRID_STYLES[level].color}`}
          strokeWidth={DATE_GRID_STYLES[level].widthPx}
        >
          {strokes
            .filter((stroke) => stroke.level === level)
            .map((stroke) => (
              <line key={stroke.date} x1={stroke.x} x2={stroke.x} y1={0} y2="100%" />
            ))}
        </g>
      ))}
    </svg>
  );
}
