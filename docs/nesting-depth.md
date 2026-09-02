# How deep a plan nests, and why the screen stops at two

Two rules, and they are deliberately not the same rule:

- **This screen creates two levels.** A task, and sub-tasks under it. A
  sub-task offers no way to take a sub-task of its own.
- **A file may carry any number.** Import, drawing, editing, and both
  exporters handle whatever depth a plan arrives with, and always have.

Neither is a gap waiting to be filled in. This document exists so that the
missing "+" on a sub-task row reads as an answer rather than as a to-do.

## Why the screen stops at two

The client asked for it. The reason it is a reasonable thing to ask for is
that a plan made here is made **to be presented**, and neither surface that
presents it draws a third level as a distinct one:

- On a slide an overview bar has exactly two heights,
  `OVERVIEW_BAR_HEIGHT_IN` and `OVERVIEW_NESTED_BAR_HEIGHT_IN`
  (`src/export/slideLayout.ts`). Depth past the first nested level reuses the
  nested height. The label's indent does keep stepping — up to
  `MAX_LABEL_INDENT_STEPS` of them (`src/utils/barNesting.ts`) — but an indent
  inside a Task column fixed at 2.60in is a step the reader has to measure
  rather than see.
- On the plan screen `rowPaddingLeft` (`src/gantt/geometry.ts`) names three
  numbers, because the Gantt design handoff describes exactly two levels and
  names exactly the three indents they need. Anything deeper reuses the
  child's indent; depth is read from the caret and the group treatment
  instead.

So a third level created here would be a level the deck cannot draw as a
distinct one — which is a worse answer than not offering it.

## Why import is not capped

A file comes from somewhere else — another tool, a spreadsheet, a hand-written
JSON plan — and it is not this app's business to decide that the fourth level
of somebody's plan should not exist. Refusing or flattening it would lose
data on the way in, and the loss would be silent, which is the worst shape a
data loss can take. So the cap is on **creating**, never on **holding**:

| what | capped at two? |
|---|---|
| the row's "+" and the context menu's "Add sub-task" | yes — absent on a sub-task |
| `addSubtask` (`src/gantt/GanttScreen.tsx`) | yes — refuses, so the rule holds at the one place a sub-task is made |
| `parsePlanJson`, the spreadsheet importer, `normalizePlanItems` | no |
| `visibleRows`, the task column, the bars, the drag | no |
| the PPTX and PDF exporters, the CSV | no |

Verified twice. On a five-level, 93-task plan when the cap went in: every
parent link and date survived the import, every task got a row and a bar, and
all 93 reached the deck (commit `99a0844`). And again when this document was
written, on a five-deep chain through the live modules — `normalizePlanItems`
keeps all five parent links and raises no warning, `visibleRows` returns rows
at depths 0–4, `sortItemsForExport` keeps them in tree order, and
`buildDepthMap` reports 0–4 rather than clamping.

## Where the rule lives

`isSubtask` in `src/gantt/rollup.ts` is the whole of it — "does this item's
`parentId` name a task that is actually in this plan". Three callers read it:
the row's "+", the context menu, and `addSubtask`'s own guard. The guard is
the one that matters; the other two are there so a control that cannot work is
not offered.

Changing the rule is therefore a one-line change plus a decision about the two
things this document says are missing: what a third indent step is, and what a
third bar depth looks like on a slide.
