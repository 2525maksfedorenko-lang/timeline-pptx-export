/**
 * Design-system parity check — fails when our transcription of the primitives
 * has drifted from the primitives themselves.
 *
 *   npm run check:design
 *
 * `src/components/systemUi.ts` is a *copy*. The design system's primitives are
 * plain `.jsx` with inline styles over CSS custom properties: they sit outside
 * `tsc -b` and oxlint, nothing in `src/` can import them, and so the only way to
 * draw a control to their contract is to restate that contract in Tailwind
 * classes. A copy with no link back to its original is a copy that goes stale
 * the first time the system is re-pulled, silently and with nobody watching.
 *
 * This is that link. It does not compare text: it reads the *values* out of
 * `Button.jsx`, `Input.jsx` and `Checkbox.jsx` at run time, converts each one to
 * the Tailwind utility it implies, and asserts that utility is in the string we
 * actually hand to a component. So if the system moves its default button from
 * 40px to 42px, or its hover from /0.9 to /0.85, or renames a token, this fails
 * — and it fails naming both values, rather than leaving the app quietly one
 * step off the system it claims to follow.
 *
 * Three things it deliberately also checks:
 *   - that every variant and size the source declares is one we can produce, so
 *     the system *adding* one is a failure rather than a silent omission;
 *   - that the utility CARD_CLASS uses still resolves to the value the system
 *     calls `--shadow-sm`. Tailwind renamed the two lightest shadows between v3
 *     (which the system is ported from) and v4 (which this app runs), and that
 *     rename is exactly the kind of thing that moves under a copy without
 *     touching either side of it;
 *   - that every colour token our classes name actually exists in the system's
 *     `tokens/colors.css`, so a colour cannot be invented into the recipe.
 *
 * If the extraction itself stops working — the system reformats a file, or moves
 * a table — this fails too, loudly, with "could not read". That is correct: an
 * unreadable source is not a passing check, it is a check that has lost its
 * grip and needs a person.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  buttonClass,
  CARD_CLASS,
  CHECKBOX_CLASS,
  DISABLED,
  FOCUS_RING,
  INPUT_CLASS,
  MENU_ITEM_CLASS,
  MENU_ITEM_DESTRUCTIVE_CLASS,
  MENU_SEPARATOR_CLASS,
  MENU_SURFACE_CLASS,
  type ButtonSize,
  type ButtonVariant,
} from '../src/components/systemUi';

const DS_DIR = path.join(process.cwd(), 'design-system');
const failures: string[] = [];
const rows: string[][] = [];

function fail(message: string) {
  failures.push(message);
}

/** One checked claim: the source value, the utility it implies, and whether the
 * string we ship contains it. */
function expect(subject: string, source: string, utility: string, haystack: string) {
  const present = new Set(haystack.split(/\s+/)).has(utility);
  rows.push([subject, source, utility, present ? 'match' : 'DRIFTED']);
  if (!present) {
    fail(`${subject}: the system says ${source}, which is \`${utility}\` — not in "${haystack}"`);
  }
}

// --- reading the source contracts -------------------------------------------
// The primitives are JSX, so they cannot be imported; but the parts that carry
// the contract are plain object literals, and those can be read out of the text
// and evaluated. Free variables inside a style object (`disabled`, `invalid`,
// the caller's `style`) are stubbed, since the contract is the same either way.

function source(rel: string): string {
  const file = path.join(DS_DIR, rel);
  if (!fs.existsSync(file)) throw new Error(`could not read ${rel} — the design system has moved or is missing`);
  return fs.readFileSync(file, 'utf8');
}

/** The balanced `{...}` that follows `marker`, evaluated with `stubs` in scope. */
function objectAfter(src: string, marker: string, rel: string, stubs: Record<string, unknown> = {}) {
  const at = src.indexOf(marker);
  if (at === -1) throw new Error(`could not read ${rel}: "${marker}" is no longer in the file`);
  const start = src.indexOf('{', at + marker.length - 1);
  let depth = 0;
  let end = start;
  for (; end < src.length; end += 1) {
    if (src[end] === '{') depth += 1;
    else if (src[end] === '}') {
      depth -= 1;
      if (depth === 0) {
        end += 1;
        break;
      }
    }
  }
  const names = Object.keys(stubs);
  const literal = src.slice(start, end);
  try {
    return new Function(...names, `return ${literal}`)(...names.map((n) => stubs[n])) as Record<string, never>;
  } catch (error) {
    throw new Error(`could not read ${rel}: the object after "${marker}" no longer evaluates (${String(error)})`);
  }
}

