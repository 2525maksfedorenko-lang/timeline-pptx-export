// Shared page geometry (inches) for both the PPTX (LAYOUT_16x9) and PDF
// exporters, so a "slide" looks identical in either format.

// Colour is deliberately *not* here. This module is the slide's geometry and
// type scale; the palette has one home per concern and duplicating any of it
// here would create a second one:
//
//   status colours   src/types/timeline.ts  — TASK_STATUS_SCALE
//   everything else  src/export/theme.ts    — COLORS
//
// Both exporters already read one computed model (timelineExportModel.ts), which
// resolves bar fills through resolveBarColor and text colours through
// readableTextOn, so pptxExporter and pdfExporter cannot drift apart: neither
// picks a colour of its own, they only render `bar.statusColor`,
// `bar.progressColor` and `row.statusColor`.

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

// "Back to overview" link on the appendix slides. It sits in the strip of
// whitespace between the header bar and the content area — the top-left of
// the slide body, where a breadcrumb belongs — rather than inside the header
// itself, which is already fully occupied by the 24pt slide title starting at
// this same left edge. Sized to end above CONTENT_TOP_IN, so it adds a
// navigation affordance without shifting a single row of content (and hence
// without changing how much fits on an appendix slide).
export const BACK_LINK_TEXT = '← Back to overview';
export const BACK_LINK_FONT_SIZE_PT = 9;
export const BACK_LINK_Y_IN = HEADER_HEIGHT_IN + 0.02;
export const BACK_LINK_HEIGHT_IN = 0.24;
// Comfortably wider than the caption measures at 9pt (~1.15in), so the whole
// phrase stays on one line and the clickable box extends a little past it.
export const BACK_LINK_WIDTH_IN = 1.5;

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
// Same reasoning as BAR_PROGRESS_FONT_SIZE_PT: the label and status sizes
// live here so the model can measure a bar's label/status text at exactly
// the size both engines draw it at, to reserve the status's own width out of
// the label's box instead of the two overlapping (see truncateToWidth in
// timelineExportModel.ts).
export const BAR_LABEL_FONT_SIZE_PT = 11;
// Status runs a notch smaller than it used to (was 9) and tracked out — see
// STATUS_LETTER_SPACING_EM. Between the size drop and the tracking it reads
// as a distinct tier from the bar's own label rather than as more label.
export const BAR_STATUS_FONT_SIZE_PT = 8;
// Same purpose, one row down: a detail slide's subtask row packs a label
// (plus dates/progress) on the left and a status on the right of the same
// line. Smaller than the overview bar's label, so the dates/progress tail
// (which never truncates) leaves more of the row for the label itself.
// The whole appendix tier runs a point larger than it first did (10/9/9):
// these rows are read close-up in a deck's appendix rather than glanced at
// like an overview bar, and the row pitch (LIST_ROW_HEIGHT_IN) had the room.
export const SUBTASK_TEXT_FONT_SIZE_PT = 11;
// A notch under the row's own text, for the same reason as
// BAR_STATUS_FONT_SIZE_PT.
export const SUBTASK_STATUS_FONT_SIZE_PT = 10;
// Dates on a subtask row, in the monospace face, one point under the row's
// text so the date tier sits below the task-name tier rather than beside it.
export const SUBTASK_DATE_FONT_SIZE_PT = 10;
// Tracking (letter-spacing), as a fraction of the font size, for the two
// roles that get it. Expressed in em so one value covers every size the role
// is drawn at; letterSpacingPt() converts. Both engines can apply this —
// pptxgenjs takes `charSpacing` in points, jsPDF takes setCharSpace in the
// document unit — but neither folds it into its own text metrics, so
// anything measured for a collision has to add measureLetterSpacingWidthIn
// on top (see textMetrics.ts).
export const STATUS_LETTER_SPACING_EM = 0.06;
export const DATE_LETTER_SPACING_EM = 0.02;
// Date captions on the overview's date axis: month-level captions are the
// primary scale, week-level ones a notch smaller. They live here rather than
// in each exporter because the model measures a caption's width at exactly
// the size both engines then draw it at, to decide how many of them fit
// without colliding (see buildAxisLabels).
export const AXIS_MONTH_FONT_SIZE_PT = 8;
export const AXIS_WEEK_FONT_SIZE_PT = 7;
// Clear space kept between two neighbouring axis captions.
export const AXIS_LABEL_GAP_IN = 0.08;

