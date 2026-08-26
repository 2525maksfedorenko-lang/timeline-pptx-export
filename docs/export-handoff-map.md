# Export slide handoff — what it specifies, and where it meets what we have

Reconnaissance for `feat/export-slide-redesign`. Nothing here changes code; it records what the
handoff fixes, what it leaves open, and what it would cost the deck we ship today.

The handoff lives outside the repo, next to the plan-screen one:

```
/mnt/c/Users/Max/Desktop/zipclaude/design_handoff_gantt_export/
  README.md                     the written spec (8 KB)
  gantt-export.html             five slides, standalone prototype (1883 lines)
  Gantt Chart Slide v2.dc.html  the authored source of the same five slides
  gantt-zoom-levels.pptx        the exported result "to match"
  deck-stage.js                 the prototype's viewer shell, not spec
```

`gantt-export.html` and `Gantt Chart Slide v2.dc.html` are byte-for-byte equivalent on every value
that matters (checked: frame padding, title size, `480px repeat(N,1fr)`, bar heights 26/20/34,
the four phase hexes — identical counts in both). So there is **one** prototype, quoted below as
`gantt-export.html:LINE`, and the README where it says something the markup cannot.

The README is explicit about fidelity: *"Colours, type sizes, paddings and bar geometry are final
and should be matched exactly."*

---

## 1. The slide the handoff describes

One slide type: **the Gantt/overview slide**, at five zoom levels. 1920 × 1080 px, laid out as a
CSS grid of `480px repeat(N, 1fr)` — a fixed task column plus N equal time columns. Bars are
positioned in **percent of the time zone**, never in column indices (README, pipeline step 1).

### Frame

| Element | Value | Source |
|---|---|---|
| Slide | 1920 × 1080 px | README "Overview" |
| Frame padding | `56px 72px 48px` | `gantt-export.html:13` |
| Background / text | `--background` / `--foreground` | `:13` |
| Font stack | `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif`, substituted with **Arial** before capture | `:13`, README trap 2 |

### Header

| Element | Value | Source |
|---|---|---|
| Title | 44px / 600 / `letter-spacing:-0.02em` / `line-height:1.15` / `nowrap` / `flex:1 1 auto` | `:16` |
| Meta, right of title | 26px, `--muted-foreground`, nowrap — e.g. `1 month · Mar 2 – Apr 2, 2026` | `:17` |
| Header row | `display:flex; align-items:baseline; justify-content:space-between; gap:40px` | `:15` |

### Legend row

| Element | Value | Source |
|---|---|---|
| Row | `margin-top:26px; gap:30px; font-size:24px; align-items:center` | `:20` |
| Item | 24×24 SVG + label, `gap:10px`, label in `--muted-foreground`, nowrap | `:21–23` |
| Items | Done, In progress, To do — **three, no Blocked** | `:21–23` |
| Zoom caption | pushed right with `margin-left:auto`, `--muted-foreground` — `Zoom: days` / `Zoom: months · rollup` | `:24`, `:1575` |

### Chart card

| Element | Value | Source |
|---|---|---|
| Card | `margin-top:16px; border:1px solid --border; border-radius:14px; overflow:hidden; flex:1; background:--card` | `:27` |
| Column header row | `grid-template-columns:480px repeat(N,1fr); border-bottom:1px solid --border; flex:none` | `:29` |
| "TASK" cell | `padding:12px 24px 14px`, `align-items:flex-end`, 24px, `--muted-foreground`, `letter-spacing:0.08em`, `text-transform:uppercase` | `:30` |
| Date cell | `padding:12px 4px 14px`, centred, `border-left:1px solid --border`, `overflow:hidden` | `:31` |
| Date cell, top line | 24px / 500 | `:31` |
| Date cell, sub line | 24px, `--muted-foreground`, `margin-top:2px` | `:31` |
| Rows container | `position:relative; flex:1; min-height:0; overflow:hidden; display:flex; flex-direction:column` — README flags `min-height:0` as required | `:65` |
| Row | `display:grid` (same columns); `align-items:center; flex:1; min-height:0; border-bottom:1px solid --border/0.6` | `:67` |
| Column rules inside a row | one `border-left:1px solid --border` div per column, `height:100%` | `:68…` |

