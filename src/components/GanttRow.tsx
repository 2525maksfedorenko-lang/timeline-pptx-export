import { useRef } from 'react';
import { getTaskStatus, TASK_STATUS_COLORS, TASK_STATUS_LABELS, type TimelineItem } from '../types/timeline';
import { useTimelineStore } from '../store/timelineStore';
import { getItemBar, shiftIsoDate } from '../export/dateScale';

interface GanttRowProps {
  item: TimelineItem;
  minDate: Date;
  pxPerDay: number;
}

interface DragState {
  startX: number;
  startLeft: number;
}

export function GanttRow({ item, minDate, pxPerDay }: GanttRowProps) {
  const updateItem = useTimelineStore((state) => state.updateItem);
  const barRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState | null>(null);

  const { left, width } = getItemBar(item, minDate, pxPerDay);
  const progress = Math.min(100, Math.max(0, item.progress ?? 0));
  const status = getTaskStatus(item);

  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    dragState.current = { startX: event.clientX, startLeft: left };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const drag = dragState.current;
      if (!drag || !barRef.current) return;
      const deltaX = moveEvent.clientX - drag.startX;
      barRef.current.style.left = `${drag.startLeft + deltaX}px`;
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      const drag = dragState.current;
      dragState.current = null;
      if (!drag) return;

      const deltaX = upEvent.clientX - drag.startX;
      const deltaDays = Math.round(deltaX / pxPerDay);

      if (deltaDays !== 0) {
        updateItem(item.id, {
          start: shiftIsoDate(item.start, deltaDays),
          end: shiftIsoDate(item.end, deltaDays),
        });
      } else if (barRef.current) {
        barRef.current.style.left = `${left}px`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="relative h-10 border-b border-slate-100">
      <div
        ref={barRef}
        onMouseDown={handleMouseDown}
        className="absolute top-1 h-8 cursor-grab select-none overflow-hidden rounded-md bg-slate-200 shadow-sm active:cursor-grabbing"
        style={{ left, width }}
      >
        <div
          className="h-full"
          style={{ width: `${progress}%`, backgroundColor: item.color ?? '#3b82f6' }}
        />
        <span className="absolute inset-0 flex items-center gap-1 truncate px-2 text-xs font-medium text-slate-900">
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: `#${TASK_STATUS_COLORS[status]}` }}
            title={TASK_STATUS_LABELS[status]}
          />
          {item.label}
          {item.progress != null && <span className="text-slate-600">({item.progress}%)</span>}
        </span>
      </div>
    </div>
  );
}
