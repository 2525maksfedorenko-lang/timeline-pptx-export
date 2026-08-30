# Codebase cleanup audit — phase 1, inventory only

Nothing in this document has been acted on. It is the list that phase 2 works
from, and the argument for why each line is on the list it is on.

**Baseline, recorded before anything was looked at** (branch `chore/codebase-cleanup`,
at `39a0f5d`): `tsc -b` clean, `oxlint src scripts` clean, and all six checks
green — `check:export`, `check:design`, `check:scale`, `check:colors`,
`check:csv`, `check:dates`. That is the bar phase 2 has to clear **without
editing a single check**.

## How this was produced

An import graph over all 88 `.ts`/`.tsx` files in `src/` and `scripts/`: every
relative import resolved to a file, every named binding recorded, reachability
walked from the two entry points (`src/main.tsx` and the six check scripts).
Then every exported symbol the graph called unreferenced was re-checked by
plain text search across `src/`, `scripts/`, `index.html`, both stylesheets,
`vite.config.ts` and `package.json`, so that a name reached only through a type
position, a re-export or a string is not mistaken for a dead one. Where the
verdict here says "dead", it means: no importer names it, and the identifier
does not appear anywhere outside the file that declares it.

Two counts worth having in front of you.

| layer | files | lines |
|---|---:|---:|
| `src/types` | 1 | 152 |
| `src/utils` | 20 | 1 369 |
| `src/store` | 3 | 790 |
| `src/import` | 6 | 999 |
| `src/export` | 13 | 5 144 |
| `src/gantt` | 23 | 4 430 |
| `src/components` | 13 | 2 035 |
| `App.tsx` + `main.tsx` | 2 | 211 |
| `scripts/` | 7 | 1 805 |

---

# A. Dead — nothing calls it, safe to delete

Ordered by how much goes with it. Everything here is unreachable from
`src/main.tsx` *and* from all six check scripts.

## A1. `src/store/peopleStore.ts` — 117 lines, and an IndexedDB database

The saved list of people a task could be assigned to. `usePeopleStore` (the
store, its own `openDB('timeline-pptx-export-people')`, `loadPeople`,
`addPerson`, `removePerson`, the eight-colour palette, the `color` backfill
migration) has **no caller anywhere**. Its own header comment points at "the
assignee picker in GanttRow.tsx" — a component that no longer exists.

One thing survives it: `scripts/fixturePlan.ts:15` imports the `Person`
**type** to shape its own fixture people. That is a type-only import of a
6-line interface; phase 2 either moves `Person` into the fixture or drops it
there, and nothing else in the repo notices.

**What deleting it costs:** nothing at run time. Worth recording, though: the
`timeline-pptx-export-people` IndexedDB database stays behind in the browser of
anyone who ever opened an older build. Deleting the module does not delete the
database — it only makes it unreachable, which is harmless, and nothing should
be written to reach it again.

## A2. The `ui` slice of `src/store/timelineStore.ts` — a second view store

`UiState` (`timelineStore.ts:24`) — `selectedItemId`, `zoomLevel`,
`editingItemId` — with `DEFAULT_UI` (:190), the `ui` field (:284), the three
setters `selectItem` / `setZoomLevel` / `setEditingItem` (:285–287), and the
four `ui: DEFAULT_UI` resets in the plan-switching paths (:418, :469, :521,
:545).

**Nothing outside `timelineStore.ts` reads or writes any of it.** The plan
screen answers all three questions from `useGanttViewStore` instead —
`selectedId`, `scale`, `renamingId`. This is the same state modelled twice, and
the copy that lost is still being maintained on every plan switch.

Not in `partialize`, so it is not in localStorage and removing it changes
nothing that is stored.

## A3. `src/components/MultiSelect.tsx` (215 lines) + `src/components/Switch.tsx` (39)

Design-system primitives transcribed for a UI that was never built.
`MultiSelect` imports `Switch`; nothing imports `MultiSelect`. They go together
or not at all.

They are *not* covered by `check:design`, whose only source-side input is
`systemUi.ts` — so deleting them does not weaken that check, and keeping them
does not strengthen it. `docs/design-system-map.md` mentions both; that mention
needs updating in the same commit as the deletion.

## A4. `src/utils/barColor.ts` — the superseded colour rule

`resolveBarColor` (:41) is the old "a bar's colour is its status, unless the
task names one". Colour is branch now (`src/utils/branchColors.ts`), and both
the screen and both exporters read it from there. The file's own comment still
describes the rule the app stopped following.

`docs/export-handoff-map.md` still cites `resolveBarColor`; that reference goes
stale with the file.

## A5. `src/utils/colorContrast.ts` — the same WCAG maths, twice

`contrastRatio` (:31) and `readableTextOn` (:50). The live copy of both is
private inside `src/gantt/barColor.ts` (`relativeLuminance`, `contrastRatio`,
and the pick in `barTextCss`), which arrives at the same answer from the same
two tokens. This file is also one of the two edges that make `src/utils`
depend on `src/export` — see the cycle section.

