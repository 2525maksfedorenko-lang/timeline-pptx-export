import { COLORS, withHash } from '../export/theme';

// Picking readable text colors for text drawn on top of an arbitrary fill
// (e.g. a progress label sitting inside a task bar, whose fill is the task's
// own color or its status color — see resolveBarColor, which the screen and
// both exporters share).

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

/** WCAG contrast ratio between two colors, 1 (identical) to 21 (black on
 * white). AA wants 4.5:1 for normal text, which is the bar the progress label
 * and the status words are held to — see docs/status-color-scale.md. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);

  return (lighter + 0.05) / (darker + 0.05);
}

/** The more readable of the two text tokens on top of `fill`, chosen by
 * measured contrast rather than by guessing from luminance alone.
 *
 * The luminance cut this replaces sat at 0.35 and got mid-tones wrong in a way
 * that mattered: on the demo plan's purple (#A855F7) it kept white at 3.96:1
 * where dark text reaches 5.00:1. Status fills come from TASK_STATUS_SCALE's
 * `solid` step and clear 4.5:1 with light text by construction; this function
 * exists for the fills it cannot control — a user's own `item.color` and a
 * person's avatar colour — where the best available option is still the right
 * one to pick. */
export function readableTextOn(fill: string): string {
  return contrastRatio(fill, withHash(COLORS.textOnFill)) >=
    contrastRatio(fill, withHash(COLORS.textOnSurface))
    ? withHash(COLORS.textOnFill)
    : withHash(COLORS.textOnSurface);
}