**Rows are `flex:1`** — they share the card's height equally, so row pitch is a *result* of how many
rows a slide carries, not a constant. Measured from the prototype: 16 rows in ≈761 px ⇒ ≈47.5 px per
row at the densest zoom; the rollup slides put 5 rows in the same space ⇒ ≈152 px each.

### Task cell and bar

| Row kind | Task cell | Bar | Source |
|---|---|---|---|
| Phase (parent) | `padding:0 24px; gap:14px`; name 26px / 600, ellipsis, nowrap; **no status icon** | `height:26px; border-radius:8px; min-width:8px`, solid phase colour | `:100–104` |
| Subtask | `padding:0 24px 0 52px; gap:14px`; 24×24 status icon, then name 26px / 400 | `height:20px; border-radius:8px; min-width:8px`, same hue at 24–28 % alpha | `:140–146` |
| Rollup row | `padding:0 24px; gap:16px`; status icon, name **32px / 600**, subline 24px `--muted-foreground` `margin-top:4px` — `5 tasks · Jan 5 – Mar 31` | `height:34px; border-radius:8px; min-width:48px`, `#2f7fed` | `:1613–1622` |
| Bar track | `grid-column:2 / -1; position:relative; height:100%; z-index:3` | bar is `position:absolute; top:50%; transform:translateY(-50%); left:L%; width:W%` | `:103`, `:145` |

### Today line

`position:absolute; top:0; bottom:0; left:calc(480px + (100% - 480px) * f); width:2px;
background:--destructive; opacity:0.8; z-index:4; pointer-events:none` — `gantt-export.html:66`.
`f` is the fraction of the **time zone**, not of the slide: 0.5625 / 0.4615 / 0.547 / 0.5342 / 0.5392
on the five slides. It spans the whole rows container, not one row.

### Type scale, floor

Minimum type size **24px** — "nothing smaller survives projection" (README). Every size used on the
slide: 44 (title), 32 (rollup name), 26 (meta, task name), 24 (legend, header cells, sublines).

---

## 2. Colours

Six tokens, resolved against `design-system/tokens/colors.css` (light theme) and confirmed against
the shipped `.pptx`:

| Token | Value | In the .pptx |
|---|---|---|
| `--background` / `--card` | `#FFFFFF` | `FFFFFF` |
| `--foreground` | `#0A0A0A` | `0A0A0A` (49 runs) |
| `--muted-foreground` | `#737373` | `737373` (38 runs) |
| `--border` | `#E5E5E5` | `E5E5E5` (562 fills) |
| `--border / 0.6` | same, 60 % alpha | `<a:alpha val="60000"/>` ×16 |
| `--destructive` | `#EF4444` | `EF4444`, `<a:alpha val="80000"/>` |

**Phase palette** (README "Phase colours"), which has no counterpart in our design system or in
`src/export/theme.ts`:

| Phase | Solid | Subtask tint |
|---|---|---|
| Discovery | `#0f9488` | `rgba(15,148,136,0.28)` |
| Design | `#7c3aed` | `rgba(124,58,237,0.24)` |
| Build | `#2f7fed` | `rgba(47,127,237,0.24)` |
| Validation / rollout | `#e08706` | `rgba(224,135,6,0.26)` |

On rollup slides every bar is one blue, `#2f7fed`. The `.pptx` carries the tints as `<a:alpha>` on
the same solid (`24000` / `26000` / `28000`), which is exactly pptxgenjs's `transparency`.

**Colour means phase, shape means status.** That is the inversion at the centre of this handoff:
today our bars are coloured by status and carry a status chip; here the bar's colour identifies the
phase it belongs to, and status is carried only by a 24×24 icon in the task cell.

---

## 3. Status icons

Three, vector, 24×24, given as literal SVG in the README and in the prototype (`:21–23`, `:141`):

- **Done** — `circle r=10 stroke=currentColor stroke-width=2` + check path `M7.5 12.3 L10.6 15.4 L16.5 9.2`
- **In progress** — same circle + filled triangle `M9.3 7.2 L17 12 L9.3 16.8 Z`
- **To do** — circle only, `stroke=#71717a` (`--muted-foreground` in the prototype), `opacity:0.7`

