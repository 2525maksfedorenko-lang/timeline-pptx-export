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
  // Hex without a leading '#' (matching theme.ts's COLORS convention) — the
  // badge/swatch fill everywhere this person shows up (GanttRow's assignee
  // badge, a detail slide's "Assigned to" line). Looked up by id at
  // assignment time but by *name* at render time (see GanttRow.tsx and
  // timelineExportModel.ts), so two different people who happen to share a
  // name are visually distinct only up to the point where a task is
  // actually assigned — from then on the task just remembers a name, not
  // which of them it was.
  color: string;
}

// Eight hues spread evenly around the wheel so any two are easy to tell
// apart at badge size, deliberately clear of the app's own status/brand
// hues (gray/amber/teal/coral — see TASK_STATUS_COLORS and theme.ts) so a
// person's color is never mistaken for a status.
const PERSON_COLOR_PALETTE = [
  'EF4444', // red
  'F97316', // orange
  '84CC16', // lime
  '22C55E', // green
  '06B6D4', // cyan
  '3B82F6', // blue
  'A855F7', // purple
  'EC4899', // pink
];

function nextPaletteColor(existingCount: number): string {
  return PERSON_COLOR_PALETTE[existingCount % PERSON_COLOR_PALETTE.length];
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
    const stored = await db.getAll(STORE_NAME);

    // Records saved before `color` existed on Person come back without one
    // — backfill from the palette (by position, same rule as a fresh
    // addPerson) and persist it, so it's a real stable value from here on
    // rather than being silently re-derived differently on every load.
    let migrated = false;
    const people = stored.map((person, index) => {
      if (person.color) return person;
      migrated = true;
      return { ...person, color: nextPaletteColor(index) };
    });

    set({ people });
    if (migrated) {
      await Promise.all(people.map((person) => db.put(STORE_NAME, person)));
    }
  },

  addPerson: async (name) => {
    const trimmed = name.trim();

    // No dedup-by-name here on purpose: "+ Add new person" is an explicit
    // "this is someone new" action (reusing an existing person means
    // picking them from the dropdown instead), and two real people can
    // share a first name — each gets their own id and, via the palette,
    // usually a different color to tell them apart by.
    const person: Person = {
      id: crypto.randomUUID(),
      name: trimmed,
      color: nextPaletteColor(get().people.length),
    };
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
