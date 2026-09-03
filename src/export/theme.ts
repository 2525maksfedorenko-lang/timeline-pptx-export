import { PDF_TEXT_FONT_FAMILY } from './pdfFont';

// aicoo brand palette for the PPTX/PDF exporters. Hex values are stored without
// '#' (pptxgenjs's format); call `withHash()` for APIs that expect a leading
// '#' (e.g. jsPDF).
//
// These are the aicoo Coordinator design-system tokens resolved to hex, because
// neither exporter can read CSS custom properties. Where a token exists, its
// name is given — keep the two in step (see design-system/tokens/).
//
// **This palette has one theme and it is light.** The plan screen follows the
// website's dark mode now (src/utils/siteTheme.ts); this file does not, and the
// line between them is not an oversight to be tidied away later. A `.pptx` or a
// `.pdf` is opened in PowerPoint, in Acrobat, on a projector and on paper, by
// people who were not the visitor who generated it — none of whom has the
// visitor's theme and most of whom are looking at white. A deck that came out
// dark because whoever exported it happened to prefer dark is a deck that has
// to be redone.
//
// Concretely: nothing here reads `localStorage`, `matchMedia`, or a class on
// `<html>`, and nothing here may start to. `slideBg` stays FFFFFF. The one
// place the screen and the deck deliberately differ is the ground a nested
// bar's tint is flattened against — see the SURFACE table in
// `src/gantt/barColor.ts`, which explains why the difference exists and why it
// does not make the two disagree about colour.

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
  // Text drawn *on* a status fill (the percentage inside a bar):
  // --primary-foreground, the token the product uses for text on its dark
  // brand surfaces.
  textOnFill: 'EBF0F5',
  // Text drawn *beside* a bar, on the pale track, where a light colour would
  // disappear: --foreground. --muted-foreground was measured first and only
  // reaches 3.7:1 on the track, so it is deliberately not used here.
  textOnSurface: '0A0A0A',
  // --destructive. The "today" rule — the one mark on a slide that means
  // "look here".
  today: 'EF4444',
  // --muted-foreground at the handoff's 0.7 opacity, resolved over the white
  // card (0.7 x 0x73 + 0.3 x 0xFF). Both engines would need a per-stroke alpha
  // otherwise, and only one of them has one.
  iconTodo: '9A9A9A',
} as const;

/* The bar palette used to live here. It now lives in
 * `src/utils/branchColors.ts`, because it stopped being an export-only palette:
 * the plan screen draws its bars from the same values, so that a task is the
 * same colour on screen as on the slide. This file keeps the colours that are
 * genuinely the deck's own — its chrome, its grid, its footer.
 *
 * `COLORS.kind*` below are not that palette. They are the design system's
 * work-item kind colours, which a task may carry as its own `TimelineItem.color`
 * — and a task's own colour still wins over the branch palette, in both media. */

export function withHash(hex: string) {
  return `#${hex}`;
}

// A uniform sans-serif look in each engine. The product itself ships no
// webfont and rides the platform UI stack, which Office and jsPDF have no
// access to, so each is given the nearest metric-neutral stand-in.
//
// PowerPoint asks for Arial by name and every reader has it, or a metric
// clone of it. The PDF cannot: jsPDF's built-in Helvetica is WinAnsiEncoding,
// which turns Cyrillic into Latin punctuation without complaining, so the file
// carries its own face instead — Arimo, which *is* an Arial metric clone, so
// the two renderings still measure a line the same way. See pdfFont.ts.
export const PPTX_FONT_FACE = 'Arial';
export const PDF_FONT_FACE = PDF_TEXT_FONT_FAMILY;

// Monospace face for dates, so a date is recognizable as a date at a glance
// rather than blending into the prose around it. 'courier' is one of jsPDF's
// built-in standard-14 fonts (confirmed via doc.getFontList(): normal +
// bold), and 'Courier New' is its metric-compatible Office counterpart —
// both advance a flat 600/1000 em per glyph, which is what
// measureMonoTextWidthIn in textMetrics.ts relies on.
//
// Courier stays a built-in even though the text face no longer is, and it can:
// the only thing set in it is a date, and a date is written here in English
// ("Aug 16 – Sep 01", see formatShortDate) — digits, ASCII letters and an en
// dash, all of which WinAnsi has. Nothing a person typed is ever drawn in it,
// so it cannot meet a character it lacks.
export const PPTX_MONO_FONT_FACE = 'Courier New';
export const PDF_MONO_FONT_FACE = 'courier';

/** The deck's provenance mark. It sits at the right of the title's line, not
 * in the footer where it used to: the footer's other tenant is the coverage
 * note, and that note is the one thing down there that must never compete for
 * attention. See docs/export-handoff-map.md, Phase 5. */
export const EXPORT_MARK_TEXT = 'Exported by aicoo';
