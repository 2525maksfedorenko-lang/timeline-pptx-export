// aicoo brand palette. Hex values are stored without '#' (pptxgenjs's format);
// call `withHash()` for APIs that expect a leading '#' (e.g. jsPDF).

export const COLORS = {
  navy: '1E2B38',
  slideBg: 'F1F2F4',
  lightText: 'E9EDF2',
  teal: '2A9D90',
  coral: 'E76E50',
  amber: 'F2C14E',
  border: 'E5E5E1',
  // Not part of the brand palette itself, but needed for legible gray
  // caption text on the light footer strip.
  footerText: '6B7280',
  // De-emphasized body text: present and readable, but visibly secondary to
  // navy (e.g. a detail section's "No assignee" placeholder).
  mutedText: '9AA2AC',
  // Vertical date grid lines behind the timeline bars, in three densities
  // (see dateGrid.ts, which pairs each with its stroke width). Monthly is
  // the darkest and daily the palest, so the levels read as a hierarchy at
  // a glance; the values are deliberately spread far enough apart to stay
  // distinguishable after antialiasing at sub-pixel widths.
  gridLine: 'D8D6CC',
  weekGridLine: 'E0E1D8',
  // Pale, but deliberately not *as* pale as the slide background it sits on
  // (slideBg F1F2F4): a lighter daily line simply disappears in the export.
  dayGridLine: 'E9EAE2',
  // Dependency connector lines between overview bars.
  dependencyLine: '8A94A0',
} as const;

export function withHash(hex: string) {
  return `#${hex}`;
}

/** Status color for a progress value, per the aicoo style guide. */
export function statusColor(progress: number): string {
  if (progress >= 100) return COLORS.teal;
  if (progress >= 34) return COLORS.amber;
  return COLORS.coral;
}

// Closest built-in equivalents for a uniform sans-serif look in each engine.
export const PPTX_FONT_FACE = 'Arial';
export const PDF_FONT_FACE = 'helvetica';

export const FOOTER_TEXT = 'Exported from aicoo';
