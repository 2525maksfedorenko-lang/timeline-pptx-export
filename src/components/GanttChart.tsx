import { useMemo } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { GanttRow } from './GanttRow';
import { AddTaskForm } from './AddTaskForm';
import { BASE_PX_PER_DAY, MS_PER_DAY, getDateRange } from '../export/dateScale';
import { sortItems } from '../utils/sortItems';

function formatDay(date: Date) {
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
}

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

  const totalWidth = days.length * pxPerDay;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#1E2B38]">Timeline</h2>
        <AddTaskForm />
      </div>
      <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <div style={{ width: totalWidth }}>
          <div className="flex border-b border-slate-200 bg-slate-50">
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className="flex-shrink-0 border-r border-slate-100 py-2 text-center text-[11px] text-slate-500"
                style={{ width: pxPerDay }}
              >
                {formatDay(day)}
              </div>
            ))}
          </div>
          <div>
            {sortedItems.map((item) => (
              <GanttRow key={item.id} item={item} minDate={minDate} pxPerDay={pxPerDay} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
