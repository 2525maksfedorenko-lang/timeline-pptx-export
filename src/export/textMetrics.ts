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

// Arimo-Bold advance widths for А-Я and а-я, in code-point order. Measured
// from the very file the PDF embeds (see pdfFont.ts), which is why they can be
// trusted rather than approximated: Arimo is metrically Arial, and the Latin
// widths measured out of it come back identical to the Helvetica-Bold table
// above — A 722, W 944, a 556, i 278, space 278 — so one table serves both
// alphabets and both engines.
//
// Without these every Cyrillic character fell through to FALLBACK_GLYPH_WIDTH,
// the width of 'W'. Real Cyrillic averages about 620, so a Russian label was
// measured half again as wide as it draws and `truncateToWidth` cut it off at
// roughly two thirds of what fitted: "Подготовка к запуску" reached the slide
// as "Подготовка к зап...". That was true of the PowerPoint file too, where
// nothing was wrong with the text itself.
const CYRILLIC_UPPERCASE_WIDTHS = [
  722, 719, 722, 567, 712, 667, 904, 626, 719, 719, 610, 702, 833, 722, 778, 719,
  667, 722, 611, 622, 854, 667, 730, 703, 1005, 1019, 870, 979, 719, 711, 1031, 719,
];
const CYRILLIC_LOWERCASE_WIDTHS = [
  556, 618, 615, 417, 635, 556, 709, 497, 615, 615, 500, 635, 740, 604, 611, 604,
  611, 556, 490, 556, 875, 556, 615, 581, 833, 844, 729, 854, 615, 552, 854, 583,
];

/** The letters outside the two contiguous runs above — Ё and the ones the
 * other Cyrillic alphabets add. */
const CYRILLIC_EXTRA_WIDTHS: Record<string, number> = {
  Ѐ: 667, Ё: 669, Ђ: 885, Ѓ: 567, Є: 711, Ѕ: 667, І: 278, Ї: 276,
  Ј: 556, Љ: 1094, Њ: 1063, Ћ: 875, Ќ: 610, Ѝ: 719, Ў: 622, Џ: 719,
  ѐ: 556, ё: 556, ђ: 611, ѓ: 417, є: 552, ѕ: 556, і: 278, ї: 281,
  ј: 278, љ: 969, њ: 906, ћ: 611, ќ: 500, ѝ: 615, ў: 556, џ: 604,
  Ґ: 487, ґ: 447,
};

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
  ...letterWidths('а', CYRILLIC_LOWERCASE_WIDTHS),
  ...letterWidths('А', CYRILLIC_UPPERCASE_WIDTHS),
  ...CYRILLIC_EXTRA_WIDTHS,
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

// Courier / Courier New advance exactly this per glyph, whatever the glyph
// and whichever weight — verified against jsPDF's own getTextWidth (which
// reads the real embedded metrics) for digits, letters, spaces and the en
// dash, in both normal and bold. That flatness is the whole point of a
// monospace face, and it's why dates need their own measurement rather than
// the proportional table above: "Aug 20 – Aug 28" measures 517/glyph in
// Helvetica-Bold but 600 here, so reusing the wrong one would under-reserve
// its box by ~16% and let the next thing along the row overlap it.
const MONO_GLYPH_WIDTH_PER_1000_EM = 600;

/** Width in inches of `text` rendered at `fontSizePt` in the monospace face
 * (theme.ts's PPTX_MONO_FONT_FACE / PDF_MONO_FONT_FACE). */
export function measureMonoTextWidthIn(text: string, fontSizePt: number): number {
  return ([...text].length * MONO_GLYPH_WIDTH_PER_1000_EM * fontSizePt) / 1000 / 72;
}

/** Extra width in inches that `letterSpacingPt` of tracking adds to `text`.
 *
 * Counts every glyph rather than the gaps between them: PDF's `Tc` operator
 * (jsPDF's setCharSpace) adds the spacing to each glyph's advance including
 * the last, and over-estimating by one glyph is the safe direction anyway —
 * the same bias the fallback width above takes. Callers add this on top of a
 * measureTextWidthIn/measureMonoTextWidthIn result, since neither engine
 * folds tracking into its own metrics (jsPDF's getTextWidth ignores
 * setCharSpace entirely). */
export function measureLetterSpacingWidthIn(text: string, letterSpacingPt: number): number {
  return ([...text].length * letterSpacingPt) / 72;
}

// Rough text-wrapping estimate used only to size layout boxes ahead of
// render: neither pptxgenjs nor jsPDF expose real text measurement before
// drawing. Assumes an average glyph is ~0.55em wide — a bit wider than a
// typical sans-serif average, so this skews toward *more* estimated lines
// rather than fewer, which is the safer direction to be wrong in (extra
// whitespace instead of overlapping the next block).
const AVG_CHAR_WIDTH_EM = 0.55;

/** How many lines `text` wraps to in a box `widthIn` wide at `fontSizePt`. */
export function estimateWrappedLines(text: string, fontSizePt: number, widthIn: number): number {
  if (!text) return 1;
  const charWidthIn = (fontSizePt * AVG_CHAR_WIDTH_EM) / 72;
  const charsPerLine = Math.max(1, Math.floor(widthIn / charWidthIn));
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}
