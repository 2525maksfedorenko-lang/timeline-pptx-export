import { labelIndent } from '../utils/barNesting';
import { TASK_STATUS_LABELS, TASK_STATUS_VALUES } from '../types/timeline';
import { estimateWrappedLines, measureLetterSpacingWidthIn, measureTextWidthIn } from './textMetrics';

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

// The slide title, and the band it sits in. The band's height used to be a
// bare proportion of the page with no relation to the type inside it, and the
// 24pt was written out again in each exporter — so nothing connected the two,
// and a title that outgrew its band had nowhere to go but over the edge. Both
// exporters centre the title in this band, so half of any overflow lands above
// the top of the slide, which is exactly what "the top half of the letters is
// missing" looks like.
//
// So the band is derived from the title instead: one line of it at a
// line-height a renderer can be trusted to stay inside (1.2 covers Arial's
// ~1.15 with room to spare), plus clear space above and below so the letters
// never touch the band's edges. The proportion stays as a floor, and at 24pt
// it is the one that wins — 0.84in against the 0.52in the type needs — so this
// changes no geometry today. What it changes is what happens if someone raises
// the title's size: the band grows with it instead of clipping it.
export const TITLE_FONT_SIZE_PT = 24;
const TITLE_LINE_HEIGHT_RATIO = 1.2;
const TITLE_BAND_PADDING_IN = 0.06;
const TITLE_BAND_MIN_HEIGHT_IN =
  (TITLE_FONT_SIZE_PT * TITLE_LINE_HEIGHT_RATIO) / 72 + TITLE_BAND_PADDING_IN * 2;
export const HEADER_HEIGHT_IN = Math.max(PAGE_HEIGHT_IN * 0.15, TITLE_BAND_MIN_HEIGHT_IN);
export const FOOTER_HEIGHT_IN = PAGE_HEIGHT_IN * 0.04;

// The page's two side margins, which are deliberately *not* the same number.
//
// The right one is the classic half-inch slide margin. The left one is the
// typographic minimum, because everything that reads left-to-right on these
// slides starts against it — the title, the Status column, and the task names
// the deck exists to be read for. A half inch there was half an inch taken off
// the one column that was running out of room.
//
// A quarter inch is the floor rather than a taste: it is three times the clear
// space kept *inside* a column (COLUMN_TEXT_INSET_IN, 0.08in), and an outer
// margin has to stay visibly wider than the padding inside the content or the
// slide's edge starts reading as tighter than its columns' edges. It is also
// the allowance a printer typically cannot print inside, so a PDF of one of
// these slides still comes off a desk printer whole.
//
// Both are here rather than one MARGIN_X_IN because the asymmetry is the
// point: every slide in the deck takes CONTENT_X_IN from here, so the whole
// deck's left edge moves together and a reader flicking through does not see
// the grid shift (see TASK_COL_WIDTH_IN for what happens to the width this
// frees, and why the timeline does not move).
export const MARGIN_LEFT_IN = 0.25;
export const MARGIN_RIGHT_IN = 0.5;
export const CONTENT_X_IN = MARGIN_LEFT_IN;
export const CONTENT_WIDTH_IN = PAGE_WIDTH_IN - MARGIN_LEFT_IN - MARGIN_RIGHT_IN;
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

// Left padding inside either column, so no text sits on a column edge and
// every row starts at the same x — the "same indent on every row" the columns
// exist to give.
export const COLUMN_TEXT_INSET_IN = 0.08;
// The status chip: spans its column (minus the inset either side) exactly as
// the on-screen chip fills its own, with the label inset from the chip's own
// edges. No dropdown chevron — nothing on a slide is interactive.
export const STATUS_CHIP_HEIGHT_IN = 0.18;
export const STATUS_CHIP_RADIUS_IN = 0.03;
export const STATUS_CHIP_TEXT_INSET_IN = 0.07;
export const STATUS_CHIP_BORDER_WIDTH_PT = 0.5;

/** Width of a status word as it is actually drawn: its glyphs plus its
 * tracking, which neither engine folds into its own metrics. Everything that
 * has to fit a status into a box measures it through here. */
export function statusTextWidthIn(text: string, fontSizePt: number): number {
  return (
    measureTextWidthIn(text, fontSizePt) +
    measureLetterSpacingWidthIn(text, letterSpacingPt(fontSizePt, STATUS_LETTER_SPACING_EM))
  );
}

