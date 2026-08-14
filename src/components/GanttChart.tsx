import { useMemo } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { GanttRow } from './GanttRow';
import { AddTaskForm } from './AddTaskForm';
import { DateGridLines } from './DateGridLines';
import { DependencyConnectors } from './DependencyConnectors';
import { HierarchyConnectors } from './HierarchyConnectors';
import { ZONE1_WIDTH_PX, ZONE3_WIDTH_PX } from './ganttLayout';
import { BASE_PX_PER_DAY, MS_PER_DAY, formatShortDate, getDateRange } from '../export/dateScale';
import { sortItems } from '../utils/sortItems';

export function GanttChart() {
  const items = useTimelineStore((state) => state.items);
  const sortMode = useTimelineStore((state) => state.exportOptions.sortMode);
  const zoomLevel = useTimelineStore((state) => state.ui.zoomLevel);

  const pxPerDay = BASE_PX_PER_DAY * zoomLevel;
  const sortedItems = useMemo(() => sortItems(items, sortMode), [items, sortMode]);

  const { minDate, days } = useMemo(() => {
    const { minDate: min, totalDays } = getDateRange(items);
    const dayList = Array.from(
      { length: totalDays },
      (_, index) => new Date(min.getTime() + index * MS_PER_DAY),
    );

    return { minDate: min, days: dayList };
  }, [items]);

  // Zone 2 (the date-scaled timeline) is whatever's left of each row after
  // the two fixed zones — matches GanttRow's own zone math exactly so bars
  // line up under the day headers below.
  const timelineWidth = days.length * pxPerDay;
  const rowWidth = ZONE1_WIDTH_PX + timelineWidth + ZONE3_WIDTH_PX;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#1E2B38]">Timeline</h2>
        <AddTaskForm />
      </div>
      <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <div style={{ width: rowWidth }}>
          <div className="flex border-b border-slate-200 bg-slate-50">
            <div
              className="sticky left-0 z-20 flex-shrink-0 border-r border-slate-200 bg-slate-50 px-2 py-2 text-xs font-medium text-slate-500"
              style={{ width: ZONE1_WIDTH_PX }}
            >
              Task
            </div>
            <div className="flex flex-shrink-0" style={{ width: timelineWidth }}>
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className="flex-shrink-0 border-r border-slate-100 py-2 text-center text-[11px] text-slate-500"
                  style={{ width: pxPerDay }}
                >
                  {formatShortDate(day)}
                </div>
              ))}
            </div>
            <div
              className="sticky right-0 z-20 flex-shrink-0 border-l border-slate-200 bg-slate-50"
              style={{ width: ZONE3_WIDTH_PX }}
            />
          </div>
          {/* Explicit z-stack, back to front: date grid, then the connector
              overlays, then the rows — whose bars and on-bar text carry z-10
              (see GanttRow) so a connector crossing a row can never be drawn
              over its percentage. Without the classes this would fall back to
              DOM order among positioned siblings, which is far too easy to
              break by reordering a line here. */}
          <div className="relative">
            <DateGridLines minDate={minDate} totalDays={days.length} pxPerDay={pxPerDay} />
            <HierarchyConnectors items={sortedItems} minDate={minDate} pxPerDay={pxPerDay} />
            <DependencyConnectors items={sortedItems} minDate={minDate} pxPerDay={pxPerDay} />
            {sortedItems.map((item) => (
              <GanttRow key={item.id} item={item} minDate={minDate} pxPerDay={pxPerDay} timelineWidth={timelineWidth} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