// --- CSS value → the Tailwind utility it implies ----------------------------
// Tailwind's spacing base is 0.25rem, so a pixel value is on the scale exactly
// when it divides by 4. The system's own scale is the same 4px scale, so a value
// that fails this is off *both* — worth saying rather than rounding away.

const SPACING_BASE_PX = 4;

function step(px: number, what: string): number | null {
  if (px % SPACING_BASE_PX !== 0) {
    fail(`${what}: ${px}px is not on the 4px scale — it has no Tailwind step and no design-system step`);
    return null;
  }
  return px / SPACING_BASE_PX;
}

/** `"hsl(var(--primary))"` → `primary`; `"hsl(var(--primary) / 0.9)"` → `primary/90`.
 * Returns null for values that are not a token (`transparent`, `inherit`), which
 * a Tailwind class expresses by simply not being there. */
function tokenSuffix(css: string): string | null {
  const match = /var\(--([a-z-]+)\)(?:\s*\/\s*([\d.]+))?/.exec(css);
  if (!match) return null;
  const [, token, alpha] = match;
  return alpha === undefined ? token : `${token}/${Math.round(Number(alpha) * 100)}`;
}

/** `"8px 16px"` → `['py-2', 'px-4']`; `"0 12px"` → `['px-3']`; `0` → `[]`. */
function paddingClasses(value: string | number, what: string): string[] {
  if (value === 0 || value === '0') return [];
  const parts = String(value).trim().split(/\s+/).map((p) => Number.parseFloat(p));
  const [y, x] = parts.length === 1 ? [parts[0], parts[0]] : parts;
  const out: string[] = [];
  if (y > 0) {
    const s = step(y, `${what} vertical padding`);
    if (s !== null) out.push(`py-${s}`);
  }
  if (x > 0) {
    const s = step(x, `${what} horizontal padding`);
    if (s !== null) out.push(`px-${s}`);
  }
  return out;
}

// --- the checks --------------------------------------------------------------

