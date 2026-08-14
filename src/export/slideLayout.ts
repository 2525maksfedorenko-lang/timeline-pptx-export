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

// Overview bars: one merged line per task instead of a separate label row
// stacked above the bar (which doubled the height every task actually
// needed). The task label and the status text are drawn beside the track, in
// their own zones; the only text on the track itself is the progress
// percentage, placed against a measured fit (see below).
export const ROW_GAP_IN = 0.04;
export const BAR_HEIGHT_IN = 0.28;
export const BAR_RADIUS_IN = 0.05;
export const BAR_LABEL_PADDING_IN = 0.06;
// Progress text ("70%") drawn on the bar: centered inside the filled part
// when that part measurably fits it, otherwise immediately after the fill,
// on the gray track. The font size lives here rather than in the exporters
// because the layout math has to measure the text at exactly the size both
// engines then draw it at.
export const BAR_PROGRESS_FONT_SIZE_PT = 9;
export const BAR_PROGRESS_PADDING_IN = 0.05;
// Space always reserved after the track for its label + status text, so a
// bar positioned late in the date range (long duration or near the right
// edge) never grows wide enough to push its label into the status column.
export const BAR_LABEL_ZONE_MIN_IN = 2.6;
// Smallest a track is ever drawn, even for a same-day task or one clipped
// almost entirely out of an export timeframe window.
export const MIN_TRACK_WIDTH_IN = 0.15;

// Per-row vertical pitch on the overview slide = bar height + gap to the
// next bar. = 0.28 + 0.04 = 0.32in
export const ROW_HEIGHT_IN = BAR_HEIGHT_IN + ROW_GAP_IN;

// Thin vertical grid line dropped from each date-axis tick, running down
// through the bar area to the bottom of the content area, behind the bars.
export const GRID_LINE_WIDTH_PT = 0.5;

// Dependency connector: a bracket line ("┐" + "└", no arrowhead) from a
// predecessor bar's right edge to a successor bar's left edge — right a
// short stub, down/up, right again into the bar.
export const DEPENDENCY_LINE_WIDTH_PT = 0.75;
export const DEPENDENCY_JOG_IN = 0.06;

// Small heading-weight row, reused for the overview slide's date-scale axis
// row. = 0.22 + 0.04 = 0.26in
export const GROUP_HEADER_HEIGHT_IN = ROW_LABEL_HEIGHT_IN + ROW_GAP_IN;

// Overview is always a single slide now (no more auto-pagination), so its
// bar capacity is a derived ceiling instead of a hardcoded count: how many
// row pitches fit under the content area once the date-axis row at the top
// is reserved. Recomputes automatically if any of the geometry above changes.
export const MAX_OVERVIEW_BARS_PER_SLIDE = Math.floor(
  (CONTENT_HEIGHT_IN - GROUP_HEADER_HEIGHT_IN) / ROW_HEIGHT_IN,
);

export const LIST_ROW_HEIGHT_IN = 0.32;
export const SECTION_GAP_IN = 0.2;
// Gap between one parent's whole subtasks/comments block and the next
// parent's block when several are packed onto the same appendix slide.
export const PARENT_SECTION_GAP_IN = 0.3;

// Comment bodies are parsed markdown (see src/utils/renderMarkdown.ts) and
// rendered as real headings/paragraphs/lists/tables. Heights below reuse the
// same row-pitch scale as the rest of a detail section (ROW_LABEL_HEIGHT_IN
// for heading-weight rows, LIST_ROW_HEIGHT_IN for body-weight rows) so a
// comment's blocks sit at the same visual rhythm as subtask rows.
export const COMMENT_META_ROW_HEIGHT_IN = 0.18;
export const COMMENT_HEADING_ROW_HEIGHT_IN = ROW_LABEL_HEIGHT_IN;
export const COMMENT_LINE_HEIGHT_IN = LIST_ROW_HEIGHT_IN;
export const COMMENT_TABLE_HEADER_ROW_HEIGHT_IN = 0.26;
export const COMMENT_TABLE_ROW_HEIGHT_IN = 0.24;
// Small vertical breathing room between adjacent blocks within one comment,
// and between one comment's blocks and the next comment's meta line.
export const COMMENT_BLOCK_GAP_IN = 0.06;
export const COMMENT_GAP_IN = 0.14;
