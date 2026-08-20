/**
 * Export coverage check — fails when a task in the plan doesn't reach the file.
 *
 *   npm run check:export
 *
 * The invariant it enforces (see src/export/exportCoverage.ts, which does the
 * actual auditing): the set of tasks with `includeInExport !== false` equals the
 * set of tasks present in the exported deck — as an overview bar, an appendix
 * section title, or a subtask row — with the single exception of tasks the file
 * itself counts in an overview footer note. A task that is neither drawn nor
 * counted is data loss, and this exits non-zero when it finds one.
 *
 * It also checks the two things a deep tree can break that a task count alone
 * would not notice: that a slide break never lands inside a level (a row's
 * parent is always its section's title or a row above it on the same slide),
 * and that the depth indent still steps by the same ratio as the on-screen
 * label column. And, on the dashboard's own tables, that a list cut down to fit
 * its slide says how many rows it cut and ends inside the content area.
 *
 * The fixture is deterministic — 100 exportable tasks, four levels, dependencies
 * and markdown comments long enough to force sections to spill — because a check
 * measured against a moving fixture proves nothing. Pass `--plan <file.json>`
 * (the shape src/import/planJson.ts reads) to run it against a real plan
 * instead, and `--all-slides` to print the per-slide breakdown for every
 * scenario rather than the first two.
 */
import { buildDashboardSlides } from '../src/export/dashboardSlides';
import { analyzeExportCoverage } from '../src/export/exportCoverage';
import { BAR_HEIGHT_IN, BAR_PROGRESS_FONT_SIZE_PT, subtaskRowIndent } from '../src/export/slideLayout';
import { buildSlideLinks } from '../src/export/slideLinks';
import { orderExportSlides } from '../src/export/slideOrder';
import { buildExportSlides, type ExportMode } from '../src/export/timelineExportModel';
import { BAR_HEIGHT_PX, PROGRESS_FONT_SIZE_PX } from '../src/components/ganttLayout';
import {
  BAR_HEIGHT_RATIO_BY_DEPTH,
  buildDepthMap,
  labelIndent,
  MAX_LABEL_INDENT_STEPS,
  progressLabelFitsInBar,
  resolveBarGeometry,
} from '../src/utils/barNesting';
import { sortItemsForExport } from '../src/utils/sortItemsForExport';
import { buildFixturePlan, isoDay, type FixturePlan } from './fixturePlan';
import type { ExportOptions, ExportTimeframe } from '../src/types/timeline';

// --- scenarios ---------------------------------------------------------------

interface Scenario {
  name: string;
  exportMode: ExportMode;
  commentMode: ExportOptions['commentMode'];
  timeframe: ExportTimeframe | null;
  perSlide: boolean;
}

/** A window over the middle of the plan, so some roots fall outside it. */
const NARROW_TIMEFRAME: ExportTimeframe = { start: isoDay(90), end: isoDay(200) };

const SCENARIOS: Scenario[] = [
  { name: 'compact · comments=all · no timeframe', exportMode: 'compact', commentMode: 'all', timeframe: null, perSlide: true },
  { name: 'full · comments=all · no timeframe', exportMode: 'full', commentMode: 'all', timeframe: null, perSlide: true },
  { name: 'full · comments=latest · no timeframe', exportMode: 'full', commentMode: 'latest', timeframe: null, perSlide: false },
  { name: 'compact · comments=none · narrow timeframe', exportMode: 'compact', commentMode: 'none', timeframe: NARROW_TIMEFRAME, perSlide: false },
  { name: 'full · comments=pinned · narrow timeframe', exportMode: 'full', commentMode: 'pinned', timeframe: NARROW_TIMEFRAME, perSlide: false },
];

export function buildDeck(plan: FixturePlan, scenario: Pick<Scenario, 'exportMode' | 'commentMode' | 'timeframe'>) {
  // Mirrors what both exporters do before drawing: sort, then build.
  const sortedItems = sortItemsForExport(plan.items, 'status');
  const slides = buildExportSlides(
    sortedItems,
    plan.comments,
    plan.people,
    scenario.commentMode,
    scenario.timeframe,
    true,
    scenario.exportMode,
  );
  const dashboardSlides = buildDashboardSlides(sortedItems, new Date('2026-08-18T00:00:00Z'));
  const orderedSlides = orderExportSlides(slides, dashboardSlides);
  return { orderedSlides, links: buildSlideLinks(orderedSlides) };
}

// --- indent parity with the reference ladder ---------------------------------
//
// A note on what "screen" means in the two checks below. They were written when
// the on-screen Gantt drew the same ladder the slides do, and compared the two
// directly. That screen has since been rebuilt to the Gantt design handoff (see
// docs/design-system-map.md, Phase 3) and now has its own geometry in
// src/gantt/ — 52px rows, 34px bars, no depth-stepped bar heights at all.
//
// So the "screen" column below is no longer a second surface: it is the
// reference ladder in src/components/ganttLayout.ts, expressed in px, which the
// export settings panel's task list still indents on. What these checks are
// really asserting is that the slides' own ladder and that reference stay one
// rule at every depth, in two units. That is still worth asserting — it is the
// rule the slides are built from — but it is no longer a claim about what the
// plan screen draws.

