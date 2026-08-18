import type { TimelineItem } from '../types/timeline';
import { labelIndent } from '../utils/barNesting';
import { measureTextWidthPx } from '../utils/measureTextWidth';

// Shared column geometry for the Gantt chart's 3-zone row layout (see
// GanttRow.tsx and GanttChart.tsx): a label zone, a fixed icons/actions
// zone, and a date-scaled timeline zone in between that gets whatever width
// is left. Zone 3's width is a constant — it never depends on any task's
// bar duration/width, so a row's icons are exactly as visible whether the
// task spans 1 day or 3 months. Zone 1 (label) is sized to content instead
// (see computeZone1Width) so long labels are never cut off.
export const MIN_ZONE1_WIDTH_PX = 160;
// Four 16px icon slots + their gaps + the zone's own padding, with a little
// slack — no wider, so no dead space opens up on its left edge.
export const ZONE3_WIDTH_PX = 104;
// Zone 0, the status column: wide enough for the longest status chip
// ("In progress" at 11px plus the chip's padding and its caret) and no
// wider, since every pixel here comes straight out of the timeline. Fixed,
// like zone 3 — a status chip is exactly as wide whatever the task.
export const STATUS_ZONE_WIDTH_PX = 118;

// Phone-sized viewports (see useIsMobile) get their own pair of widths: the
// two fixed zones are chrome, and on a 375px screen the desktop pair would
// leave under 110px for the timeline itself — the actual content. Zone 1 is
// capped rather than content-sized, with labels ellipsizing into it; zone 3
// keeps a single 40px-square control (the assignee badge, which also opens
// the task modal) instead of four 16px icons no thumb can hit apart.
export const MOBILE_ZONE1_MAX_WIDTH_PX = 124;
export const MOBILE_ZONE3_WIDTH_PX = 52;

// Must match the label's actual on-screen styling in GanttRow
// (`text-xs font-medium`) — otherwise the measured width and the rendered
// width disagree and labels clip (too small) or leave dead space (too big).
const ZONE1_LABEL_FONT = '500 12px ui-sans-serif, system-ui, sans-serif';
// Non-text chrome inside zone 1: px-2 padding on both sides (16) + the
// status dot (8) + the gap between dot and label (6), plus a little slack
// so the measured text never sits flush against the border.
const ZONE1_CHROME_PX = 34;

/** Zone 1's width for this render: wide enough to fit every item's label on
 * one line with no ellipsis, or MIN_ZONE1_WIDTH_PX, whichever is larger. All
 * rows share one width (computed from the whole item list, not each row's
 * own label) so zone 2/3 still line up across rows and with the day header
 * above them.
 *
 * `maxWidthPx` caps that — the phone layout passes
 * MOBILE_ZONE1_MAX_WIDTH_PX, trading full labels (they ellipsize instead,
 * see GanttRow's `max-md:truncate`) for a timeline wide enough to read. */
export function computeZone1Width(
  items: TimelineItem[],
  depthById: Map<string, number>,
  maxWidthPx = Infinity,
): number {
  // A nested label starts further in, so what has to fit is its indent plus its
  // text — measuring the text alone would let an indented label clip on desktop,
  // where the column is supposed to grow rather than ellipsize.
  const maxLabelWidth = items.reduce(
    (max, item) =>
      Math.max(
        max,
        labelIndent(BAR_HEIGHT_PX, depthById.get(item.id) ?? 0) +
          measureTextWidthPx(item.label, ZONE1_LABEL_FONT),
      ),
    0,
  );
  return Math.min(Math.max(MIN_ZONE1_WIDTH_PX, Math.ceil(maxLabelWidth) + ZONE1_CHROME_PX), maxWidthPx);
}

// A row's total height, its bar's full height and the bar's vertical center,
// in px. The row height must match GanttRow's own `h-10` class, and the
// connector overlays position themselves against the center without touching
// the DOM — so both stay fixed whatever a bar does. BAR_HEIGHT_PX is what a
// top-level task's bar is drawn at; a nested task's is a fraction of it (see
// resolveBarGeometry), centered on the same line, which is why the center
// below is a constant rather than something derived per row.
export const ROW_HEIGHT_PX = 40;
export const BAR_HEIGHT_PX = 32;
export const BAR_CENTER_Y_PX = 20;
