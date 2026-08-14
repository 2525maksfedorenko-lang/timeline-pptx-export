// Picking readable text colors for text drawn on top of an arbitrary fill
// (e.g. a progress label sitting inside a task bar, whose color is per-task
// on screen and status-derived in exports).

function toLinearChannel(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance (0 = black, 1 = white) of a 6-digit hex color,
 * with or without a leading '#'. Anything unparseable reads as black, i.e.
 * gets light text. */
function relativeLuminance(hex: string): number {
  const digits = hex.replace('#', '');
  const value = Number.parseInt(digits, 16);
  if (digits.length !== 6 || Number.isNaN(value)) return 0;

  return (
    0.2126 * toLinearChannel((value >> 16) & 0xff) +
    0.7152 * toLinearChannel((value >> 8) & 0xff) +
    0.0722 * toLinearChannel(value & 0xff)
  );
}

/** Whether dark text reads better than light text on top of `hex`.
 *
 * The cut leans toward keeping white on mid-tone fills (blue, violet, teal,
 * coral — all around 3:1 against white, which reads fine for the small bold
 * text this is used for) and flips only where white genuinely stops being
 * legible: ambers and light grays, where it drops to ~2.5:1 or worse while
 * dark text is above 5:1. */
export function needsDarkText(hex: string): boolean {
  return relativeLuminance(hex) > 0.35;
}
