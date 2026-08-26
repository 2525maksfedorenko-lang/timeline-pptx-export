/**
 * Colour parity check — fails when a task is one colour on screen and another
 * in the deck.
 *
 *   npm run check:colors
 *
 * The invariant: a bar's colour means **which branch this task belongs to**, in
 * both media. So for every task the exported overview draws, the colour the
 * slide fills its bar with is the colour the plan screen fills its bar with.
 *
 * This is worth a check because the two used to be different ideas. The deck
 * coloured by branch (a root takes a palette colour, its whole subtree inherits
 * it); the screen coloured by *status* out of its own token set, so a done task
 * was green and an unstarted one grey no matter what they belonged to. The same
 * plan read as two different pictures. Both sides now resolve colour through
 * `src/utils/branchColors.ts`, and this holds them there.
 *
 * Two things are checked separately, because only one of them is absolute:
 *
 *  - **Hue** — `BranchColor.solid` — must always match. This is the claim
 *    "colour means branch", and nothing is allowed to break it.
 *  - **Tint** — the alpha a bar is filled at, which says root-or-nested — must
 *    match whenever the deck draws the task's parent. When it doesn't (a
 *    timeframe filtered the parent out, the compact cut dropped it, or it is
 *    simply not in the export), the deck deliberately draws the orphan as a
 *    root at full strength, because on that slide it *is* one. The screen shows
 *    the whole plan and tints it as the child it is. That divergence is
 *    intended and is asserted here rather than left to be rediscovered.
 */
import { buildExportSlides, type ExportMode } from '../src/export/timelineExportModel';
import { buildBranchColors, branchFillAlpha, FLAT_PLAN_COLOR, planHasSubtasks } from '../src/utils/branchColors';
import { buildDepthMap } from '../src/utils/barNesting';
import { buildFixturePlan } from './fixturePlan';
import type { TimelineItem } from '../src/types/timeline';

const TODAY = new Date('2026-08-26T00:00:00.000Z');

function day(offset: number): string {
  return new Date(Date.UTC(2026, 7, 1 + offset)).toISOString().slice(0, 10);
}

/** A plan where every task is a root — the case that must come out all blue. */
function flatPlan(count: number): TimelineItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `F${i}`,
    label: `Task ${i + 1}`,
    start: day(i * 2),
    end: day(i * 2 + 3),
    status: (['todo', 'in_progress', 'done'] as const)[i % 3],
    includeInExport: true,
  }));
}

/** Flat, but every task points at a parent that isn't in the plan. Resolved
 * parentage makes these roots, so this must colour exactly like flatPlan. */
function danglingParentPlan(count: number): TimelineItem[] {
  return flatPlan(count).map((item) => ({ ...item, parentId: 'nobody' }));
}

/** Two roots and a child, with the *first* root left out of the export — the
 * case that used to shift every remaining root one place up the palette. */
function excludedRootPlan(): TimelineItem[] {
  return [
    { id: 'A', label: 'Excluded root', start: day(0), end: day(5), includeInExport: false },
    { id: 'B', label: 'Root B', start: day(1), end: day(9) },
    { id: 'B1', label: 'Child of B', start: day(2), end: day(6), parentId: 'B' },
    { id: 'C', label: 'Root C', start: day(3), end: day(12) },
  ];
}

interface Failure {
  plan: string;
  taskId: string;
  what: string;
}

function overviewBars(items: TimelineItem[], mode: ExportMode) {
  return buildExportSlides(items, [], 'all', null, mode, TODAY)
    .filter((slide) => slide.kind === 'overview')
    .flatMap((slide) => (slide as { bars: { id: string; color: string; fillAlpha: number }[] }).bars);
}

