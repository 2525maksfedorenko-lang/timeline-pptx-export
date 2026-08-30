/* Rebuilds src/export/pdfFont.ts — the subset of Arimo the PDF embeds.
 *
 * Not part of the build: it needs the network and a one-off dependency, and
 * the font changes about as often as the alphabet does. It is here so the
 * 150KB of base64 in `pdfFont.ts` has a recipe rather than a story.
 *
 *     npm i --no-save subset-font
 *     curl -sSLO https://raw.githubusercontent.com/googlefonts/arimo/main/fonts/ttf/Arimo-Regular.ttf
 *     curl -sSLO https://raw.githubusercontent.com/googlefonts/arimo/main/fonts/ttf/Arimo-Bold.ttf
 *     node scripts/buildPdfFont.mjs
 */
import fs from 'node:fs';
import subsetFont from 'subset-font';

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => String.fromCodePoint(from + i));

/** What the deck can draw. Everything outside this comes out as the
 * missing-glyph box — visible, which is the point: the encoding bug this
 * replaced was invisible. */
const KEEP = [
  ...range(0x20, 0x7e), // ASCII printable
  ...range(0xa0, 0xff), // Latin-1 Supplement — French, German, Spanish, Nordic
  ...range(0x100, 0x17f), // Latin Extended-A — Polish, Czech, Hungarian, Baltic, Turkish
  ...range(0x400, 0x45f), // Cyrillic — Russian, Ukrainian, Belarusian, Bulgarian, Serbian
  'Ґґ', // Ukrainian, outside the block above
  ...range(0x2010, 0x2015), // hyphens and dashes
  ...range(0x2018, 0x201e), // curly quotes
  '†•…‰‹›€№→·',
].join('');

const FACES = [
  ['Arimo-Regular.ttf', 'ARIMO_REGULAR_BASE64', 'Arimo Regular, subset.'],
  ['Arimo-Bold.ttf', 'ARIMO_BOLD_BASE64', 'Arimo Bold, subset.'],
];

const wrap = (b64) =>
  b64.replace(/(.{96})/g, '$1\n').split('\n').filter(Boolean).map((line) => `  '${line}' +`).join('\n').replace(/ \+$/, '');

const parts = [];
for (const [file, name, caption] of FACES) {
  const full = fs.readFileSync(file);
  const subset = await subsetFont(full, KEEP, { targetFormat: 'sfnt' });
  const base64 = subset.toString('base64');
  console.log(`${file}: ${(full.length / 1024).toFixed(0)}KB -> ${(subset.length / 1024).toFixed(1)}KB, base64 ${(base64.length / 1024).toFixed(1)}KB`);
  parts.push(`/** ${caption} */\nexport const ${name} =\n${wrap(base64)};`);
}

const existing = fs.readFileSync('src/export/pdfFont.ts', 'utf8');
const head = existing.slice(0, existing.indexOf('/** Arimo Regular'));
fs.writeFileSync('src/export/pdfFont.ts', `${head}${parts.join('\n\n')}\n`);
console.log(`glyphs kept: ${[...KEEP].length}`);
