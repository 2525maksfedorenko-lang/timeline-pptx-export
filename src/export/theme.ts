// aicoo brand palette for the PPTX/PDF exporters. Hex values are stored without
// '#' (pptxgenjs's format); call `withHash()` for APIs that expect a leading
// '#' (e.g. jsPDF).
//
// These are the aicoo Coordinator design-system tokens resolved to hex, because
// neither exporter can read CSS custom properties. Where a token exists, its
// name is given — keep the two in step (see design-system/tokens/).

export const COLORS = {
  // --primary: the one navy the whole brand rests on. Off the slide's chrome
  // since the export handoff (the frame is white now, its text --foreground);
  // what still uses it is the deck's own furniture — the summary slide's
  // headings and the dashboard tables' header row.
  navy: '1E2A38',
  // --background / --card: the slide, and the chart card on it. The handoff
  // draws both white and separates them with --border rather than with a
  // tint, so a bar's colour is the only colour on the slide.
  slideBg: 'FFFFFF',
  cardBg: 'FFFFFF',
  // --primary-foreground: the pale blue-grey that sits *on* navy — a table's
  // header row, a status segment's fill.
  lightText: 'EBF0F5',
  // Text links are the product's one deliberate exception to "navy plus
  // neutrals": Tailwind blue-500, not --primary. See the Link note in
  // design-system/components/core/Link.prompt.md.
  link: '3B82F6',
  // --status-issue: the orange the product reserves for issues and caveats,
  // used here for the "some tasks aren't shown" warning.
  warning: 'F97316',
  // --border
  border: 'E5E5E5',
  // --muted-foreground. The product has exactly one muted grey, so footer
  // captions and de-emphasised body text share it rather than drifting into
  // two greys.
  footerText: '737373',
  mutedText: '737373',
  // --kind-project / --kind-phase / --kind-task: the work-item kind colours.
  // A bar may be coloured by kind instead of by status (TimelineItem.color),
  // which is what the seeded demo plan does.
  kindProject: 'A855F7',
  kindPhase: 'D97706',
  kindTask: '3B82F6',
  // The unfilled remainder of a Gantt bar. --border, so the track reads as a
  // neutral rail rather than the slate tint it used to carry.
  barTrack: 'E5E5E5',
  // --popover / --card: an opaque white surface, for a native <select>'s
  // option list which the OS paints from the control's own colours.
  optionBg: 'FFFFFF',
  // Text drawn *on* a status fill (the percentage inside a bar):
  // --primary-foreground, the token the product uses for text on its dark
  // brand surfaces.
  textOnFill: 'EBF0F5',
  // Text drawn *beside* a bar, on the pale track, where a light colour would
  // disappear: --foreground. --muted-foreground was measured first and only
  // reaches 3.7:1 on the track, so it is deliberately not used here.
  textOnSurface: '0A0A0A',
  // --destructive. The "today" rule, and the blocked status icon: the two
  // marks on a slide that mean "look here".
  today: 'EF4444',
  blocked: 'EF4444',
  // --muted-foreground at the handoff's 0.7 opacity, resolved over the white
  // card (0.7 x 0x73 + 0.3 x 0xFF). Both engines would need a per-stroke alpha
  // otherwise, and only one of them has one.
  iconTodo: '9A9A9A',
} as const;

/** The four phase colours of the export handoff, in its own order, each with
 * the alpha its nested bars are tinted at.
 *
 * The handoff names four phases (Discovery / Design / Build / Validation) and
 * gives each a solid and a tint. Our model has no phases — it has a tree — so
 * the four are used as a cycle: a root takes the next colour in this list, and
 * everything under it inherits that colour, because what the colour says is
 * "this is the same branch", not "this is the same status". A root that
 * carries a colour of its own (TimelineItem.color) keeps it; the cycle only
 * fills in for roots that don't.
 *
 * Hex without '#', matching the rest of this file. */
export const PHASE_PALETTE = [
  { solid: '0F9488', tintAlpha: 0.28 },
  { solid: '7C3AED', tintAlpha: 0.24 },
  { solid: '2F7FED', tintAlpha: 0.24 },
  { solid: 'E08706', tintAlpha: 0.26 },
] as const;

/** The tint a bar gets when its colour did not come from the palette — a task
 * carrying its own `color`. The middle of the handoff's own 0.24–0.28 range,
 * since it gives no rule for a colour it never named. */
export const CUSTOM_COLOR_TINT_ALPHA = 0.26;

/** The colour a root's whole branch is drawn in: its own if it has one, else
 * the next entry of the palette, cycled. `rootIndex` is the root's position in
 * the plan's own order, so the same plan always produces the same colours. */
export function phaseColor(rootIndex: number, ownColor: string | undefined): { solid: string; tintAlpha: number } {
  if (ownColor) {
    return { solid: ownColor.replace('#', '').toUpperCase(), tintAlpha: CUSTOM_COLOR_TINT_ALPHA };
  }
  const entry = PHASE_PALETTE[rootIndex % PHASE_PALETTE.length];
  return { solid: entry.solid, tintAlpha: entry.tintAlpha };
}

export function withHash(hex: string) {
  return `#${hex}`;
}

// Closest built-in equivalents for a uniform sans-serif look in each engine.
// The product itself ships no webfont and rides the platform UI stack, which
// Office and jsPDF have no access to — Arial/Helvetica are the nearest
// metric-neutral stand-ins.
export const PPTX_FONT_FACE = 'Arial';
export const PDF_FONT_FACE = 'helvetica';

// Monospace face for dates, so a date is recognizable as a date at a glance
// rather than blending into the prose around it. 'courier' is one of jsPDF's
// built-in standard-14 fonts (confirmed via doc.getFontList(): normal +
// bold), and 'Courier New' is its metric-compatible Office counterpart —
// both advance a flat 600/1000 em per glyph, which is what
// measureMonoTextWidthIn in textMetrics.ts relies on.
export const PPTX_MONO_FONT_FACE = 'Courier New';
export const PDF_MONO_FONT_FACE = 'courier';

export const FOOTER_TEXT = 'Exported from aicoo';
