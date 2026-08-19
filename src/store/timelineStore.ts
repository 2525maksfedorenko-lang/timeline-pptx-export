import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ExportOptions,
  ExportTimeframe,
  TaskComment,
  TimelineItem,
} from '../types/timeline';
import { normalizeItemStatuses } from '../utils/normalizeStatus';
import { getDescendantIds } from '../utils/taskHierarchy';
import { DEV_SEED_COMMENTS, DEV_SEED_ITEMS, DEV_SEED_TITLE } from './devSeed';
import {
  deletePlan as deletePlanFromDb,
  getAllPlans,
  savePlan as persistPlan,
  type SavedPlan,
} from './planStorage';

export type { SavedPlan };
// Re-exported for convenience; they are declared in types/timeline.ts now.
export type { ExportOptions, ExportTimeframe };

export interface UiState {
  selectedItemId: string | null;
  zoomLevel: number;
  editingItemId: string | null;
}

interface TimelineStore {
  title: string;
  setTitle: (title: string) => void;

  items: TimelineItem[];
  addItem: (item: TimelineItem) => void;
  updateItem: (id: string, patch: Partial<TimelineItem>) => void;
  removeItem: (id: string) => void;
  // Parent-with-subtasks-aware variants of the two actions above: fall back
  // to the plain single-item behavior when `id` has no subtasks.
  toggleIncludeInExportCascade: (id: string) => void;
  deleteTaskCascade: (id: string) => void;

  comments: TaskComment[];
  addComment: (comment: TaskComment) => void;
  removeComment: (id: string) => void;

  exportOptions: ExportOptions;
  updateExportOptions: (patch: Partial<ExportOptions>) => void;

  ui: UiState;
  selectItem: (id: string | null) => void;
  setZoomLevel: (zoomLevel: number) => void;
  setEditingItem: (id: string | null) => void;

  // Multiple plans, persisted locally in IndexedDB (see planStorage.ts).
  activePlanId: string | null;
  savedPlans: SavedPlan[];
  loadPlans: () => Promise<void>;
  saveCurrentAsPlan: (name: string) => Promise<void>;
  switchToPlan: (id: string) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  theme: 'default',
  scale: 'days',
  showProgress: true,
  showDependencies: true,
  showHierarchyLines: true,
  commentMode: 'latest',
  sortMode: 'status',
  exportTimeframe: null,
};

const DEFAULT_UI: UiState = {
  selectedItemId: null,
  zoomLevel: 1,
  editingItemId: null,
};

/**
 * First-run bootstrap: persists `seed` (whatever is currently in memory —
 * the dev seed on a truly first visit, or in-memory state recovered from
 * localStorage if IndexedDB's plan list is empty for some other reason) as
 * the first saved plan. Kept as a standalone function, separate from the
 * store's closure, so a product integration can call a different bootstrap
 * (e.g. fetch the user's real plan from an API) instead of editing the
 * store engine itself.
 */
export async function initializeStore(seed: {
  title: string;
  items: TimelineItem[];
  exportOptions: ExportOptions;
}): Promise<SavedPlan> {
  const now = new Date().toISOString();
  const plan: SavedPlan = {
    id: crypto.randomUUID(),
    name: seed.title || DEV_SEED_TITLE,
    items: seed.items,
    exportOptions: seed.exportOptions,
    createdAt: now,
    updatedAt: now,
  };
  await persistPlan(plan);
  return plan;
}