// --- Overview slide: three fixed zones ---------------------------------------
// The on-screen chart is a fixed Status column, a fixed Task column, then the
// timeline; the slide is laid out the same way so a deck reads top-to-bottom
// like the app instead of having each task's name chase its own bar around.
// Both exporters take these from here, which is what keeps the two identical.
//
// Widths were measured, not guessed (see textMetrics.ts):
//   - the widest status label, "in progress", is 0.678in at
//     BAR_STATUS_FONT_SIZE_PT with STATUS_LETTER_SPACING_EM tracking. The chip
//     around it needs 0.818in, so a 0.95in column clears it with slack.
//   - a task name averages 0.110in per glyph at BAR_LABEL_FONT_SIZE_PT, so
//     2.35in holds roughly 21 characters before the ellipsis (see
//     labelWidth/truncateToWidth in timelineExportModel.ts).
export const STATUS_COL_WIDTH_IN = 0.95;
export const TASK_COL_WIDTH_IN = 2.35;
// Left padding inside either column, so no text sits on a column edge and
// every row starts at the same x — the "same indent on every row" the columns
// exist to give.
export const COLUMN_TEXT_INSET_IN = 0.08;
// Clear space around the divider, split evenly either side of it.
export const TIMELINE_GUTTER_IN = 0.14;
export const TIMELINE_X_IN =
  CONTENT_X_IN + STATUS_COL_WIDTH_IN + TASK_COL_WIDTH_IN + TIMELINE_GUTTER_IN;
export const TIMELINE_WIDTH_IN = CONTENT_X_IN + CONTENT_WIDTH_IN - TIMELINE_X_IN;
// The vertical rule between the columns and the timeline, centred in the
// gutter. Runs from the top of the header row to the bottom of the content
// area, as the equivalent border does on screen.
export const COLUMN_DIVIDER_X_IN = TIMELINE_X_IN - TIMELINE_GUTTER_IN / 2;
export const COLUMN_DIVIDER_WIDTH_PT = 0.75;
// Column headings ("Status", "Task") sit on the same line as the month
// captions and at the same size, so the three read as one header row. Sans
// rather than the mono the dates use — they are words, not dates.
export const COLUMN_HEADER_FONT_SIZE_PT = AXIS_MONTH_FONT_SIZE_PT;
// The status chip: spans its column (minus the inset either side) exactly as
// the on-screen chip fills its own, with the label inset from the left edge.
// No dropdown chevron — nothing on a slide is interactive.
export const STATUS_CHIP_HEIGHT_IN = 0.18;
export const STATUS_CHIP_RADIUS_IN = 0.03;
export const STATUS_CHIP_TEXT_INSET_IN = 0.07;
export const STATUS_CHIP_BORDER_WIDTH_PT = 0.5;

// Status names in the summary slide's status-breakdown legend, a notch
// under the count/percentage they sit next to (10pt) for the same reason as
// BAR_STATUS_FONT_SIZE_PT.
export const SUMMARY_LEGEND_STATUS_FONT_SIZE_PT = 9;

/** Tracking in points for `fontSizePt` — the unit pptxgenjs's charSpacing
 * wants, and 1/72 of what jsPDF's setCharSpace wants in inches. */
export function letterSpacingPt(fontSizePt: number, em: number): number {
  return fontSizePt * em;
}

// Clear space kept between a right-aligned status text and the right edge of
// the content area, on the overview bars and on a detail slide's subtask
// rows alike. Without it the status is anchored *on* that edge: measured in
// the generated PDF, "In progress" ended at 9.502in against a content edge
// of 9.500, i.e. touching it and a hair past. Wide enough to read as a
// margin rather than as a rounding accident.
export const STATUS_RIGHT_PADDING_IN = 0.12;

// Top of the dashboard tables' slides (Delayed / At risk). A slide's content
// normally starts at CONTENT_TOP_IN, which is right for text — but these
// slides open with a filled table header, and a solid band reads as
// crowding the dark title bar in a way a line of text at the same y does
// not. Kept as its own constant rather than raising CONTENT_TOP_IN, which
// the overview's bars-per-slide ceiling is derived from.
export const DASHBOARD_TABLE_TOP_IN = CONTENT_TOP_IN + 0.18;

