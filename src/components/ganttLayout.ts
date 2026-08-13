// Shared column geometry for the Gantt chart's 3-zone row layout (see
// GanttRow.tsx and GanttChart.tsx): a fixed label zone, a fixed
// icons/actions zone, and a date-scaled timeline zone in between that gets
// whatever width is left. Both zones' widths are constants — they never
// depend on any task's bar duration/width, so a row's label and icons are
// exactly as visible whether the task spans 1 day or 3 months.
export const ZONE1_WIDTH_PX = 160;
export const ZONE3_WIDTH_PX = 140;
