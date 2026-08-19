import type { TimelineItem } from '../types/timeline';
import type { DashboardTableSlideModel } from './dashboardSlides';
import { buildDateGrid, DATE_GRID_LEVELS, DATE_GRID_MIN_GAP_PT } from './dateGrid';
import { BAR_HEIGHT_RATIO_BY_DEPTH, buildDepthMap } from '../utils/barNesting';
import type { OrderedSlideModel } from './slideOrder';
import type { SlideLinks } from './slideLinks';
import {
  BAR_HEIGHT_IN,
  COLUMN_TEXT_INSET_IN,
  CONTENT_BOTTOM_IN,
  CONTENT_TOP_IN,
  CONTENT_X_IN,
  COMMENT_META_ROW_HEIGHT_IN,
  DASHBOARD_TABLE_TOP_IN,
  DASHBOARD_TABLE_WIDTH_IN,
  LIST_ROW_HEIGHT_IN,
  ROW_LABEL_HEIGHT_IN,
  STATUS_COL_WIDTH_IN,
  subtaskRowIndent,
  TASK_COL_WIDTH_IN,
  TIMELINE_X_IN,
  TIMELINE_WIDTH_IN,
  tableColumnTextWidthIn,
  tableRowHeightIn,
} from './slideLayout';

/** Audits a built deck against the plan it was built from.
 *
 * The invariant, in one line: **the set of tasks with `includeInExport !== false`
 * equals the set of tasks present in the file** — where "present" means drawn as
 * an overview bar, as an appendix section title, or as a subtask row. The only
 * licensed exception is a task the file itself *counts* in an overview footer
 * note ("+N tasks not shown"), because then the reader knows it exists.
 *
 * The dashboard tables are held to the same terms one level down. A row missing
 * from them is not a task loss — they list tasks the deck covers elsewhere — but
 * a table cut to fit its slide is the same silent truncation, so what it drops
 * has to be counted in its own footer note, and what it draws has to end inside
 * the content area.
 *
 * It runs on the slide models rather than on a PPTX/PDF file because that model
 * is the single thing both exporters draw: an omission here is an omission in
 * both formats, and one that only appeared in one format would be a rendering
 * bug in that exporter, not a coverage bug. See docs/export-coverage.md for the
 * ceilings this exists to keep closed.
 *
 * Pure: no store, no filesystem, no dates of its own. */

export interface SlideCoverage {
  slideNumber: number;
  kind: OrderedSlideModel['kind'];
  title: string;
  /** Nesting depths present on this slide, as absolute plan depths (0 = root),
   * ascending — "which levels does this slide show". */
  depths: number[];
  /** Tasks the slide accounts for, in draw order. */
  taskIds: string[];
}

/** What one overview slide's date grid holds, and what the calendar says it
 * should. Reported per slide so the two numbers can be read side by side
 * rather than taken on trust. */
export interface GridCoverage {
  slideNumber: number;
  window: string;
  /** Marks the calendar produces for this window at the levels it draws —
   * counting a day that qualifies for two levels twice, which is exactly what
   * used to be drawn. */
  calendarMarks: number;
  /** Distinct positions among them: one per calendar day, however many levels
   * claim it. */
  distinctPositions: number;
  /** Strokes actually drawn. Equals distinctPositions minus the ones a
   * stronger neighbour absorbed within the minimum gap. */
  strokes: number;
  levels: string;
}

/** What one dashboard-table slide (Delayed / At risk) drew, and what it cut.
 * Reported per slide for the same reason the grid is: the two numbers are only
 * worth anything read side by side. */
export interface DashboardTableCoverage {
  slideNumber: number;
  title: string;
  /** Rows actually on the slide. */
  rowsDrawn: number;
  /** Rows the slide had no room for. */
  omittedRowCount: number;
  /** The note announcing them, as drawn in the footer. */
  note: string | null;
  /** Where the table's last row ends, re-measured from the rows themselves. */
  bottomIn: number;
}