Done and In progress are drawn in `currentColor` = `--foreground`; they are **not** status-coloured.

README trap 1 is explicit: glyph characters (`▶`, `✓`) break cross-platform — macOS substitutes a
colour emoji. Icons must be vector SVG, and in PPTX embedded as images or native shapes, never text
runs. The shipped deck does exactly that: 15 `<p:pic>` per slide, 130 media files, each icon present
twice (`image-1-10.svg` + `image-1-9.png` fallback pairs).

Status rule in the handoff: `end <= today` → Done, `start <= today < end` → In progress, else To do.
**We have an explicit `status` field**; see question 4.

---

## 4. Zoom levels and rollup

| Requested range | Columns | Header cell | Rows | Prototype |
|---|---|---|---|---|
| 1 month | ~32 days | day number + weekday **single letter** (`02` / `M`) | phases + subtasks | `:29–62` |
| 3 months | 13 weeks | `W1…W13` + week-start date (`W1` / `Mar 2`) | phases + subtasks | `:723…` |
| 6 months | 12 half-months | month + `1–15` / `16–end` | phases + subtasks | `:1154…` |
| 1 year | 12 months | month + `'26` | **rollup**, phases only | `:1566…` |
| 3 years | 12 quarters | `Q1` + `'26` | **rollup**, phases only | `:1724…` |

Two rules attached to this:

- **The window follows the tasks.** If the requested window does not contain the data extent, widen
  it. If the plan fills less than ~25 % of the window, crop the axis to the data extent + padding and
  step the zoom down one level (README, pipeline step 2).
- **Rollup** (Jira / MS Project summary bars): above the half-month zoom, subtasks collapse into
  their parent, which then carries `N tasks · date – date`. The README notes the caveat itself:
  rollup shortens the row list, it does not lengthen bars.

---

## 5. What the .pptx artifact proves — and one contradiction

Unpacked and read (`ppt/presentation.xml`, `ppt/slides/slide1.xml`):

- Slide size `18288000 × 10287000` EMU = **20 in × 11.25 in**, i.e. px ÷ 96.
- Text: `sz="3300"` / `1950` / `1800` = 33 / 19.5 / 18 pt = 44 / 26 / 24 px × 0.75. Typeface **Arial**, 261 runs.
- Bars: `roundRect`, `cy=247650` EMU = 26 px, `adj=30769` = 8 px radius ÷ 26 px height.
- Card: `roundRect` `FFFFFF` with a `7620` EMU (0.6 pt) `E5E5E5` line, `adj=1653`.
- Grid: 562 plain `rect` fills in `E5E5E5` — the per-row column borders, drawn one rect per cell edge.
- Everything positions at px × 9525 EMU (96 dpi): title at `x=685800` = 72 px, `y=533400` = 56 px, which
  is exactly the frame padding.

**The README says the opposite about size**: *"Slide size 13.333 × 7.5 in = 1920 × 1080 px at 144 dpi;
convert px → inches with `px / 144`."* The shipped deck is 20 × 11.25 in at 96 dpi. Both are 16:9, so
the layout is identical either way, but every point size differs by a factor of 1.5 (24 px = 18 pt at
96 dpi, 12 pt at 144 dpi). **Question 1.**

Our deck today is 10 × 5.625 in (`slideLayout.ts:21`), a third smaller again.

---

## 6. What we ship today, element by element