/** The two units (px, slide inches) mean parity can only be asserted as a
 * ratio: one indent step, divided by that unit's own bar height. Compared at
 * every level up to the cap, since that is where a ladder that started on a
 * different rung would give itself away. */
function checkIndentParity(): { rows: string[][]; failures: string[] } {
  const rows: string[][] = [];
  const failures: string[] = [];

  for (let depth = 0; depth <= MAX_LABEL_INDENT_STEPS; depth += 1) {
    // A subtask row at section depth `d` is a task at absolute depth `d + 1`,
    // which is what the screen indents.
    const slideStep = (subtaskRowIndent(depth + 1) - subtaskRowIndent(depth)) / BAR_HEIGHT_IN;
    const screenStep = (labelIndent(BAR_HEIGHT_PX, depth + 2) - labelIndent(BAR_HEIGHT_PX, depth + 1)) / BAR_HEIGHT_PX;

    rows.push([
      `level ${depth + 1} → ${depth + 2}`,
      `${(subtaskRowIndent(depth + 1) - subtaskRowIndent(depth)).toFixed(4)}in`,
      slideStep.toFixed(4),
      `${labelIndent(BAR_HEIGHT_PX, depth + 2) - labelIndent(BAR_HEIGHT_PX, depth + 1)}px`,
      screenStep.toFixed(4),
      Math.abs(slideStep - screenStep) < 1e-9 ? 'match' : 'DIVERGED',
    ]);

    if (Math.abs(slideStep - screenStep) >= 1e-9) {
      failures.push(
        `depth indent step ${depth + 1}→${depth + 2}: slide ${slideStep.toFixed(4)} of a bar height, ` +
          `screen ${screenStep.toFixed(4)} — the surfaces would drift apart`,
      );
    }
  }

  return { rows, failures };
}

/** The height ladder in each unit, and where each rung puts its progress
 * percentage.
 *
 * The heights are shared by construction (one ladder, two base units), so what
 * this is really auditing is the *second* rule: the two surfaces set that label
 * at different sizes relative to their bars — 11px on a 32px bar, 9pt on a
 * 0.28in one — so "tall enough to hold the label" is a question they could
 * answer differently for the same rung without either being wrong on its own.
 * A rung where they disagree means the same plan reads one way on screen and
 * another in the file, which is the whole thing this check exists to catch. */
function checkBarHeightParity(): { rows: string[][]; failures: string[] } {
  const rows: string[][] = [];
  const failures: string[] = [];

  for (let depth = 0; depth < BAR_HEIGHT_RATIO_BY_DEPTH.length; depth += 1) {
    const slideHeight = resolveBarGeometry(BAR_HEIGHT_IN, depth).height;
    const screenHeight = resolveBarGeometry(BAR_HEIGHT_PX, depth).height;
    const slideInside = progressLabelFitsInBar(slideHeight, BAR_PROGRESS_FONT_SIZE_PT / 72);
    const screenInside = progressLabelFitsInBar(screenHeight, PROGRESS_FONT_SIZE_PX);

    rows.push([
      `depth ${depth}${depth === BAR_HEIGHT_RATIO_BY_DEPTH.length - 1 ? '+' : ''}`,
      BAR_HEIGHT_RATIO_BY_DEPTH[depth].toFixed(2),
      `${slideHeight.toFixed(4)}in`,
      `${screenHeight}px`,
      slideInside ? 'inside' : 'outside',
      screenInside ? 'inside' : 'outside',
      slideInside === screenInside ? 'match' : 'DIVERGED',
    ]);

    if (slideInside !== screenInside) {
      failures.push(
        `depth ${depth}: the slide puts its progress label ${slideInside ? 'inside' : 'outside'} the bar ` +
          `and the screen puts it ${screenInside ? 'inside' : 'outside'} — the surfaces would read differently`,
      );
    }
  }

  return { rows, failures };
}

// --- reporting ---------------------------------------------------------------

function printTable(rows: string[][], indent = '   ') {
  if (rows.length === 0) return;
  const widths = rows[0].map((_cell, column) => Math.max(...rows.map((row) => row[column].length)));
  rows.forEach((row) => {
    console.log(indent + row.map((cell, column) => cell.padEnd(widths[column])).join('  ').trimEnd());
  });
}

function loadPlanArgument(): FixturePlan | null {
  const flagIndex = process.argv.indexOf('--plan');
  if (flagIndex === -1) return null;

  const path = process.argv[flagIndex + 1];
  // Deliberately require-free of any import helper: a plan file is the same
  // JSON shape the app's own importer reads.
  const raw = JSON.parse(require('node:fs').readFileSync(path, 'utf8'));
  return {
    items: raw.items ?? [],
    comments: raw.comments ?? [],
    people: raw.people ?? [],
  };
}

