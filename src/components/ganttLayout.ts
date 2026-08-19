import type { TimelineItem } from '../types/timeline';
import { labelIndent } from '../utils/barNesting';
import { measureTextWidthPx } from '../utils/measureTextWidth';

// Shared column geometry for the Gantt chart's row layout (see GanttRow.tsx
// and GanttChart.tsx): three fixed columns — status, label, actions — and
// then the date-scaled timeline, which gets whatever width is left. The
// three read left to right in that order and all three stick together on a
// horizontal scroll, so the row keeps its identity (what, who, and what you
// can do about it) while the bars slide underneath.
//
// The actions column's width is a constant — it never depends on any task's
// bar duration/width, so a row's icons are exactly as visible whether the
// task spans 1 day or 3 months. The label column is sized to content instead
// (see computeZone1Width) so long labels are never cut off.
export const MIN_ZONE1_WIDTH_PX = 160;
// Four 16px icon slots + their gaps + the column's own padding, with a
// little slack — no wider, since every pixel here comes out of the timeline.
export const ACTIONS_ZONE_WIDTH_PX = 104;
// Zone 0, the status column: wide enough for the longest status chip
// ("In progress" at 11px plus the chip's padding and its caret) and no
// wider, since every pixel here comes straight out of the timeline. Fixed,
// like the actions column — a status chip is exactly as wide whatever the
// task.
export const STATUS_ZONE_WIDTH_PX = 118;

// Phone-sized viewports (see useIsMobile) get their own pair of widths: the
// fixed columns are chrome, and on a 375px screen the desktop pair would
// leave under 110px for the timeline itself — the actual content. Zone 1 is
// capped rather than content-sized, with labels ellipsizing into it; the
// actions column keeps a single 40px-square control (the assignee badge,
// which also opens the task modal) instead of four 16px icons no thumb can
// hit apart.
//
// 96 rather than 124 for the label: with the actions column moved to the
// left the two of them are one block, and at 124 that block took just over
// half the card's 349px, leaving the timeline 173px — under six days. The
// 28px bought here go straight to the timeline (201px, 6.3 days) and cost
// the label about three characters before it ellipsizes.
export const MOBILE_ZONE1_MAX_WIDTH_PX = 96;
export const MOBILE_ACTIONS_ZONE_WIDTH_PX = 52;

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
 * own label) so the columns after it still line up across rows and with the
 * day header above them.
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

// The muted tint the sticky columns wear — the header band's shade, and the
// one a hovered branch's row takes — painted as an *opaque* layer: the same
// `hsl(var(--muted)/0.5)` over the card the translucent `bg-muted/50` would
// give, but as a background-image over an opaque background-color, so it is
// a solid surface. It has to be: a sticky column has the timeline scrolling
// underneath it, and a half-transparent one shows the day captions and the
// bars straight through itself. Kept here rather than written out in both
// GanttChart (the header) and GanttRow (the rows) so the two bands can't
// drift apart.
export const STICKY_TINT_CLASS = 'bg-card bg-[linear-gradient(hsl(var(--muted)/0.5),hsl(var(--muted)/0.5))]';

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

// The progress percentage drawn on a bar, in px. Here rather than in GanttRow
// because two things ask about it and only one of them is styling: how wide the
// label renders, and whether a bar is tall enough to hold it inside itself
// (progressLabelFitsInBar). The second is what the export-parity check compares
// against the slides' own BAR_PROGRESS_FONT_SIZE_PT, and it can only do that
// from a module that doesn't drag React in. Must match the `text-[11px]` class
// the label is actually drawn with.
export const PROGRESS_FONT_SIZE_PX = 11;
