// Real browser text measurement, for layout decisions that have to be made
// before rendering (e.g. "is this bar's filled part actually wide enough to
// hold its progress label?"). A single offscreen canvas answers that without
// a DOM node, a ref, or a layout pass.

let cachedContext: CanvasRenderingContext2D | null | undefined;

function getContext(): CanvasRenderingContext2D | null {
  if (cachedContext === undefined) {
    cachedContext = document.createElement('canvas').getContext('2d');
  }
  return cachedContext;
}

/** Width in CSS px of `text` drawn with `font` — a CSS `font` shorthand
 * (e.g. `600 11px system-ui`) that must match how the text is actually
 * styled. Falls back to a rough per-character estimate only when a 2D
 * context isn't available. */
export function measureTextWidthPx(text: string, font: string): number {
  const context = getContext();
  if (!context) return text.length * 7;

  context.font = font;
  return context.measureText(text).width;
}