| Handoff element | Ours today | Where |
|---|---|---|
| White slide, dark text | `--base-background` `#EBF0F5` slide + **navy header band** with light title | `pptxExporter.ts:82–96`, `theme.ts` |
| Title 44 px / 33 pt | 24 pt, centred in a derived band | `slideLayout.ts:39–44` |
| Meta line (range, right of title) | — | — |
| Legend row (3 statuses + zoom) | — | — |
| Chart card (border, radius 14) | no card; content sits on the slide | — |
| Column header row, per-column captions | axis captions on one line + "Status"/"Task" headings | `slideLayout.ts:218–221`, model `columnHeaders` |
| Fixed 480 px task column | derived `STATUS_COL_WIDTH_IN` + `TASK_COL_WIDTH_IN` (2.60 in) | `slideLayout.ts:185–212` |
| Status as a 24×24 icon | **status chip** — pale fill, hairline border, dark label | `OverviewBarModel.statusChip*`, `pptxExporter.ts:340–349` |
| Bar colour = phase | bar colour = status, or `TimelineItem.color` | `resolveBarColor` |
| Subtask bar = same hue, 24–28 % alpha, 20 px | subtask bar = shorter by depth ladder (`1 / 0.7 / 0.55`), full opacity | `barNesting.ts:29` |
| Rows share the card height (`flex:1`) | fixed pitch `ROW_HEIGHT_IN` = 0.32 in, capacity derived from it | `slideLayout.ts:312, 328` |
| Today line, 2 px `--destructive`, 80 % | today is a grid line among the date grid levels | `dateGrid.ts` |
| Uniform hairline per column boundary | four grid levels (day/week/month/year) at four greys and widths | `theme.ts:63–70`, `dateGrid.ts` |
| Zoom levels + rollup | density tier chosen from the widest window; no rollup | `buildOverviewAxes` |
| — | dashboard table slides (Delayed / At risk) + QR | `dashboardSlides.ts` |
| — | summary slide (status segments + stats) | `timelineExportModel.ts:334` |
| — | appendix: Subtasks & Comments, markdown-rendered | `timelineExportModel.ts:1412` |
| — | footer "Exported from aicoo", internal hyperlinks, back-links | `theme.ts:93`, `slideLinks.ts`, `slideLayout.ts:87` |
| — | `+N tasks not shown` note, timeframe chevrons, compact/full | `omittedNote`, `chevronLeft/Right` |

---

## 7. Gap A — in the handoff, missing from our data or our export

1. **Phase identity as a colour.** The handoff names four phases and gives each a hex. Our model has
   no phase concept — it has a tree, where any item with children is a "group". Nothing says which of
   the four colours an arbitrary root gets, or what happens to roots five and six. *(Question 2.)*
2. **Zoom as a first-class input.** The handoff's columns come from a *requested range* (1 month …
   3 years). We take an optional `exportTimeframe` and derive a grid density tier; there is no zoom
   selector anywhere in the app, and adding one would be a change to the app, which is out of scope
   for this branch. *(Question 5.)*
3. **Rollup mode.** No equivalent today: our overview draws every exportable task as a bar at every
   depth (that is coverage rule A2, closed deliberately). *(Question 6.)*
4. **`N tasks · date – date` subline** on a rollup row — we have the counts, so this is renderable.
5. **Vector status icons.** Neither exporter draws an icon today. PPTX would take SVG data URIs
   (pptxgenjs `addImage`); jsPDF has no SVG support, so the icons would be drawn with vector
   primitives (`circle`, `lines`) at the same geometry.
6. **Alpha fills.** pptxgenjs takes `transparency`; jsPDF needs a `GState`. Neither is used today.
7. **A three-status world.** The legend has Done / In progress / To do. Blocked has no icon, no
   colour and no legend entry. *(Question 3.)*

## 8. Gap B — ours, and the handoff is silent

The handoff describes exactly one slide type. It says nothing about: the dashboard table slides, the
summary slide, the Subtasks & Comments appendix (markdown, tables, pins), QR codes, internal
hyperlinks and back-links, the footer, the export filename, the "+N tasks not shown" note, the
timeframe-clipping chevrons, Compact/Full overflow, the monospace date face, or the sort order.

Per the brief these stay exactly as they are — but *stay as they are* has a visual edge case: those
slides currently wear the navy header band on the `#EBF0F5` background. If the overview turns white
and card-based and they do not, one deck will carry two chromes. *(Question 7.)*

## 9. Watchlist — things we removed on purpose

Checked the whole handoff for each. Nothing we removed comes back by accident:

| Removed recently | In the handoff? |
|---|---|
| Progress percentages / progress fill | **No.** Bars are one solid rectangle; the word "progress" appears only inside "In progress". |
| Assignee avatars / names | **No.** No occurrence of assignee, avatar or a person anywhere. |
| Tags | **No.** |
| Dependency connectors | **No.** No connector, no arrow, no "depend". |
| Blocked as a choosable status | **No** — and this cuts the other way: the handoff's three-status world has no place to *draw* a task that is already blocked in the data. |

