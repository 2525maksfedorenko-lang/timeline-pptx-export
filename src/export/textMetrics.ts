// Text measurement for slide layout. Neither pptxgenjs nor jsPDF can measure
// text before it's drawn, so widths come from the standard Helvetica/Arial
// advance-width table — both engines' font faces (see theme.ts) share those
// metrics, and for the glyphs below they're the same in regular and bold.

const GLYPH_WIDTH_PER_1000_EM: Record<string, number> = {
  '0': 556,
  '1': 556,
  '2': 556,
  '3': 556,
  '4': 556,
  '5': 556,
  '6': 556,
  '7': 556,
  '8': 556,
  '9': 556,
  '%': 889,
  ' ': 278,
};

// Widest entry above, so an unlisted character is over- rather than
// under-estimated (extra whitespace beats overlapping text).
const FALLBACK_GLYPH_WIDTH = 889;

/** Width in inches of `text` rendered at `fontSizePt`. */
export function measureTextWidthIn(text: string, fontSizePt: number): number {
  const widthPerEm =
    [...text].reduce((sum, char) => sum + (GLYPH_WIDTH_PER_1000_EM[char] ?? FALLBACK_GLYPH_WIDTH), 0) / 1000;

  return (widthPerEm * fontSizePt) / 72;
}
