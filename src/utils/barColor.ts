import { getTaskStatus, TASK_STATUS_COLORS, type TimelineItem } from '../types/timeline';

// A 6-digit hex, with or without the leading '#'. Anything else — a CSS
// color name, an rgb() string, a 3-digit shorthand — is not something both
// renderers can agree on: the browser takes any CSS color, pptxgenjs wants
// bare 'RRGGBB' and jsPDF wants '#RRGGBB'. Falling back to the status color
// for those keeps the screen and the export showing the same thing, which is
// the whole point of this module.
const HEX_COLOR = /^#?[0-9a-fA-F]{6}$/;

/** The fill color of a task's bar, as a hex without a leading '#' (the
 * convention TASK_STATUS_COLORS and export/theme.ts both store colors in;
 * callers drawing to the DOM prefix it themselves).
 *
 * One rule, used by the on-screen chart and by both exporters, so a task
 * cannot be blue on screen and amber in the deck: an explicitly chosen
 * `item.color` wins everywhere, and a task without one takes its status
 * color — the same value its status dot already uses, rather than a separate
 * default blue that meant nothing.
 *
 * That the explicit color wins is deliberate, and it has a cost worth stating
 * plainly: on a plan where only some tasks carry one, bar color stops being a
 * status reading. Three tasks can all be "done" with two bars green and the
 * third amber, which looks like a distinction that isn't there. The trade is
 * accepted because a task's color is a choice someone made — dropping it in
 * the export would make the deck disagree with the screen, which is the one
 * thing this module exists to prevent — and because status is not carried by
 * the bar alone: every row states it twice more, as the word in the Status
 * column and as that chip's own color (see OverviewBarModel's statusText /
 * statusChipBg, and the status dot in GanttRow). A colored bar therefore
 * carries the task's own meaning (the seed uses the brand's kind colors —
 * blue task, purple project, amber phase) while its status stays legible
 * beside it.
 *
 * If status should ever win instead, this is the only place to change: return
 * the status color unconditionally and every surface follows.
 *
 * Pure: no React, no DOM, no store. That's what lets src/export/ — which
 * must stay independent of the components — share it.
 */
export function resolveBarColor(item: Pick<TimelineItem, 'color' | 'status'>): string {
  const explicit = item.color?.trim();
  if (explicit !== undefined && HEX_COLOR.test(explicit)) {
    return explicit.replace('#', '').toUpperCase();
  }

  return TASK_STATUS_COLORS[getTaskStatus(item)];
}
