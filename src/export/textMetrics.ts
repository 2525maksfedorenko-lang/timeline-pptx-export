// Text measurement for slide layout. Neither pptxgenjs nor jsPDF can measure
// text before it's drawn, so widths come from the standard Helvetica/Arial
// advance-width table — both engines' font faces (see theme.ts) share those
// metrics.
//
// The values are the *bold* face's, because every piece of text measured for
// a collision (an overview bar's label, its status, its progress) is drawn
// bold. Bold advances are >= regular for every glyph, so the few callers
// measuring regular text (a detail slide's subtask row) still get an
// over-estimate — the safe direction, same as FALLBACK_GLYPH_WIDTH below.

// Helvetica-Bold advance widths for a-z and A-Z, in alphabetical order.
// Letters have to be in the table: falling through to the fallback width
// overestimated ordinary mixed-case text by ~1.6x, which truncated task
// labels (see truncateToWidth in timelineExportModel.ts) roughly twice as
// early as the glyphs actually required.
const LOWERCASE_WIDTHS = [
  556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889,
  611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500,
];
const UPPERCASE_WIDTHS = [
  722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833,
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611,
];

function letterWidths(firstLetter: string, widths: number[]): Record<string, number> {
  const firstCharCode = firstLetter.charCodeAt(0);
  return Object.fromEntries(
    widths.map((width, index) => [String.fromCharCode(firstCharCode + index), width]),
  );
}

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
  ...letterWidths('a', LOWERCASE_WIDTHS),
  ...letterWidths('A', UPPERCASE_WIDTHS),
};

// Widest entry above ('W'), so an unlisted character — punctuation, or any
// non-Latin script — is over- rather than under-estimated (extra whitespace
// beats overlapping text).
const FALLBACK_GLYPH_WIDTH = 944;

/** Width in inches of `text` rendered at `fontSizePt`. */
export function measureTextWidthIn(text: string, fontSizePt: number): number {
  const widthPerEm =
    [...text].reduce((sum, char) => sum + (GLYPH_WIDTH_PER_1000_EM[char] ?? FALLBACK_GLYPH_WIDTH), 0) / 1000;

  return (widthPerEm * fontSizePt) / 72;
}