function checkButton() {
  const rel = 'components/core/Button.jsx';
  const src = source(rel);
  const variants = objectAfter(src, 'const VARIANTS = {', rel) as unknown as Record<
    string,
    { bg: string; fg: string; hoverBg?: string; hoverFg?: string; underline?: boolean }
  >;
  const sizes = objectAfter(src, 'const SIZES = {', rel) as unknown as Record<
    string,
    { height: number; width?: number; padding: string | number }
  >;

  for (const [name, size] of Object.entries(sizes)) {
    const cls = buttonClass('outline', name as ButtonSize);
    if (cls.includes('undefined')) {
      fail(`Button size "${name}" exists in the system but systemUi.ts cannot produce it`);
      rows.push([`size ${name}`, `height ${size.height}`, '—', 'MISSING']);
      continue;
    }
    const h = step(size.height, `Button size "${name}" height`);
    if (h !== null) expect(`Button size ${name}`, `height ${size.height}px`, `h-${h}`, cls);
    if (size.width !== undefined) {
      const w = step(size.width, `Button size "${name}" width`);
      if (w !== null) expect(`Button size ${name}`, `width ${size.width}px`, `w-${w}`, cls);
    }
    for (const utility of paddingClasses(size.padding, `Button size "${name}"`)) {
      expect(`Button size ${name}`, `padding ${size.padding}`, utility, cls);
    }
  }

  for (const [name, variant] of Object.entries(variants)) {
    const cls = buttonClass(name as ButtonVariant, 'default');
    if (cls.includes('undefined')) {
      fail(`Button variant "${name}" exists in the system but systemUi.ts cannot produce it`);
      rows.push([`variant ${name}`, variant.bg, '—', 'MISSING']);
      continue;
    }
    const bg = tokenSuffix(variant.bg);
    if (bg) expect(`Button ${name} fill`, variant.bg, `bg-${bg}`, cls);
    const fg = tokenSuffix(variant.fg);
    if (fg) expect(`Button ${name} text`, variant.fg, `text-${fg}`, cls);
    if (variant.hoverBg) {
      const hover = tokenSuffix(variant.hoverBg);
      if (hover) expect(`Button ${name} hover fill`, variant.hoverBg, `hover:bg-${hover}`, cls);
    }
    if (variant.hoverFg) {
      const hover = tokenSuffix(variant.hoverFg);
      if (hover) expect(`Button ${name} hover text`, variant.hoverFg, `hover:text-${hover}`, cls);
    }
    if (variant.underline) expect(`Button ${name} underline`, 'underline on hover', 'hover:underline', cls);
  }

  // The base style, read by the properties that carry a contract rather than as
  // one object — it is written inline in the component with the size and variant
  // already merged in.
  const base = buttonClass('default', 'default');
  const radius = /borderRadius:\s*"var\(--radius-([a-z]+)\)"/.exec(src);
  if (radius) expect('Button radius', `var(--radius-${radius[1]})`, `rounded-${radius[1]}`, base);
  const fontSize = /fontSize:\s*"var\(--text-([a-z0-9]+)\)"/.exec(src);
  if (fontSize) expect('Button type size', `var(--text-${fontSize[1]})`, `text-${fontSize[1]}`, base);
  const weight = /fontWeight:\s*"var\(--font-weight-([a-z]+)\)"/.exec(src);
  if (weight) expect('Button weight', `var(--font-weight-${weight[1]})`, `font-${weight[1]}`, base);
  const gap = /gap:\s*(\d+)/.exec(src);
  if (gap) {
    const s = step(Number(gap[1]), 'Button gap');
    if (s !== null) expect('Button gap', `${gap[1]}px`, `gap-${s}`, base);
  }
  const opacity = /opacity:\s*disabled \? ([\d.]+)/.exec(src);
  if (opacity) {
    expect('Disabled opacity', `opacity ${opacity[1]}`, `disabled:opacity-${Math.round(Number(opacity[1]) * 100)}`, DISABLED);
  }
  if (/pointerEvents:\s*disabled \? "none"/.test(src)) {
    expect('Disabled pointer events', 'pointer-events: none', 'disabled:pointer-events-none', DISABLED);
  }
}

function checkInput() {
  const rel = 'components/forms/Input.jsx';
  const src = source(rel);
  const style = objectAfter(src, 'style={{', rel, { invalid: false, style: {} }) as unknown as Record<string, string | number>;
  const cls = INPUT_CLASS;

  const h = step(Number(style.height), 'Input height');
  if (h !== null) expect('Input height', `height ${style.height}px`, `h-${h}`, cls);
  const radius = tokenSuffix(String(style.borderRadius));
  if (radius) expect('Input radius', String(style.borderRadius), `rounded-${radius.replace('radius-', '')}`, cls);
  const border = tokenSuffix(String(style.border));
  if (border) {
    expect('Input border', String(style.border), 'border', cls);
    expect('Input border colour', String(style.border), `border-${border}`, cls);
  }
  const bg = tokenSuffix(String(style.background));
  if (bg) expect('Input fill', String(style.background), `bg-${bg}`, cls);
  const fg = tokenSuffix(String(style.color));
  if (fg) expect('Input text', String(style.color), `text-${fg}`, cls);
  const size = tokenSuffix(String(style.fontSize));
  if (size) expect('Input type size', String(style.fontSize), size.replace('text-', 'text-'), cls);
  for (const utility of paddingClasses(String(style.padding), 'Input')) {
    expect('Input padding', String(style.padding), utility, cls);
  }
}

function checkCheckbox() {
  const rel = 'components/forms/Checkbox.jsx';
  const src = source(rel);
  const style = objectAfter(src, 'style={{', rel, { on: false, disabled: false, style: {} }) as unknown as Record<
    string,
    string | number
  >;
  const cls = CHECKBOX_CLASS;

  const h = step(Number(style.height), 'Checkbox height');
  if (h !== null) expect('Checkbox height', `height ${style.height}px`, `h-${h}`, cls);
  const w = step(Number(style.width), 'Checkbox width');
  if (w !== null) expect('Checkbox width', `width ${style.width}px`, `w-${w}`, cls);
  const radius = tokenSuffix(String(style.borderRadius));
  if (radius) expect('Checkbox radius', String(style.borderRadius), `rounded-${radius.replace('radius-', '')}`, cls);
  const border = tokenSuffix(String(style.border));
  if (border) expect('Checkbox border colour', String(style.border), `border-${border}`, cls);
}

