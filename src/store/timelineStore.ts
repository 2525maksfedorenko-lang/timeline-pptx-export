import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TaskComment, Timeline, TimelineItem } from '../types/timeline';
import {
  deletePlan as deletePlanFromDb,
  getAllPlans,
  savePlan as persistPlan,
  type SavedPlan,
} from './planStorage';

export type { SavedPlan };

export interface ExportOptions {
  theme: string;
  scale: Timeline['scale'];
  showProgress: boolean;
  showDependencies: boolean;
  commentMode: 'latest' | 'pinned' | 'all' | 'none';
}

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
  commentMode: 'latest',
};

const DEFAULT_UI: UiState = {
  selectedItemId: null,
  zoomLevel: 1,
  editingItemId: null,
};

const mockItems: TimelineItem[] = [
  {
    id: '1',
    label: 'Research',
    start: '2026-08-01',
    end: '2026-08-05',
    progress: 100,
    group: 'Phase 1',
    color: '#3b82f6',
  },
  {
    id: '2',
    label: 'Design',
    start: '2026-08-04',
    end: '2026-08-10',
    progress: 60,
    group: 'Phase 1',
    color: '#8b5cf6',
    dependencies: ['1'],
  },
  {
    id: '3',
    label: 'Development',
    start: '2026-08-08',
    end: '2026-08-20',
    progress: 30,
    group: 'Phase 2',
    color: '#f59e0b',
    dependencies: ['2'],
  },
  {
    id: '4',
    label: 'Testing',
    start: '2026-08-18',
    end: '2026-08-25',
    progress: 0,
    group: 'Phase 2',
    color: '#ef4444',
    dependencies: ['3'],
  },
  {
    id: '3a',
    label: 'Backend API',
    start: '2026-08-08',
    end: '2026-08-14',
    progress: 50,
    group: 'Phase 2',
    color: '#f59e0b',
    parentId: '3',
  },
  {
    id: '3b',
    label: 'Frontend UI',
    start: '2026-08-12',
    end: '2026-08-20',
    progress: 20,
    group: 'Phase 2',
    color: '#f59e0b',
    parentId: '3',
  },
  {
    id: '5',
    label: 'Internal Notes',
    start: '2026-08-01',
    end: '2026-08-02',
    progress: 100,
    group: 'Internal',
    color: '#94a3b8',
    includeInExport: false,
  },
];

const mockComments: TaskComment[] = [
  {
    id: 'c1',
    taskId: '2',
    body: 'Initial design review looks good, ready for sign-off.',
    isPinned: true,
    createdAt: '2026-08-05T10:00:00.000Z',
  },
  {
    id: 'c2',
    taskId: '2',
    body: 'Updated color palette per client feedback.',
    createdAt: '2026-08-07T09:30:00.000Z',
  },
  {
    id: 'c3',
    taskId: '3',
    body: 'Backend API contracts finalized with the mobile team.',
    createdAt: '2026-08-10T14:00:00.000Z',
  },
];

export const useTimelineStore = create<TimelineStore>()(
  persist(
    (set, get) => ({
      title: 'Демо-проект',
      setTitle: (title) => set({ title }),

      items: mockItems,
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      updateItem: (id, patch) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        })),
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((item) => item.id !== id) })),

      comments: mockComments,
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
          const now = new Date().toISOString();
          const defaultPlan: SavedPlan = {
            id: crypto.randomUUID(),
            name: state.title || 'Демо-проект',
            items: state.items,
            exportOptions: state.exportOptions,
            createdAt: now,
            updatedAt: now,
          };
          await persistPlan(defaultPlan);
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
      name: 'timeline-pptx-export-storage',
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
