# Export coverage

Every place a task can fail to reach the exported file, walked end to end from
the store to the drawn slide.

Written as an audit *before* widening the export to the full tree, so sections A
to E describe the behaviour at the branch point (`main` @ `fb9cde0`); each entry
then carries its resolution, and "What changed" at the end is the summary. The
invariant the audit exists to protect is enforced by
`npm run check:export` — see `src/export/exportCoverage.ts`.

The question this answers: **if a task has `includeInExport !== false`, what can
stop it appearing in the PPTX/PDF — and does the file say so when it happens?**

## The path

| # | Stage | Where |
| - | ----- | ----- |
| 1 | Pre-flight capacity check (to offer Compact/Full) | `src/App.tsx:71` |
| 2 | Sort, hierarchically | `src/utils/sortItemsForExport.ts:66` |
| 3 | `includeInExport` filter | `src/export/timelineExportModel.ts:1276` |
| 4 | Tree build (roots drive the appendix; **every** task becomes an overview bar) | `timelineExportModel.ts:1277` |
| 5 | Timeframe filter + capacity slice | `timelineExportModel.ts:448` |
| 6 | Overview slide(s): compact (1) or full (N) | `timelineExportModel.ts:695` |
| 7 | Detail candidates — **one root, its direct children** | `timelineExportModel.ts:1281` |
| 8 | Candidate → chunks (comment overflow only) | `timelineExportModel.ts:1103` |
| 9 | Chunks packed onto slides by measured height | `timelineExportModel.ts:1188` |
| 10 | Dashboard slides, from the same filtered set | `src/export/dashboardSlides.ts:44` |
| 11 | Summary slide, from the same filtered set | `timelineExportModel.ts:1296` |
| 12 | Deck order, then internal links | `slideOrder.ts:18`, `slideLinks.ts:27` |
| 13 | Render (both engines consume one model) | `pptxExporter.ts`, `pdfExporter.ts` |

Stages 3, 10 and 11 see the **whole** tree. Stages 4 and 7 are where it is cut.

## A. Depth ceilings — the data loss

### A1. Only direct children are listed  ❌ silent

`timelineExportModel.ts:1284`:

```ts
const children = parentNode.children.map((node) => node.item);
```

`parentNode.children` is one level. A grandchild is in neither `children` (not a
direct child) nor the candidate list itself (stage 7 iterates `roots`, so a
non-root parent never gets a section of its own). It therefore reaches **no
slide at all**: no bar, no row, no title, and no count anywhere in the file.

`buildTaskHierarchy` and `buildDepthMap` already resolve arbitrary depth — only
the export's use of them stops at one level.

**Closed.** `collectSubtreeRows` walks the root's whole subtree in pre-order and
takes each row's depth from the export's one `buildDepthMap`, so a section lists
every descendant at any depth. Depth is drawn as indent through
`subtaskRowIndent`, which rebases barNesting's ladder onto the subtask block —
the same *step per level* the on-screen label column uses, so three levels read
as three levels instead of one flat list.

### A2. Only roots got overview bars  ✅ closed

**Was:** `timelineExportModel.ts` (and `getExportParentItems`, used for the
pre-flight check) reduced the tree to `roots` before planning the overview. The
Overview was a top-level report; the tree belonged in the appendix.

The cost was not task loss — every subtask still reached the appendix as a text
row, so the invariant below always held — but it was the one thing a Gantt slide
is for. A subtask's dates, its overlap with its siblings, where it sits against
the plan's other work: none of that was visible anywhere in the file, for the
levels that carry most of a plan's detail. On a deep plan the deck showed 23 bars
for 100 tasks.

Worth noting at the time: `buildOverviewSlide` already computed a per-depth bar
height and label indent (`resolveBarGeometry`, `labelIndent`), but because it was
only ever fed roots every bar resolved to depth 0 — that machinery was live on
screen and inert here, which is why the height ladder could be tuned without
anything in the file changing.

**Closed.** `planOverview` is fed every exportable task at every depth, and a bar
is drawn shorter by its depth (`BAR_HEIGHT_RATIO_BY_DEPTH`, 1 / 0.7 / 0.55)
while its row keeps the same pitch. Three consequences worth knowing:

- **Depth is judged once for the whole overview**, not per page
  (`buildOverviewSlides`). A task whose parent the timeframe or the compact cut
  removed has no parent on the overview and is drawn as a root — the existing
  rule — but a task merely separated from its parent by a page break keeps its
  level, or nesting would read as pagination.
- **The pre-flight check counts every task**, not the roots (`App.tsx`,
  `getExportOverviewItems`). Counting roots alone would promise the user that
  everything fits and then hand them a truncated slide.
- **A bar says when a task runs and nothing else.** It is one solid rectangle
  in the task's colour, with no paler track behind it: the percentage it used
  to carry — as a figure on the bar and as the width of a fill inside it — was
  removed from both surfaces, so there is no fraction left for a track to be
  the remainder of.