/** Tailwind's spacing scale carries half steps (`py-1.5` is 6px), so a value
 * that is even has a utility even when it is off the 4px scale. The menu row's
 * 6px padding is the only place in the system that needs one. */
function halfStep(px: number, what: string): string | null {
  if (px % 2 !== 0) {
    fail(`${what}: ${px}px is not on Tailwind's half-step scale`);
    return null;
  }
  const value = px / 4;
  return Number.isInteger(value) ? `${value}` : `${value}`;
}

function checkDropdownMenu() {
  const rel = 'components/overlays/DropdownMenu.jsx';
  const src = source(rel);
  // Both style objects are written inline with free variables in them — the
  // surface's position depends on `side`/`align`, the row's fill on `hover`.
  // Neither affects the values being read here, so they are stubbed.
  const surface = objectAfter(src, 'role="menu" style={{', rel, {
    minWidth: 224,
    side: 'bottom',
    align: 'start',
  }) as unknown as Record<string, string | number>;
  // Sliced to the row component first: `style={{` alone would find the
  // wrapper's, which is three objects earlier in the file.
  const itemSrc = src.slice(src.indexOf('export function DropdownMenuItem'));
  const item = objectAfter(itemSrc, 'style={{', rel, {
    hover: true,
    disabled: false,
  }) as unknown as Record<string, string | number>;

  const min = step(Number(surface.minWidth), 'DropdownMenu minimum width');
  if (min !== null) {
    expect('Menu min width', `${surface.minWidth}px`, `min-w-${min}`, MENU_SURFACE_CLASS);
  }
  const surfaceRadius = tokenSuffix(String(surface.borderRadius));
  if (surfaceRadius) {
    expect(
      'Menu radius',
      String(surface.borderRadius),
      `rounded-${surfaceRadius.replace('radius-', '')}`,
      MENU_SURFACE_CLASS,
    );
  }
  const surfaceBorder = tokenSuffix(String(surface.border));
  if (surfaceBorder) {
    expect('Menu border colour', String(surface.border), `border-${surfaceBorder}`, MENU_SURFACE_CLASS);
  }
  const surfaceBg = tokenSuffix(String(surface.background));
  if (surfaceBg) expect('Menu fill', String(surface.background), `bg-${surfaceBg}`, MENU_SURFACE_CLASS);
  const surfaceFg = tokenSuffix(String(surface.color));
  if (surfaceFg) expect('Menu text', String(surface.color), `text-${surfaceFg}`, MENU_SURFACE_CLASS);
  const surfacePadding = step(Number(surface.padding), 'DropdownMenu padding');
  if (surfacePadding !== null) {
    expect('Menu padding', `${surface.padding}px`, `p-${surfacePadding}`, MENU_SURFACE_CLASS);
  }
  const shadow = /boxShadow:\s*"var\(--shadow-([a-z0-9]+)\)"/.exec(src);
  if (shadow) expect('Menu elevation', `var(--shadow-${shadow[1]})`, `shadow-${shadow[1]}`, MENU_SURFACE_CLASS);

  const itemRadius = tokenSuffix(String(item.borderRadius));
  if (itemRadius) {
    expect(
      'Menu row radius',
      String(item.borderRadius),
      `rounded-${itemRadius.replace('radius-', '')}`,
      MENU_ITEM_CLASS,
    );
  }
  const itemSize = tokenSuffix(String(item.fontSize));
  if (itemSize) expect('Menu row type size', String(item.fontSize), itemSize, MENU_ITEM_CLASS);
  const itemGap = step(Number(item.gap), 'DropdownMenu row gap');
  if (itemGap !== null) expect('Menu row gap', `${item.gap}px`, `gap-${itemGap}`, MENU_ITEM_CLASS);
  const [padY, padX] = String(item.padding).split(/\s+/).map((part) => Number.parseFloat(part));
  const y = halfStep(padY, 'DropdownMenu row vertical padding');
  if (y !== null) expect('Menu row padding', String(item.padding), `py-${y}`, MENU_ITEM_CLASS);
  const x = halfStep(padX, 'DropdownMenu row horizontal padding');
  if (x !== null) expect('Menu row padding', String(item.padding), `px-${x}`, MENU_ITEM_CLASS);

  // The row's hover fill and text are written as a ternary on `hover`, which
  // the stub above pins to true — so what comes back is the hovered state.
  const hoverBg = tokenSuffix(String(item.background));
  if (hoverBg) expect('Menu row hover fill', String(item.background), `hover:bg-${hoverBg}`, MENU_ITEM_CLASS);
  const hoverFg = tokenSuffix(String(item.color));
  if (hoverFg) expect('Menu row hover text', String(item.color), `hover:text-${hoverFg}`, MENU_ITEM_CLASS);

  const separator = /separator\s*\n?\s*\? <div key=\{"sep" \+ i\} style=\{\{([^}]*)\}\}/.exec(src);
  if (separator) {
    const colour = tokenSuffix(separator[1]);
    if (colour) expect('Menu separator colour', `hsl(var(--${colour}))`, `bg-${colour}`, MENU_SEPARATOR_CLASS);
    expect('Menu separator weight', 'height 1', 'h-px', MENU_SEPARATOR_CLASS);
  } else {
    fail(`could not read ${rel}: the separator is no longer a one-line style object`);
  }
}

