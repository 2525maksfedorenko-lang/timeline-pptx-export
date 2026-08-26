import type { TimelineItem } from '../types/timeline';
import { normalizeItemStatuses } from './normalizeStatus';
import { breakParentCycles } from './parentCycles';

export interface PlanNormalization {
  items: TimelineItem[];
  /** Everything that had to be repaired, one plain sentence each — shown in
   * the import dialog for a file, and by PlanNotice for a plan being opened. */
  warnings: string[];
}

/** A task is in the export unless it says otherwise.
 *
 * Every reader already treats the field this way (`includeInExport !== false`),
 * so an absent flag has always *behaved* as true. It is written down here so
 * the stored task says what it means: a plan hand-written without the field, or
 * saved by a build from before it existed, comes back with it set rather than
 * relying on every future reader remembering which way `undefined` falls. The
 * three in-app "create a task" paths set it themselves (see buildNewTask), as
 * does the spreadsheet importer; JSON was the door that left it blank. */
function withDefaults(item: TimelineItem): TimelineItem {
  return item.includeInExport === undefined ? { ...item, includeInExport: true } : item;
}

/** The one pass every task takes on its way into this app, whichever door it
 * came through: the three parsers (JSON tasks, JSON plan, spreadsheet) and both
 * persistence layers, so a plan saved by an older build is repaired on the way
 * out of storage exactly as a file is on the way in.
 *
 * Three rules today, in the order a reader would apply them: fill in the
 * defaults a task may simply not carry, canonicalize what each task *says* (its
 * status), then what the tasks say about *each other* (parent loops). They are
 * independent — none reads what another writes — so the order is for
 * legibility, not correctness. The last two report rather than throw: a task
 * with an unknown status or a circular parent is still a real task, and the
 * file or plan it came from is still worth opening. The first reports nothing,
 * because a missing default is not a defect.
 *
 * `locate` names a task the way its own source counts them — "Task at index 3"
 * for a JSON array — and is passed through to the status rule, which is the one
 * that has something to point at. A parent loop names itself: the loop is the
 * location. */
export function normalizePlanItems(
  items: TimelineItem[],
  locate?: (item: TimelineItem, index: number) => string,
): PlanNormalization {
  const statuses = normalizeItemStatuses(items.map(withDefaults), locate);
  const parents = breakParentCycles(statuses.items);

  return { items: parents.items, warnings: [...statuses.warnings, ...parents.warnings] };
}
