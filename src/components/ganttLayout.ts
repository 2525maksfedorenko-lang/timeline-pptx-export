// Shared column geometry for the Gantt chart's 3-zone row layout (see
// GanttRow.tsx and GanttChart.tsx): a fixed label zone, a fixed
// icons/actions zone, and a date-scaled timeline zone in between that gets
// whatever width is left. Both zones' widths are constants — they never
// depend on any task's bar duration/width, so a row's label and icons are
// exactly as visible whether the task spans 1 day or 3 months.
export const ZONE1_WIDTH_PX = 160;
// Four 16px icon slots + their gaps + the zone's own padding, with a little
// slack — no wider, so no dead space opens up on its left edge.
export const ZONE3_WIDTH_PX = 104;

// A row's total height and its bar's vertical center, in px — must match
// GanttRow's own classes (`h-10` row, `top-1 h-8` bar) exactly, since the
// dependency-connector overlay positions itself against these without
// touching the DOM.
export const ROW_HEIGHT_PX = 40;
export const BAR_CENTER_Y_PX = 20;
