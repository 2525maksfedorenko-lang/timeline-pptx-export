# timeline-pptx-export — handover

What this is, how to run it, what to look at. Read this first.

## In short

A Gantt-chart planner prototype whose point is **turning a plan into a
presentation**: `.pptx` (PowerPoint) and `.pdf`, plus CSV and JSON. The problem
it exists to solve is not the plan screen itself but what comes out of it — a
slide you can actually show: a correct date grid, labels that fit inside the
bar, status colours, wrapping, Cyrillic in the PDF.

It ships in two places, from one source. It is a **standalone project** with
its own repository, and it is also checked into the aicoo website repository at
`tools/timeline-pptx-export/`, where the built bundle under
`public/tools/timeline-pptx-export/` is what the Tools page's
"Timeline → PowerPoint" card opens. See `docs/website-integration.md` for how
that fits together and what has to be rebuilt when this app changes.

It is not part of the website's build. The end goal is for
this logic to be absorbed into the main aicoo product (`aicoo-core-dev`), not
for the prototype to grow into an application. That is why the layers are kept
apart: they are meant to be lifted out one at a time.

There is no server-side data at all. Plans live in the browser's IndexedDB
(`store/planStorage.ts`), there is no backend, and no environment variables are
needed (`.env.example` is empty). `docs/db-schema.sql` is a **proposal** for a
future server-side schema, not something the app connects to.

## Running it

Needs Node 20+.

```bash
npm install
npm run dev          # http://localhost:5176
npm run build        # tsc -b && vite build → dist/
npm run build:embed  # the same build, based at /tools/timeline-pptx-export/
npm run preview      # serve the build
npm run lint         # oxlint
```

`build:embed` is the one the website needs: the site serves this app from a
sub-path, so every asset URL has to carry that prefix. A plain `npm run build`
produces a bundle whose assets are rooted at `/`, which 404s a level up when
it is served from `public/tools/timeline-pptx-export/`.

Port 5176 is pinned in `vite.config.ts` (`strictPort`) and a cloudflared
tunnel is attached to it, so it belongs to whoever is running the project.
A second server, for verification runs, goes on 5180:
`npm run dev -- --port 5180 --strictPort`.

## Five-minute tour

1. `npm run dev`, open the plan screen.
2. Add a couple of tasks and drag a bar — the dates move; nesting and parent
   progress roll up on their own (`gantt/rollup.ts`).
3. **Export → PPTX**. You get a deck: an overview slide with the timeline plus
   per-task slides. Same via **PDF**, which is also where Cyrillic gets
   exercised.
4. With more tasks than fit on the overview slide, the app asks whether to
   truncate to one slide or page across several (`ExportOverflowModal`).
5. **Import** accepts XLSX/CSV and a previously exported JSON file.

## How it is put together

The layers are deliberately separate — each one travels on its own.

| Directory | What's inside |
| --- | --- |
| `src/types/` | data shapes (`TimelineItem`, `ExportOptions`, the status scale) |
| `src/store/` | zustand plan store + IndexedDB persistence |
| `src/gantt/` | the plan screen: task list, timeline, dragging, editing |
| `src/export/` | the `.pptx` / `.pdf` / CSV generators — pure logic, no React |
| `src/import/` | XLSX / CSV / JSON parsing and import staging |
| `src/utils/` | pure transforms (dates, hierarchy, colours, sorting) |
| `src/components/` | shared UI pieces (menus, modals, flyouts) |
| `scripts/` | the check scripts (below) |
| `design-system/` | a local copy of the aicoo design system — **reference material, not app source**; excluded from `tsc -b` and from the linter |
| `docs/` | this file and the decision write-ups |

The export entry points are `exportTimelineToPptx` / `exportTimelineToPdf`.
They take an array of tasks plus options and know nothing about React.

## Checks

There is no test runner. In its place is a set of check scripts, each failing
with a readable message. To run them all:

```bash
npm run build        # types
npm run lint
npm run check:export # every field of the model reaches a slide
npm run check:design # classes match the design system
npm run check:scale  # the date scale: days / weeks / months
npm run check:colors # on-screen status colours == deck colours
npm run check:csv    # CSV round-trip
npm run check:dates  # date edits commit correctly
```

## Where to read next

- `CLAUDE.md` — project rules: scope discipline, UI expectations, ports.
- `docs/design-system-map.md` — how the project maps onto the design system and
  where it deliberately departs from it (the plan screen follows a design
  handoff instead).
- `docs/export-handoff-map.md` — exactly what lands on a slide and where it
  comes from.
- `docs/export-coverage.md`, `docs/export-sort.md`,
  `docs/status-color-scale.md` — narrower write-ups on the export.
- `docs/cleanup-audit.md` — the state of the code and known rough edges.
- `docs/nesting-depth.md` — why the screen creates two levels and import
  accepts any.
- `docs/website-integration.md` — how this app reaches the aicoo website, why
  the built bundle is committed there, and what to rebuild when this changes.

## Things worth knowing before you change something

- **Two storage layers, on purpose.** localStorage mirrors the active plan so
  the first frame paints before IndexedDB has opened; IndexedDB is the durable
  record of the list of plans. `startAutosave` in `store/timelineStore.ts`
  keeps them level — debounced a second after the last edit, flushed on
  `pagehide` and on `visibilitychange`. That debounce-and-flush pair is
  deliberately the shape a backend will want, and `flushedActivePlan` is
  already the payload builder.
- **A comment belongs to a plan.** `SavedPlan.comments`. Records written
  before that carried none, and `adoptLooseComments` hands the old flat list
  to the plans it was about, once, partitioned by task id.
- **Dates commit when the edit ends**, not on every value that parses — a
  half-typed year is a real date and would send the canvas back to the year 2.
  See `gantt/dateEdit.ts` and `gantt/DateField.tsx`.
- **The plan screen creates two levels** and no more; import accepts any depth.
  That is a decision, not a gap — `docs/nesting-depth.md` says why.
- **On a phone** the task list is a drawer and the Edit Task panel is the whole
  screen, so opening the panel closes the drawer: they cannot both have it.