Two things do need your call rather than my judgement, both listed as questions below: what a blocked
task looks like on the new slide (3), and whether we adopt the handoff's date-derived status rule in
place of our stored `status` (4). I am not proposing either silently.

## 10. What this does to the checks

- **`npm run check:design`** — untouched. It compares `src/components/systemUi.ts` against the
  vendored primitives; no slide constant reaches it.
- **`npm run check:export`** — two halves, and both feel this:
  - *Coverage audit* (`exportCoverage.ts`) reads geometry off `slideLayout.ts` at run time
    (`CONTENT_BOTTOM_IN`, row heights, table caps) and re-measures what the model produced. Changing
    the page size and the row model does not break it by itself — it recomputes — **but** two of its
    rules are geometry-shaped: "every drawn row ends inside the content area" and "everything cut is
    counted in a note". A rollup mode that hides subtasks from the overview must keep them in the
    appendix, or this fails, correctly.
  - *Indent parity* (`checkExportCoverage.ts:95–122`) asserts that the appendix's indent ladder
    (`subtaskRowIndent`) steps by the same ratio as the screen's (`labelIndent`, `barNesting.ts`), in
    two units. The handoff's task column has exactly **two** indents — 24 px for a phase, 52 px for a
    subtask — and no third. If the overview adopts a fixed two-level indent, the parity check is
    unaffected (it measures the *appendix*, which the handoff does not describe). If we were to
    re-ladder the appendix to match, the check would fail unless `barNesting` changed too — and
    `barNesting` is the screen's, which this branch must not touch. **So: the appendix ladder stays.**
- **Rasterisation** (`jiti` + `poppler`, per the browser-testing note) is unaffected mechanically; the
  reference images simply change.

## 11. Open questions — nothing gets invented

1. **Slide size.** The shipped `.pptx` is 20 × 11.25 in (px ÷ 96); the README says 13.333 × 7.5 in
   (px ÷ 144). Ours is 10 × 5.625 in. Which one is the deck? *(13.333 × 7.5 is PowerPoint's own
   16:9 default and the only one that opens without a "non-standard size" nudge; 20 × 11.25 is what
   the artifact actually is.)*
2. **Phase colours for a real plan.** Four hexes, four named phases. Our plans have any number of
   roots, in any order, sometimes with a `TimelineItem.color` of their own. Cycle the four by root
   order? Keep `item.color` where set and cycle only for the rest? And what colours a *nested* group
   three levels down — its own root's hue, or its own?
3. **Blocked.** No icon, no colour, no legend entry in the handoff. Draw it as To do? Keep our red?
   Add a fourth icon in the same family?
4. **Status source.** The handoff derives status from dates (`end <= today` → Done). We store it.
   Confirm we keep the stored field and ignore the date rule (I would).
5. **Which zoom a deck uses.** There is no zoom control in the app and this branch cannot add one.
   Do we map the five levels onto the export timeframe automatically (span ≤ 45 d → days, ≤ 130 d →
   weeks, ≤ 200 d → half-months, ≤ 550 d → months, else quarters), or fix one level, or add the
   choice to the export settings *(which is an app change and would need your go)*?
6. **Rollup.** Adopting it means the overview stops drawing subtask bars on year/multi-year decks.
   Coverage still holds because the appendix carries them — but it is a real change to what a reader
   sees. Adopt as specified, or always draw every level?
7. **The other slides' chrome.** Overview turns white/card. Do the dashboard, summary and appendix
   slides keep the navy band (two chromes in one deck), or do they take the new frame — background,
   title size, card — while their content stays exactly as it is?
8. **Rows per slide.** Rows are `flex:1` with no stated minimum, so nothing in the handoff says when
   a slide is full. Densest prototype slide is ≈47.5 px per row. Do we set the floor there (⇒ a
   capacity of ~16 rows before Compact/Full kicks in), or somewhere else?
9. **Icons.** The brief says lucide only; the handoff ships its own SVG paths, which are close to
   lucide's `circle-check`, `circle-play` and `circle` but not identical. Handoff paths, or lucide?
10. **Task column width.** 480 px = 25 % of 1920. Keep it as a fraction of the slide (so it survives
    a size change), or as the absolute inch equivalent of 480 px at whatever size question 1 picks?

---

# Phase 2 — what was built