export interface CoverageReport {
  /** Tasks with `includeInExport !== false`. */
  planTaskCount: number;
  /** Distinct tasks reachable in the deck. */
  fileTaskCount: number;
  /** In the plan, absent from the deck — must be empty. */
  missing: string[];
  /** In the deck, but excluded from the plan — must be empty. */
  extra: string[];
  /** Tasks listed as a subtask row more than once. */
  duplicated: string[];
  /** What the overview footers announce as absent from the file. Must equal
   * `missing` exactly: a task may be left out, but never unannounced. */
  announcedAbsent: number;
  /** What the footers announce as not drawn on the overview — a superset of
   * `announcedAbsent`, since the rest are in the appendix. */
  announcedOffOverview: number;
  slides: SlideCoverage[];
  grid: GridCoverage[];
  dashboard: DashboardTableCoverage[];
  /** Every broken invariant, one line each. Empty means the deck is sound. */
  failures: string[];
}

const CONTINUED_SUFFIX = '(continued)';
/** Slack for comparing inch coordinates that were reached by summing many
 * fractional row heights — a hair over a boundary is float noise, not overflow. */
const EPSILON_IN = 0.001;

/** Checks one slide's grid against the calendar its window implies.
 *
 * The point is not that the two counts match — they must *not*, since a
 * position claimed by several levels draws once (see resolveGridStrokes). What
 * has to hold is that the collapse only ever removed: every stroke is a real
 * date at its own level, no two strokes sit close enough to read as one, and
 * nothing was invented. */
function auditGrid(
  windowStart: string,
  windowEnd: string,
  tierDays: number,
  lines: readonly { level: string; x: number; date: string }[],
  slideNumber: number,
  failures: string[],
): GridCoverage {
  // The same span the slide actually ruled, which is not the same as the span
  // its tasks occupy: an overview rules `tierDays` days from its window's start
  // — that being exactly how much of the zone the shared density covers — so a
  // page whose tasks span less than the widest still rules edge to edge (see
  // buildOverviewSlide). Rebuilding over `windowStart..windowEnd` instead
  // audits a shorter grid than the one drawn, and every line past the page's
  // last task reads as a line off the calendar.
  const gridStart = new Date(windowStart);
  const gridEnd = new Date(gridStart);
  gridEnd.setUTCDate(gridEnd.getUTCDate() + tierDays - 1);
  const ruledRange = `${windowStart}..${gridEnd.toISOString().slice(0, 10)}`;
  const calendar = buildDateGrid(gridStart, gridEnd, tierDays);
  const drawnLevels = DATE_GRID_LEVELS.filter((level) => calendar[level].length > 0);
  const datesByLevel = new Map(
    DATE_GRID_LEVELS.map((level) => [
      level as string,
      new Set(calendar[level].map((mark) => mark.date.toISOString().slice(0, 10))),
    ]),
  );

  const calendarMarks = drawnLevels.reduce((total, level) => total + calendar[level].length, 0);
  const distinctPositions = new Set(
    drawnLevels.flatMap((level) => calendar[level].map((mark) => mark.date.toISOString().slice(0, 10))),
  ).size;

  const minGapIn = DATE_GRID_MIN_GAP_PT / 72;
  const seen = new Set<string>();

  lines.forEach((line, index) => {
    if (!datesByLevel.get(line.level)?.has(line.date)) {
      failures.push(
        `slide ${slideNumber}: grid line at ${line.date} is not a ${line.level} mark of ${ruledRange}`,
      );
    }
    if (seen.has(line.date)) {
      failures.push(`slide ${slideNumber}: grid line repeated at ${line.date}`);
    }
    seen.add(line.date);

    if (line.level === 'week' && new Date(line.date).getUTCDay() !== 1) {
      failures.push(`slide ${slideNumber}: week line at ${line.date} is not a Monday`);
    }

    const previous = lines[index - 1];
    if (previous) {
      if (line.x <= previous.x) {
        failures.push(`slide ${slideNumber}: grid lines out of order at ${line.date}`);
      } else if (line.x - previous.x <= minGapIn) {
        failures.push(
          `slide ${slideNumber}: grid lines ${(line.x - previous.x).toFixed(4)}in apart at ${previous.date}/${line.date} ` +
            `— under the ${minGapIn.toFixed(4)}in minimum, they read as one`,
        );
      }
    }
  });

  if (lines.length > distinctPositions) {
    failures.push(
      `slide ${slideNumber}: ${lines.length} strokes drawn for ${distinctPositions} calendar positions`,
    );
  }

  return {
    slideNumber,
    window: `${windowStart}..${windowEnd}`,
    calendarMarks,
    distinctPositions,
    strokes: lines.length,
    levels: drawnLevels.join('+'),
  };
}