`docs/status-color-scale.md` cites it.

## A6. `src/utils/clampProgress.ts` — 5 lines

`clampProgress` (:3). No caller. Progress is written by `progressForStatus` now
and never by hand.

## A7. Dead exports inside living files

Each of these is an exported symbol with no reference outside its own file, in
a file that is otherwise alive.

| where | symbol | why it is dead |
|---|---|---|
| `src/utils/barNesting.ts:29,43,56,75` | `BAR_HEIGHT_RATIO_BY_DEPTH`, `barHeightRatio`, `BarVerticalGeometry`, `resolveBarGeometry` | The ratio ladder that used to shrink a nested bar. The slides use two flat constants now (`OVERVIEW_BAR_HEIGHT_IN` 26px / `OVERVIEW_NESTED_BAR_HEIGHT_IN` 20px, `slideLayout.ts:216`), the screen uses `geometry.ts`'s own `barHeight`. Only `labelIndent`, `MAX_LABEL_INDENT_STEPS` and `buildDepthMap` are still read from this file. `timelineExportModel.ts:1414` still *names* `BAR_HEIGHT_RATIO_BY_DEPTH` in a comment describing behaviour it no longer drives; `docs/export-coverage.md:74` and `docs/design-system-map.md:322` do the same. |
| `src/export/dateScale.ts:10,110` | `shiftIsoDate`, `formatMonthYear` | No caller. |
| `src/export/slideLayout.ts:259,409,412` | `COLUMN_TEXT_INSET_IN`, `COMMENT_TABLE_ROW_HEIGHT_IN`, `COMMENT_TABLE_HEADER_ROW_HEIGHT_IN` | `COLUMN_TEXT_INSET_IN` is a declaration and nothing else. The other two are a pair: the header constant is an alias of the row constant, nobody reads the alias, and the row constant's only reader *is* the alias. Both die together. (`pdfExporter.ts:494` names `COMMENT_TABLE_ROW_HEIGHT_IN` in a comment.) |
| ~~`src/export/timelineExportModel.ts:403,1358`~~ | ~~`getItemsInTimeframe`, `getCommentsForSlide`~~ | **Wrong — corrected during phase 2.** Both are called from inside their own file (`planOverview` at :436 calls the first, `buildExportSlides` at :1432 the second). They are over-exported, not dead, and deleting either would have broken the deck. See "Corrections" below. |
| `src/export/dateGrid.ts` | `MAX_VISIBLE_DAYS_FOR_DAY_LINES`, `MAX_VISIBLE_DAYS_FOR_WEEK_LINES` | Declared, used once each inside the file — see the over-exported list below; these two are borderline and belong there rather than here. |
| `src/gantt/rollup.ts:26` | `isGroup` | A third answer to "does anything call this its parent". The two live answers are `childrenOf(items, id).length > 0` (four call sites) and an inline `items.some(...)` (two). |
| `src/utils/newTask.ts:14` | `isCompleteTask` | No caller. |
| `src/utils/renderMarkdown.ts:37` | `toPlainSummary` | No caller. |
| `src/types/timeline.ts:54` | `TASK_STATUS_CHIP` | The pale chip the old task column wore. Dead; deleted. |
| ~~`src/types/timeline.ts:3,140`~~ | ~~`SortMode`, `Timeline`~~ | **Wrong — corrected during phase 2.** `SortMode` types `ExportOptions.sortMode`, and `Timeline` types `ExportOptions.scale`, both in the same file. Neither can go without changing `ExportOptions`, which is the plan file's own shape. Both are now marked category C instead. See "Corrections" below. |

**Rough total for category A: five whole files (474 lines), the `ui` slice
(~15), and ~115 lines of dead symbols inside living files — call it 600
lines, none of which any surface reaches.**

---

# B. Alive but orphaned — the code runs, nothing in the UI reaches it

These are *not* deletion candidates on this pass. Each is a feature with a
working implementation and no door, and each would take data or a check with it.

## B1. The Dashboard screen

`src/components/Dashboard.tsx` and everything it draws work. The only way in is
to type `?dashboardView=status` or `?dashboardView=delayed` into the address
bar: `App.tsx:36` reads that parameter once at startup and `activeTab` is
`useState` with no setter (`App.tsx:57`). Nothing in the app produces such a
URL any more — the deck's QR codes did, and they left with the screen they
opened (`e171b04`).

**What deleting it would break.** `src/utils/dashboardMetrics.ts` is *not*
orphaned with it: `getStatusSegments` feeds the deck's summary slide
(`timelineExportModel.ts:11`) and `getDelayedTasks` / `getDaysOverdue` feed the
deck's dashboard tables (`dashboardSlides.ts:2`), which `check:export` asserts
across 23 slides. So the screen can go; the metrics cannot. Removing the screen
is a product decision, not a cleanup one — **left for a separate ask.**

