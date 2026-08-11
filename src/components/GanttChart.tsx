import { useMemo } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { GanttRow } from './GanttRow';

const BASE_PX_PER_DAY = 32;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

function formatDay(date: Date) {
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
}

export function GanttChart() {
  const items = useTimelineStore((state) => state.items);
  const zoomLevel = useTimelineStore((state) => state.ui.zoomLevel);

  const pxPerDay = BASE_PX_PER_DAY * zoomLevel;

  const { minDate, days } = useMemo(() => {
    if (items.length === 0) {
      const today = new Date();
      return { minDate: today, days: [today] };
    }

    const starts = items.map((item) => new Date(item.start).getTime());
    const ends = items.map((item) => new Date(item.end).getTime());
    const min = new Date(Math.min(...starts));
    const max = new Date(Math.max(...ends));
    const totalDays = daysBetween(min, max) + 1;
    const dayList = Array.from(
      { length: totalDays },
      (_, index) => new Date(min.getTime() + index * MS_PER_DAY),
    );

    return { minDate: min, days: dayList };
  }, [items]);

  const totalWidth = days.length * pxPerDay;

  return (
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
          {items.map((item) => (
            <GanttRow key={item.id} item={item} minDate={minDate} pxPerDay={pxPerDay} />
          ))}
        </div>
      </div>
    </div>
  );
}
