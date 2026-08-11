import { openDB, type IDBPDatabase } from 'idb';
import type { TimelineItem } from '../types/timeline';
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
  return db.getAll(STORE_NAME);
}

export async function deletePlan(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}
