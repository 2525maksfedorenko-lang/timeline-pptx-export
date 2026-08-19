import { openDB, type IDBPDatabase } from 'idb';
import type { TimelineItem } from '../types/timeline';
import { normalizePlanItems } from '../utils/normalizePlanItems';
import type { ExportOptions } from './timelineStore';

export interface SavedPlan {
  id: string;
  name: string;
  items: TimelineItem[];
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
  /** What had to be repaired to load each plan, keyed by plan id — see
   * normalizePlanItems. Kept per plan rather than pooled because only the
   * plan actually on screen is worth telling anyone about, and which one that
   * is isn't decided here. */
  noticesByPlanId: Record<string, string[]>;
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
  const noticesByPlanId: Record<string, string[]> = {};
  const plans = stored.map((plan) => {
    const { items, warnings } = normalizePlanItems(plan.items);
    if (warnings.length > 0) noticesByPlanId[plan.id] = warnings;
    return { ...plan, items };
  });

  return { plans, noticesByPlanId };
}

export async function deletePlan(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}
