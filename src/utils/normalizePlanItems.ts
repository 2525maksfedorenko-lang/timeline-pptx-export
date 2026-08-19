import type { TimelineItem } from '../types/timeline';
import { normalizeItemStatuses } from './normalizeStatus';
import { breakParentCycles } from './parentCycles';

export interface PlanNormalization {
  items: TimelineItem[];
  /** Everything that had to be repaired, one plain sentence each — shown in
   * the import dialog for a file, and by PlanNotice for a plan being opened. */
  warnings: string[];
}

/** The one pass every task takes on its way into this app, whichever door it
 * came through: the three parsers (JSON tasks, JSON plan, spreadsheet) and both
 * persistence layers, so a plan saved by an older build is repaired on the way
 * out of storage exactly as a file is on the way in.
 *
 * Two rules today, in the order a reader would apply them: canonicalize what
 * each task *says* (its status), then what the tasks say about *each other*
 * (parent loops). They are independent — neither reads what the other writes —
 * so the order is for legibility, not correctness. Both report rather than
 * throw: a task with an unknown status or a circular parent is still a real
 * task, and the file or plan it came from is still worth opening.
 *
 * `locate` names a task the way its own source counts them — "Task at index 3"
 * for a JSON array — and is passed through to the status rule, which is the one
 * that has something to point at. A parent loop names itself: the loop is the
 * location. */
export function normalizePlanItems(
  items: TimelineItem[],
  locate?: (item: TimelineItem, index: number) => string,
): PlanNormalization {
  const statuses = normalizeItemStatuses(items, locate);
  const parents = breakParentCycles(statuses.items);

  return { items: parents.items, warnings: [...statuses.warnings, ...parents.warnings] };
}