### A3. A comment on a non-root task is never rendered  ❌ silent

`timelineExportModel.ts:1285` collects comments for the *root* only. A comment
attached to a subtask is dropped with no marker. Not a task loss, so it is out
of this change's scope — but it is the same shape of hole and is recorded here
deliberately.

## B. Count ceilings

### B1. Overview capacity  ⚠️ marked

`MAX_OVERVIEW_BARS_PER_SLIDE` (`slideLayout.ts:247`) is derived, not hardcoded:
`floor((CONTENT_HEIGHT_IN − GROUP_HEADER_HEIGHT_IN) / ROW_HEIGHT_IN)` =
`floor((4.10625 − 0.26) / 0.32)` = **12** bars.

- Compact mode: `inRange.slice(0, 12)`; the rest are dropped from the overview
  and counted in `omittedCount`, drawn in the footer as
  `+N tasks not shown …` (`pptxExporter.ts:130`, `pdfExporter.ts:186`).
- Full mode: paged across `ceil(N/12)` overview slides, `omittedCount` 0.

The user chooses between the two in `ExportOverflowModal`, but only when the
pre-flight check trips — and since A2 closed, that check counts **every
exportable task** (`App.tsx`, `getExportOverviewItems`), which is what the
overview itself now draws. A deep plan therefore reaches the modal far more
often than it used to: 100 tasks against a 12-bar slide, where before it was 23
roots.

A task cut here still reaches the appendix (stage 7 does not consult the plan) —
a root as its own section, a subtask as a row in its root's — so the *task*
survives even in compact mode. The exception is B2.

### B2. A childless root outside the timeframe  ❌ silent

`getItemsInTimeframe` (`timelineExportModel.ts:420`) filters overview bars by
window overlap. `omittedCount` is `inRange − included` — capacity only — so
window-excluded roots are **not** in that count.

For most roots this is harmless: stage 7 ignores the timeframe, so the root
still appears as a section title. But a root with no children *and* no comments
is skipped, so it has no section either. Out of window + childless = gone,
uncounted.

**Closed.** The overview footer now carries two counts instead of one, because
"not on this slide" and "not in this file" are different facts:
`omittedFromOverviewCount` (roots with no bar, whatever the reason) and
`absentTaskCount` (of those, the ones with no appendix section either). The note
names which applies — "+11 tasks not on the overview: 10 in the appendix, 1 not
in this export" — and `absentTaskCount` is what the coverage check holds equal to
the set of tasks it cannot find in the deck.

### B3. No cap on subtask rows  ⚠️ becomes the main risk

There is no limit on `children.length`: all of a root's direct children go into
its first chunk (`makeChunk`, `timelineExportModel.ts:1109` — `children: isFirst
? children : []`) and only *comments* ever spill into a `(continued)` chunk.

A section taller than `CONTENT_HEIGHT_IN` is still emitted as one chunk;
`buildDetailSlides` gives it a slide of its own and the rows past the bottom of
the content area are drawn **off the page**. At `LIST_ROW_HEIGHT_IN` = 0.32in,
one slide holds ~12 rows minus the title/heading/assignee overhead (~0.9in), so
a root with more than ~10 direct children already overflows today. It takes a
wide plan to hit; expanding to full depth makes it the common case.

**Closed.** Rows now page like comments always did: `expandCandidateToChunks`
fills a chunk branch by branch and starts a `(continued)` chunk — repeating the
parent's title — when the next branch doesn't fit. The unit is a **branch** (a
direct child plus all of its own descendants, `splitIntoBranches`), so a slide
break never separates a task from its children and never lands mid-level. Only a
single branch taller than an entire slide is broken further, row by row, and it
keeps its depths so the continuation still reads as an outline.

## C. Height / overflow ceilings

### C1. Lone oversized markdown block  ⚠️ narrowed

`expandCandidateToChunks` splits a comment at block boundaries, but a single
block too tall for an empty chunk is let through (the `isEmpty(current) && count
=== 1` arm) rather than looping forever. It overflows the slide.

**Narrowed, and made harmless to the deck.** `isEmpty` used to mean "no comments
yet", which counted a chunk already full of subtask rows as a blank slate; it now
means "nothing on it at all", so the fallback only fires for a block that is
genuinely alone on a slide. And this is the case that used to let
`jspdf-autotable` insert a page of its own: both table call sites now draw
inside `withoutPageBreaks`, so a mis-measured table overflows its own slide
rather than shifting every slide after it (and with it every hyperlink, which
addresses slides by number).

### C2. Height is estimated, not measured  ⚠️ inherent (tables fixed)

`estimateWrappedLines` assumes a 0.55em average glyph; neither engine can measure
text before drawing. Deliberately biased to over-estimate. A bad miss shows as
overlap, never as a dropped row.