## B2. Focus mode — already gone, but its comments are not

There is no focus state anywhere: not in `timelineStore`, not in `viewStore`,
not in any component. What remains is four comments describing behaviour the
app no longer has, and one of them is actively misleading:

- `src/gantt/barColor.ts:89–90` — "the focused view promotes a sub-tree to the
  top level" — explains why `buildBarStyles` takes a whole-plan depth map. The
  reason it gives is gone; the parameter is still right for another reason
  (a collapsed group must not repaint its children).
- `src/App.tsx:48`, `src/gantt/GanttToolbar.tsx:43` — "narrows only by a fold
  or a focus". There is no focus.

Comment drift, not dead code. Fixing it costs nothing and is not a behaviour
change.

## B3. Model fields with no control that sets them

| field | who writes it | who reads it | no UI because |
|---|---|---|---|
| `progress` | `buildNewTask` (0), `progressForStatus` via the status control, sheet import, JSON import | `rollup.statusOf` (a group with a child over 0% is in progress), the CSV's Progress column | The progress slider was removed. It is now derived from status and never typed. |
| `assignee` | sheet import (`Assignee` / `Owner` column), JSON import | the CSV's Assignee column | The assignee picker went with `peopleStore` (A1). |
| `tags` | sheet import (`Tags` column), JSON import | the CSV's Tags column | Never had one. |
| `dependencies` | JSON import | `timelineStore.deleteTaskCascade` (:267) prunes links to deleted tasks, `branchPlan.copyBranch` (:51–58) remaps or drops them when a branch becomes a plan, and reports the drop as a plan notice | The links switch and the dependency connectors were removed from the chart. The data is still maintained correctly — it just is not drawn. |
| `milestone` | JSON import, validated only | **nobody** | Never drawn. |
| `group` | JSON import, validated only | **nobody** | Predates `parentId`. Superseded by it. |

**What deleting each would break at import.** This is the important column, and
it splits three ways.

1. **`progress`, `assignee`, `tags` — cannot be removed.** `src/export/planCsv.ts:43`
   writes all three as columns, and `scripts/checkCsvRoundTrip.ts` asserts a
   plan survives its own CSV including a task with `assignee: { name: 'Мария
   Иванова' }` and `tags: ['ui', 'needs review']`. Removing any of the three
   fails `check:csv` — which is exactly the signal that says they are load
   bearing. They belong in category C.
2. **`dependencies` — removable only by also removing behaviour.** The field is
   never drawn, but two code paths actively maintain it, and one of them
   *tells the user about it*: copying a branch into its own plan reports "N
   dependency links dropped" through `PlanNotice`. Deleting the field deletes
   that message. That is a behaviour change, so under this pass's own rule it
   is **written down and not done**.
3. **`milestone` and `group` — removable from the type without losing data, but
   read the mechanism first.** `validateTimelineItem`
   (`src/import/importTasks.ts:64`) ends with `return record as unknown as
   TimelineItem` — it *casts*, it does not pick fields. So an old file carrying
   `"milestone": true` or `"group": "Phase 1"` keeps those keys on the object in
   memory whether or not the interface declares them, and
   `exportPlanToJsonFile` writes them straight back out. **Removing the two
   fields from `TimelineItem` therefore loses nothing on a round trip.** What it
   *would* change, if the two validation branches (`importTasks.ts:30`, `:42`)
   went with them, is that a file saying `"milestone": "yes"` would be accepted
   silently instead of rejected with a message. Keeping the guards while
   dropping the type fields is possible — the validator indexes a
   `Record<string, unknown>` — but the pair then says two different things about
   the same key. Recommendation: **keep both, and mark them (category C).**

## B4. `src/export/exportCoverage.ts` — 572 lines that only a check calls

Not reachable from `src/main.tsx`. Its one importer is
`scripts/checkExportCoverage.ts`. It is the deck auditor: "the set of tasks with
`includeInExport !== false` equals the set of tasks present in the file". It is
correct and load bearing — it is simply test infrastructure that lives in
`src/` rather than beside the check that runs it. Moving it is a phase-2
boundary question, not a deletion.

## B5. `initializeStore` (`timelineStore.ts:205`)

