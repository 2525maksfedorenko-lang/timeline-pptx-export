import type { TimelineItem } from '../types/timeline';
import { buildDepthMap } from '../utils/barNesting';
import type { OrderedSlideModel } from './slideOrder';
import type { SlideLinks } from './slideLinks';
import {
  BAR_HEIGHT_IN,
  CONTENT_BOTTOM_IN,
  CONTENT_TOP_IN,
  CONTENT_X_IN,
  COMMENT_META_ROW_HEIGHT_IN,
  LIST_ROW_HEIGHT_IN,
  ROW_LABEL_HEIGHT_IN,
  subtaskRowIndent,
} from './slideLayout';

/** Audits a built deck against the plan it was built from.
 *
 * The invariant, in one line: **the set of tasks with `includeInExport !== false`
 * equals the set of tasks present in the file** — where "present" means drawn as
 * an overview bar, as an appendix section title, or as a subtask row. The only
 * licensed exception is a task the file itself *counts* in an overview footer
 * note ("+N tasks not shown"), because then the reader knows it exists.
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
  /** Every broken invariant, one line each. Empty means the deck is sound. */
  failures: string[];
}

const CONTINUED_SUFFIX = '(continued)';
/** Slack for comparing inch coordinates that were reached by summing many
 * fractional row heights — a hair over a boundary is float noise, not overflow. */
const EPSILON_IN = 0.001;

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
          `slide ${slideNumber}: ${slide.omittedFromOverviewCount} root(s) left off the overview ` +
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
      });
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

  // The other half of the footer's claim: the roots it says are off the
  // overview are exactly the roots with no bar. Descendants never get bars, so
  // only depth-0 tasks count here.
  const rootsWithoutBar = exportableItems.filter(
    (item) => depthById.get(item.id) === 0 && !barredIds.has(item.id),
  ).length;
  if (rootsWithoutBar !== announcedOffOverview) {
    failures.push(
      `${rootsWithoutBar} root(s) have no overview bar, but the footers announce ` +
        `${announcedOffOverview}`,
    );
  }
  extra.forEach((id) => failures.push(`task "${id}" is excluded from export but appears in the deck`));
  duplicated.forEach((id) => failures.push(`task "${id}" is listed as a subtask row more than once`));

  return {
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
