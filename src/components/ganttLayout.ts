import type { TimelineItem } from '../types/timeline';
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
 * above them. */
export function computeZone1Width(items: TimelineItem[]): number {
  const maxLabelWidth = items.reduce(
    (max, item) => Math.max(max, measureTextWidthPx(item.label, ZONE1_LABEL_FONT)),
    0,
  );
  return Math.max(MIN_ZONE1_WIDTH_PX, Math.ceil(maxLabelWidth) + ZONE1_CHROME_PX);
}

// A row's total height and its bar's vertical center, in px — must match
// GanttRow's own classes (`h-10` row, `top-1 h-8` bar) exactly, since the
// dependency-connector overlay positions itself against these without
// touching the DOM.
export const ROW_HEIGHT_PX = 40;
export const BAR_CENTER_Y_PX = 20;