The decisions of section 11, as answered, and the ones left to me. Every value
the handoff fixes now lives in `src/export/slideLayout.ts` written as the
handoff's own pixels (`px(56)`, `px(480)`, `px(26)`) over one conversion —
`PX_PER_IN = 144`, since 1920 x 1080 px at 144dpi *is* PowerPoint's 13.333 x
7.5in page.

## Answered

1. **Slide size** — 13.333 x 7.5in. The shipped `.pptx` is 20 x 11.25in; that is
   the prototype's export, not the intention.
2. **Phase colours** — the handoff's four hexes are `PHASE_PALETTE` in
   `theme.ts`. A root takes the next one in plan order (cycling past four), or
   its own `TimelineItem.color` where it has one; every task under it inherits
   that colour, its own included, because the colour says *which branch* and a
   subtree in four colours says nothing. Nested bars are the same hue at the
   palette's tint (24–28%), a custom colour at 26%.
3. **Blocked** — ~~kept, in the product's red, as a fourth icon of the same
   family and a fourth legend entry.~~ **Revised: the status was removed from
   the product outright** ("we don't have it and won't"), so the legend is the
   handoff's own three. See "Phase 4" at the end of this document.
4. **Status** — read from the stored field. The handoff's date rule
   (`end <= today` → done) is not applied anywhere.
5. **Zoom** — derived from the widest window of the export, which is the window
   whose density every slide already shares: `slideZoomFor` — ≤45d days, ≤130d
   weeks, ≤200d half-months, ≤550d months, else quarters. No control was added.
6. **Rollup** — not adopted. The overview draws every task at every depth, and
   Compact/Full still handles the overflow.
7. **The other slides** — dashboard, summary and appendix take the same frame:
   white page, 22pt title at the top left, the footer line, no navy band. Their
   own content is untouched.
8. **The appendix ladder** — untouched, and `barNesting` with it.

## Decided here (questions 8, 9, 10 of the map)

- **Rows per slide.** Rows share the card's height, as the handoff draws them,
  so the ceiling comes from a floor on the row: `MIN_ROW_HEIGHT_IN` = 48px, the
  densest row the prototype draws (16 rows in ~761px). That gives 15 rows a
  slide against the old 12.
- **Icons.** The handoff's own three paths, transcribed — a ring plus the
  check `M7.5 12.3 L10.6 15.4 L16.5 9.2`, the ring plus the filled play
  triangle `M9.3 7.2 L17 12 L9.3 16.8 Z`, and the bare ring. Three, exactly as
  the handoff lists them. Drawn from primitives in both engines rather than as
  an image, since jsPDF has no SVG: the triangle is `doc.triangle` in the PDF
  and PowerPoint's own `triangle` shape given a quarter turn in the deck.

  *(Revised. This first shipped as lucide's `circle-check` / `clock` / `circle`
  — the plan screen's four, on the grounds that a deck should not rename the
  screen's vocabulary on the way out. Overruled: the README fixes the icons
  along with everything else, so the slide draws the triangle. The plan screen
  keeps its clock — that screen answers to its own handoff.)*
- **Task column.** 480px, kept as pixels and converted like everything else, so
  it stays 25% of the slide whatever the page size does next.

## Deviations worth knowing

- **Columns are equal, bars are not.** `repeat(N, 1fr)` with bars positioned as
  a percentage of the window is the handoff's own combination, so a 28-day
  February column is as wide as a 31-day January while the bars inside them
  stay true to the calendar. On month and quarter zooms the two disagree by
  under 1% of the width.
- **A grid level was added.** `halfMonth` (the 1st and the 16th) joins
  `dateGrid.ts`, because the half-month zoom rules a boundary no existing level
  claimed, and the coverage audit holds every stroke to being a real mark of a
  real level. The levels lost their weights and colours in the same move: the
  handoff rules every boundary as one 1px `--border` hairline, so what a level
  decides now is only which dates qualify.
- **A footer the handoff does not have.** It keeps the deck's provenance line
  and — the reason it stays — the coverage note ("+N tasks not shown"), at the
  handoff's own 24px floor. The card ends above it.
- **Chevron marks are triangles now.** They were `◀` / `▶` characters, which is
  precisely the handoff's first export trap (macOS substitutes a colour emoji).
  So is the appendix's old `←`; the back link reads "Back to overview" and sits
  on the title's line, where the overview puts its window caption.