// Widths were measured, not guessed (see textMetrics.ts). The Status column is
// *derived* from the widest label it has to carry rather than picked: the chip
// spans the column minus COLUMN_TEXT_INSET_IN either side, and the label sits
// STATUS_CHIP_TEXT_INSET_IN inside that, on both sides. A hardcoded 0.95in
// looked like it cleared the widest label ("in progress", 0.678in) with slack,
// but the arithmetic behind it counted only one of the two insets: the label
// ended up with 0.07in of chip to its left and 0.042in to its right, and one
// status word a shade wider would have run out of the chip altogether. Derived,
// the two insets stay equal whatever the font size, the tracking or the status
// list does next.
export const STATUS_COL_WIDTH_IN =
  Math.max(
    ...TASK_STATUS_VALUES.map((status) =>
      statusTextWidthIn(TASK_STATUS_LABELS[status], BAR_STATUS_FONT_SIZE_PT),
    ),
  ) +
  (STATUS_CHIP_TEXT_INSET_IN + COLUMN_TEXT_INSET_IN) * 2;
// The Task column takes every inch the left margin gave up, and the Status
// column is not squeezed for it — the two simply move left together.
//
// Written as base + reclaimed rather than as one number so the invariant is
// visible: the column block shifts left by (MARGIN_RIGHT_IN - MARGIN_LEFT_IN)
// and Task grows by the same amount, which lands TIMELINE_X_IN below exactly
// where it sat when both margins were 0.5in. The timeline zone therefore keeps
// its width, and with it its scale — a day is the same number of inches before
// and after this, so no bar moves and no date line shifts.
//
// A task name averages 0.110in per glyph at BAR_LABEL_FONT_SIZE_PT, so the
// 2.60in this comes to holds roughly 23 characters before the ellipsis, against
// 21 at the old 2.35in (see labelWidth/truncateToWidth in
// timelineExportModel.ts).
const TASK_COL_BASE_WIDTH_IN = 2.35;
export const TASK_COL_WIDTH_IN = TASK_COL_BASE_WIDTH_IN + (MARGIN_RIGHT_IN - MARGIN_LEFT_IN);
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
// The rest of a dashboard slide's two-column split: the table on the left, the
// QR code into the same list on screen on the right. These were a private copy
// in each exporter until the model had to know how wide a table's columns are
// to work out how many of its rows fit (see fitTableRows in dashboardSlides).
export const DASHBOARD_TABLE_QR_COLUMN_WIDTH_IN = 2.0;
export const DASHBOARD_TABLE_QR_SIZE_IN = 1.5;
export const DASHBOARD_TABLE_GAP_IN = 0.4;
export const DASHBOARD_TABLE_WIDTH_IN =
  CONTENT_WIDTH_IN - DASHBOARD_TABLE_QR_COLUMN_WIDTH_IN - DASHBOARD_TABLE_GAP_IN;
// All the height a dashboard table has. Neither engine paginates a table — the
// PDF is explicitly stopped from trying (withoutPageBreaks) — so rows past this
// are drawn off the slide unless the model cuts them first.
export const DASHBOARD_TABLE_MAX_HEIGHT_IN = CONTENT_BOTTOM_IN - DASHBOARD_TABLE_TOP_IN;

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
// after its label, in the rest of the Task column: mini gray pills, small
// enough not to compete with the name for attention. They take the width the
// name does not want rather than reserving their own out of it — the name is
// the last thing on the row to give way, and the pills are what compresses
// first (see buildOverviewSlides in timelineExportModel.ts).
//
// They run at the bottom rung of the slide's type scale, one step under the
// status text and four under the name they sit beside — the same rung the
// week-level date captions use, which is the tier this deck reserves for
// reference detail. At 8pt, set bold in a filled pill, they carried as much
// weight on the row as the 11pt name did, and a tag is a qualifier: it should
// be legible when looked for and quiet when not.
//
// The pill's own padding and height are held in em of its own type rather than
// in inches, so "proportional to the size" is a property of the definition
// instead of an arithmetic step someone has to remember to repeat. The two
// em figures are exactly what the old inch values were at the old 8pt
// (0.04in = 0.36em, 0.16in = 1.44em), so the pill's proportions are unchanged
// — it is the same chip, drawn one size down.
export const TAG_PILL_FONT_SIZE_PT = AXIS_WEEK_FONT_SIZE_PT;
const TAG_PILL_PADDING_EM = 0.36;
const TAG_PILL_HEIGHT_EM = 1.44;
export const TAG_PILL_PADDING_IN = (TAG_PILL_FONT_SIZE_PT * TAG_PILL_PADDING_EM) / 72;
export const TAG_PILL_HEIGHT_IN = (TAG_PILL_FONT_SIZE_PT * TAG_PILL_HEIGHT_EM) / 72;
export const TAG_PILL_RADIUS_IN = 0.03;
export const TAG_PILL_GAP_IN = 0.05;
export const LABEL_TAG_GAP_IN = 0.08;
// The whole subtask block's inset from a detail slide's content edge: what
// separates the rows from the section title above them, before any nesting is
// taken into account. Every row gets it whatever its depth — the levels are
// told apart by subtaskRowIndent() below.
export const DETAIL_ROW_INDENT_IN = 0.2;

