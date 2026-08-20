import type { TimelineItem } from '../types/timeline';
import { labelIndent, MAX_LABEL_INDENT_STEPS } from '../utils/barNesting';
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
// (see computeZone1Width), between a floor and a ceiling: it grows to fit the
// names it carries, and stops at MAX_ZONE1_WIDTH_PX.

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

// Must match the label's and the tag pills' actual on-screen styling in
// GanttRow (`text-xs font-medium` / `text-[9px] font-medium`) — otherwise the
// measured width and the rendered width disagree, and labels clip (measured
// too small) or leave dead space (too big).
const ZONE1_LABEL_FONT = '500 12px ui-sans-serif, system-ui, sans-serif';
const ZONE1_TAG_FONT = '500 9px ui-sans-serif, system-ui, sans-serif';
// Non-text chrome inside zone 1: px-2 padding on both sides (16) + the
// status dot (8) + the gap between dot and label (6), plus a little slack
// so the measured text never sits flush against the border.
const ZONE1_CHROME_PX = 34;
// A tag pill's own `px-1` either side, and the `gap-x-1.5` between whatever
// sits on the row — the two numbers fitRowTags adds around a measured word to
// get the space the pill actually occupies.
const TAG_PILL_PADDING_PX = 8;
const ZONE1_GAP_PX = 6;

export const MIN_ZONE1_WIDTH_PX = 160;
// ...and the ceiling. Without one, a single long name sets the width of the
// column on every row: the plan's longest task decides how much of the chart
// is names, every other row pays for it in white space, and the timeline —
// which is what the chart is for — gets whatever is left.
//
// The number is derived from what the column has to hold rather than picked
// by eye. TYPICAL_LABEL_CHARS is the 75th percentile of task-name lengths
// across the plans this repo actually carries (110 names: the dev seed and
// the export fixture) — three names in four fit with no ellipsis at all. The
// other two terms are what a name shares its column with: the zone's own
// chrome, and the deepest indent a label can be pushed by (the ladder stops
// at MAX_LABEL_INDENT_STEPS), so the guarantee holds at *any* nesting depth
// rather than only at the root. A root-level name gets those 48px back and
// fits about 42 characters.
//
// LABEL_CHAR_WIDTH_PX is measured, not assumed: 6.15px is what a realistic
// mixed-case task name averages per character at the label's exact font in
// Chromium, against 6.76 for a lowercase alphabet. Deliberately a constant
// and not a canvas measurement — the cap has to be one number every row and
// the day header agree on before anything is rendered, and this module is
// imported by code that runs with no DOM at all.
export const TYPICAL_LABEL_CHARS = 34;
const LABEL_CHAR_WIDTH_PX = 6.15;
export const MAX_ZONE1_WIDTH_PX = Math.ceil(
  ZONE1_CHROME_PX +
    labelIndent(BAR_HEIGHT_PX, MAX_LABEL_INDENT_STEPS) +
    TYPICAL_LABEL_CHARS * LABEL_CHAR_WIDTH_PX,
);
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

/** Zone 1's width for this render: wide enough to fit every item's label on
 * one line with no ellipsis, clamped between MIN_ZONE1_WIDTH_PX and
 * `maxWidthPx`. All rows share one width (computed from the whole item list,
 * not each row's own label) so the columns after it still line up across rows
 * and with the day header above them.
 *
 * `maxWidthPx` is the layout's own ceiling and is passed rather than defaulted,
 * because there are two of them and which one applies is the caller's fact, not
 * this function's: MAX_ZONE1_WIDTH_PX on a desktop, the much tighter
 * MOBILE_ZONE1_MAX_WIDTH_PX on a phone. A name past the ceiling ellipsizes in
 * the row (see GanttRow's `truncate`, and fitRowTags for what happens to the
 * tags beside it) and stays readable in full through the row's `title`.
 *
 * Tags are deliberately *not* measured here. The column is sized by the names
 * it carries; the tags then take what the name left, which is the priority
 * fitRowTags applies row by row. Sizing the column to fit tags too would let a
 * three-tag row widen the name column on every other row — the same fault the
 * ceiling exists to fix, one level down. */