Exported, and called only from inside its own file (:315). The export is
deliberate and documented in place: "kept as a standalone function, separate
from the store's closure, so a product integration can call a different
bootstrap (e.g. fetch the user's real plan from an API)". That is the
aicoo-core-dev seam this repo exists to prepare. **Keep the export, mark it.**

---

# C. Kept on purpose — mark in code so nobody deletes it next month

The point of this category is that everything in it *looks* like category A to
a reader with a call-graph tool and is not. Phase 2 should give each of these a
one-line marker in the source saying so, rather than relying on this document
being found.

| what | where | why it stays |
|---|---|---|
| `milestone`, `group` on `TimelineItem` | `types/timeline.ts:130,133` + `importTasks.ts:30,42` | File-format fields old plans carry. Nothing draws them; the validator is the only thing that names them, and its rejection message is real behaviour. See B3.3. |
| `dependencies` | `types/timeline.ts:132` | Carried by old files, maintained by the delete cascade and the branch copy, and the branch copy *reports* what it drops. See B3.2. |
| `progress`, `assignee`, `tags` | `types/timeline.ts:128,136,137` | Arrive by spreadsheet and JSON import, leave by CSV. `check:csv` asserts the round trip. No UI writes them and none is needed. |
| `initializeStore` | `store/timelineStore.ts:205` | The integration seam for a real backend. See B5. |
| `FALLBACK_BAR_STYLE` | `gantt/barColor.ts` | Already carries its own note: unreachable while the style map is built from the same list the rows are, kept because the exporter has the same fallback in the same colour. The note is the model for what the rest of this table needs. |
| `src/export/exportCoverage.ts` | whole file | Only `check:export` calls it. That is a check, not an absence of callers. |
| `Person` | `store/peopleStore.ts:10` | The one thing in A1 that has a live consumer (`scripts/fixturePlan.ts`). If A1 is deleted, this type moves rather than dies. |

---

# Separate lists

## Duplicates — two implementations of one thing

| # | the two | which is live | note |
|---|---|---|---|
| D1 | `src/components/ganttLayout.ts` (`BAR_HEIGHT_PX = 32`) vs `src/gantt/geometry.ts` (the whole plan-screen ladder) | both, for different pictures | Not a true duplicate any more — `ganttLayout.ts` is down to one constant and its header says so. It *is* misfiled: the constant is the **export's** reference bar height, its two readers are `ExportSettingsPanel` and `checkExportCoverage`, and neither is a component. It belongs in `src/export/`. |
| D2 | `src/utils/barColor.ts` (`resolveBarColor`) vs `src/utils/branchColors.ts` (`buildBranchColors`) | branchColors | Two answers to "what colour is this bar". The loser is dead (A4). |
| D3 | `src/utils/colorContrast.ts` vs the private `contrastRatio` / `relativeLuminance` in `src/gantt/barColor.ts` | the private pair | Same WCAG formula written twice, to four decimal places of agreement. The loser is dead (A5). |
| D4 | the `ui` slice of `timelineStore` vs `gantt/viewStore` | viewStore | Selection, zoom and "which row is being edited", modelled twice. The loser is dead (A2). |
| D5 | `src/gantt/rollup.ts` (`childrenOf`, `isGroup`, `isSubtask`, `statusOf`) + `src/gantt/rows.ts` (`visibleRows`) vs `src/utils/taskHierarchy.ts` (`buildTaskHierarchy`) | both | Not dead, and not simply redundant: `taskHierarchy` builds a tree once, `rollup` answers one question at a time with an O(n) scan, and `visibleRows` walks the tree again with a `collapsed` map on top. Same relation, three traversals. Merging them is a **behaviour-preserving but non-trivial** refactor — it changes the shape of the plan screen's row model. **Flagged, not scheduled.** |
| D6 | "is this a group?" | — | Five spellings: `rollup.isGroup` (dead), `childrenOf(...).length > 0` (`GanttScreen:576`, `EditTaskPanel:112`), `items.some(c => c.parentId === id)` (`GanttScreen:449`), `items.filter(i => items.some(c => c.parentId === i.id))` (`GanttToolbar:82`), and `GanttRowModel.isGroup` (`rows.ts:12`, the one that is actually passed around). Cheap to collapse onto the last. |
| D7 | `ExportOptions` / `ExportTimeframe` | `types/timeline.ts` | Declared in `types/`, re-exported by `store/timelineStore.ts:22` "for convenience". Five files import them from the store, one (`checkExportCoverage.ts:37`) from `types/`. This aliasing is what creates the module cycle — see below. It is the single highest-value line in this document. |

## Files nobody imports

Five, all covered above: `src/components/MultiSelect.tsx`,
`src/components/Switch.tsx`, `src/utils/barColor.ts`,
`src/utils/clampProgress.ts`, `src/utils/colorContrast.ts`.

Two more are reachable but not from the app: `src/store/peopleStore.ts` (only a
fixture's type import) and `src/export/exportCoverage.ts` (only a check).

## Exports with no importer

**Dead** — listed in A7 above.

**Over-exported but internally used** — these are *not* dead; each is read
inside its own file and merely does not need the `export` keyword. Dropping the
keyword is free and makes the next audit's dead-list honest. Listed for
completeness, low priority:

`slideLayout.ts` — `PX_PER_IN`, `FRAME_X_IN`, `LEGEND_MARGIN_TOP_IN`,
`CARD_MARGIN_TOP_IN`, `COLUMN_HEADER_LINE_GAP_IN`, `ROWS_AREA_HEIGHT_IN`,
`TASK_CELL_INDENT_STEP_IN`, `DETAIL_ROW_INDENT_IN`, `COMMENT_TABLE_LINE_HEIGHT_IN`
· `dateGrid.ts` — `MAX_VISIBLE_DAYS_FOR_DAY_LINES`, `MAX_VISIBLE_DAYS_FOR_WEEK_LINES`,
`getVisibleGridLevels` · `gantt/scale.ts` — `CANVAS_PAD_MONTHS` ·
`gantt/barColor.ts` — `barFillCss`, `barTextCss`, `barRingCss` ·
`utils/barNesting.ts` — `LABEL_INDENT_RATIO` · `utils/normalizeStatus.ts` —
`STATUS_HINT` · `utils/sortItemsForExport.ts` — `STATUS_SORT_ORDER` ·
`types/timeline.ts` — `TASK_STATUS_SCALE`.

A caveat on `slideLayout.ts`: that file reads as a published spec sheet for the
deck's geometry, and exporting a constant nobody imports *yet* is a defensible
thing for a spec sheet to do. Recommendation is to leave it alone and only
delete the three that are genuinely unreachable (A7).

**Exported types used only as their own file's return shape** — 39 of them
(`PlanRange`, `TaskHierarchy`, `ScrollPanes`, `ImportedTasks`, `LoadedPlans`,
`DashboardKpis`, …). These are correct as they are: a function's public return
type has to be nameable by its callers. Not a finding; recorded so the next
person running the same tool does not re-raise them.

## Dependencies in `package.json` with no use

**None.** Every runtime dependency has at least one importer:

`idb` (2) · `jspdf` (1) · `jspdf-autotable` (1) · `lucide-react` (14) ·
`marked` (1) · `pptxgenjs` (1) · `react` (21) · `react-dom` (2) · `xlsx` (1) ·
`zustand` (3).

`idb` is the one worth a second look — half its usage is `peopleStore` (A1).
After that deletion it is down to `planStorage.ts` alone, which is still a real
use. It stays.

Two things noticed while counting, neither a cleanup item:

- `npm audit --omit=dev` reports 3 high-severity advisories, all transitive or
  unfixable on npm: `xlsx` (prototype pollution + ReDoS, "no fix available" —
  SheetJS publishes to its own registry now) and `image-size` via `pptxgenjs`
  (two DoS parsers; the offered fix downgrades `pptxgenjs` to 1.1.5, which is a
  breaking change). Both are worth a decision before this code moves into a
  product; neither is this pass's business.
- The dev dependencies are all build tooling and none is imported by `src/`,
  which is the right shape.

---

# Portability into aicoo-core-dev

## Layer dependencies, and the cycles

Folder-level edges, as they actually are:

```
main.tsx → App.tsx → gantt, components, export, import, utils, store
components → store, export, utils, types, import
gantt       → components, store, utils, types, export
import      → types, utils, store
export      → types, utils, store
store       → types, utils
utils       → types, export, store
types       → (nothing)
```

**One strongly-connected component: `export ↔ utils ↔ store`.** And one
file-level cycle inside it: `store/planStorage.ts ↔ store/timelineStore.ts`.

The cycle is smaller than it looks. Here is every edge that creates it, with
what actually travels along it:

| edge | files | what crosses |
|---|---|---|
| `export → store` | `pdfExporter.ts:4`, `pptxExporter.ts:2`, `timelineExportModel.ts:1` | `type ExportOptions` — **nothing else** |
| `utils → store` | `normalizeExportOptions.ts:1` | `type ExportOptions` — nothing else |
| `store → store` | `planStorage.ts:5` | `type ExportOptions` — nothing else |
| `utils → export` | `colorContrast.ts:1` | `COLORS`, `withHash` — **from a dead file (A5)** |
| `utils → export` | `dashboardMetrics.ts:1` | `MS_PER_DAY` |
| `store → utils` | 4 files | real work: normalisation, plan notices, branch copy, hierarchy |
| `export → utils` | 7 files | real work: depth map, hierarchy, markdown, metrics, colours, sort |

So four of the seven edges carry **one type alias that is not even declared
where it is being imported from**. `ExportOptions` and `ExportTimeframe` live in
`src/types/timeline.ts:96,101`; `store/timelineStore.ts:22` re-exports them
"for convenience", and five files took the convenience. Changing those five
import lines to point at `types/` deletes `export → store`, `utils → store` and
the `planStorage ↔ timelineStore` file cycle outright. `checkExportCoverage.ts:37`
already imports them from `types/`, so this is a proven path, not a proposal.

What is left after that is `utils ↔ export`, held up by two edges: the dead
`colorContrast.ts`, and `dashboardMetrics.ts` reaching into `export/dateScale.ts`
for `MS_PER_DAY`. Delete the first, move the date primitives out of `export/`,
and the graph becomes acyclic with `types` at the bottom and no layer above
`export` except the UI.

**Verdict: the cycle is real but shallow — four import lines and one misplaced
constant, not a tangle.**

## What is tied to the environment

Searched for hardcoded hosts, absolute paths, browser globals outside
components, and build-tool coupling.

- **Hardcoded domains or URLs: none.** No `http://`, no `.com`, no `localhost`
  anywhere in `src/`.
- **Absolute asset paths: one.** `GanttToolbar.tsx:263` loads `/aicoo-logo.svg`
  from `public/`. A host app that serves the bundle from a sub-path would break
  it. One line.
- **`import.meta`, `process.env`, `NODE_ENV`, Vite-only import suffixes
  (`?url`, `?raw`, `?worker`): none.** The only Vite coupling in the whole
  source tree is `"types": ["vite/client"]` in `tsconfig.app.json` and the two
  CSS imports in `main.tsx`/`index.css` that Tailwind's Vite plugin resolves.
  That is a build-config coupling, not a source one — the modules themselves
  would compile under any bundler.
- **DOM and browser globals outside `src/components` and `src/gantt`:**

  | where | what | portable? |
  |---|---|---|
  | `main.tsx` | `document.getElementById('root')` | the mount point; expected |
  | `App.tsx:37` | `window.location.search` | reads `?dashboardView`; goes with B1 |
  | `utils/useIsMobile.ts` | `window.matchMedia` | a hook, already guarded for a non-browser context |
  | `utils/useFocusTrap.ts` | `document.activeElement`, `document.addEventListener` | a hook; belongs in `components/` more than in `utils/` |
  | `export/planCsv.ts:145–154` | `URL.createObjectURL`, `document.createElement('a')`, `link.click()` | **the one real leak** — `buildPlanCsv` (:112) is pure and `downloadPlanCsv` (:145) is a browser download stapled to the same file |
  | `import/planJson.ts:10–19` | the same download dance | same shape |
  | `export/pdfExporter.ts:844`, `export/pptxExporter.ts:919` | `doc.save()` / `pptx.writeFile()` | the libraries' own browser save; a host app wanting a Blob would need a second entry point |
  | `store/*`, `utils/newTask.ts`, `utils/branchPlan.ts`, `import/sheetImport.ts` | `crypto.randomUUID()` | a standard global in browsers and Node ≥ 19; the check scripts already run it under jiti |

  Nothing outside those. In particular `src/export/` contains **no** `document`,
  `navigator`, `localStorage` or `fetch` beyond `planCsv`'s download helper.

- **Clock reads inside otherwise-pure code:** `dateScale.ts:122` (`getDateRange`
  falls back to `new Date()` for an empty plan). Everything else takes `today`
  as a parameter on purpose — `buildExportSlides(…, today = new Date())`,
  `buildDashboardSlides(items, now)` — which is what lets `check:export` pin a
  date. One inconsistency, in the least important branch.

## How independent the data model is

`src/types/timeline.ts` **imports nothing at all.** 152 lines, zero
dependencies, no React, no store, no DOM. It is the most portable file in the
repo and would drop into another codebase unchanged.

One qualification, and it is not a small one: the file is React-free but not
*presentation*-free. `TASK_STATUS_SCALE`, `TASK_STATUS_COLORS`,
`TASK_STATUS_CHIP` and `TASK_STATUS_LABELS` put a palette and an English label
set in the same module as the domain shape. A host product with its own design
tokens and its own localisation inherits four things it will want to replace,
and it cannot take `TimelineItem` without them. Splitting the shape from its
presentation is a genuine portability improvement — and `TASK_STATUS_CHIP` is
dead already (A7), which is a quarter of the problem gone for free.

The store is a thin layer above it: `TimelineStore` is state plus setters plus
IndexedDB persistence, with the domain rules (`normalizePlanItems`,
`breakParentCycles`, `copyBranch`, `getDescendantIds`) already living outside it
in `utils/`. That is the right split and it is already made.

## How independent the export is from the screen

The boundary is **clean in the direction that matters**: nothing in
`src/export/` imports anything from `src/components/` or `src/gantt/`. Verified
across all 13 export files. The deck can be built with no UI present, which is
what `check:export` does 23 slides at a time.

The leaks all run the other way — the UI reaching into `export/` for things
that are not about exporting:

| module | what the screen takes | is it export-specific? |
|---|---|---|
| `export/dateScale.ts` | `daysBetween`, `MS_PER_DAY` (`gantt/scale.ts:2`), `formatShortDate` (`Dashboard`, `ImportModal`), `getDateRange`, `firstDayOfMonthIso`, `lastDayOfMonthIso` (`ExportSettingsPanel`), `buildExportFilename` (`App.tsx`) | **No.** Ten of its fourteen exports are generic date arithmetic. Only `buildExportFilename` and the `BASE_PX_PER_DAY` / `getItemBar` / `ItemBar` group are the deck's. |
| `export/theme.ts` | `COLORS` (`gantt/barColor.ts:1`, `Dashboard.tsx:3`), `withHash` | **Partly.** The screen needs exactly two entries — `textOnFill` and `textOnSurface` — to pick a readable label on a bar. The other twenty are the deck's chrome. |
| `export/timelineExportModel.ts` | `type ExportMode` (`ExportOverflowModal`), `planOverview`, `getExportOverviewItems` (`App.tsx`) | **Yes**, correctly. The overflow modal asks a question only the export can answer. |

And the three modules the two sides genuinely share:

- **`utils/barNesting.ts` — correct, and smaller than it looks.** After A7 it is
  three symbols: `buildDepthMap` (screen + both exporters + two checks — a real
  shared rule), and `labelIndent` + `MAX_LABEL_INDENT_STEPS` (export only, plus
  `ExportSettingsPanel`, which draws the export's own task list). The comment at
  the top claiming it is "shared by the on-screen chart and both exporters" is
  now only two-thirds true: the chart takes the depth map and nothing else.
- **`export/slideLayout.ts` — correct.** Six importers, all inside `src/export/`
  or its check. No UI file touches it. This one is right.
- **`components/ganttLayout.ts` — misfiled.** One constant, `BAR_HEIGHT_PX = 32`,
  described by its own header as "the bar ladder the *export* surface is
  measured against", read by `ExportSettingsPanel` and `checkExportCoverage`.
  It is export geometry sitting in the components folder because that is where
  it was when it meant something else.

**Verdict: the border is drawn in the right place and pointing the right way.
The three crossings are one shared rule (`buildDepthMap`), one generic utility
filed under the wrong roof (`dateScale`), and one constant left behind by a
rewrite (`ganttLayout`).**

## Portability score

Same rubric as the previous audit, which scored **3.5 / 5**.

| dimension | score | why |
|---|---:|---|
| Data model independence | **4.5 / 5** | `types/` imports nothing. Loses half a point for carrying a palette and English labels. |
| Layer boundaries and cycles | **3 / 5** | One SCC and one file cycle — but four of the seven edges are a single type alias imported from the wrong module. Shallow, and cheap to fix. |
| Export ↔ screen separation | **4 / 5** | Nothing in `export/` reaches into the UI. Loses a point for two generic modules (`dateScale`, `theme`) living under `export/` and being imported by six UI files. |
| Environment coupling | **4 / 5** | No hosts, no paths, no `import.meta`, no env vars. Loses a point for the two DOM download helpers mixed into pure modules and the one absolute asset path. |
| Module hygiene | **3 / 5** | Five orphan files, ~450 dead lines, four live/dead pairs of the same idea. Nothing is broken; there is simply more here than the app uses. |
| **Overall** | **3.7 / 5** | Up from 3.5. The model and the export/screen border improved; the cycle and the dead weight are what is holding it back, and both are on this list. |

## The five edits with the most effect

In this order. The first is worth more than the other four together.

1. **Import `ExportOptions` / `ExportTimeframe` from `src/types/timeline.ts`,
   not from `src/store/timelineStore.ts`.** Five import lines:
   `export/pdfExporter.ts:4`, `export/pptxExporter.ts:2`,
   `export/timelineExportModel.ts:1`, `utils/normalizeExportOptions.ts:1`,
   `store/planStorage.ts:5`. Then drop the re-export at `timelineStore.ts:22`.
   This alone deletes the `export → store` edge, the `utils → store` edge and
   the `planStorage ↔ timelineStore` file cycle. Type-only; zero runtime effect.
2. **Move the generic date arithmetic out of `src/export/dateScale.ts`** into a
   neutral module (`src/utils/dates.ts`), leaving `buildExportFilename`,
   `BASE_PX_PER_DAY` and `getItemBar` behind as the deck's own. Removes the
   `utils → export` edge, the `gantt → export` edge and three of the five
   `components → export` edges. With edit 1 and the deletion of
   `colorContrast.ts`, the import graph becomes acyclic.
3. **Delete category A.** Five files and the `ui` slice: `peopleStore.ts`,
   `MultiSelect.tsx`, `Switch.tsx`, `utils/barColor.ts`,
   `utils/colorContrast.ts`, `utils/clampProgress.ts`, plus the A7 symbols.
   ~600 lines, no behaviour, and it removes one of the two `utils → export`
   edges as a side effect.
4. **Split the two colour concerns in `src/types/timeline.ts`** — keep
   `TaskStatus`, `TimelineItem`, `ExportOptions`, `TaskComment`,
   `getTaskStatus`; move `TASK_STATUS_SCALE` / `TASK_STATUS_COLORS` /
   `TASK_STATUS_LABELS` to a presentation module (and delete
   `TASK_STATUS_CHIP`, which is dead). The domain shape then travels without a
   palette or an English string attached.
5. **Separate "build the file" from "hand it to the browser."**
   `planCsv.buildPlanCsv` / `downloadPlanCsv` are already split inside one file;
   do the same for `planJson` and give `pptxExporter` / `pdfExporter` a
   Blob-returning entry point beside their `writeFile` / `save` ones. A host app
   embedding this then gets the bytes and decides what to do with them, which
   is the difference between "portable" and "portable if you are in a browser".

Runners-up, not in the five: move `components/ganttLayout.ts` into
`src/export/`; move `utils/useFocusTrap.ts` into `components/`; collapse the
five spellings of "is this a group" (D6) onto `GanttRowModel.isGroup`.

---

---

# Corrections to this document, found while acting on it

Four rows of the A7 table were wrong, all in the same way and from the same
mistake. The tool that produced the list reported, for every exported symbol,
both "referenced outside its own file" and "mentions inside its own file". The
first column is what "dead" was defined as here, and it was right every time.
The second column is what separates *dead* from *merely over-exported*, and for
four rows the prose was written from the first column alone.

| symbol | what it actually is | if it had been deleted |
|---|---|---|
| `getItemsInTimeframe` | called by `planOverview` in the same file (:436) | the overview would stop windowing to the export timeframe — `check:export` fails |
| `getCommentsForSlide` | called by `buildExportSlides` in the same file (:1432) | no comment reaches any appendix slide — `check:export` fails |
| `SortMode` | types `ExportOptions.sortMode` (:98) | does not compile |
| `Timeline` | types `ExportOptions.scale` (:83) | does not compile |

Each was caught by re-reading the symbol before removing it, which is why
phase 2 checks by hand rather than trusting the list. Nothing was deleted on
the strength of the table alone. `SortMode` and `Timeline` are now marked in
`types/timeline.ts` as category C, beside the `ExportOptions` fields they
describe.

One item was *added* to the deletion list, and it did not come from the audit:
removing the Dashboard screen made `getDashboardKpis` and `DashboardKpis`
(`utils/dashboardMetrics.ts`) dead, since the deck's dashboard slides use
`getDelayedTasks` and `getDaysOverdue` and never asked for the KPI numbers. The
module stays — it feeds the slides, which is why it was never an orphan — but
the two symbols the screen alone used went with the screen.

# Phase 2, as three branches

Proposed split, smallest blast radius first. Each ends with all six checks
green and no check edited.

1. **`chore/remove-dead-code`** — **done.** Seven files deleted (the five
   orphans, plus `Dashboard.tsx` and its `?dashboardView` plumbing in
   `App.tsx`), the `ui` slice, and the A7 symbols that survived being re-read.
   `GanttToolbar`'s `showTimelineControls` prop went with the Dashboard: with
   one screen left it could only ever be `true`. `Person` moved into
   `scripts/fixturePlan.ts`, its only consumer. Category C markers added to
   `TimelineItem`'s six fields, `SortMode`, `Timeline`, `initializeStore` and
   `exportCoverage.ts`; the focus-mode comment drift fixed; four documents
   updated. Result: **81 files (was 88), zero orphans, zero unreachable
   modules**, all six checks green with no check edited.
2. **`chore/remove-duplication`** — D1 through D4 are resolved by branch 1;
   this branch is D6 (one spelling of "is this a group") and the stale comments
   from B2. D5 (`rollup` / `rows` / `taskHierarchy`) is **out of scope** — it
   cannot be done without reshaping the plan screen's row model, which is
   refactoring logic, not cleaning up.
3. **`chore/module-boundaries`** — edits 1, 2 and 4 from the list above, plus
   moving `ganttLayout.ts` and `useFocusTrap.ts`. Ends with a proof: the same
   import-graph script, re-run, reporting zero cycles. (After branch 1 the graph
   still reports the one file cycle and the one folder cycle — untouched on
   purpose, since neither is dead code.)

Edit 5 (Blob entry points) is a new API surface, not a cleanup. It is left for
its own ask.

## What this pass will not do, and why

- **`dependencies` stays.** Removing it deletes the "N dependency links dropped"
  notice a branch copy raises. That is behaviour.
- **The Dashboard stays.** Removing a whole screen is a product decision, and
  its metrics module is load bearing for the deck either way.
- **`rollup` / `rows` / `taskHierarchy` stay as three traversals — known, and
  deliberately deferred.** `taskHierarchy.buildTaskHierarchy` builds the parent
  tree once; `rollup` answers one question at a time with an O(n) scan over the
  flat list (`childrenOf`, `isSubtask`, `statusOf`); `rows.visibleRows` walks the
  same relation a third time, with a `collapsed` map on top, to produce
  `GanttRowModel`. Three traversals of one relation, and all three are correct.

  Merging them is not a cleanup. `GanttRowModel` is what every row on the plan
  screen is drawn from — `depth`, `isGroup`, `childCount`, `isSubtask`, `status`
  — and rebuilding it on top of `TaskNode` changes the shape the list, the bars,
  the context menu and the create/rename paths all read. That is reshaping the
  screen's model, which is logic, not dead weight. It stays on the list as a
  known duplication with a named cost, and it is not scheduled.
- **`slideLayout.ts`'s over-exported constants stay exported.** The file is a
  spec sheet; only the three genuinely unreachable ones go.