// Minimum clear gap always kept between a label and the status text sharing
// its row, even after the label has been reserved room / truncated against
// the status's own measured width — a small buffer against the font-metric
// approximation in textMetrics.ts, so a truncated label never visually
// touches the status next to it.
export const LABEL_STATUS_GAP_IN = 0.1;
// Same buffer, but for a detail slide's subtask row specifically — kept
// smaller than LABEL_STATUS_GAP_IN (rather than reusing it) so tightening
// this one doesn't also widen the overview bar's label column.
export const SUBTASK_META_STATUS_GAP_IN = 0.05;
// Gap between the three pieces of a subtask row's left side — task name,
// then its dates, then its progress. These used to be one string joined by
// "  —  " separators; now that each piece is drawn in its own face and size
// (name / monospace date / progress), whitespace alone separates them and
// the dashes would just be noise.
export const SUBTASK_META_GAP_IN = 0.09;

// An overview bar's tag pills (item.tags — see TimelineItem) sit right
// after its label, before the status text: mini gray pills, small enough
// not to compete with the label for attention. Their total width (measured
// against TAG_PILL_FONT_SIZE_PT, same as the label/status pattern above) is
// reserved out of the label's box the same way the status text already is,
// so a label long enough to reach them still truncates instead of
// overlapping.
export const TAG_PILL_FONT_SIZE_PT = 8;
export const TAG_PILL_PADDING_IN = 0.04;
export const TAG_PILL_HEIGHT_IN = 0.16;
export const TAG_PILL_RADIUS_IN = 0.03;
export const TAG_PILL_GAP_IN = 0.05;
export const LABEL_TAG_GAP_IN = 0.08;
// Left indent of a detail slide's subtask rows from the content edge —
// shared with the model so it can size the row's available text width the
// same way the exporters position it.
export const DETAIL_ROW_INDENT_IN = 0.2;
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

// The vertical day/week/month date lines that run down through the bar area
// behind the bars don't have their weights here: they're shared with the
// on-screen chart, so both their colors and their stroke widths live in one
// table next to the geometry that produces them — see DATE_GRID_STYLES in
// dateGrid.ts.

// Dependency connector: a bracket line ("┐" + "└", no arrowhead) from a
// predecessor bar's right edge to the nearest reachable edge of the
// successor's bar — a short stub out, down/up, then back in to that edge,
// stopping at it rather than continuing into the bar. Drawn under the bars
// in both exporters, as on screen. DEPENDENCY_JOG_IN is how far clear of a
// bar's edge the vertical leg runs; see buildDependencyConnectors for which
// edge each end lands on.
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

// Small color swatch drawn before "Assigned to: <name>" on a detail slide,
// vertically centered within the assignee row (LIST_ROW_HEIGHT_IN) — see
// assigneeColor in timelineExportModel.ts.
export const ASSIGNEE_SWATCH_SIZE_IN = 0.1;
export const ASSIGNEE_SWATCH_GAP_IN = 0.08;

// Body text of a comment's paragraphs and list items. Lives here rather
// than in each exporter because the model measures wrapped line counts
// against it (estimateBlockHeight) at exactly the size both engines then
// draw it at — three private copies of the number is how the three quietly
// drift apart.
export const COMMENT_BODY_FONT_SIZE_PT = 12;

// Every single-line row on a detail slide (subtask rows, the assignee line,
// the section headings) is drawn vertically centered in its own row box
// rather than hung from the box's top: the pieces sharing one line are drawn
// at four different sizes, and a shared top edge puts four different
// baselines on what should read as one line. Centering is also what keeps a
// row's text aligned with the graphics beside it — the assignee swatch is
// centered in the same box.
//
// In pptxgenjs that's `valign: 'middle'` on a box of the row's height; in
// jsPDF, `baseline: 'middle'` at the row's center Y, which this helper
// resolves so the two engines can't drift apart.
export function rowCenterY(rowY: number, rowHeightIn: number): number {
  return rowY + rowHeightIn / 2;
}

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