function checkFocusRing() {
  const rel = 'tokens/elevation.css';
  const css = source(rel);
  const width = /--focus-ring-width:\s*(\d+)px/.exec(css);
  const offset = /--focus-ring-offset:\s*(\d+)px/.exec(css);
  if (!width || !offset) {
    fail(`could not read ${rel}: --focus-ring-width / --focus-ring-offset are no longer there`);
    return;
  }
  expect('Focus ring width', `${width[1]}px`, `focus-visible:outline-${width[1]}`, FOCUS_RING);
  expect('Focus ring offset', `${offset[1]}px`, `focus-visible:outline-offset-${offset[1]}`, FOCUS_RING);
  expect('Focus ring colour', '--ring', 'focus-visible:outline-ring', FOCUS_RING);
}

/** The v3 → v4 rename guard: whichever Tailwind utility currently emits the
 * value the system calls `--shadow-sm` is the one a card at rest must use. */
function checkCardShadow() {
  const dsCss = source('tokens/elevation.css');
  const wanted = /--shadow-sm:\s*([^;]+);/.exec(dsCss);
  if (!wanted) {
    fail('could not read tokens/elevation.css: --shadow-sm is no longer there');
    return;
  }
  const normalise = (v: string) => v.replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ').trim();
  const themeFile = path.join(process.cwd(), 'node_modules/tailwindcss/theme.css');
  if (!fs.existsSync(themeFile)) {
    rows.push(['Card shadow', normalise(wanted[1]), 'tailwind theme not found', 'SKIPPED']);
    return;
  }
  const theme = fs.readFileSync(themeFile, 'utf8');
  const match = [...theme.matchAll(/--shadow-([a-z0-9]+):\s*([^;]+);/g)].find(
    (m) => normalise(m[2]) === normalise(wanted[1]),
  );
  if (!match) {
    fail(
      `no Tailwind utility emits the system's --shadow-sm (${normalise(wanted[1])}) — ` +
        `the scale has changed under us and CARD_CLASS cannot be right`,
    );
    return;
  }
  expect('Card shadow at rest', `--shadow-sm = ${normalise(wanted[1])}`, `shadow-${match[1]}`, CARD_CLASS);
}

/** `text-` utilities that set alignment rather than a colour or a size. */
const TEXT_ALIGNMENTS = new Set(['left', 'center', 'right', 'justify', 'start', 'end']);

