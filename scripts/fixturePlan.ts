/**
 * A deterministic deep plan for the export coverage check: 100 exportable tasks
 * (plus 3 excluded ones), four levels, dependencies, and markdown comments long
 * enough to force appendix sections to spill across slides.
 *
 * Deterministic on purpose — a check measured against a moving fixture proves
 * nothing, and the interesting shapes here (a root with 27 descendants, a
 * four-level chain, a bare root parked outside the timeframe) each exist to
 * exercise one ceiling from docs/export-coverage.md.
 *
 * A module of its own so importing the plan has no side effects: the check's
 * CLI runs on import, and the export runner needs the same plan without it.
 */
import { buildDepthMap } from '../src/utils/barNesting';
import type { Person } from '../src/store/peopleStore';
import type { TaskComment, TaskStatus, TimelineItem } from '../src/types/timeline';

const PLAN_START_MS = Date.UTC(2026, 0, 5);
const DAY_MS = 86_400_000;
export const isoDay = (dayOffset: number) => new Date(PLAN_START_MS + dayOffset * DAY_MS).toISOString().slice(0, 10);

/** mulberry32: four lines of arithmetic, no dependency, same sequence every run. */
function makeRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Shape {
  children: Shape[];
}
const leaf: Shape = { children: [] };
const node = (...children: Shape[]): Shape => ({ children });

/** The plan opens with the awkward roots — one whose 27 descendants cannot fit
 * on any single slide (which is what makes the appendix paging load-bearing
 * rather than theoretical), one mixed tree, one four-level chain — and then
 * cycles small ones. Sized so the plan ends up with more roots than a single
 * overview slide holds (MAX_OVERVIEW_BARS_PER_SLIDE, 15 at the deck's row
 * pitch), because the compact truncation and the 'full' paging are otherwise
 * never exercised. */
const OPENING_SHAPES: Shape[] = [
  node(...Array.from({ length: 9 }, () => node(leaf, leaf))),
  node(node(leaf, leaf), node(leaf, node(leaf, leaf)), leaf, node(leaf)),
  node(node(node(leaf))),
  node(node(leaf, leaf), node(leaf), leaf),
];
const ROOT_SHAPES: Shape[] = [leaf, node(leaf, leaf), node(leaf, leaf, leaf), node(node(node(leaf)))];

function shapeSize(shape: Shape): number {
  return 1 + shape.children.reduce((sum, child) => sum + shapeSize(child), 0);
}

const TOTAL_ITEMS = 103;
const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];
const AREAS = ['Platform', 'Billing', 'Onboarding', 'Reporting', 'Search', 'Mobile', 'Data', 'Identity'];
const ACTIONS = ['migration', 'rollout', 'audit', 'redesign', 'hardening', 'integration', 'cleanup', 'pilot'];
const DETAILS = ['phase 1', 'EU region', 'legacy path', 'dry run', 'GA', 'internal beta', 'follow-up'];

const LONG_COMMENT = `## Status review

The migration is running two weeks behind the original plan, mostly because the
legacy reconciliation job turned out to write to three tables nobody had
documented. We have since mapped all of them and the shadow writes are in place,
which unblocks the cutover rehearsal.

Remaining risks, in the order they would hurt:

- The reconciliation job still holds a table lock for ~40 seconds under load
- No rollback rehearsal has been done against production-sized data yet
- Two downstream consumers read the old column names directly
- Ownership of the nightly export is still unclear between teams
- The audit trail needs a retention decision before we can enable it broadly

| Workstream | Owner | State |
| --- | --- | --- |
| Shadow writes | Platform | done |
| Cutover rehearsal | Platform | in progress |
| Consumer migration | Reporting | not started |
| Retention policy | Legal | blocked |

### Next steps

Rehearse the cutover against a restored snapshot, then re-run the consumer
compatibility suite. If the lock duration cannot be brought under ten seconds we
will need a maintenance window, which pushes GA into the following quarter and
means revisiting the communication plan with the account teams.`;

const SHORT_COMMENTS = [
  'Waiting on the security review before we can schedule the rollout.',
  '**Blocked** on the vendor SLA — escalated, no date yet.',
  'Scope trimmed: the reporting piece moves to the next phase.',
  'Rehearsal went fine, one flaky test to chase down.',
];

export interface FixturePlan {
  items: TimelineItem[];
  comments: TaskComment[];
  people: Person[];
}

