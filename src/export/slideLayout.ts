// Shared page geometry (inches) for both the PPTX (LAYOUT_16x9) and PDF
// exporters, so a "slide" looks identical in either format.

export const PAGE_WIDTH_IN = 10;
export const PAGE_HEIGHT_IN = 5.625;

export const HEADER_HEIGHT_IN = PAGE_HEIGHT_IN * 0.15;
export const FOOTER_HEIGHT_IN = PAGE_HEIGHT_IN * 0.04;

export const MARGIN_X_IN = 0.5;
export const CONTENT_X_IN = MARGIN_X_IN;
export const CONTENT_WIDTH_IN = PAGE_WIDTH_IN - MARGIN_X_IN * 2;
export const CONTENT_TOP_IN = HEADER_HEIGHT_IN + 0.3;
export const CONTENT_BOTTOM_IN = PAGE_HEIGHT_IN - FOOTER_HEIGHT_IN - 0.15;
// Vertical space actually available for slide content, used to compute how
// many rows/sections fit per slide instead of guessing a fixed count.
// = 5.25 - 1.14375 = 4.10625in
export const CONTENT_HEIGHT_IN = CONTENT_BOTTOM_IN - CONTENT_TOP_IN;

export const ROW_LABEL_HEIGHT_IN = 0.22;

// Overview bars: the task label, progress %, and status text are drawn on
// top of the bar itself — one merged line per task, matching the on-screen
// Gantt row (see GanttRow.tsx) — instead of a separate label row stacked
// above the bar (which doubled the height every task actually needed).
export const ROW_GAP_IN = 0.04;
export const BAR_HEIGHT_IN = 0.28;
export const BAR_RADIUS_IN = 0.05;
export const BAR_LABEL_PADDING_IN = 0.06;
// Per-row vertical pitch on the overview slide = bar height + gap to the
// next bar. = 0.28 + 0.04 = 0.32in
export const ROW_HEIGHT_IN = BAR_HEIGHT_IN + ROW_GAP_IN;

// Small heading-weight row, reused for: the status-group headers stacked
// above each run of same-status bars on the overview slide, and that
// slide's repeating date-scale axis row. = 0.22 + 0.04 = 0.26in
export const GROUP_HEADER_HEIGHT_IN = ROW_LABEL_HEIGHT_IN + ROW_GAP_IN;

export const LIST_ROW_HEIGHT_IN = 0.32;
export const SECTION_GAP_IN = 0.2;
// Gap between one parent's whole subtasks/comments block and the next
// parent's block when several are packed onto the same appendix slide.
export const PARENT_SECTION_GAP_IN = 0.3;