/** Checks one dashboard-table slide — the deck's other place where a list is
 * cut down to fit. Two rules, the same two the overview footer is held to: the
 * rows drawn have to end inside the content area, and every row cut has to be
 * counted where the reader can see it.
 *
 * The height is re-measured here from the rows themselves rather than read off
 * the model, so a cap that stops matching what the renderers draw — a font size
 * changed on one side, a row height re-derived — surfaces as a failure here
 * instead of as rows drawn off the bottom of a slide. */
function auditDashboardTable(
  slide: DashboardTableSlideModel,
  slideNumber: number,
  failures: string[],
): DashboardTableCoverage {
  const table = slide.table;
  const columnTextWidth = tableColumnTextWidthIn(
    DASHBOARD_TABLE_WIDTH_IN,
    table ? table.headers.length : 1,
  );
  const bottomIn = table
    ? table.rows.reduce(
        (y, row) => y + tableRowHeightIn(row, columnTextWidth),
        DASHBOARD_TABLE_TOP_IN + tableRowHeightIn(table.headers, columnTextWidth),
      )
    : DASHBOARD_TABLE_TOP_IN;

  if (slide.omittedRowCount > 0 && slide.note === null) {
    failures.push(
      `slide ${slideNumber}: ${slide.omittedRowCount} row(s) cut from "${slide.title}" ` +
        `with no note to say so`,
    );
  }
  if (slide.note !== null && slide.omittedRowCount === 0) {
    failures.push(`slide ${slideNumber}: note "${slide.note}" with nothing cut`);
  }

  return {
    slideNumber,
    title: slide.title,
    rowsDrawn: table?.rows.length ?? 0,
    omittedRowCount: slide.omittedRowCount,
    note: slide.note,
    bottomIn,
  };
}