export function buildFixturePlan(): FixturePlan {
  const random = makeRandom(0x5eed);
  const items: TimelineItem[] = [];
  let counter = 0;
  let rootIndex = 0;

  const addShape = (shape: Shape, parentId: string | undefined, window: { start: number; end: number }) => {
    counter += 1;
    const id = `T${String(counter).padStart(3, '0')}`;
    const span = Math.max(4, window.end - window.start);
    const duration = Math.max(3, Math.round(span * (0.3 + random() * 0.5)));
    const start = window.start + Math.floor(random() * Math.max(1, span - duration));

    const area = AREAS[counter % AREAS.length];
    const action = ACTIONS[(counter * 3) % ACTIONS.length];
    const detail = DETAILS[(counter * 5) % DETAILS.length];
    // Every fourth label is long enough to exercise truncation against the
    // room the row's dates/progress/status leave it.
    const label =
      counter % 4 === 0 ? `${area} ${action} — ${detail}, cross-team review` : `${area} ${action} (${detail})`;

    items.push({
      id,
      label,
      start: isoDay(start),
      end: isoDay(start + duration),
      progress: Math.round(random() * 100),
      status: STATUSES[Math.floor(random() * STATUSES.length)],
      assignee: random() > 0.25 ? { name: `Person ${1 + Math.floor(random() * 6)}` } : undefined,
      tags: random() > 0.8 ? ['q3'] : undefined,
      parentId,
    });

    shape.children.forEach((child) => addShape(child, id, { start, end: start + duration }));
  };

  while (counter < TOTAL_ITEMS) {
    const remaining = TOTAL_ITEMS - counter;
    const candidate =
      rootIndex < OPENING_SHAPES.length
        ? OPENING_SHAPES[rootIndex]
        : ROOT_SHAPES[(rootIndex - OPENING_SHAPES.length) % ROOT_SHAPES.length];
    // Never overshoot the target: fall back to smaller shapes, then to a bare
    // root, so the plan lands on exactly TOTAL_ITEMS tasks.
    const shape =
      shapeSize(candidate) <= remaining
        ? candidate
        : (ROOT_SHAPES.filter((option) => shapeSize(option) <= remaining).pop() ?? leaf);
    addShape(shape, undefined, { start: rootIndex * 16, end: rootIndex * 16 + 60 + Math.floor(random() * 60) });
    rootIndex += 1;
  }

  // Dependencies on an earlier task only, so the graph stays acyclic. Some
  // point at tasks that will be excluded below or that a timeframe window will
  // drop — connectors to a bar that isn't on the slide are meant to disappear.
  items.forEach((item, index) => {
    if (index >= 6 && index % 7 === 0) item.dependencies = [items[index - 5].id];
  });

  // Three exclusions, one of each interesting kind: a childless root (nothing
  // else in the deck could mention it), a mid-tree parent (whose children then
  // become export roots in their own right — buildTaskHierarchy's rule), and a
  // deep leaf.
  const childIds = new Set(items.map((item) => item.parentId).filter(Boolean));
  const depthById = buildDepthMap(items);
  const excluded = [
    items.filter((item) => item.parentId === undefined && !childIds.has(item.id)).pop(),
    items.find((item) => depthById.get(item.id) === 1 && childIds.has(item.id)),
    items.filter((item) => (depthById.get(item.id) ?? 0) >= 2 && !childIds.has(item.id)).pop(),
  ];
  excluded.forEach((item) => {
    if (item) item.includeInExport = false;
  });

  // Two childless roots parked well outside NARROW_TIMEFRAME and kept
  // commentless below. That combination is the last shape of task that can
  // leave no trace in the file at all — no bar, and nothing to put in an
  // appendix section — so the footer note is the only thing standing between it
  // and silent loss (see docs/export-coverage.md, B2).
  const bareRoots = items.filter((item) => item.parentId === undefined && !childIds.has(item.id)).slice(0, 2);
  bareRoots.forEach((root, index) => {
    root.start = isoDay(300 + index * 10);
    root.end = isoDay(312 + index * 10);
  });
  const bareRootIds = new Set(bareRoots.map((root) => root.id));

  // Comments: enough volume on a few roots to force a section to spill onto a
  // "(continued)" slide, several tasks with more comments than 'latest' or
  // 'pinned' will show, and a couple on subtasks.
  const comments: TaskComment[] = [];
  const roots = items.filter((item) => item.parentId === undefined && !bareRootIds.has(item.id));
  roots.forEach((root, index) => {
    if (index % 4 === 0) {
      comments.push({
        id: `c-${root.id}-long`,
        taskId: root.id,
        body: LONG_COMMENT,
        isPinned: true,
        createdAt: isoDay(120 + index),
      });
    }
    if (index % 3 === 0) {
      SHORT_COMMENTS.forEach((body, commentIndex) => {
        comments.push({
          id: `c-${root.id}-${commentIndex}`,
          taskId: root.id,
          body,
          isPinned: commentIndex === 1,
          createdAt: isoDay(100 + index + commentIndex),
        });
      });
    }
  });
  items
    .filter((item) => (depthById.get(item.id) ?? 0) >= 2)
    .slice(0, 4)
    .forEach((item, index) => {
      comments.push({
        id: `c-${item.id}`,
        taskId: item.id,
        body: SHORT_COMMENTS[index % SHORT_COMMENTS.length],
        createdAt: isoDay(140 + index),
      });
    });

  const people: Person[] = Array.from({ length: 6 }, (_unused, index) => ({
    id: `p${index + 1}`,
    name: `Person ${index + 1}`,
    color: ['1E40AF', '166534', '991B1B', '7C3AED', 'B45309', '0F766E'][index],
  }));

  return { items, comments, people };
}
