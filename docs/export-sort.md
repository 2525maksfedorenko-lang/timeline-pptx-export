# Export sort order

How tasks are ordered on the exported slides, and why it differs from the app.

## The order

`STATUS_SORT_ORDER` in `src/utils/sortItemsForExport.ts`:

```
done → in_progress → blocked → todo
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

Sorting the flat list — which is what `sortItems`' own `'status'` mode still does
for the screen — would scatter subtasks away from their parents.

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

This is also why the flat sort modes matter more than they used to: `'date'` and
`'progress'` (`sortItems`) order the list without regard to the tree, so a
subtask's bar can land far from its parent's on the Overview — exactly as its
row already does on screen, which is the point of the two surfaces sharing one
sort.

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

`sortItems` (screen) leads with `todo`; `sortItemsForExport` (slides) leads with
`done`. Both are reached through the same `exportOptions.sortMode === 'status'`.

This is deliberate and was specified: a deck is read as a report of what is
finished, the app is a working view of what is still open. The cost is that the
same setting means two different orders depending on the surface, and the order
you see on screen is not the order you get in the file.

## Dependency connectors

Sorting by status takes rows out of time order, so a dependency that used to step
one row down now runs upward and diagonally across many rows. Two consequences:

- **Bounds.** Every connector x is clamped into the timeline zone
  (`buildDependencyConnectors` in `timelineExportModel.ts`). Two of the x values a
  connector derives sit outside the bars themselves — the stub past the
  predecessor's right edge and the approach column in front of the successor — and
  since the columns change, a bar may end at the zone's right edge or start at its
  left one. Unclamped, the stub ran into the slide margin and the approach column
  into the Task column, drawing a dependency line through the task names.
- **Readability.** The lines stay inside the timeline and under the bars, so they
  obscure no text, but a long dependency chain does become harder to follow than
  it was in date order. That is inherent to the requested ordering, not a bug.