function main() {
  const plan = loadPlanArgument() ?? buildFixturePlan();
  const allSlides = process.argv.includes('--all-slides');
  const exportable = plan.items.filter((item) => item.includeInExport !== false);
  const depthById = buildDepthMap(exportable);
  const maxDepth = Math.max(...[...depthById.values()]);

  console.log('');
  console.log('Export coverage check');
  console.log(`   plan: ${plan.items.length} items, ${exportable.length} exportable, ` +
    `${plan.items.length - exportable.length} excluded, ${maxDepth + 1} levels deep, ` +
    `${plan.comments.length} comments`);

  const parity = checkIndentParity();
  console.log('');
  console.log('Depth indent, slide vs screen (ratios, not sizes — the units differ)');
  printTable([['', 'slide step', '/ bar h', 'screen step', '/ bar h', ''], ...parity.rows]);

  const heights = checkBarHeightParity();
  console.log('');
  console.log('Bar height by depth, and where the progress label sits');
  printTable([['', 'ratio', 'slide bar', 'screen bar', 'slide %', 'screen %', ''], ...heights.rows]);

  let totalFailures = parity.failures.length + heights.failures.length;
  parity.failures.forEach((failure) => console.log(`   FAIL  ${failure}`));
  heights.failures.forEach((failure) => console.log(`   FAIL  ${failure}`));

  SCENARIOS.forEach((scenario, index) => {
    const { orderedSlides, links } = buildDeck(plan, scenario);
    const report = analyzeExportCoverage(plan.items, orderedSlides, links);
    totalFailures += report.failures.length;

    console.log('');
    console.log(`── ${scenario.name} ${'─'.repeat(Math.max(0, 58 - scenario.name.length))}`);
    printTable([
      ['tasks in plan (includeInExport)', `${report.planTaskCount}`],
      ['tasks present in the deck', `${report.fileTaskCount}`],
      ['absent from the deck', report.missing.length === 0 ? 'none' : report.missing.join(', ')],
      ['   ...of those, announced', `${report.announcedAbsent} in the overview footer`],
      ['UNANNOUNCED (must be 0)', `${report.missing.length - report.announcedAbsent}`],
      ['excluded tasks that leaked in', report.extra.length === 0 ? 'none' : report.extra.join(', ')],
      ['subtask rows listed twice', report.duplicated.length === 0 ? 'none' : report.duplicated.join(', ')],
      ['tasks not drawn on the overview', `${report.announcedOffOverview} (all in the appendix unless absent)`],
      ['slides', `${report.slides.length}`],
      ['links checked', `${links.detailSlideNumberByTaskId.size} bar links + back-to-overview`],
    ]);

    if (report.grid.length > 0) {
      console.log('');
      printTable([
        ['overview', 'window', 'levels', 'calendar marks', 'positions', 'strokes drawn'],
        ...report.grid.map((g) => [
          `${g.slideNumber}`,
          g.window,
          g.levels,
          `${g.calendarMarks}`,
          `${g.distinctPositions}`,
          `${g.strokes}`,
        ]),
      ]);
    }

    if (report.dashboard.length > 0) {
      console.log('');
      printTable([
        ['dashboard table', 'rows drawn', 'cut', 'table ends', 'footer note'],
        ...report.dashboard.map((table) => [
          `${table.slideNumber} ${table.title}`,
          `${table.rowsDrawn}`,
          `${table.omittedRowCount}`,
          `${table.bottomIn.toFixed(2)}in`,
          table.note ?? '—',
        ]),
      ]);
    }

    if (scenario.perSlide || allSlides) {
      console.log('');
      printTable([
        ['#', 'kind', 'levels', 'tasks', 'title'],
        ...report.slides.map((slide) => [
          `${slide.slideNumber}`,
          slide.kind,
          slide.depths.length === 0 ? '—' : slide.depths.join(','),
          `${slide.taskIds.length}`,
          slide.title,
        ]),
      ]);
    }

    if (report.failures.length === 0) {
      const absentNote = report.missing.length === 0 ? '' : `, ${report.missing.length} announced as absent`;
      console.log(
        `   OK    no unannounced loss across ${report.slides.length} slides${absentNote}`,
      );
    } else {
      report.failures.forEach((failure) => console.log(`   FAIL  ${failure}`));
    }

    if (index === SCENARIOS.length - 1) console.log('');
  });

  if (totalFailures > 0) {
    console.log(`FAILED — ${totalFailures} broken invariant(s)`);
    process.exit(1);
  }
  console.log(`PASSED — ${SCENARIOS.length} scenarios, no task lost, no link into empty space`);
}

// Only when invoked as the CLI. `buildDeck` above is imported by the export
// runner too, and importing a module must not run a check as a side effect.
if (process.argv[1]?.endsWith('checkExportCoverage.ts')) main();
