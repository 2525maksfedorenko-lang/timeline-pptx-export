import { openDB, type IDBPDatabase } from 'idb';
import type { TaskComment, TimelineItem } from '../types/timeline';
import { normalizePlanItems } from '../utils/normalizePlanItems';
import { repairNotice, type PlanNotice } from '../utils/planNotice';
import type { ExportOptions } from '../types/timeline';

export interface SavedPlan {
  id: string;
  name: string;
  items: TimelineItem[];
  /** What has been said about this plan's tasks, keyed by task id.
   *
   * Part of the plan, and it has to be: a comment is about a task, a task is
   * in exactly one plan, so a comment is in exactly one plan. It lived beside
   * the plans instead — one flat list belonging to the browser — until
   * `fix/comments-belong-to-the-plan`, which meant switching plans left every
   * comment on screen and a plan opened somewhere else showed none of its own.
   *
   * Records written before that have no such field at all. `getAllPlans`
   * gives them one, and the store adopts the old flat list into it once; see
   * `planIdsMissingComments` below. */
  comments: TaskComment[];
  exportOptions: ExportOptions;
  createdAt: string;
  updatedAt: string;
}

const DB_NAME = 'timeline-pptx-export';
const DB_VERSION = 1;
const STORE_NAME = 'plans';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function savePlan(plan: SavedPlan): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, plan);
}

export interface LoadedPlans {
  plans: SavedPlan[];
  /** Ids of the records that had no `comments` field — plans saved before
   * comments belonged to a plan. Always well-formed in `plans` above, because
   * this door is where a missing field is given its empty array; this set is
   * only how the store knows a record predates the field, which is what tells
   * it whether the old flat list still has to be adopted. Empty once every
   * plan in the database has been written since. */
  planIdsMissingComments: Set<string>;
  /** What had to be repaired to load each plan, keyed by plan id — see
   * normalizePlanItems. Kept per plan rather than pooled because only the
   * plan actually on screen is worth telling anyone about, and which one that
   * is isn't decided here. */
  noticesByPlanId: Record<string, PlanNotice>;
}

export async function getAllPlans(): Promise<LoadedPlans> {
  const db = await getDb();
  const stored: SavedPlan[] = await db.getAll(STORE_NAME);

  // Repaired on the way out, not only on the way in. Plans saved before the
  // importers ran this pass are already sitting in this database, and this is
  // the only door they can come back through — without the same rule here, a
  // plan that once imported "In Progress" from JSON would keep it for good,
  // every reopening would draw a status the colour table, the chip and the
  // export sort all fail to match, and a plan holding a parent loop would keep
  // hiding those tasks from the chart entirely. Nothing is written back: the
  // repair costs nothing to redo, and the next save persists it anyway.
  //
  // What the repair changed is returned rather than swallowed: an import says
  // so in its dialog, and a reload has to say so too, or the person meets a
  // plan that sorts differently than they left it with no way to find out why.
  const noticesByPlanId: Record<string, PlanNotice> = {};
  const planIdsMissingComments = new Set<string>();
  const plans = stored.map((plan) => {
    const { items, warnings } = normalizePlanItems(plan.items);
    if (warnings.length > 0) noticesByPlanId[plan.id] = repairNotice(warnings);

    // A plan older than the comments field, or one whose field is not an
    // array because a hand-edited JSON file said so, opens as a plan with no
    // comments rather than as an error. Nothing else in the app then has to
    // ask whether `comments` is there.
    const hasComments = Array.isArray(plan.comments);
    if (!hasComments) planIdsMissingComments.add(plan.id);

    return { ...plan, items, comments: hasComments ? plan.comments : [] };
  });

  return { plans, noticesByPlanId, planIdsMissingComments };
}

export async function deletePlan(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}