/** Nothing in the recipes may name a colour the system does not define. */
function checkColourVocabulary() {
  const colours = source('tokens/colors.css');
  const status = source('tokens/status-palette.css');
  const known = new Set(
    [...`${colours}\n${status}`.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1].replace(/^--/, '')),
  );
  // Bridged in src/index.css on top of the token names, plus Tailwind's own
  // structural keywords, which name no colour.
  const allowed = new Set([...known, 'transparent', 'current', 'inherit', 'micro', 'overlay-scrim']);
  // `text-` is overloaded: it sets a colour *or* a type size. The sizes come
  // from the system too, so read them rather than listing them here — that way a
  // size added upstream stops being mistaken for an invented colour.
  const typography = source('tokens/typography.css');
  const typeSizes = new Set(
    [...typography.matchAll(/--text-([a-z0-9]+)\s*:/g)].map((m) => m[1]).concat(['micro']),
  );
  const recipes: [string, string][] = [
    ['buttonClass(default)', buttonClass('default')],
    ['buttonClass(destructive)', buttonClass('destructive')],
    ['buttonClass(outline)', buttonClass('outline')],
    ['buttonClass(secondary)', buttonClass('secondary')],
    ['buttonClass(ghost)', buttonClass('ghost')],
    ['buttonClass(link)', buttonClass('link')],
    ['INPUT_CLASS', INPUT_CLASS],
    ['CHECKBOX_CLASS', CHECKBOX_CLASS],
    ['CARD_CLASS', CARD_CLASS],
    ['MENU_SURFACE_CLASS', MENU_SURFACE_CLASS],
    ['MENU_ITEM_CLASS', MENU_ITEM_CLASS],
    ['MENU_ITEM_DESTRUCTIVE_CLASS', MENU_ITEM_DESTRUCTIVE_CLASS],
    ['MENU_SEPARATOR_CLASS', MENU_SEPARATOR_CLASS],
  ];
  let checked = 0;
  for (const [recipe, cls] of recipes) {
    for (const token of cls.split(/\s+/)) {
      // `outline-offset-N` is geometry, not a colour.
      if (/outline-offset-/.test(token)) continue;
      const colour = /^(?:hover:|focus-visible:|disabled:)?(bg|text|border|outline|accent|ring)-([a-z][a-z0-9-]*)(?:\/\d+)?$/.exec(token);
      if (!colour) continue;
      const [, property, name] = colour;
      // `border` on its own, and sizes like `outline-2`, are not colours.
      if (/^\d+$/.test(name)) continue;
      // A `text-` utility that names a step of the type scale is a size, and
      // one that names an alignment is neither a size nor a colour.
      if (property === 'text' && typeSizes.has(name)) continue;
      if (property === 'text' && TEXT_ALIGNMENTS.has(name)) continue;
      checked += 1;
      if (!allowed.has(name)) {
        fail(`${recipe}: \`${token}\` names "${name}", which is not a token in the design system`);
      }
    }
  }
  rows.push(['Colour vocabulary', `${known.size} tokens defined`, `${checked} colour classes`, failures.length ? 'see below' : 'match']);
}

function printTable(header: string[], body: string[][], indent = '   ') {
  const all = [header, ...body];
  const widths = header.map((_, column) => Math.max(...all.map((row) => (row[column] ?? '').length)));
  console.log(indent + header.map((cell, i) => cell.padEnd(widths[i])).join('  ').trimEnd());
  body.forEach((row) => console.log(indent + row.map((cell, i) => (cell ?? '').padEnd(widths[i])).join('  ').trimEnd()));
}

function main() {
  console.log('');
  console.log('Design-system parity check');
  console.log('   systemUi.ts is a transcription of the primitives; this reads the primitives');
  console.log('   themselves and checks the transcription still says the same thing.');
  console.log('');

  try {
    checkButton();
    checkInput();
    checkCheckbox();
    checkDropdownMenu();
    checkFocusRing();
    checkCardShadow();
    checkColourVocabulary();
  } catch (error) {
    console.log(`   FAIL  ${error instanceof Error ? error.message : String(error)}`);
    console.log('');
    console.log('FAILED — the design system could not be read, so parity is unknown');
    process.exit(1);
  }

  printTable(['claim', 'the system says', 'which is', ''], rows);
  console.log('');

  if (failures.length > 0) {
    failures.forEach((failure) => console.log(`   FAIL  ${failure}`));
    console.log('');
    console.log(`FAILED — ${failures.length} value(s) drifted from design-system/`);
    process.exit(1);
  }
  console.log(`PASSED — ${rows.length} values still match design-system/`);
}

if (process.argv[1]?.endsWith('checkDesignSystem.ts')) main();
