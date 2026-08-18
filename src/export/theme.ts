// aicoo brand palette for the PPTX/PDF exporters. Hex values are stored without
// '#' (pptxgenjs's format); call `withHash()` for APIs that expect a leading
// '#' (e.g. jsPDF).
//
// These are the aicoo Coordinator design-system tokens resolved to hex, because
// neither exporter can read CSS custom properties. Where a token exists, its
// name is given — keep the two in step (see design-system/tokens/).

export const COLORS = {
  // --primary: the one navy the whole brand rests on.
  navy: '1E2A38',
  // --base-background: the product's pale blue-grey app chrome, so a slide
  // reads as a Coordinator surface rather than plain white.
  slideBg: 'EBF0F5',
  // --primary-foreground: the pale blue-grey that sits *on* navy. Same value as
  // slideBg upstream, which is safe here because it is only ever drawn on the
  // navy header band or on a coloured bar fill, never on the slide background.
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
  // captions and de-emphasised body text (e.g. a detail section's "No
  // assignee" placeholder) share it rather than drifting into two greys.
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
  // Vertical date grid lines behind the timeline bars, in four densities, each
  // paired with a stroke width in dateGrid.ts. No design-system counterpart —
  // the product's Gantt isn't part of the system — so these are derived: the
  // original khaki-tinted set retuned onto neutral greys, since aicoo has no
  // warm greys anywhere. The spread is kept wide enough that the levels stay
  // distinguishable after antialiasing at sub-pixel widths, and every one of
  // them stays a clear step darker than slideBg or it would vanish.
  //
  // Monthly is the darkest of the three regular levels and daily the palest,
  // so the levels read as a hierarchy at a glance.
  gridLine: 'CFCFCF',
  weekGridLine: 'D6D6D6',
  // Year boundaries, only drawn on ranges long enough that months are the
  // *fine* level (see getVisibleGridLevels). A clear step darker than the
  // monthly line, since on a multi-year range it's the one mark that says
  // where one year ends and the next begins.
  yearGridLine: 'B0B0B0',
  dayGridLine: 'E0E0E0',
  // On-screen connector strokes. Relocated here unchanged so no hex lives
  // outside this file; they have no design-system counterpart (the product's
  // Gantt is outside the system) and deliberately keep their existing values,
  // since retuning connectors is not part of the contrast work.
  //
  // Note they do not match `dependencyLine` below, which the export uses for
  // the same relationship — a divergence that predates this and is left as a
  // decision rather than silently unified.
  screenDependencyLine: '8A94A0',
  screenHierarchyLine: 'C7CDD4',
  // Dependency connector lines between overview bars. Also derived — secondary
  // to the bars it links, but readable on slideBg.
  dependencyLine: 'A3A3A3',
  // Fallback swatch fill for a detail slide's "Assigned to" line when the
  // assignee's name no longer matches any saved Person (e.g. removed from
  // peopleStore after the task was assigned) — a neutral badge instead of
  // silently guessing a color that isn't really theirs.
  assigneeFallback: '9CA3AF',
} as const;

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
