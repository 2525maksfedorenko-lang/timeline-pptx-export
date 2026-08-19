import { openDB, type IDBPDatabase } from 'idb';
import type { TimelineItem } from '../types/timeline';
import { normalizeItemStatuses } from '../utils/normalizeStatus';
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

export async function getAllPlans(): Promise<SavedPlan[]> {
  const db = await getDb();
  const plans: SavedPlan[] = await db.getAll(STORE_NAME);

  // Repaired on the way out, not only on the way in. Plans saved before the
  // importers normalized statuses are already sitting in this database, and
  // this is the only door they can come back through — without the same rule
  // here, a plan that once imported "In Progress" from JSON would keep it for
  // good, and every reopening would draw a status the colour table, the chip
  // and the export sort all fail to match. Nothing is written back: the repair
  // costs nothing to redo, and the next save persists it anyway.
  return plans.map((plan) => ({ ...plan, items: normalizeItemStatuses(plan.items).items }));
}

export async function deletePlan(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}
