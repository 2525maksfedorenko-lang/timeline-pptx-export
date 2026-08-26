# Design-system map

Phase 1 inventory for branch `feat/design-system-apply`. No application code was
changed to produce this file.

Every value below was read out of a file or computed from one; where a mapping
could not be made, it is listed under [Escalations](#escalations) rather than
guessed. That is the whole point of this document: to separate what the system
answers from what it does not.

## 0. What "the design system" is, here

Two different artefacts are in play, and they are not interchangeable.

| | `design-system/` (in this repo) | `design_handoff_gantt_chart/` (on the Desktop) |
|---|---|---|
| What it is | The aicoo Coordinator design system — tokens, 33 primitives, 19 guideline specimens, a click-through UI kit | A **design handoff for one screen**: a Gantt plan view, as HTML prototypes plus a written spec |
| Authority | Normative. Ported verbatim from `github.com/aicoo2/coordinator` `frontend/src/globals.css`, `tailwind.config.js` and `frontend/src/components/ui/` | A proposal measured against a *different* codebase |
| Built against | The product itself | `aicoo2/coordinator` `master`, `frontend/src/components/GanttChart/*` — **not this repo** (`github.md`) |
| Files | 169 | 5 |

The handoff's own README says its files "are **not production code to copy**" and
that its task is "to recreate them inside the existing frontend environment" of
`aicoo2/coordinator`. It also instructs: "Where a value below is given as a hex,
check first whether a token in `frontend/src/globals.css` already carries it …
and prefer the token/utility class."

So the ordering this document applies is: **tokens first, handoff second.** The
handoff is a source of *geometry and intent* for a screen the system does not
cover; it is not a source of colour.

### The handoff is missing its own primitives bundle

Both `.dc.html` files link
`_ds/coordinator-ui-primitives-529e179f-4c98-4267-a74c-069ea1b2481d/_ds_bundle.css`.
**That directory is not in the handoff folder** — the folder has exactly five
files. The bundle it wants is the same primitives family already vendored here
(`Button`, `Input`, `Textarea`, `Label`, `Badge`, `Switch`, `Progress`,
`Separator`, `Select`, `MultiSelect`, `Checkbox` are all present in
`design-system/components/`), so the references resolve against our copy. Nothing
is missing in practice, but the handoff cannot be rendered as-is.

### How the system is consumed in this project

`design-system/` is **reference material, not a package**. Its components are
plain `.jsx` with inline styles, excluded from `tsc -b` and from oxlint
(`.oxlintrc.json` → `ignorePatterns: ["design-system/**"]`). Nothing in `src/`
imports a component from it; the only runtime imports are

- `src/index.css` → `@import "../design-system/styles.css"` (all tokens), then an
  `@theme` block bridging the colour tokens into Tailwind's namespace, and
- `src/App.tsx:17` → the logo SVG asset.

**Consequence for Phase 2:** "put a component on the system one-to-one" means
*recreating* the primitive's look, geometry and states in our own TSX with
Tailwind utilities over these tokens. It does not mean importing it. There is no
build path that would make `design-system/components/*.jsx` part of the app.

---

## 1. What the system has

### 1.1 Colour tokens — `design-system/tokens/colors.css`

Values are **raw HSL components**; they must be written `hsl(var(--x))`, never
`var(--x)` (stated in the file header and in `readme.md`). Each also has a
resolved `--color-*` twin. A `.dark` block redefines the same names.

| Token | Light | Dark |
|---|---|---|
| `--background` | `0 0% 100%` | `212 30% 11%` |
| `--base-background` | `210 33% 94%` | `212 30% 11%` |
| `--foreground` | `0 0% 3.9%` | `0 0% 98%` |
| `--card` / `--card-foreground` | `0 0% 100%` / `0 0% 3.9%` | `212 22% 8%` / `0 0% 98%` |
| `--popover` / `--popover-foreground` | `0 0% 100%` / `0 0% 3.9%` | `0 0% 2%` / `0 0% 98%` |
| `--primary` / `--primary-foreground` | `212 30% 17%` / `210 33% 94%` | `0 0% 98%` / `0 0% 9%` |
| `--secondary` / `--secondary-foreground` | `0 0% 96.1%` / `0 0% 9%` | `212 22% 3%` / `0 0% 98%` |
| `--muted` / `--muted-foreground` | `0 0% 96.1%` / `0 0% 45.1%` | `212 22% 3%` / `0 0% 63.9%` |
| `--accent` / `--accent-foreground` | `0 0% 96.1%` / `0 0% 9%` | `212 22% 25%` / `0 0% 98%` |
| `--destructive` / `--destructive-foreground` | `0 84.2% 60.2%` / `0 0% 98%` | `0 62.8% 30.6%` / `0 0% 98%` |
| `--border`, `--input` | `0 0% 89.8%` | `212 22% 25%` |
| `--ring` | `0 0% 3.9%` | `0 0% 83.1%` |
| `--nav-background` / `--nav-foreground` / `--nav-hover` | `212 30% 17%` / `210 33% 94%` / `212 30% 25%` | `212 22% 8%` / `0 0% 98%` / `212 22% 15%` |
| `--chart-1 … --chart-5` | `12 76% 61%`, `173 58% 39%`, `197 37% 24%`, `43 74% 66%`, `27 87% 67%` | `220 70% 50%`, `160 60% 45%`, `30 80% 55%`, `280 65% 60%`, `340 75% 55%` |
| `--sidebar-*` (8 tokens) | mirror nav/primary/border/ring | mirror |

**The neutrals are achromatic** — hue 0, saturation 0% — for every grey the
system owns. This matters in §2 and §3.

### 1.2 Meaning-carrying colour — `design-system/tokens/status-palette.css`

These are **flat hex**, not HSL, because upstream the product paints statuses
with Tailwind palette utilities rather than tokens.

| Group | Tokens |
|---|---|
| Status | `--status-ontrack-bg #dcfce7`, `--status-ontrack-fg #166534`, `--status-done-bg #dcfce7`, `--status-done-fg #166534`, `--status-delayed-bg #fee2e2`, `--status-delayed-fg #991b1b`, `--status-neutral-bg #f3f4f6`, `--status-neutral-fg #1f2937`, `--status-active-dot #22c55e`, `--status-inactive-dot #ef4444`, `--status-issue #f97316` |
| Kanban 1–8 | each a triplet `-bg` / `-fg` / `-border`: blue `#dbeafe`/`#1e40af`/`#bfdbfe`, yellow `#fef9c3`/`#854d0e`/`#fef08a`, green `#dcfce7`/`#166534`/`#bbf7d0`, red `#fee2e2`/`#991b1b`/`#fecaca`, orange `#ffedd5`/`#9a3412`/`#fed7aa`, indigo `#e0e7ff`/`#3730a3`/`#c7d2fe`, pink `#fce7f3`/`#9d174d`/`#fbcfe8`, purple `#f3e8ff`/`#6b21a8`/`#e9d5ff` |
| Sources | slack `#f3e8ff`/`#7e22ce`, email `#dbeafe`/`#1d4ed8`, sembly `#ccfbf1`/`#0f766e`, recording `#fef3c7`/`#b45309`, chat `#d1fae5`/`#047857`, wiki `#e0e7ff`/`#4338ca` |
| Work-item kinds | `--kind-project #a855f7`, `--kind-phase #d97706`, `--kind-task #3b82f6`, `--badge-live-bg #dcfce7` / `-fg #047857` / `-dot #10b981` |

The rule from `readme.md`: "Colour beyond that appears **only as meaning**: green
for on-track/done, red for delayed and destructive, orange for issues, purple for
projects and proposals, amber for phases, blue for tasks."

### 1.3 Type — `design-system/tokens/typography.css`, `guidelines/type-scale.card.html`

No webfont; the platform stack (`--font-sans`, `--font-mono` in `fonts.css`).
The scale, with the line-height each size carries:

| Size | 10 | 12 | 13 | 14 | 16 | 18 | 20 | 24 | 30 | 36 |
|---|---|---|---|---|---|---|---|---|---|---|
| Leading | 14 | 16 | 18 | **20** | 24 | 28 | 28 | 32 | 36 | 40 |
| Token | `--text-2xs` | `--text-xs` | `--text-13` | `--text-sm` | `--text-base` | `--text-lg` | `--text-xl` | `--text-2xl` | `--text-3xl` | `--text-4xl` |

14/20 is the **default body and control size**. Weights 400/500/600/700
(`--font-weight-*`). Tracking is default except `--tracking-tight -0.025em` on
24px titles. Roles (`type-roles.card.html`): page title = 18 semibold; CardTitle
= 24 semibold tracking-tight; KPI = 24 bold; body = 14; meta = 12 muted.

**There is no 9, 11, 11.5, 12.5, 13.5, 14.5, 15 or 8.5 in the scale.**

### 1.4 Spacing — `tokens/spacing.css`, `guidelines/spacing-*.card.html`

4px base: `0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48, 64`.
Control heights are fixed: `--control-height-sm 36`, `--control-height 40`,
`--control-height-lg 44`, `--header-height 48`. Layout: `--sidebar-width 18rem`,
`--sidebar-width-icon 3rem`, `--content-max 1152px`, `--page-padding 24px`.
Density from `readme.md`: 24px card padding, 16px table cells, 12px Kanban cards,
8px control gaps.

### 1.5 Radius — `tokens/radius.css`

One source: `--radius: 0.5rem`. `--radius-sm 4` · `--radius-md 6` ·
`--radius-lg 8` · `--radius-xl 12` · `--radius-full 9999`. **3 and 5 do not
exist.**

### 1.6 Elevation and states — `tokens/elevation.css`, `guidelines/states.card.html`

`--shadow-sm 0 1px 2px 0 rgb(0 0 0 /.05)` · `--shadow 0 1px 3px …` ·
`--shadow-md 0 4px 6px -1px …` · `--shadow-lg 0 10px 15px -3px …` ·
`--overlay-scrim rgb(0 0 0 / 0.8)` · `--focus-ring-width 2px` ·
`--focus-ring-offset 2px` · three Kanban `--selection-ring-*` glows.

The states card is normative and short:

| State | Treatment |
|---|---|
| rest | card / `shadow-sm` |
| hover | `muted/50` + `shadow-md`; primary fills darken to `/0.9`, secondary to `/0.8`; ghost and outline fill with `--accent` |
| selected | primary border + `ring/20` |
| focus-visible | 2px ring, offset 2 |
| disabled | `opacity: .5` (+ `pointer-events: none`, per `Button.jsx`) |

"Nothing scales or bounces; transitions are 150ms colour-only."
"**No inner shadows anywhere.** Focus states are 2px rings offset 2px, never
glows." Allowed shadow steps are **sm / default / md / lg only**.

### 1.7 Motion — `tokens/motion.css`

`--duration-fast 150ms`, `--duration 200ms`, `--ease-out cubic-bezier(0,0,.2,1)`,
`--ease-linear`, `--transition-colors` (colour/background/border at 150ms),
`--sidebar-transition`, `--recording-pulse-duration 1.75s`.

### 1.8 Components — `design-system/components/`, indexed by `_ds_manifest.json`

33 primitives, each with `.jsx` + `.d.ts` + `.prompt.md`:

- **core/** — Button, Badge, Card (+Header/Title/Description/Content/Footer), Separator, Skeleton, Progress, Link
- **forms/** — Input, Textarea, Label, Checkbox, RadioGroup, Switch, Select, MultiSelect, Form, Calendar, DatePicker, Command
- **overlays/** — Dialog (+Header/Title/Description/Footer), AlertDialog, Sheet, Popover, DropdownMenu, Tooltip, ConfirmationPopover
- **navigation/** — Sidebar, Tabs, NavigationMenu, Accordion, Collapsible, ScrollArea
- **data/** — Table (+Header/Body/Footer/Row/Head/Cell/Caption)
- **icons/** — Icon (lucide wrapper; the one intentional addition)

Two contracts read in full, because Phase 2 converts against them:

**`Button`** — variants `default` (primary fill, hover `/0.9`), `destructive`,
`outline` (bg `--background`, fg `--muted-foreground`, 1px `--input`, hover
`--accent`), `secondary` (hover `/0.8`), `ghost`, `link`. Sizes `default` h40
p8/16 · `sm` h36 p0/12 · `lg` h44 p0/32 · `icon` 40×40. Radius `--radius-md`,
`--text-sm`/`--leading-sm`, weight 500, gap 8, `--transition-colors`, disabled
`opacity .5` + `pointer-events: none`.

**`Input`** — h40, `--radius-md`, 1px `hsl(var(--input))` (or `--destructive`
when invalid), bg `--background`, padding 8/12, `--text-sm`/`--leading-sm`,
`outline: none`.

### 1.9 Iconography

**lucide only.** 16px default, stroke 2, `currentColor`; 14px in dense rows, 20px
for page titles, 10–12px in micro badges. No icon fonts, no PNG icons, **no
emoji, no unicode glyphs as icons**. The project already uses
`lucide-react@0.436.0` — the same version the product ships.

---

## 2. What the system does not have

`design-system/readme.md` says so itself, in a section headed **"Not
recreated"**:

> Deliberately left out because they are not primitives and would have to be
> invented rather than copied: **the Gantt chart** (`GanttChart/`, ~26 files …),
> the resource planning board, the wiki content editor, the LLM testing
> dashboards, and the admin sections.

So the single largest thing on our screen is, by the system's own statement,
outside it. The handoff is what partially fills that hole — but as a *spec for
another repo*, not as a component.

| # | Our screen feature | Verdict | Nearest thing that does exist |
|---|---|---|---|
| 1 | **Gantt bars** (track, fill, progress overlay, depth-stepped heights) | **none** in the system | Handoff §4 specifies bars in full (fills, progress overlay at `.18`/`.35`, radius 5, height `min(34, row-16)`). Token-wise the fills are `--kanban-*-bg` / `--status-*-bg`; `Progress` (`core/Progress.jsx`) is the only primitive that draws a fill in a track |
| 2 | **Date grid** (day/week/month rules) | **none** | Handoff §4 gives layered `repeating-linear-gradient` rules at `#f4f7fa` / `#e2e8f0` / `#f1f5f9`. The system has no grid, no rule-weight scale; `--border` is the only line colour it owns |
| 3 | **Dependency connectors** | **none** | Handoff §4 gives the elbow path, `#cbd5e1` @1.1px, critical `#ef4444` @1.6px. No primitive draws a connector |
| 4 | **Status column** (per-row status chip / select) | **relative — strong** | `forms/Select.jsx` for the control, `core/Badge.jsx` for the chip, and the Kanban chip triplets for its colours. `Table.prompt.md` and `colors-kanban.card.html` show a status chip in a table row. Our chip already uses these exact values (§3) |
| 5 | **Bar popup** (`BarActionMenu`) | **relative — exact for the mechanism** | `overlays/DropdownMenu.jsx` (+`DropdownMenuItem`) and `overlays/Popover.jsx`. A menu anchored to an element is a primitive the system owns outright |
| 6 | **Import modal** | **relative — exact for the shell** | `overlays/Dialog.jsx` (+`DialogHeader/Title/Description/Footer`); `AlertDialog` for the destructive confirm. The file-drop area inside it has no counterpart — the system's only "add" affordance idiom is "dashed border" (`readme.md`) |
| 7 | **Zoom control** | **none** | The system has no segmented control, no slider, no stepper — grep for `segmented`/`zoom`/`slider` across all 169 files returns only prose. The handoff §1 *composes* one: `div.bg-muted` with `radius 8, padding 2, gap 2` wrapping three `Button`s (active `default`, inactive `ghost`). That is a **recipe over primitives**, and it is the nearest relative |
| 8 | **Notification strip** (`PlanNotice`) | **none** | No toast, no banner, no inline alert exists — only `AlertDialog` (modal) and `ConfirmationPopover` (anchored). The nearest relative is a `Card` with an `Icon` and `--status-issue`/`--muted-foreground` text, which is what we already render |
| 9 | **Task-list row** (name + tags + indent) | **relative** | `Table` row idiom for the row; `Badge` for the tags. Depth indentation has no counterpart in the system — `Sidebar`'s `SidebarMenuSub` is the only nested-list idiom, and it is navigation, not data |

Also absent, and worth naming because Phase 2 will meet them: no **drag** idiom
(no grab cursor, no drag pill, no resize handle), no **avatar** component (the
handoff invents a 6-colour palette), no **density switch**, no **empty
timeline** state.

---

## 3. Where this project already stands

The project is closer to the system than a first look suggests: `src/index.css`
already imports the whole token set and bridges the colours into Tailwind.

### 3.1 Already conforming

| Area | Evidence |
|---|---|
| **Colour bridging** | `src/index.css` `@theme` maps 20 `--color-*` utilities to `hsl(var(--…))`, deliberately keeping them as `var()` references so a future `.dark` swap keeps working |
| **Status scale** | `TASK_STATUS_SCALE` in `src/types/timeline.ts` — **all 16 hexes are exact design-system token values** (computed, table below). Documented already in `docs/status-color-scale.md` |
| **Focus** | 26 occurrences of `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring` — exactly the system's "2px ring, offset 2" |
| **Type** | 148 of 155 text-size utilities are on-scale (`text-sm` ×81, `text-xs` ×44, `text-base` ×15, `text-lg` ×6, `text-2xl` ×2) |
| **Radius** | Every radius utility resolves to an on-scale step: `rounded-md` ×58 → 6px, `rounded-lg` ×7 → 8px, `rounded-sm` ×1 → 4px, `rounded-full` ×3. Tailwind v4's radius scale happens to match the system's exactly |
| **Spacing** | Tailwind v4's 0.25rem base matches the system's 4px scale step for step |
| **Motion** | `transition-colors` ×29; Tailwind's default 150ms is the system's `--duration-fast` |
| **Icons** | `lucide-react@0.436.0` — the product's own version. No emoji anywhere in `src/` |
| **No gradients / no blur** | none in `src/` |

Our status scale against the tokens, computed by converting every HSL token to
hex and matching:

| Our value | Role | Design-system token(s) |
|---|---|---|
| `#F3F4F6` | `todo.surface` | `--status-neutral-bg` |
| `#E5E5E5` | `todo.border` | `--border` / `--input` |
| `#737373` | `todo.accent` | `--muted-foreground` |
| `#1F2937` | `todo.solid` | `--status-neutral-fg` |
| `#DBEAFE` | `in_progress.surface` | `--kanban-1-bg` |
| `#BFDBFE` | `in_progress.border` | `--kanban-1-border` |
| `#3B82F6` | `in_progress.accent` | `--kind-task` |
| `#1E40AF` | `in_progress.solid` | `--kanban-1-fg` |
| `#DCFCE7` | `done.surface` | `--status-done-bg` / `--kanban-3-bg` |
| `#BBF7D0` | `done.border` | `--kanban-3-border` |
| `#22C55E` | `done.accent` | `--status-active-dot` |
| `#166534` | `done.solid` | `--status-done-fg` / `--kanban-3-fg` |
| `#FEE2E2` | `blocked.surface` | `--status-delayed-bg` / `--kanban-4-bg` |
| `#FECACA` | `blocked.border` | `--kanban-4-border` |
| `#EF4444` | `blocked.accent` | `--destructive` / `--status-inactive-dot` |
| `#991B1B` | `blocked.solid` | `--status-delayed-fg` / `--kanban-4-fg` |

16 of 16 exact. They are written as literals only because the PPTX exporter needs
hex without `#` (`TASK_STATUS_COLORS`, `src/types/timeline.ts:40`). Phase 2 can
name them without changing a single rendered colour.

*(Later: the `blocked` status was removed from the product, so its four rows no
longer correspond to anything in `TASK_STATUS_SCALE` — twelve of these sixteen
are live. The table is left whole as the record of the audit that produced it;
see "Phase 4" in docs/export-handoff-map.md.)*

### 3.2 Divergences — ours to fix

| What | Where | System says |
|---|---|---|
| `disabled:opacity-40` ×8, `disabled:opacity-60` ×1 | across `src/components/` | `opacity: .5` (states card, `Button.jsx`) |
| `disabled:cursor-not-allowed` ×8 | same | `pointer-events: none` — a different behaviour, not just a different cursor |
| `shadow-xl` ×4 | `SettingsFlyout.tsx:39`, `ExportOverflowModal.tsx:57`, `TaskDetailsModal.tsx:89`, `ImportModal.tsx:125` | sm / default / md / lg **only**; dialogs and sheets use `lg` |
| `text-[10px]` ×1 | `src/components/` | 10px *is* on the scale — `--text-2xs`, already exposed here as `--text-micro` in `src/index.css`. Should be `text-micro` |
| Hand-rolled buttons / inputs / dialogs | `AddTaskForm`, `ImportModal`, `ExportSettingsPanel`, `SettingsFlyout`, `TaskDetailsModal`, `StatusSelect`, `AssigneeSelect`, `ZoomControl`, … | `Button`, `Input`, `Select`, `Dialog`, `Badge`, `Checkbox`, `Switch` exist and specify heights (36/40/44), padding, radius and every state |
| `PlanNotice` has no resting shadow | `PlanNotice.tsx:42` | cards rest at `shadow-sm` |
| `ZoomControl` buttons are `h-6 w-6` (24px) | `ZoomControl.tsx:32,51` | control heights are 36 / 40 / 44; 24 is not a step |

### 3.3 A trap: Tailwind v4 renamed the two lightest shadows

The system was ported from a Tailwind **v3** config; this project runs
**Tailwind v4.3.3**. The shadow scale shifted by one name at the light end:

| Design-system token | Value | Tailwind-v4 utility that emits it |
|---|---|---|
| `--shadow-sm` | `0 1px 2px 0 rgb(0 0 0 /.05)` | **`shadow-xs`** |
| `--shadow` | `0 1px 3px 0 …, 0 1px 2px -1px …` | **`shadow-sm`** |
| `--shadow-md` | `0 4px 6px -1px …` | `shadow-md` |
| `--shadow-lg` | `0 10px 15px -3px …` | `shadow-lg` |

So our two `shadow-sm` uses currently render the system's `--shadow`, one step
heavier than "card at rest". Phase 2 must write `shadow-xs` where the system says
`shadow-sm`. Nothing else in the system's scales is affected — type, spacing and
radius line up exactly.

Note also that the design system's tokens live in a plain `:root{}` block, so
Tailwind's utilities do **not** read them: only the `--color-*` names bridged
through `@theme` in `src/index.css` are wired up. Radius/spacing/type agree by
lineage, not by configuration.

---

## 4. The fence, and what it permits

Excluded by the task, and verified to be genuinely load-bearing:

- **Export geometry** — `src/export/slideLayout.ts` (page, margins, `STATUS_COL_WIDTH_IN`, `TASK_COL_WIDTH_IN`, timeline zone, axis window, progress-label placement, connectors).
- **`src/utils/barNesting.ts` ratios** — `BAR_HEIGHT_RATIO_BY_DEPTH [1, 0.7, 0.55]`, `LABEL_INDENT_RATIO 0.5`, `MAX_LABEL_INDENT_STEPS 3`, `PROGRESS_LABEL_MIN_BAR_HEIGHT_RATIO 2.1`. Shared by screen and file.
- **Logic** — `src/import/*`, `src/utils/sortItems*.ts`, `normalizeStatus.ts`, `normalizePlanItems.ts`, and the invariant in `docs/export-coverage.md`.
- **16px form controls below the breakpoint** — the iOS Safari zoom guard.

`scripts/checkExportCoverage.ts` enforces the sharing directly: it imports
`BAR_HEIGHT_PX` and `PROGRESS_FONT_SIZE_PX` **from the screen module** and
asserts that both surfaces agree on (a) the indent step as a fraction of a bar
height, and (b) whether each depth's bar can hold its progress label inside
itself. That gives a computed envelope for anything Phase 2 might want to
restyle:

| screen bar px ↓ / label px → | 9 | 10 | 11 | 12 | 13 | 14 |
|---|---|---|---|---|---|---|
| 28 | fail | ok | ok | ok | ok | fail |
| 30 | fail | fail | ok | ok | ok | ok |
| **32 (ours)** | fail | fail | **ok** | **ok** | ok | ok |
| 34 (handoff) | fail | fail | **fail** | ok | ok | ok |
| 36 | fail | fail | fail | ok | ok | ok |
| 40 | fail | fail | fail | fail | fail | ok |

Read two ways:

1. Our progress label is `11px` — **off the system's type scale**. Snapping it up
   to `12px` (`text-xs`) keeps `check:export` green. Snapping it **down to 10px
   (`text-micro`) breaks it**: at 10px the depth-1 bar starts claiming it can
   hold the label inside, while the slide still says it cannot. So there is
   exactly one legal move, and it is upward.
2. The handoff's bar height (34px) is **incompatible with our current 11px
   label** — it would need the label at 12px first. This is a second, independent
   reason not to import the handoff's geometry.

The indent step is safe either way: `labelIndent` normalises by the bar height,
so the ratio the check compares is `0.5` on both surfaces whatever the base unit.

---

## Escalations

Per the task's own rule — *"если нужного токена нет, скажи мне, а не подбирай на
глаз"* — these cannot be resolved from the system and are **not** being decided
unilaterally.

### E1. The handoff paints in Tailwind *slate*; the system's neutrals are achromatic

Of the 38 distinct hexes the handoff names, **13 have an exact token and 25 have
none**. The 25 are not scattered — they are mostly one ramp:

| Handoff hex | Used for | Closest system token | Difference |
|---|---|---|---|
| `#334155` | primary text | `--foreground` `0 0% 3.9%` | slate-700 vs near-black; hue 215 vs 0 |
| `#475569` | bar text (todo), sub-task badge | — | slate-600 |
| `#64748B` | secondary text | `--muted-foreground` `0 0% 45.1%` | slate-500 vs neutral grey |
| `#94A3B8` | muted text | `--muted-foreground` | slate-400 |
| `#CBD5E1` | todo icon, drag dots, connectors | — | slate-300 |
| `#E2E8F0` | strong borders | `--border` `0 0% 89.8%` (`#E5E5E5`) | slate-200; same lightness, different hue |
| `#F1F5F9` | soft borders, todo tint | `--muted` `0 0% 96.1%` | slate-100 |
| `#F4F7FA` | day lines | — | — |

Plus these, with no token and no ramp to attach them to: `#F8FBFF` /
`#FEF6F6` (name-pill fills), `#F5F9FF` (selected row), `#FAFCFD` (weekend),
`#FCFDFE` (add row), `#EFF6FF` (add button), `#FDE047` (today), `#60A5FA` /
`#F87171` (edge dots, edit focus), `#B91C1C` (CP badge), `#16A34A` (100%),
`#1E3A8A` (bar text, in progress), and the six avatar colours `#2563EB`,
`#7C3AED`, `#059669`, `#0891B2`, `#DB2777`, `#D97706`.

**The question:** adopting the handoff's greys would introduce a blue cast the
system does not have anywhere. Do we (a) keep the system's achromatic neutrals
and accept that our Gantt will not match the handoff's screenshots, or (b) treat
the handoff's slate ramp as an approved extension and add it as named tokens?
I will not pick one on my own — it changes every grey in the app.

Two of the 13 "exact" matches are **value coincidences, not meanings**, and I
would not use them: `#FAFAFA` (the handoff's panel band) happens to equal
`--destructive-foreground`, and `#D97706` (an avatar colour) happens to equal
`--kind-phase`.

### E2. Off-scale type sizes we currently use

`text-[11px]` ×4 (bar progress label) and `text-[9px]` ×3 (tag pills). Neither
9 nor 11 exists in the system's scale (10 / 12 / 13 / 14 / 16 / 18 / …).

- The 11px label can go to **12px** and stay green (§4). Confirm?
- The 9px tag pill has no legal neighbour that is smaller; the only on-scale move
  is **up to 10px** (`text-micro`), which will widen every pill and eat into the
  task name the previous branch just recovered. Confirm, or keep 9px as a
  documented exception?

### E3. Off-scale geometry the Gantt needs

Row 40px, bar 32px, `BASE_PX_PER_DAY` 32, zone widths 118 / 292 / 104 and the
mobile 96 / 52 are all **outside the system's control-height scale** (36/40/44/48),
because they are chart geometry rather than controls. The system offers nothing
for them. I propose deriving them as they already are and recording each in this
file, but they cannot be "put on the system" — there is nothing to put them on.

`BASE_PX_PER_DAY` in particular is imported by `src/export/timelineExportModel.ts`
and is therefore **inside the fence**: the handoff's 30 / 15.2 / 7 column widths
cannot be adopted at all.

### E4. Two handoff treatments contradict the system outright

- The resize handle's hover is `box-shadow: inset ±2px 0 0 rgba(15,23,42,.35)`.
  The system: "**No inner shadows anywhere.**"
- Radii 3 (CP badge) and 5 (bar) are not on the radius scale (4 / 6 / 8 / 12).

If we build the Gantt from the handoff, these two need a ruling: follow the
system (4 or 6px radius, no inset shadow) or follow the handoff.

### E5. Scope

The handoff describes a screen we do not have: a 348/520px Edit Task side panel,
a critical-path mode, an inline add row, roll-up groups, a two-row toolbar with
search and filter chips. None of that is in this project, and Phase 2 as written
is a *restyling* pass, not a feature port. Confirm that the handoff is being used
only as a **source of visual treatment for parts we already have**, and that
nothing new gets built from it.

---

# Phase 2 — decisions and mappings

Decisions taken by the project owner on the escalations above, recorded before
any code was changed.

| # | Decision |
|---|---|
| E1 | **Achromatic (a).** The system is the source of colour; the handoff is the source of geometry and intent. Slate is not adopted. Pixel-parity with the handoff's screenshots is explicitly not required — it was built against another repository and says itself it is not production code. The 25 tokenless hexes fall to the nearest achromatic token (table below). |
| E2 | 11px → **12px** (`text-xs`), since `check:export` stays green. Not 10px — that breaks the surface parity. **9px stays** as a recorded deviation. |
| E3 | Gantt geometry stays ours: row 40, bar 32, zones 118/292/104. `BASE_PX_PER_DAY` is not touched at all. The handoff is not authoritative here. |
| E4 | **The system wins**: no inner shadow on the resize handle, radii 3 and 5 round to the 4/6 scale, modal `shadow-xl` comes back to an allowed step. |
| E5 | Phase 2 is a restyling pass only. Nothing new is built from the handoff — no Edit Task panel, no critical path, no search toolbar. Where an existing element is more simply expressed with a system primitive, it is. |

Plus: the Tailwind v3→v4 shadow rename is resolved with one table applied
uniformly, not site by site. The notification strip, the import modal's file zone
and the zoom control are composed from primitives — the way the handoff itself
composes its zoom control out of three `Button`s — rather than becoming new
components.

## 5. Colour: the achromatic mapping

The system's neutrals are achromatic (hue 0, saturation 0%). Every grey the
handoff names is Tailwind **slate** — hue ≈ 213–215, saturation 16–40%. Mapping
is therefore by **lightness**, dropping the hue:

| Handoff | L | Role | → token | Token L | ΔL |
|---|---|---|---|---|---|
| `#334155` | 26.7 | primary text | `--foreground` (`0 0% 3.9%`) | 3.9 | 22.8 |
| `#475569` | 34.5 | bar text (todo), sub-task badge | `--muted-foreground` (`0 0% 45.1%`) | 45.1 | 10.6 |
| `#64748B` | 46.9 | secondary text | `--muted-foreground` | 45.1 | **1.8** |
| `#94A3B8` | 65.1 | muted text | `--muted-foreground` | 45.1 | 20.0 |
| `#CBD5E1` | 83.9 | todo icon, drag dots, connectors | `--border` (`0 0% 89.8%`) | 89.8 | 5.9 |
| `#E2E8F0` | 91.4 | strong borders | `--border` | 89.8 | **1.6** |
| `#F1F5F9` | 96.1 | soft borders, todo tint | `--muted` (`0 0% 96.1%`) | 96.1 | **0.0** |
| `#F4F7FA` | 96.9 | day grid lines | `--muted` | 96.1 | 0.8 |
| `#F8FBFF` | 98.6 | name-pill fill | `--background` / `--card` | 100 | 1.4 |
| `#FCFDFE` | 99.2 | add row | `--background` | 100 | 0.8 |
| `#FAFCFD` | 98.6 | weekend tint | `--background` | 100 | 1.4 |
| `#F5F9FF` | 98.0 | selected row | `--muted` | 96.1 | 1.9 |
| `#FAFAFA` | 98.0 | panel band | `--muted` | 96.1 | 1.9 |
| `#EFF6FF` | 96.9 | add-button fill | `--muted` | 96.1 | 0.8 |
| `#FEF6F6` | 98.0 | blocked-pill fill | `--muted` | 96.1 | 1.9 |

Two notes on this half of the table. `#F1F5F9` lands **exactly** on `--muted`,
and `#E2E8F0` / `#64748B` land within 2 points of `--border` / `--muted-foreground`
— the handoff's ramp and the system's ramp are the same ramp with a blue cast
added, so most of the mapping is lossless in value and only drops hue. The two
big deltas are `#334155` (a mid text grey where the system has only near-black)
and `#94A3B8`, and in both cases the system genuinely has one fewer step than the
handoff wants. Nothing is invented to fill them: they collapse onto the nearest
step the system does own.

The chromatic ones are **not** mapped by lightness — the system's rule is that
colour beyond the neutrals appears only as meaning, so they map by meaning:

| Handoff | Role | → token | Note |
|---|---|---|---|
| `#B91C1C` | critical-path badge text | `--status-delayed-fg` (`#991b1b`) | same meaning: delayed/at risk |
| `#16A34A` | percentage at 100% | `--status-done-fg` (`#166534`) | same meaning: done |
| `#1E3A8A` | bar text, in progress | `--kanban-1-fg` (`#1e40af`) | same meaning: task in progress |
| `#F87171` | edge dot, blocked | `--destructive` / `--status-inactive-dot` (`#ef4444`) | same meaning |
| `#60A5FA` | edit-input focus border | `--ring` | the system's focus is a 2px ring, not a coloured border |
| `#FDE047` | today band | — | the system has **no** "today" meaning. Not needed: we have no today band |
| `#2563EB` `#7C3AED` `#059669` `#0891B2` `#DB2777` `#D97706` | avatar palette | `--chart-1 … --chart-5` | the system's only categorical set. Not needed: we have no avatar stack |

Of these 25, only a handful are reachable from what we actually render — we have
no today band, weekend tint, add row, name pill, avatar stack, CP badge or edit
panel. The table exists so that any future adoption has an answer already, not
because Phase 2 consumes all of it.

## 6. Elevation: the v3 → v4 table, applied uniformly

| System intent | System token | Written in this project as | Sites |
|---|---|---|---|
| card at rest | `--shadow-sm` | **`shadow-xs`** | `App.tsx` active tab pill; `Dashboard.tsx` ×3 cards; `PlanNotice.tsx` |
| hover / menus | `--shadow-md` | `shadow-md` | `BarActionMenu.tsx` (was `shadow-lg`); Dashboard card hover |
| dialogs and sheets | `--shadow-lg` | `shadow-lg` | `ImportModal`, `TaskDetailsModal`, `ExportOverflowModal`, `SettingsFlyout` (all were `shadow-xl`) |
| anything else | — | none | `GanttRow` bar track loses its `shadow-sm`: a chart bar is not a card, and the system gives shadows only to cards, menus and dialogs |

`shadow-xl` does not exist in the system's vocabulary and is gone from the app.

## 7. Recorded deviations from the scale

These stay, deliberately, and are listed here so they are visible rather than
silently embedded:

| Value | Where | Why it stays |
|---|---|---|
| **9px** (`text-[9px]` + `leading-[14px]`) | tag pills on a Gantt row, `GanttRow.tsx` | The scale's next step up is 10px. Raising it widens every pill and takes width straight back from the task name that `fix/task-column-cap` and `fix/task-column-legibility` just recovered (the name has priority over its tags in `fitRowTags`). 14px leading is the system's own `--leading-2xs`. |
| Gantt geometry: row 40, bar 32, zones 118 / 292 / 104, mobile 96 / 52 | `ganttLayout.ts` | Chart geometry, not control geometry; the system's 36/40/44/48 scale is for controls. `BASE_PX_PER_DAY` additionally crosses into the export and is fenced. |
| `max-h-[85vh]`, `z-[1]`, `min-w-[3rem]`, `max-w-[12rem]`, `max-w-[33%]` | modals, SVG overlays, zoom readout, plan name, mobile resize handle | Layout constraints, not design tokens. The system has no counterpart and does not need one. |
| 16px form controls below the breakpoint | inputs and selects | iOS Safari zoom guard — behaviour, explicitly fenced. |

`tracking-[0.02em]` on mono text is **not** in this list: the system's mono
specimen (`guidelines/type-mono.card.html`) prescribes no letter-spacing and
names `tabular-nums` instead, so the seven sites take `tabular-nums` and drop the
tracking. The export keeps its own `DATE_LETTER_SPACING_EM` — that is a renderer
metric inside `slideLayout.ts`, which is fenced.

## 8. What Phase 2 changed

18 files, all of them screen. `src/export/**` was not touched, and the export's
output is byte-identical (§9).

**One transcription instead of twenty copies.** `src/components/systemUi.ts`
holds the system's control contracts — `buttonClass(variant, size, extra)` with
the six variants and four sizes from `Button.jsx`, `INPUT_CLASS` /
`INPUT_CLASS_AUTO` from `Input.jsx`, `CHECKBOX_CLASS` from `Checkbox.jsx`,
`CARD_CLASS`, `FOCUS_RING`, `DISABLED`. It is not a component and adds no new
idea: the primitives cannot be imported (§0), so this is the only way to apply
them uniformly rather than re-typing class strings at each call site. 33 controls
now come from it.

| Rule | Applied |
|---|---|
| Control heights | every button on 36 / 40 / 44 or the 40×40 icon; every input, select and textarea at h-10 |
| Hover | colour only — primary `/0.9`, secondary `/0.8`, ghost and outline fill with `--accent` |
| Disabled | `opacity-50` + `pointer-events-none` everywhere (was `opacity-40`/`opacity-60` + `cursor-not-allowed`, 9 sites) |
| Focus | the one 2px/offset-2 `--ring` treatment, from a single constant (it was a local const in two files and inlined elsewhere) |
| Elevation | the §6 table: 4 dialogs/sheets `shadow-xl` → `shadow-lg`, the menu `shadow-lg` → `shadow-md`, cards and the active tab → `shadow-xs`, the Gantt bar's shadow removed |
| Type | `text-[11px]` → `text-xs` (with `PROGRESS_FONT_SIZE_PX` 11 → 12), `text-[10px]` → `text-micro`, seven `tracking-[0.02em]` → `tabular-nums` |
| Colour | the modal scrim is now the system's `--overlay-scrim` token rather than Tailwind's own `black/80` — the same value, but the system's to change |
| Indent | the export settings list stepped 20px per level while the chart stepped 16; it now calls the same `labelIndent` both surfaces share |

Composed from primitives, as instructed, rather than becoming new components:

- **Notification strip** (`PlanNotice`) — the system's card at rest + a lucide icon + a ghost icon button. There is no toast, banner or inline alert in the system to use instead.
- **Import modal's file zone** — the system's one "add" idiom, a dashed border, around an icon and a Button.
- **Zoom control** — a `bg-muted` container at 8px radius with 2px padding wrapping three ghost Buttons, the way the handoff composes its own zoom control. Its `h-7` is not copied: 28px is not on the control scale, and per E4 the system wins.

## 9. Verification

| Check | Result |
|---|---|
| `tsc -b` | clean |
| `oxlint` | clean |
| `npm run build` | built |
| `npm run check:export` | PASSED — 5 scenarios, no task lost, no link into empty space |
| Raw hex in the diff | **0** |
| Off-system utilities remaining | `shadow-xl`, `disabled:opacity-40`, `disabled:cursor-not-allowed`, `text-[11px]`, `text-[10px]`, `tracking-[0.02em]`: **none** |
| Arbitrary classes added | 4, all layout constraints recorded in §7 (`max-h-[85vh]` ×2, `min-w-[3rem]`, `animate-[flyout-in…]`) |
| **Export output** | **48 of 48 PDF content streams byte-identical** to `main`. The only bytes that differ in the whole file are `/CreationDate` (one second apart) and the `/ID` derived from it |
| Screens | captured in headless Chromium at 1280 and 375, before and after |

The export comparison is the load-bearing one: it is generated from the same
fixture on both branches and compared stream by stream, so "geometry unchanged"
is a measurement rather than an assurance.

## 10. The six colours the screen takes from the export palette — settled

Six colours reach the screen from `src/export/theme.ts`'s `COLORS`: the bar
track, the option background, the on-surface text, the assignee fallback, and
the two connector greys. Four are already exact token values (`barTrack #E5E5E5`
= `--border`, `optionBg #FFFFFF` = `--background`, `textOnSurface #0A0A0A` =
`--foreground`). The two connector greys (`#8A94A0`, `#C7CDD4`) and the four
grid-line greys (`#CFCFCF`, `#D6D6D6`, `#B0B0B0`, `#E0E0E0`) have **no token at
all** — `theme.ts` says so in its own comments.

**Ruled: leave them.** Moving the screen off that palette would mean either
editing a file the export reads, or letting the screen and the slide draw the
same line in two different greys. Splitting the two surfaces for the sake of a
tidy palette is a bad trade: the grid and the connectors are the one thing a
reader compares between the app and the deck.

The trigger to revisit is specific: **if the design system gains tokens for
lines** — a rule/grid/connector colour, at any weight — these six become
expressible and should move. Until then this is a decision, not a backlog item.

The 9px tag pill and the Gantt's own geometry likewise stay off-scale by
decision (§7).

## 11. Keeping the transcription honest

`systemUi.ts` is a copy, and a copy of a thing that can be re-pulled will go
stale without anyone noticing. That risk is now mechanically guarded rather than
merely acknowledged:

    npm run check:design

It does not diff text. It reads the *values* out of `Button.jsx`, `Input.jsx`
and `Checkbox.jsx` at run time — the object literals carry the contract, and the
free variables inside a style object (`disabled`, `invalid`, the caller's
`style`) are stubbed, since the contract does not depend on them — converts each
value to the Tailwind utility it implies, and asserts that utility is in the
string we actually hand to a component. **50 values** are checked today.

| It catches | How it reports |
|---|---|
| A size moving (default button 40 → 42) | names both values; and 42px is additionally flagged as off the 4px scale |
| A colour or opacity moving (hover `/0.9` → `/0.85`) | `hover:bg-primary/85` expected, our string printed in full |
| The system **adding** a variant or size | `MISSING` — "exists in the system but systemUi.ts cannot produce it" |
| Tailwind renaming a shadow step again | the card-at-rest check resolves `--shadow-sm` against `node_modules/tailwindcss/theme.css` and asserts `CARD_CLASS` uses whichever utility currently emits it |
| A colour invented into a recipe | every colour class is checked against the token names in `tokens/colors.css` + `status-palette.css` (type sizes are read from `typography.css` so they are not mistaken for colours) |
| The source becoming unreadable | fails with "could not read … parity is unknown" rather than passing quietly |

All six were exercised against a deliberately mutated copy of `Button.jsx`
before this was committed, and the vendored files were left clean.

### What it does *not* cover

Worth stating, because a check that is trusted beyond its reach is worse than
none:

- **Only the three primitives we transcribe.** The system has 33. Transcribing a fourth means adding it here too, or it is unguarded.
- **Presence, not absence.** It asserts the implied utility *is* in our string; it does not assert nothing else is. An extra utility that happens to use a real token (say `bg-muted` slipped onto the default button) would pass.
- **The properties that carry the contract**, not every declaration: heights, widths, padding, radius, type size and weight, gap, the variant colours, focus, disabled, the card shadow. Not `display`, `boxSizing`, `whiteSpace`, `lineHeight` or the transition timing.
- **Not call sites.** The `extra` argument each component passes is layout, and unchecked by construction.
- **Not the guideline specimens.** The states card and the type/spacing cards are prose and HTML, not machine-readable contracts; the focus ring is checked because `elevation.css` happens to carry it as real tokens.

---

# Phase 3 — the plan screen is rebuilt to the handoff

Recorded on the branch `feat/handoff-rebuild`. **This reverses four of the Phase 2
decisions above, for one screen and no other.**

Phase 2 was a restyling pass: the handoff was treated as a source of geometry and
intent only, the design system was the sole source of colour, and nothing new was
built. The instruction for Phase 3 is the opposite one — rebuild the app's screen
*as* the handoff's prototypes, take a value from the prototype wherever it has
one, and only ask where the handoff is silent. So:

| # | Phase 2 said | Phase 3 does |
|---|---|---|
| E1 | Achromatic. The handoff's slate ramp is not adopted; its 25 tokenless hexes fall to the nearest neutral token. | **The handoff's palette is adopted for the plan screen**, as `--gantt-*` tokens in `src/gantt/tokens.css`. Where a handoff value is identical to a system token the system token is referenced instead of restating the number (`#f1f5f9` *is* `--muted`; white *is* `--card`). No hex is written outside that one file. Every other screen — dashboard, settings, import, the export slides — is untouched and stays achromatic. |
| E3 | Gantt geometry stays ours: row 40, bar 32, zones 118/292/104; `BASE_PX_PER_DAY` is not touched. | **The handoff's geometry is adopted**: row 52, bar `min(34, row−16)`, list 320, columns 30/15.2/7px per day, panel 348/520. It lives in `src/gantt/geometry.ts` and `src/gantt/scale.ts`. `BASE_PX_PER_DAY` is still not touched — the screen's column width and the slides' inches-per-day are now separate numbers on purpose. |
| E4 | The system wins on the two contradictions: no inset shadow on a resize handle, radii 3 and 5 round to the 4/6 scale. | **The handoff wins on this screen.** The resize handle's hover keeps its `inset ±2px` hairline, the bar keeps radius 5, the CP badge radius 3. |
| E5 | Nothing new is built from the handoff — no side panel, no critical path, no search toolbar. | **All of it is built**: the two-row toolbar with search, filter chips and the Links / Critical path switches; roll-up groups with collapse and a sub-task count; the Edit Task side panel; CPM over the leaf tasks; the inline add row; the today band, weekend tint and out-of-range shading. |

E2 (11px → 12px, 9px kept) is untouched and still applies to the export side.

## What the handoff does not answer

Recorded rather than decided silently:

- **The app's own actions.** Import, Settings, the two exports, the Dashboard view and plan switching have no slot in the handoff's toolbar. Per the project owner they were folded into it: icon buttons and short labels at the right of the top row, and the plan's name became the plan menu. The handoff's own README warns that this row overflows below ~950px, which is why the export buttons read "PDF" / "PPTX" rather than spelling the verb twice.
- **Nesting past two levels.** The handoff models exactly `task` and `group`, so it names exactly three left-indents (6 / 24 / 26). This app's `parentId` allows any depth; depth ≥ 2 reuses the child indent rather than extrapolating a ladder the handoff does not specify.
- **The canvas's extent.** The prototype's canvas is a fixed 133 days with 7 days of air before the first task and 30 after the last. A canvas derived from the plan takes those two numbers as its padding, and is additionally widened to the viewport so the grid never stops in mid-air.
- **Author on a comment, description on a task, more than one assignee.** The model has none of the three. The panel's comment row shows its date where the handoff shows an avatar and a name, the Description field is not built, and a bar carries one avatar rather than a stack.

## Where the plan screen leaves the handoff's scrolling model

The handoff builds the canvas as **one** `overflow: auto` box with the list
`sticky left` and the header `sticky top`, and states the reason: *"vertical
alignment between list and bars is structural, not synchronised in JS."* That is
the better architecture and it was built that way first.

It has one consequence that ruled it out. A single scroller's horizontal
scrollbar spans the whole box — so it runs under the task list as well as under
the bars — and it sits at the bottom of the *content*, which on a plan taller
than the window is off-screen. The bar is a reading of how much plan lies either
side of the view, so it has to belong to the timeline zone alone and stay in it.

So the canvas is four panes in a fixed 2×2 frame — corner, header, list, body —
and only the body scrolls. `src/gantt/useScrollPanes.ts` writes the header's
horizontal offset and the list's vertical offset from the body's, in a `scroll`
listener that touches the DOM directly rather than going through React state.
Three things follow from the split and live in the same hook: a grab-to-pan on
the body (which refuses to start inside `[data-gantt-bar]`, so panning and moving
a bar can never both run on one press), shift-wheel for horizontal travel and
wheel forwarding from the `overflow: hidden` list pane, and a scale change that
holds the day at the middle of the zone — anchored on every scroll, because by
the time a layout effect could read `scrollLeft` the browser has already clamped
it into the new canvas's range.

The handoff describes none of those three: it has no wheel handler and no pan.
