import type { TaskStatus } from '../types/timeline';

/* What a status is drawn in — the colours, and only the colours.
 *
 * These used to sit in `src/types/timeline.ts`, beside `TimelineItem` itself,
 * which meant that a product taking the model also took twenty-four lines of
 * hex it would want to replace with its own tokens. They are here, next to
 * `branchColors.ts`, because that is the same kind of thing: a colour rule the
 * plan screen and both exporters have to agree on, owned by neither.
 *
 * **These are deck colours, not screen colours, and that is why they are hex.**
 * Every reader of this file is on the export path — `timelineExportModel.ts`
 * and `dashboardMetrics.ts`, which feeds it — and nothing the plan screen draws
 * comes from here: a status on screen is an icon stroke out of
 * `gantt/tone.ts`, which names a `--gantt-*` token and follows the theme with
 * everything else. So these values are deliberately *not* lifted into CSS
 * custom properties. They could not be read from one — pptxgenjs and jsPDF take
 * strings, not `var()` — and a token would drag them into the dark palette,
 * where a deck must never go. `src/export/theme.ts` argues that boundary at
 * length; this file sits on the same side of it.
 *
 * What deliberately did *not* come with them is `TASK_STATUS_LABELS`. Those
 * look like presentation and are not: `normalizeStatus.ts` accepts a status
 * typed as its display label ("In Progress" is a valid value in an imported
 * spreadsheet), and quotes the same labels back when nothing matches. They are
 * the vocabulary the model accepts, so they stay with the model.
 */

/** The scale every status is drawn from. Four steps, because a status has to
 * appear on four different kinds of surface and one colour cannot serve them:
 *
 *   surface  the palest step — a chip background, meant to sit *under* dark
 *            text. Never used as a fill with text on top of it.
 *   border   the chip's hairline, one step up from its background.
 *   accent   the mid step, for small non-text marks (the status dot). Too
 *            light to carry text at WCAG AA — that is what `solid` is for.
 *   solid    the darkest step, for fills that carry light text (Gantt bars)
 *            and for status words set as text on a light background (the
 *            export slides). Doubles as the chip's own text colour.
 *
 * Every value is a literal token from the vendored design system rather than a
 * derived one — the scale the product's Kanban chips are built from already has
 * a dark step, so nothing here is invented. See docs/status-color-scale.md for
 * the token paths and the measured contrast of every pair.
 */
export const TASK_STATUS_SCALE: Record<
  TaskStatus,
  { surface: string; border: string; accent: string; solid: string }
> = {
  // Each value is a design-system token, named here so the provenance is
  // visible where the value is used. They stay written as hex because the PPTX
  // exporter consumes them in exactly this form (TASK_STATUS_COLORS below
  // strips the '#' for pptxgenjs); hsl(var(--x)) would be unreadable to it.
  //                                                    the token each one is
  todo: { surface: '#F3F4F6', border: '#E5E5E5', accent: '#737373', solid: '#1F2937' },
  //     --status-neutral-bg  --border/--input  --muted-foreground  --status-neutral-fg
  in_progress: { surface: '#DBEAFE', border: '#BFDBFE', accent: '#3B82F6', solid: '#1E40AF' },
  //            --kanban-1-bg       --kanban-1-border  --kind-task        --kanban-1-fg
  done: { surface: '#DCFCE7', border: '#BBF7D0', accent: '#22C55E', solid: '#166534' },
  //     --status-done-bg     --kanban-3-border --status-active-dot --status-done-fg
};

const withoutHash = (hex: string) => hex.replace('#', '').toUpperCase();

/** Bar and marker fills, as hex without a leading '#' to match pptxgenjs's
 * expected format (see export/theme.ts's COLORS); prefix with '#' for CSS and
 * jsPDF use. The `solid` step, dark enough to carry light text. */
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: withoutHash(TASK_STATUS_SCALE.todo.solid),
  in_progress: withoutHash(TASK_STATUS_SCALE.in_progress.solid),
  done: withoutHash(TASK_STATUS_SCALE.done.solid),
};