function checkPlan(name: string, items: TimelineItem[], mode: ExportMode): Failure[] {
  const failures: Failure[] = [];
  const screenColor = buildBranchColors(items);
  const screenDepth = buildDepthMap(items);
  const bars = overviewBars(items, mode);
  const drawnIds = new Set(bars.map((bar) => bar.id));

  for (const bar of bars) {
    const color = screenColor.get(bar.id);
    if (!color) {
      failures.push({ plan: name, taskId: bar.id, what: 'drawn in the deck but has no colour on screen' });
      continue;
    }

    if (bar.color !== color.solid) {
      failures.push({ plan: name, taskId: bar.id, what: `hue: deck ${bar.color}, screen ${color.solid}` });
    }

    const item = items.find((candidate) => candidate.id === bar.id);
    const parentDrawn = item?.parentId !== undefined && drawnIds.has(item.parentId);
    const isChildOnScreen = (screenDepth.get(bar.id) ?? 0) > 0;
    const screenAlpha = branchFillAlpha(screenDepth.get(bar.id) ?? 0, color);

    if (!isChildOnScreen || parentDrawn) {
      if (Math.abs(bar.fillAlpha - screenAlpha) > 1e-9) {
        failures.push({ plan: name, taskId: bar.id, what: `tint: deck ${bar.fillAlpha}, screen ${screenAlpha}` });
      }
    } else if (bar.fillAlpha !== 1) {
      // The orphan case: the deck should be drawing it as a root.
      failures.push({
        plan: name,
        taskId: bar.id,
        what: `orphan in the deck should be full strength, got ${bar.fillAlpha}`,
      });
    }
  }

  return failures;
}

/** A plan with no sub-tasks anywhere is drawn in one colour, and that colour is
 * the palette's blue — on screen and on the slide alike. */
function checkFlatIsBlue(name: string, items: TimelineItem[]): Failure[] {
  const failures: Failure[] = [];
  if (planHasSubtasks(items)) {
    return [{ plan: name, taskId: '—', what: 'fixture is not actually flat' }];
  }

  const colors = buildBranchColors(items);
  colors.forEach((color, id) => {
    if (color.solid !== FLAT_PLAN_COLOR.solid) {
      failures.push({ plan: name, taskId: id, what: `flat plan should be ${FLAT_PLAN_COLOR.solid}, got ${color.solid}` });
    }
  });

  for (const bar of overviewBars(items, 'full')) {
    if (bar.color !== FLAT_PLAN_COLOR.solid) {
      failures.push({ plan: name, taskId: bar.id, what: `flat plan slide bar is ${bar.color}` });
    }
  }

  return failures;
}

function main() {
  const fixture = buildFixturePlan();
  const flat = flatPlan(12);
  const dangling = danglingParentPlan(12);

  const cases: { name: string; items: TimelineItem[]; mode: ExportMode }[] = [
    { name: 'fixture / compact', items: fixture.items, mode: 'compact' },
    { name: 'fixture / full', items: fixture.items, mode: 'full' },
    { name: 'flat plan', items: flat, mode: 'full' },
    { name: 'dangling parents', items: dangling, mode: 'full' },
    { name: 'excluded first root', items: excludedRootPlan(), mode: 'full' },
  ];

  const failures: Failure[] = [];

  for (const { name, items, mode } of cases) {
    const bad = checkPlan(name, items, mode);
    failures.push(...bad);
    const bars = overviewBars(items, mode).length;
    if (bad.length === 0) {
      console.log(`   OK    ${name.padEnd(22)} ${String(bars).padStart(4)} bars, same colour in both`);
    } else {
      console.log(`   FAIL  ${name.padEnd(22)} ${bad.length} mismatched`);
      bad.slice(0, 4).forEach((f) => console.log(`         ${f.taskId}  ${f.what}`));
    }
  }

  for (const [name, items] of [['flat plan', flat], ['dangling parents', dangling]] as const) {
    const bad = checkFlatIsBlue(name, items);
    failures.push(...bad);
    if (bad.length === 0) {
      console.log(`   OK    ${`${name} is all blue`.padEnd(22)} every bar ${FLAT_PLAN_COLOR.solid}`);
    } else {
      console.log(`   FAIL  ${name} is not all blue: ${bad.length} off`);
      bad.slice(0, 4).forEach((f) => console.log(`         ${f.taskId}  ${f.what}`));
    }
  }

  // The fixture is a deep tree, so it must NOT take the flat plan's colour —
  // otherwise "all blue" would be passing for the wrong reason everywhere.
  if (!planHasSubtasks(fixture.items)) {
    failures.push({ plan: 'fixture', taskId: '—', what: 'expected a nested fixture' });
  }
  const fixtureHues = new Set([...buildBranchColors(fixture.items).values()].map((c) => c.solid));
  console.log(`   OK    ${'nested fixture'.padEnd(22)} ${fixtureHues.size} branch colours in use`);

  if (failures.length > 0) {
    console.log(`\nFAILED — ${failures.length} colour mismatch(es)`);
    process.exit(1);
  }
  console.log('\nPASSED — screen and deck agree on every bar colour');
}

if (process.argv[1]?.endsWith('checkColorParity.ts')) main();
