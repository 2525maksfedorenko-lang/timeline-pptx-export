# Project guidelines

## Scope discipline
This is a small, modular prototype — NOT a full application. The end goal is that
this logic gets absorbed into aicoo's main product (aicoo-core-dev), not that this
grows into a standalone app. Because of this:
- Prefer small, isolated, composable modules over large all-in-one components
- Every new feature should be something that could be lifted out and dropped into
  another codebase with minimal rewiring (e.g. pure functions for data transforms,
  clearly separated data/UI/export layers — this pattern is already used in
  src/export/, src/store/, src/types/)
- Avoid speculative complexity. Don't build configuration options, abstractions, or
  edge-case handling for needs that haven't been explicitly requested
- When in doubt between "more features" and "simpler, cleaner code" — choose simpler

## Design quality
The UI should feel as clean, simple, and intuitive as production tools from
Google, Amazon, or similar — not like a typical developer prototype. When building
or modifying UI:
- Favor whitespace, clear visual hierarchy, and restraint over cramming in options
- Keep interactions obvious without needing explanation (self-evident icons, clear
  labels, sensible defaults)
- Reuse the same spacing/color/typography patterns already established in the app
  instead of introducing new styles per component
- When adding a new UI element, ask "would this look at home in a well-designed
  SaaS product?" — if not, simplify it

## Design system
`design-system/` is a local copy of the aicoo Coordinator design system (tokens, 33 primitives,
guideline specimens, click-through UI kit). It is **reference material, not app source** — it is
excluded from `tsc -b` (which only includes `src`) and from oxlint. Read `design-system/readme.md`
before designing anything new; it is the ground truth for this brand.

The rules that bite most often:
- Colour tokens hold **raw HSL components**, so always write `hsl(var(--primary))`, never
  `var(--primary)`. Deep navy `212 30% 17%` is the whole brand; colour beyond the neutrals only
  ever carries meaning (green on-track, red delayed, orange issue, purple project, amber phase,
  blue task).
- No webfonts, no gradients, no emoji, no backdrop blur. 14px body, 18px semibold page titles.
  **The webfont rule now has exactly one exception:** `src/fonts/geist.css` ships Geist,
  the aicoo website's typeface, because this app is served as a page of that site and the
  site's owner asked for it by name. The file's header is the argument. Do not add a second
  exception, and do not "fix" this one back.
- lucide is the only icon system.
- Hover changes colour only — nothing scales, bounces, or slides for decoration.

## The plan screen and its handoff
`src/gantt/` is the plan screen, rebuilt from the Gantt design handoff at
`design_handoff_gantt_chart/` (on the Desktop, outside this repo): two `.dc.html`
prototypes and a measured README. For that screen the handoff — not the design system
— is the source of look, layout, geometry and states, which reverses decisions E1/E3/E4/E5
in `docs/design-system-map.md`; see the Phase 3 section there for exactly what changed
and what the handoff leaves open. Its palette lives as `--gantt-*` tokens in
`src/gantt/tokens.css`, the single place hex is written; components reference
`var(--gantt-*)` and never a literal. Everything outside `src/gantt/` — dashboard,
settings, import, exports — still follows the design system as before.

`src/export/theme.ts` is a **separate** palette for the PPTX/PDF exporters: hex without `#`
(pptxgenjs's format), and its grid-line/footer colours have no design-system counterpart. Keep the
two in their own formats rather than trying to unify them.

## Light and dark
The screen follows the website's theme; the exports never do.

The site keeps the choice in `localStorage.theme` and applies it as a `dark` class on `<html>`
(`contexts/ThemeContext.tsx`). Served from its origin, this app simply reads that — see
`src/utils/siteTheme.ts`, and the blocking script in `index.html` that applies it before first
paint. Standalone the key is absent and `prefers-color-scheme` answers instead; one rule, both
cases.

Everything the screen draws changes by **token**, never per component: `design-system/` ships its
own `.dark` block, and `src/gantt/tokens.css` now carries one whose derivation is argued in the
file. The two exceptions, both documented where they live, are the mark (two files, one per
theme — the site's own rule) and a nested bar's tint (computed against the canvas, so the canvas
is an input: the `SURFACE` table in `src/gantt/barColor.ts`).

`src/export/theme.ts` and `src/utils/statusColors.ts` are on the other side of that line and must
stay there. A deck is opened by people who never saw the visitor's theme, so `slideBg` is white
whoever pressed Export. Nothing on the export path may read `localStorage`, `matchMedia`, or a
class on `<html>`.

## Порты
5176 — постоянный порт пользователя, к нему подключён туннель cloudflared.
Не занимать, в `vite.config.ts` не менять.

Для собственных проверок поднимай сервер на 5180:
`npm run dev -- --port 5180 --strictPort`
После проверки останавливай его.