export function analyzeExportCoverage(
  items: TimelineItem[],
  orderedSlides: OrderedSlideModel[],
  links: SlideLinks,
): CoverageReport {
  const exportableItems = items.filter((item) => item.includeInExport !== false);
  const exportableIds = new Set(exportableItems.map((item) => item.id));
  const depthById = buildDepthMap(exportableItems);
  const parentById = new Map(exportableItems.map((item) => [item.id, item.parentId]));

  const failures: string[] = [];
  const slides: SlideCoverage[] = [];
  const grid: GridCoverage[] = [];
  const dashboardTables: DashboardTableCoverage[] = [];
  const present = new Set<string>();
  const rowCounts = new Map<string, number>();
  const barredIds = new Set<string>();
  /** Every slide a task's appendix section appears on, first one first. */
  const sectionSlidesByTaskId = new Map<string, number[]>();
  let announcedAbsent = 0;
  let announcedOffOverview = 0;

  orderedSlides.forEach((slide, index) => {
    const slideNumber = index + 1;
    const taskIds: string[] = [];
    let maxContentY = CONTENT_TOP_IN;

    if (slide.kind === 'overview') {
      announcedAbsent += slide.absentTaskCount;
      announcedOffOverview += slide.omittedFromOverviewCount;

      // A count nobody can read is not an announcement.
      if (slide.omittedFromOverviewCount > 0 && slide.omittedNote === null) {
        failures.push(
          `slide ${slideNumber}: ${slide.omittedFromOverviewCount} task(s) left off the overview ` +
            `with no footer note to say so`,
        );
      }
      if (slide.omittedNote !== null && slide.omittedFromOverviewCount === 0) {
        failures.push(`slide ${slideNumber}: footer note "${slide.omittedNote}" with nothing left out`);
      }
      if (slide.absentTaskCount > slide.omittedFromOverviewCount) {
        failures.push(
          `slide ${slideNumber}: ${slide.absentTaskCount} absent task(s) but only ` +
            `${slide.omittedFromOverviewCount} left off the overview — a task absent from the file ` +
            `cannot be on the overview`,
        );
      }

      slide.bars.forEach((bar) => {
        taskIds.push(bar.id);
        present.add(bar.id);
        barredIds.add(bar.id);
        maxContentY = Math.max(maxContentY, bar.y + BAR_HEIGHT_IN);

        // A bar's height is one of the ladder's rungs and nothing else — a
        // height arrived at any other way means some caller is scaling bars on
        // its own, which is exactly the drift barNesting exists to stop. Not
        // checked against this task's depth in the *plan*: the overview judges
        // depth against the set it draws, so a task whose parent the timeframe
        // or the compact cut removed is legitimately drawn as a root.
        const isLadderHeight = BAR_HEIGHT_RATIO_BY_DEPTH.some(
          (ratio) => Math.abs(bar.barHeight - BAR_HEIGHT_IN * ratio) <= EPSILON_IN,
        );
        if (!isLadderHeight) {
          failures.push(
            `slide ${slideNumber}: bar "${bar.id}" is ${bar.barHeight.toFixed(4)}in tall, ` +
              `which is no rung of the depth ladder`,
          );
        }

        // A bar's name has to say *something*. Truncation is expected — the
        // column is fixed and names are not — but a row rendering "" or a bare
        // "..." has spent a line of the overview identifying nothing, and that
        // is not a state a reader can tell from a bug. It is reachable whenever
        // something else in the Task column is allowed to reserve width ahead of
        // the name (tag pills, once), so it is checked rather than reasoned
        // about.
        if (bar.label.replace(/\.+$/, '').length === 0) {
          failures.push(
            `slide ${slideNumber}: bar "${bar.id}" renders no name (label "${bar.label}")`,
          );
        }

        // Nothing in the Task column may cross into the gutter: the name is
        // truncated against the column and the pills are laid out from where it
        // ends, so an overhanging pill means one of the two measured against a
        // width the other did not.
        const columnRight = CONTENT_X_IN + STATUS_COL_WIDTH_IN + TASK_COL_WIDTH_IN - COLUMN_TEXT_INSET_IN;
        const lastTag = bar.tags[bar.tags.length - 1];
        if (lastTag !== undefined && lastTag.x + lastTag.width > columnRight + EPSILON_IN) {
          failures.push(
            `slide ${slideNumber}: bar "${bar.id}" tag "${lastTag.text}" ends at ` +
              `${(lastTag.x + lastTag.width).toFixed(4)}in, past the Task column's ` +
              `${columnRight.toFixed(4)}in`,
          );
        }

        // The row pitch is what every overlay, the date grid and the
        // bars-per-slide ceiling are pinned to, so a shortened bar has to give
        // its height back evenly to both sides. Off-center by even a little and
        // the dependency connectors — which aim at the row's center line — stop
        // meeting the bars they connect.
        const rowCenter = bar.y + BAR_HEIGHT_IN / 2;
        const barCenter = bar.barY + bar.barHeight / 2;
        if (Math.abs(barCenter - rowCenter) > EPSILON_IN) {
          failures.push(
            `slide ${slideNumber}: bar "${bar.id}" is centered at ${barCenter.toFixed(4)}in ` +
              `but its row's center line is ${rowCenter.toFixed(4)}in`,
          );
        }

        // Wherever the progress label ended up — in the fill, on the track, or
        // clear of a bar too short to hold it — it stays inside the timeline
        // zone. This is the one piece of a bar that is placed relative to the
        // fill rather than clamped with the track, so it is the one that can
        // walk off the slide.
        const labelLeft = bar.progressX;
        const labelRight = bar.progressX + bar.progressWidth;
        if (labelLeft < TIMELINE_X_IN - EPSILON_IN || labelRight > TIMELINE_X_IN + TIMELINE_WIDTH_IN + EPSILON_IN) {
          failures.push(
            `slide ${slideNumber}: bar "${bar.id}" progress label spans ` +
              `${labelLeft.toFixed(4)}-${labelRight.toFixed(4)}in, outside the timeline zone ` +
              `(${TIMELINE_X_IN.toFixed(4)}-${(TIMELINE_X_IN + TIMELINE_WIDTH_IN).toFixed(4)}in)`,
          );
        }
      });

      if (slide.windowStart !== null && slide.windowEnd !== null && slide.windowTierDays !== null) {
        grid.push(
          auditGrid(
            slide.windowStart,
            slide.windowEnd,
            slide.windowTierDays,
            slide.gridLines,
            slideNumber,
            failures,
          ),
        );
      } else if (slide.gridLines.length > 0) {
        failures.push(`slide ${slideNumber}: ${slide.gridLines.length} grid lines but no date window`);
      }
    } else if (slide.kind === 'dashboard-table') {
      const coverage = auditDashboardTable(slide, slideNumber, failures);
      dashboardTables.push(coverage);
      // Fed into the same bottom-of-slide check every other kind gets: these
      // tables are the one thing on a slide whose height comes from how much
      // text each cell holds, so "it fit last time" proves nothing.
      maxContentY = Math.max(maxContentY, coverage.bottomIn);
    } else if (slide.kind === 'detail') {
      slide.sections.forEach((section) => {
        taskIds.push(section.taskId);
        present.add(section.taskId);
        sectionSlidesByTaskId.set(section.taskId, [
          ...(sectionSlidesByTaskId.get(section.taskId) ?? []),
          slideNumber,
        ]);
        maxContentY = Math.max(maxContentY, section.parentTitleY + ROW_LABEL_HEIGHT_IN);

        // The most recent row seen at each depth, so a row's own parent can be
        // located *on this slide*. A row whose parent is neither the section's
        // own task nor a row above it on the same slide is the failure mode the
        // branch-boundary chunking exists to prevent: a level torn in half by a
        // slide break, leaving children indented from nothing.
        const lastRowAtDepth = new Map<number, string>();

        section.subtasks.forEach((row) => {
          taskIds.push(row.taskId);
          present.add(row.taskId);
          rowCounts.set(row.taskId, (rowCounts.get(row.taskId) ?? 0) + 1);
          maxContentY = Math.max(maxContentY, row.y + LIST_ROW_HEIGHT_IN);

          const planDepth = depthById.get(row.taskId);
          if (planDepth === undefined) {
            failures.push(`slide ${slideNumber}: row "${row.taskId}" is not an exportable task`);
          } else if (planDepth - 1 !== row.depth) {
            // The row's drawn depth and the shared depth map must agree, or the
            // slide is indenting by a number the rest of the app never sees.
            failures.push(
              `slide ${slideNumber}: row "${row.taskId}" drawn at depth ${row.depth}, ` +
                `depth map says ${planDepth - 1}`,
            );
          }

          const expectedX = CONTENT_X_IN + subtaskRowIndent(row.depth);
          if (Math.abs(row.labelX - expectedX) > EPSILON_IN) {
            failures.push(
              `slide ${slideNumber}: row "${row.taskId}" at x=${row.labelX.toFixed(4)}in, ` +
                `barNesting says ${expectedX.toFixed(4)}in`,
            );
          }

          const expectedParent = row.depth === 0 ? section.taskId : lastRowAtDepth.get(row.depth - 1);
          const actualParent = parentById.get(row.taskId);
          if (expectedParent === undefined) {
            failures.push(
              `slide ${slideNumber}: row "${row.taskId}" (depth ${row.depth}) has no parent row ` +
                `on this slide — a level was split across a slide break`,
            );
          } else if (actualParent !== expectedParent) {
            failures.push(
              `slide ${slideNumber}: row "${row.taskId}" follows "${expectedParent}" but its ` +
                `parent is "${actualParent ?? 'none'}"`,
            );
          }

          lastRowAtDepth.set(row.depth, row.taskId);
          // A deeper level that came before cannot parent anything that follows
          // this row — clearing them is what makes the check reject a re-entry
          // into a level whose rows are on the previous slide.
          [...lastRowAtDepth.keys()]
            .filter((depth) => depth > row.depth)
            .forEach((depth) => lastRowAtDepth.delete(depth));
        });

        if (section.assigneeY !== undefined) {
          maxContentY = Math.max(maxContentY, section.assigneeY + LIST_ROW_HEIGHT_IN);
        }
        section.comments.forEach((comment) => {
          if (comment.meta) {
            maxContentY = Math.max(maxContentY, comment.meta.y + COMMENT_META_ROW_HEIGHT_IN);
          }
          comment.blocks.forEach((block) => {
            maxContentY = Math.max(maxContentY, block.y + block.height);
          });
        });
      });
    }

    if (maxContentY > CONTENT_BOTTOM_IN + EPSILON_IN) {
      failures.push(
        `slide ${slideNumber} (${slide.kind}): content reaches ${maxContentY.toFixed(3)}in, ` +
          `past the content area's ${CONTENT_BOTTOM_IN.toFixed(3)}in — drawn off the slide`,
      );
    }

    const depths = [...new Set(taskIds.map((id) => depthById.get(id) ?? -1))].sort((a, b) => a - b);
    slides.push({ slideNumber, kind: slide.kind, title: slide.title, depths, taskIds });
  });

  // --- "(continued)" labelling -------------------------------------------------
  // A parent whose content spilled must say so on every slide after the first,
  // and must not say so on the first — otherwise a reader cannot tell a
  // continuation from a second, separate section for the same task.
  orderedSlides.forEach((slide, index) => {
    if (slide.kind !== 'detail') return;
    slide.sections.forEach((section) => {
      const firstSlide = (sectionSlidesByTaskId.get(section.taskId) ?? [])[0];
      const isContinuation = index + 1 !== firstSlide;
      const saysContinued = section.parentTitle.endsWith(CONTINUED_SUFFIX);
      if (isContinuation !== saysContinued) {
        failures.push(
          `slide ${index + 1}: section "${section.parentTitle}" ` +
            `${saysContinued ? 'claims to be' : 'is'} a continuation of slide ${firstSlide}` +
            `${saysContinued ? ' but is the first section for that task' : ' but is not labelled'}`,
        );
      }
    });
  });

  // --- links point at real content --------------------------------------------
  const slideCount = orderedSlides.length;
  if (links.overviewSlideNumber === null) {
    failures.push('no overview slide for the "Back to overview" links to return to');
  } else if (
    links.overviewSlideNumber < 1 ||
    links.overviewSlideNumber > slideCount ||
    orderedSlides[links.overviewSlideNumber - 1].kind !== 'overview'
  ) {
    failures.push(`"Back to overview" points at slide ${links.overviewSlideNumber}, not an overview slide`);
  }

  links.detailSlideNumberByTaskId.forEach((slideNumber, taskId) => {
    const target = slideNumber >= 1 && slideNumber <= slideCount ? orderedSlides[slideNumber - 1] : undefined;
    if (!target || target.kind !== 'detail') {
      failures.push(`task "${taskId}" links to slide ${slideNumber}, which holds no appendix section`);
      return;
    }
    if (!target.sections.some((section) => section.taskId === taskId)) {
      failures.push(`task "${taskId}" links to slide ${slideNumber}, which has no section for it`);
      return;
    }
    const firstSlide = (sectionSlidesByTaskId.get(taskId) ?? [])[0];
    if (slideNumber !== firstSlide) {
      failures.push(
        `task "${taskId}" links to slide ${slideNumber}, but its subtree starts on slide ${firstSlide}`,
      );
    }
  });

  // Every task that has a section must be reachable by a click, and nothing
  // else may be: a bar linking nowhere is a dead click, a link to a task with
  // no section is a click into empty space.
  sectionSlidesByTaskId.forEach((_slideNumbers, taskId) => {
    if (!links.detailSlideNumberByTaskId.has(taskId)) {
      failures.push(`task "${taskId}" has an appendix section but no link to it`);
    }
  });

  // --- the invariant itself ----------------------------------------------------
  const missing = exportableItems.filter((item) => !present.has(item.id)).map((item) => item.id);
  const extra = [...present].filter((id) => !exportableIds.has(id));
  const duplicated = [...rowCounts.entries()].filter(([, count]) => count > 1).map(([id]) => id);

  if (missing.length !== announcedAbsent) {
    failures.push(
      `${missing.length} task(s) absent from the deck, but the footers announce ` +
        `${announcedAbsent} — every absent task must be counted where the reader can see it`,
    );
  }

  // The other half of the footer's claim: the tasks it says are off the
  // overview are exactly the tasks with no bar. Every depth counts now — the
  // overview draws subtasks as bars too, so a check that still looked only at
  // depth 0 would pass while every missing subtask went unannounced.
  const tasksWithoutBar = exportableItems.filter((item) => !barredIds.has(item.id)).length;
  if (tasksWithoutBar !== announcedOffOverview) {
    failures.push(
      `${tasksWithoutBar} task(s) have no overview bar, but the footers announce ` +
        `${announcedOffOverview}`,
    );
  }
  extra.forEach((id) => failures.push(`task "${id}" is excluded from export but appears in the deck`));
  duplicated.forEach((id) => failures.push(`task "${id}" is listed as a subtask row more than once`));

  return {
    grid,
    dashboard: dashboardTables,
    planTaskCount: exportableItems.length,
    fileTaskCount: present.size,
    missing,
    extra,
    duplicated,
    announcedAbsent,
    announcedOffOverview,
    slides,
    failures,
  };
}
