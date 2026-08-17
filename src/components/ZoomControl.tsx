import { useTimelineStore } from '../store/timelineStore';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

// Round to 2dp so repeated +/- 0.25 steps never drift into float noise
// (e.g. 0.1 + 0.2 = 0.30000000000000004).
function clampZoom(value: number): number {
  return Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)) * 100) / 100;
}

/** "-" / "100%" / "+" zoom control sitting above the Gantt chart — drives
 * ui.zoomLevel, which GanttChart multiplies into pxPerDay to scale the
 * whole timeline (bars, day header, date grid, connectors). The middle
 * button both displays the current zoom and resets it to 100%. */
export function ZoomControl() {
  const zoomLevel = useTimelineStore((state) => state.ui.zoomLevel);
  const setZoomLevel = useTimelineStore((state) => state.setZoomLevel);

  return (
    // The two steppers grow from a 24px mouse target to a 44px touch one
    // below the breakpoint, and the readout between them grows to match —
    // the control is the only way to change the scale on a phone, where
    // there's no scroll wheel or trackpad pinch to fall back on.
    <div className="flex items-center gap-0.5 rounded-md border border-slate-200 bg-white p-0.5 max-md:gap-1 max-md:p-1">
      <button
        type="button"
        onClick={() => setZoomLevel(clampZoom(zoomLevel - ZOOM_STEP))}
        disabled={zoomLevel <= MIN_ZOOM}
        className="flex h-6 w-6 items-center justify-center rounded text-sm text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 max-md:h-11 max-md:w-11 max-md:text-lg"
        title="Zoom out"
        aria-label="Zoom out"
      >
        −
      </button>
      <button
        type="button"
        onClick={() => setZoomLevel(1)}
        className="min-w-[3rem] rounded px-1.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 max-md:min-h-11 max-md:px-3 max-md:text-sm"
        title="Reset zoom to 100%"
        aria-label="Reset zoom to 100%"
      >
        {Math.round(zoomLevel * 100)}%
      </button>
      <button
        type="button"
        onClick={() => setZoomLevel(clampZoom(zoomLevel + ZOOM_STEP))}
        disabled={zoomLevel >= MAX_ZOOM}
        className="flex h-6 w-6 items-center justify-center rounded text-sm text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 max-md:h-11 max-md:w-11 max-md:text-lg"
        title="Zoom in"
        aria-label="Zoom in"
      >
        +
      </button>
    </div>
  );
}
