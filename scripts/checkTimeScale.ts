/**
 * Time-scale alignment check — fails when the header and the grid disagree.
 *
 *   npm run check:scale
 *
 * The invariant: at every scale, the plan screen draws on exactly one ruler.
 * A header cell's right edge, the strong period rule painted under it, and the
 * left edge of a bar whose task starts on that cell's first day are the same x.
 *
 * This is worth a check because the two used to be computed apart. The header
 * has always grouped by the calendar (`buildHeaderCells` — months of 28 to 31
 * days, a first week clipped to wherever the canvas starts), while the grid was
 * ruled at a fixed period, `columnWidth × 30` for a month and `× 7` for a week
 * measured from day 0. Those agree only when the calendar happens to tile
 * evenly, which at the month scale is never: the rules drifted up to 140px from
 * the header captions sitting above them.
 *
 * So the sweep below is over *start dates*, not over plans — a canvas beginning
 * on each of the seven weekdays, in every month, across a leap year and a
 * common one. That is the axis the old bug lived on, and a fixture with one
 * start date would have missed six sevenths of it.
 */
import { barLeft } from '../src/gantt/geometry';
import {
  buildHeaderCells,
  COLUMN_WIDTH_PX,
  dayIndexOf,
  periodEdges,
  periodRuleLayer,
  TIME_SCALES,
  type HeaderCell,
  type TimeScale,
} from '../src/gantt/scale';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The x of every rule the painted layer actually puts on the canvas.
 *
 * Read back out of the CSS rather than recomputed, because the CSS is what the
 * browser draws. `periodRuleLayer` has two branches — a repeating gradient when
 * the cells tile evenly, an explicit stop list when they don't — and a check
 * that trusted the branch it expected would not be checking anything. */
function rulesDrawnBy(layer: string, canvasWidth: number): number[] {
  const repeating = layer.match(/^repeating-linear-gradient\(to right, transparent 0 [\d.]+px, var\(--gantt-rule-strong\) [\d.]+px ([\d.]+)px\)$/);
  if (repeating) {
    const period = Number(repeating[1]);
    const rules: number[] = [];
    // A repeating gradient tiles until the box runs out; the epsilon keeps a
    // rule that lands exactly on the right edge, as the last cell's does.
    for (let x = period; x <= canvasWidth + 1e-6; x += period) rules.push(x);
    return rules;
  }

  // The explicit form: ... transparent Apx, strong Apx, strong Bpx, transparent Bpx ...
  // where B is the rule's x and A is B−1. Take the closing edge of each band.
  return [...layer.matchAll(/var\(--gantt-rule-strong\) [\d.]+px, var\(--gantt-rule-strong\) ([\d.]+)px/g)].map(
    (match) => Number(match[1]),
  );
}

/** Where the header actually puts each cell's right edge, accumulated the way
 * a flex row does it — `width: cell.days × columnWidth` per cell, in order —
 * rather than from the cell's own index. If those two ever came apart, the
 * captions would slide off the columns they name and nothing else would say so. */
function headerEdgesLaidOut(cells: HeaderCell[], columnWidth: number): number[] {
  const edges: number[] = [];
  let x = 0;
  for (const cell of cells) {
    x += cell.days * columnWidth;
    edges.push(x);
  }
  return edges;
}

interface Failure {
  scale: TimeScale;
  start: string;
  what: string;
  drift: number;
}

/** Floating-point columns (15.2px a day at the week scale) mean exact equality
 * is the wrong test; a twentieth of a pixel is below anything that can be
 * drawn, and well under the 30.4px and 140px the old grid was out by. */
const EPSILON = 0.05;

function checkCanvas(scale: TimeScale, minDate: Date, totalDays: number): Failure[] {
  const failures: Failure[] = [];
  const start = minDate.toISOString().slice(0, 10);
  const cw = COLUMN_WIDTH_PX[scale];
  const cells = buildHeaderCells(minDate, totalDays, scale);
  const canvasWidth = totalDays * cw;

  const laidOut = headerEdgesLaidOut(cells, cw);
  const fromIndex = periodEdges(cells, cw);
  const painted = rulesDrawnBy(periodRuleLayer(cells, cw), canvasWidth);

  // 1. The header's own two ways of placing a cell edge agree.
  laidOut.forEach((edge, i) => {
    const drift = Math.abs(edge - fromIndex[i]);
    if (drift > EPSILON) failures.push({ scale, start, what: `header cell ${i} edge`, drift });
  });

  // 2. The grid rules exactly the header's edges — no more, no fewer. A count
  //    mismatch is reported *and* the shared prefix still measured, so the
  //    failure says how far out the lines are and not merely that there are
  //    the wrong number of them.
  if (painted.length !== laidOut.length) {
    failures.push({
      scale,
      start,
      what: `grid rules ${painted.length} lines for ${laidOut.length} header cells`,
      drift: 0,
    });
  }
  for (let i = 0; i < Math.min(painted.length, laidOut.length); i += 1) {
    const drift = Math.abs(painted[i] - laidOut[i]);
    if (drift > EPSILON) failures.push({ scale, start, what: `period rule ${i}`, drift });
  }

  // 3. A bar whose task starts on a cell's first day opens on that cell's left
  //    edge, plus the 2px inset every bar carries.
  for (const cell of cells) {
    const iso = new Date(minDate.getTime() + cell.index * MS_PER_DAY).toISOString().slice(0, 10);
    const drift = Math.abs(barLeft(dayIndexOf(iso, minDate), cw) - (cell.index * cw + 2));
    if (drift > EPSILON) failures.push({ scale, start, what: `bar starting ${iso}`, drift });
  }

  return failures;
}

function main() {
  // A leap year and a common one, so February is checked at both lengths.
  const YEARS = [2024, 2026];
  // Long enough that a month-scale canvas carries a dozen months and the drift
  // has room to accumulate, and not a multiple of 7 or of any month length.
  const TOTAL_DAYS = 401;

  const failures: Failure[] = [];
  let canvases = 0;

  for (const scale of TIME_SCALES) {
    for (const year of YEARS) {
      for (let dayOfYear = 0; dayOfYear < 365; dayOfYear += 1) {
        const minDate = new Date(Date.UTC(year, 0, 1 + dayOfYear));
        failures.push(...checkCanvas(scale, minDate, TOTAL_DAYS));
        canvases += 1;
      }
    }
  }

  for (const scale of TIME_SCALES) {
    const bad = failures.filter((failure) => failure.scale === scale);
    const worst = bad.reduce((max, failure) => Math.max(max, failure.drift), 0);
    const cw = COLUMN_WIDTH_PX[scale];
    const label = `${scale.padEnd(5)} ${String(cw).padStart(4)}px/day`;
    if (bad.length === 0) {
      console.log(`   OK    ${label}  header, grid and bars on one ruler across ${canvases / 3} start dates`);
    } else {
      console.log(`   FAIL  ${label}  ${bad.length} misplaced, worst ${worst.toFixed(1)}px`);
      bad.slice(0, 5).forEach((failure) => console.log(`         ${failure.start}  ${failure.what}  ${failure.drift.toFixed(1)}px`));
    }
  }

  if (failures.length > 0) {
    console.log(`\nFAILED — ${failures.length} misplaced line(s)`);
    process.exit(1);
  }
  console.log(`\nPASSED — ${canvases} canvases, no drift above ${EPSILON}px`);
}

if (process.argv[1]?.endsWith('checkTimeScale.ts')) main();