**Tables were not merely imprecise, they were wrong.** A row was assumed 0.24in
where `jspdf-autotable` drew 0.283in — 18% short, and measured on a real export
it inserted 4 stray pages into a 41-slide deck. `COMMENT_TABLE_ROW_HEIGHT_IN` is
now derived (one line height plus padding above and below), the padding is passed
*into* autoTable so the renderer follows the model instead of the reverse, and
every cell is measured for wrapping rather than assumed to be one line.

## D. Relation losses (not task losses)

- **Dependency connectors** whose predecessor or successor is not on the same
  slide are dropped rather than drawn to nowhere (`buildDependencyConnectors`,
  `timelineExportModel.ts:770`). Expected in compact mode and across full-mode
  pages.
- **Bar → detail hyperlinks** exist only for tasks that got a section
  (`slideLinks.ts:24`); a bar with no section is inert rather than broken. A
  `(continued)` section never overwrites the first one, so a link always lands
  on the slide where that parent's content *starts*.

## E. Out of scope, recorded for completeness

- **Dashboard tables** (`dashboardSlides.ts`) see the full tree at any depth, so
  nothing is lost by depth — but they have no row cap, and both exporters let a
  long table overflow one slide rather than paginate (PDF additionally
  neutralises `addPage` so it cannot desync the deck, `withoutPageBreaks` in
  `pdfExporter.ts`).

  **Closed.** `fitTableRows` fills a table row by row and stops at the first one
  that doesn't fit, measuring each against the same `tableRowHeightIn` both
  renderers draw with — a wrapped cell makes its whole row taller, so a count of
  rows was never the unit. What it cuts is announced as `+43 more delayed tasks
  - scan for the full list`, drawn in the footer band by the same
  `drawOmittedNote` the overview's own count uses, next to the QR code that
  opens the full list on screen. Rows are kept in the plan's order rather than
  re-sorted by severity, so the slide shows the top of the same list the app
  shows — which is exactly why the count is not optional.
- **Comment mode** (`getCommentsForSlide`): `none` → 0, `pinned` → pinned only,
  `latest` → 1 of N. A deliberate user choice, but the file itself never said how
  many were left out. **Closed**: the section heading reads "Comments (1 of 4)"
  when some were dropped (`buildCommentsHeading`) — in the heading rather than on
  a line of its own, so it costs no layout.
- **Label truncation** (`truncateToWidth`) shortens a name to its column with an
  ellipsis. Visible by construction, and the ellipsis is the marker.

## Verdict at the branch point

Two silent task-losses (**A1**, **B2**), one row-overflow about to stop being an
edge case (**B3**), one silent comment-loss (**A3**) plus one under-reported one
(**E**, comment mode), and two accepted best-effort overflows (**C1**, **C2**).

## What changed

| # | Was | Now |
| - | --- | --- |
| A1 | grandchildren reached no slide | whole subtree, any depth, indented by the shared ladder |
| A3 | a subtask's comments never rendered | unchanged — documented, out of this change's scope |
| B2 | childless out-of-window root vanished | counted as `absentTaskCount` and named in the footer |
| B3 | rows past the slide bottom drawn off-page | paged at branch boundaries into `(continued)` chunks |
| C1 | oversized block let through onto a full chunk | only when genuinely alone; tables can no longer add pages |
| C2 | table rows under-measured by 18% | derived row height, per-cell wrap measurement |
| E  | comment-mode truncation unstated | "Comments (1 of 4)" in the heading |
| E  | dashboard tables drawn off the slide | cut to what fits, remainder counted in the footer |

**Still open, by design.** A3 (comments on a non-root task are not rendered) and
the estimate-not-measure limit of C2, for text blocks and for the dashboard
tables alike: their rows are measured against equal columns, which is what
pptxgenjs draws, while `jspdf-autotable` sizes columns by content and so ends its
table higher up the slide than the model reserved. Over-estimating cuts a row or
two more than the PDF strictly needs — the safe direction, and the same bias as
everywhere else here.

## The invariant, enforced

`npm run check:export` builds a deterministic 100-task, four-level plan
(`scripts/fixturePlan.ts`) across five scenarios — compact and full, every
comment mode, with and without a timeframe — and fails when:

- a task with `includeInExport !== false` reaches no slide *and* is not counted
  in an overview footer;
- a task excluded from export appears anyway, or a task is listed twice;
- a subtask row's parent is neither its section's title nor a row above it on the
  same slide (a level torn across a slide break);
- a row's drawn depth or indent disagrees with `buildDepthMap` / `subtaskRowIndent`;
- an overview bar's height is no rung of `BAR_HEIGHT_RATIO_BY_DEPTH`, or the bar
  is not centered on its row's center line (which is where the dependency
  connectors aim);
- a continuation is unlabelled, or a first section claims to be one;
- content is laid out past `CONTENT_BOTTOM_IN` — including a dashboard table,
  re-measured from the rows it actually drew rather than taken from the model;
- a dashboard table cuts rows without a footer note, or carries one having cut
  nothing;
- a hyperlink points at a missing slide, at a slide with no section for that
  task, or at anything other than where that task's subtree starts.
