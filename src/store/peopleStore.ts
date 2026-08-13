import { openDB, type IDBPDatabase } from 'idb';
import { create } from 'zustand';

/**
 * Saved list of people usable as a task's assignee, so a name only has to be
 * typed once (see the assignee picker in GanttRow.tsx). Separate from
 * timelineStore/planStorage by design — this list isn't part of any one
 * plan, it's shared across all of them.
 */
export interface Person {
  id: string;
  name: string;
}

const DB_NAME = 'timeline-pptx-export-people';
const DB_VERSION = 1;
const STORE_NAME = 'people';

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

interface PeopleStore {
  people: Person[];
  loadPeople: () => Promise<void>;
  addPerson: (name: string) => Promise<Person>;
  removePerson: (id: string) => Promise<void>;
}

export const usePeopleStore = create<PeopleStore>((set, get) => ({
  people: [],

  loadPeople: async () => {
    const db = await getDb();
    const people = await db.getAll(STORE_NAME);
    set({ people });
  },

  addPerson: async (name) => {
    const trimmed = name.trim();

    // Adding the same name twice reuses the existing entry instead of
    // creating a duplicate row in the picker.
    const existing = get().people.find((person) => person.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;

    const person: Person = { id: crypto.randomUUID(), name: trimmed };
    const db = await getDb();
    await db.put(STORE_NAME, person);
    set((state) => ({ people: [...state.people, person] }));
    return person;
  },

  removePerson: async (id) => {
    const db = await getDb();
    await db.delete(STORE_NAME, id);
    set((state) => ({ people: state.people.filter((person) => person.id !== id) }));
  },
}));
