# Export sort order

How tasks are ordered on the exported slides, and why it differs from the app.

## There is one order, and nothing chooses it

The export settings used to offer four sort modes — status, start date, parent
group, progress — in a "Sort by" dropdown. That control is gone, and with it the
three flat modes: only the status order below ever rebuilt the tree, and the
other three sorted the plan as a flat list, which puts a subtask's bar somewhere
other than under its parent's on the Overview.

So `sortItemsForExport(items)` takes no mode, `src/utils/sortItems.ts` (the flat
sorter it used to delegate to) is deleted, and every deck this app writes —
PPTX, PDF, and the dashboard slides built from the same ordered list — is drawn
in the order described here.

`ExportOptions.sortMode` stays in the plan file. A plan saved with
`"sortMode": "date"` still says so, still opens, still round-trips; nothing
reads it. That is the same treatment `showProgress` and `showDependencies`
already had — see the note on the interface in `src/types/timeline.ts`.

## The order

`STATUS_SORT_ORDER` in `src/utils/sortItemsForExport.ts`:

```
done → in_progress → todo
```

Reordering the deck is a one-line edit to that array. Nothing in the slide
layout reads it — the layout only consumes the already-ordered list.

Within one status the tie-break is **start date ascending, then label
alphabetically, then id**. The id is not decoration: without it, items agreeing
on status, start and label would keep whatever order the input array happened to
have, so a store reload or a re-import could change the slide while the data
stayed the same — and regression screenshots would be comparing noise.

## It is hierarchical, not flat

The tree is rebuilt from `parentId`, every level is sorted, and the result is
flattened depth-first. So a parent carries its whole subtree, a child never rises
above its own parent, and a child never lands between another parent's children.

Sorting the flat list would scatter subtasks away from their parents, which is
exactly why the three flat modes went rather than being kept as options.

**Where this is actually visible.** Both slides, and for the same reason.
`buildTaskHierarchy` preserves the input's relative order at each level, and
since the Overview began drawing every task rather than only the roots
(`getExportOverviewItems`, see docs/export-coverage.md A2) the depth-first
flattening is what puts a subtask's bar directly under its parent's instead of
somewhere else on the slide. Concretely:

- Overview: root order follows `STATUS_SORT_ORDER`, and each root is
  immediately followed by its own subtree's bars in the sorted child order.
- Subtasks & Comments: parent sections follow the same root order, and each
  parent's subtask rows follow the sorted child order.

This is also what the flat modes used to break: `'date'` and `'progress'`
ordered the list without regard to the tree, so a subtask's bar could land far
from its parent's on the Overview. Removing the control removed that failure
mode with it.

## What status order costs a long plan

> **Superseded.** Everything below described a deck where each overview slide
> took its date window from its own tasks. That is no longer how the deck
> works: **every overview slide is drawn against one window, the whole plan's**
> — see `buildOverviewAxes` and Phase 5 of docs/export-handoff-map.md. The
> measurements are kept because they are the evidence behind a decision the
> customer then reversed, and because they say something that is still true
> about long plans. Read them as history, not as behaviour.

Sorting by status pulls tasks from both ends of the timeline onto the same
slide, and that had a measurable price when a slide's window came from its own
tasks. Measured then on a 2.8-year plan — 249 tasks, 50 roots, 1036 days, five
overview slides:

| sort mode (both existed then) | per-slide windows | share of the plan | a 46-day bar |
| --- | --- | --- | --- |
| `date` | 256, 292, 262, 240, 86 days | 8–28% | 0.828in |
| `status` | 982, 756, 980, 771, 67 days | **73–95%** | 0.246in |

The reading at the time: under `status` four of the five slides already spanned
nearly the entire plan, the widest window set the density for all of them, and
the same task was drawn 3.4× shorter than in date order. What per-slide windows
bought `status` order was that bars started at the left edge rather than
somewhere in the middle, and that each slide's captions named its own months.

**What the shared window changes.** The axis no longer depends on the sort at
all: every slide spans the whole plan whatever order the tasks arrive in, so
the `date` column of that table is now the `status` column — a 46-day bar is
0.246in either way. Sort order still decides *which* tasks share a slide and in
what sequence; it no longer decides how wide anything is drawn.

**Practical reading, restated:** a plan much longer than a year is compressed
on every overview slide, in every sort mode. That is the price of one axis, and
it was accepted knowingly. If a deck needs resolution rather than
comparability, the lever is the export timeframe — a narrower window the reader
chooses — not the sort mode.

The alternative once considered — paginating the overview by date band and
sorting by status *within* each band — would have given every slide a tight
window. It is doubly moot now: it changes pagination rather than the axis, it
would break the deck-level `done`-block-first reading this document describes,
and the deck has since chosen one axis on purpose.

## A `done` parent with an open child

Ranking uses the parent's *own* `status`, never one derived from its children:
the status is a fact the user set, and inferring it would silently overrule them.

That does mean a parent marked `done` leads the deck while still holding, say, a
`todo` subtask. Checked on a real export, this does **not** read as a
contradiction, for two reasons:

1. On the Overview slide the child is not drawn at all, so nothing is juxtaposed.
2. In the appendix the parent appears as a section *heading* — its own status is
   not printed next to it — above subtask rows that each carry their own status.
   A reader sees "Rollout DACH → Customs docs: done, Site survey: to do", which
   is a list of facts, not a claim that the open child is finished.

What it does do is surface a data inconsistency more prominently than before,
since `done` parents now lead. That is arguably useful, but it is a behaviour
change worth knowing about: if a parent's status is stale, the export now puts it
first.

## The export order is not the screen order

The plan screen does not sort at all: `visibleRows` walks the tree in the plan's
own order, so a task sits where it was put and a drag moves dates rather than
rows. The deck sorts, and leads with `done`.

This is deliberate and was specified: a deck is read as a report of what is
finished, the app is a working view of what is still open. The cost is the one
worth stating plainly — **the order you see on screen is not the order you get
in the file**, and there is no longer a setting that could make them agree.

## Dependency connectors

Removed. The slides drew elbow connectors between a predecessor's bar and its
successor's, and status ordering made them long and diagonal — the reason this
section used to describe how they were clamped into the timeline zone. Neither
the plan screen nor the deck draws them any more; `dependencies` remains on the
item, and nothing renders it.