/** A subtask row's left indent, for a `depth` measured *within its section*
 * (0 = a direct child of the section's parent).
 *
 * The block's own inset, plus the shared depth ladder from barNesting rebased
 * so that first level sits exactly at that inset. Rebasing — rather than
 * starting the ladder at rung 0 — is what makes the *step* between two levels
 * identical to the on-screen label column's at every depth, the cap included:
 * on screen an indent stops growing after MAX_LABEL_INDENT_STEPS, and a ladder
 * that started a rung late would still be stepping once the screen had stopped,
 * so five-level trees would read differently on the two surfaces.
 *
 * Lives here rather than in either exporter because the model needs it to place
 * the row and to size the text that truncates against what's left, and the
 * coverage check needs it to verify neither drifted. */
export function subtaskRowIndent(depth: number): number {
  return DETAIL_ROW_INDENT_IN + labelIndent(BAR_HEIGHT_IN, depth + 1) - labelIndent(BAR_HEIGHT_IN, 1);
}
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

// Breathing room either side of a slide's own date window, as a fraction of
// the *widest* window in the export rather than of each slide's own.
//
// A fraction of each slide's own span would pad a three-month slide by days
// and a three-year one by months, so the same clear space would read as a
// different amount of time on every slide. Taken from the widest window, one
// ratio produces one identical margin in inches everywhere — which is what
// "the same axis, drawn at the same density" has to mean visually.
export const OVERVIEW_WINDOW_PAD_RATIO = 0.02;

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
// A markdown table inside a comment. These are *derived* rather than picked,
// because jspdf-autotable will draw whatever height its own metrics say and the
// model has to predict it exactly: a table estimated shorter than it draws runs
// past the bottom of the content area, and autoTable answers that by inserting
// a page of its own — a physical PDF page with no header, no footer and no
// slide model behind it, which desyncs every slide after it (see
// docs/export-coverage.md, and the note above drawTableBlock in pdfExporter).
//
// One text line plus padding above and below it, where the line height is the
// font size times jsPDF's own 1.15 line-height factor. The padding is passed
// *into* autoTable rather than read off it, so the renderer follows this number
// instead of this number chasing the renderer's defaults.
export const COMMENT_TABLE_FONT_SIZE_PT = 9;
export const COMMENT_TABLE_CELL_PADDING_IN = 0.07;
const PDF_LINE_HEIGHT_FACTOR = 1.15;
export const COMMENT_TABLE_LINE_HEIGHT_IN = (COMMENT_TABLE_FONT_SIZE_PT * PDF_LINE_HEIGHT_FACTOR) / 72;
export const COMMENT_TABLE_ROW_HEIGHT_IN =
  COMMENT_TABLE_LINE_HEIGHT_IN + COMMENT_TABLE_CELL_PADDING_IN * 2;
// The header row is the same box in a bold face, not a taller one.
export const COMMENT_TABLE_HEADER_ROW_HEIGHT_IN = COMMENT_TABLE_ROW_HEIGHT_IN;

/** Text width of one column of a `tableWidthIn`-wide table with `columnCount`
 * equal columns. Equal columns are what pptxgenjs is told to draw and what
 * jspdf-autotable converges on at these widths, so one number serves both. */
export function tableColumnTextWidthIn(tableWidthIn: number, columnCount: number): number {
  return tableWidthIn / Math.max(columnCount, 1) - COMMENT_TABLE_CELL_PADDING_IN * 2;
}

/** Height of one table row whose cells wrap at `columnTextWidthIn`. Every cell
 * is measured and the tallest decides the row: a cell whose text wraps to two
 * lines makes the whole row two lines tall in either renderer, and a row
 * assumed to be one line is exactly how a table ends up taller than the space
 * reserved for it. Shared by a comment's markdown tables and the dashboard's
 * own, so "how tall is this table" has a single answer. */
export function tableRowHeightIn(cells: string[], columnTextWidthIn: number): number {
  const lines = Math.max(
    ...cells.map((cell) => estimateWrappedLines(cell, COMMENT_TABLE_FONT_SIZE_PT, columnTextWidthIn)),
  );
  return lines * COMMENT_TABLE_LINE_HEIGHT_IN + COMMENT_TABLE_CELL_PADDING_IN * 2;
}
// Small vertical breathing room between adjacent blocks within one comment,
// and between one comment's blocks and the next comment's meta line.
export const COMMENT_BLOCK_GAP_IN = 0.06;
export const COMMENT_GAP_IN = 0.14;
