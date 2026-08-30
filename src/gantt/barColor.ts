import { COLORS } from '../export/theme';
import { branchFillAlpha, FLAT_PLAN_COLOR, type BranchColor } from '../utils/branchColors';

/**
 * A branch colour, as the three CSS values a bar needs.
 *
 * The exporters hand `solid` and an alpha straight to pptxgenjs and jsPDF,
 * which composite it over the white card themselves. The screen has no such
 * step — a translucent bar would let the grid's period rules show through it —
 * so the tint is flattened against the canvas here instead. Same two numbers,
 * same resulting colour, arrived at in the way each medium can actually draw.
 *
 * This is the one file on the plan screen that computes a colour rather than
 * naming a token, and the reason is that its input is data (which branch a task
 * is in) rather than a design decision. `tokens.css` still owns every colour
 * the screen *chooses*; nothing here is chosen.
 */

/** `--gantt-surface`, the canvas a bar is drawn on, as components. Written as
 * numbers rather than as a hex literal because it is an input to arithmetic
 * here, not a colour this file is picking. */
const SURFACE = { r: 255, g: 255, b: 255 };

function toRgb(hex: string): { r: number; g: number; b: number } {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return { r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff };
}

function toHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

/** WCAG relative luminance, for choosing the label colour by measurement
 * rather than by a rule of thumb. The palette runs from a deep violet to an
 * amber that is nearly as light as its own tint, and "roots get light text"
 * would be unreadable on the amber one. */
function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: string, b: string): number {
  const [high, low] = [relativeLuminance(toRgb(a)), relativeLuminance(toRgb(b))].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/** The branch colour flattened against the canvas: full strength for a root,
 * the branch's tint for anything nested under it. */
export function barFillCss(color: BranchColor, depth: number): string {
  const alpha = branchFillAlpha(depth, color);
  const rgb = toRgb(color.solid);
  return toHex({
    r: SURFACE.r + (rgb.r - SURFACE.r) * alpha,
    g: SURFACE.g + (rgb.g - SURFACE.g) * alpha,
    b: SURFACE.b + (rgb.b - SURFACE.b) * alpha,
  });
}

/** The bar's own name, set on the bar. Whichever of the deck's two text
 * colours reads better on this particular fill — the pale one the export uses
 * *on* a fill, or the near-black it uses beside one. */
export function barTextCss(color: BranchColor, depth: number): string {
  const fill = barFillCss(color, depth);
  const onFill = `#${COLORS.textOnFill}`;
  const onSurface = `#${COLORS.textOnSurface}`;
  return contrastRatio(fill, onFill) >= contrastRatio(fill, onSurface) ? onFill : onSurface;
}

/** The selection ring: the branch's solid at half alpha, whatever depth the
 * bar sits at, so selecting a tinted sub-task still shows the branch's colour
 * at full saturation. */
export function barRingCss(color: BranchColor): string {
  return `#${color.solid}`;
}

/** Everything a bar paints itself with, resolved once per task. */
export interface BarStyle {
  fill: string;
  text: string;
  ring: string;
}

/** Every task's bar style, keyed by id.
 *
 * `depthById` must be the depth in the **whole plan**, not the row's depth on
 * screen. The two can differ — folding a group away leaves its children out of
 * the drawn rows, and any depth computed from what is drawn would shift the
 * ones that remain. A bar that changed from tinted to full strength because a
 * row above it was folded would be saying its task had been re-parented. The
 * same rule made the export and the screen agree, which is why the depth map
 * is built once from the whole plan and handed in. */
export function buildBarStyles(
  colorById: ReadonlyMap<string, BranchColor>,
  depthById: ReadonlyMap<string, number>,
): Map<string, BarStyle> {
  const styles = new Map<string, BarStyle>();
  colorById.forEach((color, id) => {
    const depth = depthById.get(id) ?? 0;
    styles.set(id, {
      fill: barFillCss(color, depth),
      text: barTextCss(color, depth),
      ring: barRingCss(color),
    });
  });
  return styles;
}

/** What a bar falls back to if its task carries no colour. Unreachable while
 * the style map is built from the same list the rows are — kept because the
 * exporter has the same fallback, in the same colour, and a default that
 * differed between them would be a difference waiting to be found. */
export const FALLBACK_BAR_STYLE: BarStyle = {
  fill: barFillCss(FLAT_PLAN_COLOR, 0),
  text: barTextCss(FLAT_PLAN_COLOR, 0),
  ring: barRingCss(FLAT_PLAN_COLOR),
};
