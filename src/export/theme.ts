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
  // Faint vertical date-axis grid lines on the overview slide.
  gridLine: 'D8D6CC',
  // Weekly tick marks on the overview slide's date axis — lighter than
  // gridLine so they read as secondary to the monthly grid lines.
  weekGridLine: 'E8E9E4',
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