- **The status chip is gone** from the overview, with the Status column it sat
  in. Status is the icon beside the name, as the handoff draws it; the word is
  still written out on every appendix row.

---

# Phase 4 — `blocked` was removed from the product

Not a handoff decision: the status itself was dropped ("we don't have it and
won't"), and `TaskStatus` is now `todo | in_progress | done`. That closes
question 3 above by removing its subject, and it lands the deck on exactly the
three-status world the handoff describes. Recorded here because the map's
"Watchlist" promised nothing would come back by accident, and this is the
reverse — something leaving.

## What went with it

`blocked` was not only a colour. Each of these existed *because* the status did,
so each left with it rather than being kept as an option that can never fire:

| Gone | Where it was | Why it could not stay |
|---|---|---|
| The fourth legend entry, its pause glyph, and the `bars` icon primitive | `slideLayout.ts`, both exporters | The primitive had one user, and the glyph had one status |
| `COLORS.blocked` | `theme.ts` | Same hex as `COLORS.today`, kept apart because they meant different things; only one meaning is left |
| The **At risk** KPI card, its table, and its whole dashboard slide | `Dashboard.tsx`, `dashboardSlides.ts`, `dashboardMetrics.ts` | `getAtRiskTasks` filtered to `status === 'blocked'` and nothing else — the count could only ever be zero |
| `?dashboardView=atrisk` and its QR deep link | `App.tsx`, `qrCode.ts` | The section it scrolled to no longer exists |
| The **At risk (blocked)** stat on the summary slide | `timelineExportModel.ts` | Same |
| The pink overrun wash after a blocked task's deadline, and `--gantt-out-of-range` | `TimelineBody.tsx`, `tokens.css` | Drawn only for blocked rows |
| The blocked name-pill and red edge dot | `TaskListRow.tsx`, `TaskBar.tsx`, `tokens.css` | Same |
| `SELECTABLE_TASK_STATUS_VALUES` and `statusOptionsFor` | `types/timeline.ts` | They existed to hide one unselectable status from pickers; with three statuses both lists are `TASK_STATUS_VALUES` |

**Delayed is untouched.** It is a fact about dates — not done, past its end —
so it survives on the dashboard, in the deck and in the KPI row, which now has
three cards instead of four.

## Plans that already hold a blocked task

Nothing new was written for this. A stored or imported plan carrying
`status: "blocked"` goes through `normalizeItemStatuses` on the way in, which
now recognises three spellings, drops the fourth and says so:

```
"blocked" is not a status ("Old blocked task") — imported as "to do".
Expected one of: to do, in progress, done.
```

So the task loads, reads as **to do**, and the plan carries a repair notice
naming it. That is the same path an unknown status from a spreadsheet has
always taken; it is a one-way door, and re-selecting the old value is not
possible because no control offers it.

---

# Phase 5 — the customer's consistency pass (`fix/deck-consistency`)

Four changes asked for by the customer after reading a real deck. Three of them
are **deliberate divergences from the handoff or reversals of our own earlier
decisions**, so this section exists to stop a future pass "fixing" them back.
Where the handoff and the customer disagree here, the customer wins — that is
the standing instruction for this branch.

## 1. A parent's name is bold, not underlined

The overview's task name is the deck's one clickable task label (it jumps to
that task's appendix section), and pptxgenjs stamps `u="sng"` on any run
carrying a hyperlink. Only tasks with an appendix section get a link, and those
are the parents — so every parent name, and nothing else, came out underlined.

Fixed by **taking the hyperlink off the text run entirely**. The name is now
plain text, and the jump lives on an invisible shape over the same box — a
`rect` with a fully transparent fill and no outline, whose link lands in
`<p:cNvPr>` where it can decorate nothing.

The first attempt was `underline: { style: 'none' }` on the run. That does
suppress it in PowerPoint, and it is not what shipped, because it leaves the
run *a hyperlink*: a viewer is entitled to style one however it likes, so the
underline stayed one renderer away from coming back. Moving the link is the
version that cannot regress.

Two details worth keeping: the fill must be transparent rather than absent — a
shape with `fill: none` takes a click only on its outline, and this one has no
outline — and this is exactly what the PDF has always done (`linkToPage` over
the label's rectangle), so the two engines now attach a link the same way.
**PDF was never affected** either way; jsPDF's `link()` draws no decoration.

The "Back to overview" link on appendix slides keeps its underline. It is a
navigation affordance rather than a task name, and the customer's note was
about task rows.

## 2. One date window for the whole deck

**Reverses `fix/per-slide-timeframe`.** That branch gave each overview slide a
window computed from its own tasks; the section it wrote in docs/export-sort.md
is now marked superseded. Every overview slide is drawn against a single
window — the first day of what the overview draws to the last — so the same x
means the same date on every slide and two slides can be laid side by side.

**The accepted cost:** a slide whose tasks all fall late in the plan draws them
against an axis that starts at the plan's beginning, so the left part of that
slide is empty track. The customer was told this and accepted it. Slide 7/7 of
the fixture deck is the example: ten rows, all in Sep '26 – Jan '27, on an axis
running Jan '26 – Feb '27.

One consequence worth naming: with the automatic window covering everything the
overview draws, no bar is ever clipped, so the timeframe chevrons only appear
when the reader sets an explicit export timeframe. They are not dead code — the
explicit path still reaches them.

### The today rule

It is drawn on every overview slide, at the same x on each, because they share
one window. If today falls **outside** the plan's span — a plan wholly in the
future, or one that ended before today — `todayX` is null and **no slide of the
deck draws the rule at all**. There is no edge marker and no fallback: a rule
pinned to the left or right edge would assert a date the axis does not carry.
Verified both ways; there is no longer a middle case where the same day is on
one slide and off the next.

## 3. One row height, everywhere

**Diverges from the handoff.** The handoff makes a row `flex:1`, so rows share
the card's height and their pitch depends on how many a slide carries — which
is why a slide of four rows drew them three times taller than a slide of
fifteen. `OVERVIEW_ROW_HEIGHT_IN` is now a fixed 48px on every slide: the
handoff's own densest row (16 rows in ~761px), the same number that used to
serve as the floor.

**The accepted cost:** a slide with fewer rows is part-empty, its card ruled
down to a blank lower half. The customer proposed this themselves with their own
example, slide 34 half filled, and accepted it.

Two derivations to keep intact:

- `MAX_OVERVIEW_BARS_PER_SLIDE = floor(ROWS_AREA_HEIGHT_IN / OVERVIEW_ROW_HEIGHT_IN)`
  — 15 rows. Both the Compact truncation (`planOverview`) and the Full pager
  read that constant, so changing the row height re-pages the deck by itself.
  Nothing carries a copy of the number.
- Because 15 × 48px = 720px against a 743.4px rows area, **even a full slide
  keeps a ~23px strip below its last row**. That is the remainder of the floor
  division, not a bug; it is what a fixed pitch costs against a fixed card.

The coverage audit was tightened in the same move. It used to check that a row
matched *the first row of its own card* — which passed happily while two slides
of one deck disagreed. It now holds every row to `OVERVIEW_ROW_HEIGHT_IN`
itself, so the pitch cannot drift without the check failing.

## 4. The deck's mark, and what happened to the footer

The overview's two captions are gone: the window line beside the title
("5 months · Aug 01 – Dec 31, 2028") and the zoom caption at the right of the
legend row ("Zoom: months"). With one window for the deck, a per-slide caption
had nothing left to say that the axis does not.

**`Exported by aicoo` took the slot beside the title**, and it did so on every
slide, not only the overview — the deck holds one chrome, and leaving the mark
in the footer on some slides and at the top on others would have made two.

**The footer now carries the coverage note and nothing else.** The note —
`+N tasks not shown`, the deck's promise that nothing was dropped silently — is
untouched, and it gained the width the mark used to reserve beside it
(`CONTENT_WIDTH_IN`, previously `CONTENT_WIDTH_IN - 2.4`). `FOOTER_HEIGHT_IN`
is still reserved on every slide whether or not there is a note to put in it,
which is why none of the geometry above moved.

Appendix slides are the one exception to the mark: "Back to overview" already
owns the right of their title line, so `drawChrome` is called with
`markRight: false` there. One slot, one occupant.