export function computeZone1Width(
  items: TimelineItem[],
  depthById: Map<string, number>,
  maxWidthPx: number,
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

/** Which of a row's tags are drawn as pills, and which collapse into the
 * "+N" counter after them. */
export interface RowTagFit {
  visible: string[];
  /** Everything that did not fit, in order — the counter's own count, and the
   * list its `title` names. Empty when every tag is drawn. */
  hidden: string[];
}

const NO_TAGS: RowTagFit = { visible: [], hidden: [] };

/** How a row's tags share the label column with its name, once the column has
 * a ceiling and the two can no longer both have everything they want.
 *
 * The name has priority: it takes as much of the column as it needs, the pills
 * take what is left, and the ones that do not fit collapse into a single "+N"
 * counter rather than being dropped or clipped mid-word. Only that counter's
 * own width is ever taken *from* the name — about 24px, against the ~60px a
 * pill costs — and nothing is lost by it, since the counter names what it
 * hides in its tooltip. So the order of giving way is: pills collapse first,
 * the name ellipsizes last, and it ellipsizes into the same `title` the
 * counter uses.
 *
 * Depth is part of the arithmetic, not a detail: a row's indent comes out of
 * the same column, so the third level starts ~48px in and has that much less
 * to divide between its name and its tags than a root does.
 *
 * Returns the split rather than pixel positions — the row is a flex line, so
 * CSS places what this chooses to render, and the name ellipsizes into
 * whatever the pills leave without either side being told a width. */
export function fitRowTags(
  label: string,
  tags: readonly string[] | undefined,
  depth: number,
  zone1Width: number,
): RowTagFit {
  if (tags === undefined || tags.length === 0) return NO_TAGS;

  const available = zone1Width - ZONE1_CHROME_PX - labelIndent(BAR_HEIGHT_PX, depth);
  const labelWidth = measureTextWidthPx(label, ZONE1_LABEL_FONT);
  const pillWidth = (text: string) =>
    measureTextWidthPx(text, ZONE1_TAG_FONT) + TAG_PILL_PADDING_PX;

  // The whole line: the name from where it starts to where it actually ends —
  // its own width, or the whole budget when it is longer than the row can show
  // — then each pill, then the counter if the row has one.
  const lineWidth = (pills: readonly string[], hiddenCount: number) => {
    let x = Math.min(labelWidth, available);
    for (const pill of pills) x += ZONE1_GAP_PX + pillWidth(pill);
    if (hiddenCount > 0) x += ZONE1_GAP_PX + pillWidth(`+${hiddenCount}`);
    return x;
  };

  // As many pills as fit beside the name, counting no counter — a row that
  // shows all of its tags does not need one and must not pay for one.
  const visible: string[] = [];
  for (const tag of tags) {
    if (lineWidth([...visible, tag], 0) > available) break;
    visible.push(tag);
  }
  if (visible.length === tags.length) return { visible, hidden: [] };

  // Something is hidden, so the row does need a counter and the counter needs
  // room of its own. Hand pills back until it has some: a pill is ~50px and a
  // counter ~18px, so this gives up one at the very most — and giving one back
  // is the right trade, since "roadmap +1" says more than "+2" in the same
  // space. Never the name's room, which is not this loop's to spend.
  while (visible.length > 0 && lineWidth(visible, tags.length - visible.length) > available) {
    visible.pop();
  }
  return { visible, hidden: tags.slice(visible.length) };
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

// The progress percentage drawn on a bar, in px. Here rather than in GanttRow
// because two things ask about it and only one of them is styling: how wide the
// label renders, and whether a bar is tall enough to hold it inside itself
// (progressLabelFitsInBar). The second is what the export-parity check compares
// against the slides' own BAR_PROGRESS_FONT_SIZE_PT, and it can only do that
// from a module that doesn't drag React in. Must match the `text-[11px]` class
// the label is actually drawn with.
export const PROGRESS_FONT_SIZE_PX = 11;
