import { useTimelineStore } from '../store/timelineStore';
import { Minus, Plus } from 'lucide-react';
import { buttonClass } from './systemUi';

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
 * button both displays the current zoom and resets it to 100%.
 *
 * The design system has no segmented control, no stepper and no slider (see
 * docs/design-system-map.md §2), so this is composed the way the Gantt handoff
 * composes its own zoom control: a `bg-muted` container at 8px radius with 2px
 * of padding, wrapping plain Buttons. The buttons are the system's own ghost
 * variant at its own sizes — `icon` (40x40) for the two steppers, `default`
 * (h-10) for the readout between them, so all three share one height. The
 * handoff's h-7 is not used: 28px is not a step on the system's control scale
 * and the system wins where the two disagree. */
export function ZoomControl() {
  const zoomLevel = useTimelineStore((state) => state.ui.zoomLevel);
  const setZoomLevel = useTimelineStore((state) => state.setZoomLevel);

  return (
    // Below the breakpoint the steppers grow to the system's `lg` height — 44px,
    // its largest control and the touch target this needs, since the control is
    // the only way to change the scale on a phone.
    <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
      <button
        type="button"
        onClick={() => setZoomLevel(clampZoom(zoomLevel - ZOOM_STEP))}
        disabled={zoomLevel <= MIN_ZOOM}
        className={buttonClass('ghost', 'icon', 'text-muted-foreground max-md:h-11 max-md:w-11')}
        title="Zoom out"
        aria-label="Zoom out"
      >
        <Minus size={16} strokeWidth={2} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => setZoomLevel(1)}
        className={buttonClass('ghost', 'default', 'min-w-[3rem] text-muted-foreground max-md:h-11')}
        title="Reset zoom to 100%"
        aria-label="Reset zoom to 100%"
      >
        {Math.round(zoomLevel * 100)}%
      </button>
      <button
        type="button"
        onClick={() => setZoomLevel(clampZoom(zoomLevel + ZOOM_STEP))}
        disabled={zoomLevel >= MAX_ZOOM}
        className={buttonClass('ghost', 'icon', 'text-muted-foreground max-md:h-11 max-md:w-11')}
        title="Zoom in"
        aria-label="Zoom in"
      >
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