export const useTimelineStore = create<TimelineStore>()(
  persist(
    (set, get) => ({
      title: DEV_SEED_TITLE,
      setTitle: (title) => set({ title }),

      items: DEV_SEED_ITEMS,
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      updateItem: (id, patch) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        })),
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((item) => item.id !== id) })),

      toggleIncludeInExportCascade: (id) => {
        const state = get();
        const item = state.items.find((candidate) => candidate.id === id);
        if (!item) return;

        const descendantIds = getDescendantIds(state.items, id);
        const nextValue = !(item.includeInExport !== false);

        if (descendantIds.length === 0) {
          state.updateItem(id, { includeInExport: nextValue });
          return;
        }

        const idsToUpdate = new Set([id, ...descendantIds]);
        set((current) => ({
          items: current.items.map((candidate) =>
            idsToUpdate.has(candidate.id) ? { ...candidate, includeInExport: nextValue } : candidate,
          ),
        }));
      },

      deleteTaskCascade: (id) => {
        const state = get();
        const idsToRemove = new Set([id, ...getDescendantIds(state.items, id)]);

        set((current) => ({
          items: current.items
            .filter((item) => !idsToRemove.has(item.id))
            .map((item) =>
              item.dependencies?.some((depId) => idsToRemove.has(depId))
                ? { ...item, dependencies: item.dependencies.filter((depId) => !idsToRemove.has(depId)) }
                : item,
            ),
          comments: current.comments.filter((comment) => !idsToRemove.has(comment.taskId)),
        }));
      },

      comments: DEV_SEED_COMMENTS,
      addComment: (comment) => set((state) => ({ comments: [...state.comments, comment] })),
      removeComment: (id) =>
        set((state) => ({ comments: state.comments.filter((comment) => comment.id !== id) })),

      exportOptions: DEFAULT_EXPORT_OPTIONS,
      updateExportOptions: (patch) =>
        set((state) => ({ exportOptions: { ...state.exportOptions, ...patch } })),

      ui: DEFAULT_UI,
      selectItem: (id) => set((state) => ({ ui: { ...state.ui, selectedItemId: id } })),
      setZoomLevel: (zoomLevel) => set((state) => ({ ui: { ...state.ui, zoomLevel } })),
      setEditingItem: (id) => set((state) => ({ ui: { ...state.ui, editingItemId: id } })),

      activePlanId: null,
      savedPlans: [],

      loadPlans: async () => {
        const plans = await getAllPlans();

        if (plans.length === 0) {
          const state = get();
          const defaultPlan = await initializeStore({
            title: state.title,
            items: state.items,
            exportOptions: state.exportOptions,
          });
          set({ savedPlans: [defaultPlan], activePlanId: defaultPlan.id });
          return;
        }

        const state = get();
        const persistedActivePlan = plans.find((plan) => plan.id === state.activePlanId);

        if (persistedActivePlan) {
          // localStorage already restored the latest items/exportOptions for this plan
          // (possibly newer than the last IndexedDB flush) — keep them and just sync
          // IndexedDB, instead of overwriting current state with a stale snapshot.
          const hasDrift =
            JSON.stringify(persistedActivePlan.items) !== JSON.stringify(state.items) ||
            JSON.stringify(persistedActivePlan.exportOptions) !== JSON.stringify(state.exportOptions);

          if (!hasDrift) {
            set({ savedPlans: plans });
            return;
          }

          const refreshedPlan: SavedPlan = {
            ...persistedActivePlan,
            items: state.items,
            exportOptions: state.exportOptions,
            updatedAt: new Date().toISOString(),
          };
          await persistPlan(refreshedPlan);
          set({
            savedPlans: plans.map((plan) => (plan.id === refreshedPlan.id ? refreshedPlan : plan)),
          });
          return;
        }

        const fallbackPlan = plans[0];
        set({
          savedPlans: plans,
          activePlanId: fallbackPlan.id,
          title: fallbackPlan.name,
          items: fallbackPlan.items,
          exportOptions: fallbackPlan.exportOptions,
        });
      },

      saveCurrentAsPlan: async (name) => {
        const state = get();
        const now = new Date().toISOString();
        const existing = state.savedPlans.find((plan) => plan.name === name);

        const plan: SavedPlan = existing
          ? { ...existing, items: state.items, exportOptions: state.exportOptions, updatedAt: now }
          : {
              id: crypto.randomUUID(),
              name,
              items: state.items,
              exportOptions: state.exportOptions,
              createdAt: now,
              updatedAt: now,
            };

        await persistPlan(plan);
        set((current) => ({
          savedPlans: existing
            ? current.savedPlans.map((p) => (p.id === plan.id ? plan : p))
            : [...current.savedPlans, plan],
          activePlanId: plan.id,
          title: plan.name,
        }));
      },

      switchToPlan: async (id) => {
        const state = get();
        if (id === state.activePlanId) return;

        const targetPlan = state.savedPlans.find((plan) => plan.id === id);
        if (!targetPlan) return;

        // Flush in-progress edits on the outgoing plan before switching away.
        const outgoingPlan = state.savedPlans.find((plan) => plan.id === state.activePlanId);
        if (outgoingPlan) {
          const flushedPlan: SavedPlan = {
            ...outgoingPlan,
            items: state.items,
            exportOptions: state.exportOptions,
            updatedAt: new Date().toISOString(),
          };
          await persistPlan(flushedPlan);
          set((current) => ({
            savedPlans: current.savedPlans.map((p) => (p.id === flushedPlan.id ? flushedPlan : p)),
          }));
        }

        set({
          activePlanId: targetPlan.id,
          title: targetPlan.name,
          items: targetPlan.items,
          exportOptions: targetPlan.exportOptions,
          ui: DEFAULT_UI,
        });
      },

      deletePlan: async (id) => {
        await deletePlanFromDb(id);
        const state = get();
        const remaining = state.savedPlans.filter((plan) => plan.id !== id);

        if (state.activePlanId !== id) {
          set({ savedPlans: remaining });
          return;
        }

        const next = remaining[0] ?? null;
        set({
          savedPlans: remaining,
          activePlanId: next?.id ?? null,
          title: next?.name ?? '',
          items: next?.items ?? [],
          exportOptions: next?.exportOptions ?? DEFAULT_EXPORT_OPTIONS,
          ui: DEFAULT_UI,
        });
      },
    }),
    {
      // Two persistence layers exist by design, not by accident:
      // - localStorage (this `persist` middleware) mirrors only the
      //   *currently active* plan's working state. It's synchronous, so it
      //   restores instantly on reload — before IndexedDB has even opened —
      //   avoiding a flash of empty/seed data while `loadPlans()` (async)
      //   resolves.
      // - IndexedDB (`planStorage.ts`) is the durable, authoritative store
      //   for the *list* of named saved plans (the multi-plan library
      //   feature) — something a single flat localStorage key can't model.
      // `loadPlans()` reconciles the two on startup. If a product
      // integration doesn't need multiple named plans, IndexedDB can be
      // dropped and this `persist` config becomes the only storage layer.
      name: 'timeline-pptx-export-storage',
      // The same repair getAllPlans does, on the other door — and the one that
      // opens first. This mirror restores synchronously on reload, before
      // IndexedDB has even opened, so a plan that predates the importers'
      // status rule would otherwise be drawn with an unmatched status until
      // loadPlans() resolved, and saved straight back that way if anything was
      // edited in between.
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<TimelineStore>;

        return {
          ...currentState,
          ...persisted,
          items: persisted.items ? normalizeItemStatuses(persisted.items).items : currentState.items,
        };
      },
      partialize: (state) => ({
        title: state.title,
        items: state.items,
        comments: state.comments,
        exportOptions: state.exportOptions,
        activePlanId: state.activePlanId,
      }),
    },
  ),
);
