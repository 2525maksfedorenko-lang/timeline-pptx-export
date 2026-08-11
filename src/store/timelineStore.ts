import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TaskComment, Timeline, TimelineItem } from '../types/timeline';

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

export interface SavedPlan {
  id: string;
  name: string;
  title: string;
  items: TimelineItem[];
  exportOptions: ExportOptions;
  updatedAt: string;
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

  // saved_plans: local browser storage of multiple plans, switchable by id.
  plans: SavedPlan[];
  activePlanId: string | null;
  savePlan: (name?: string) => void;
  createPlan: (name: string) => void;
  loadPlan: (id: string) => void;
  renamePlan: (id: string, name: string) => void;
  deletePlan: (id: string) => void;
}

const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
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

const initialPlan: SavedPlan = {
  id: 'plan-1',
  name: 'Демо-проект',
  title: 'Демо-проект',
  items: mockItems,
  exportOptions: DEFAULT_EXPORT_OPTIONS,
  updatedAt: new Date().toISOString(),
};

export const useTimelineStore = create<TimelineStore>()(
  persist(
    (set) => ({
      title: initialPlan.title,
      setTitle: (title) => set({ title }),

      items: initialPlan.items,
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

      exportOptions: initialPlan.exportOptions,
      updateExportOptions: (patch) =>
        set((state) => ({ exportOptions: { ...state.exportOptions, ...patch } })),

      ui: DEFAULT_UI,
      selectItem: (id) => set((state) => ({ ui: { ...state.ui, selectedItemId: id } })),
      setZoomLevel: (zoomLevel) => set((state) => ({ ui: { ...state.ui, zoomLevel } })),
      setEditingItem: (id) => set((state) => ({ ui: { ...state.ui, editingItemId: id } })),

      plans: [initialPlan],
      activePlanId: initialPlan.id,

      savePlan: (name) =>
        set((state) => {
          const updatedAt = new Date().toISOString();
          const activePlan = state.plans.find((plan) => plan.id === state.activePlanId);

          if (activePlan) {
            return {
              plans: state.plans.map((plan) =>
                plan.id === activePlan.id
                  ? {
                      ...plan,
                      name: name ?? plan.name,
                      title: state.title,
                      items: state.items,
                      exportOptions: state.exportOptions,
                      updatedAt,
                    }
                  : plan,
              ),
            };
          }

          const newPlan: SavedPlan = {
            id: crypto.randomUUID(),
            name: name ?? state.title,
            title: state.title,
            items: state.items,
            exportOptions: state.exportOptions,
            updatedAt,
          };
          return { plans: [...state.plans, newPlan], activePlanId: newPlan.id };
        }),

      createPlan: (name) =>
        set((state) => {
          const newPlan: SavedPlan = {
            id: crypto.randomUUID(),
            name,
            title: name,
            items: [],
            exportOptions: DEFAULT_EXPORT_OPTIONS,
            updatedAt: new Date().toISOString(),
          };
          return {
            plans: [...state.plans, newPlan],
            activePlanId: newPlan.id,
            title: newPlan.title,
            items: newPlan.items,
            exportOptions: newPlan.exportOptions,
            ui: DEFAULT_UI,
          };
        }),

      loadPlan: (id) =>
        set((state) => {
          const plan = state.plans.find((p) => p.id === id);
          if (!plan) return state;
          return {
            activePlanId: plan.id,
            title: plan.title,
            items: plan.items,
            exportOptions: plan.exportOptions,
            ui: DEFAULT_UI,
          };
        }),

      renamePlan: (id, name) =>
        set((state) => ({
          plans: state.plans.map((plan) => (plan.id === id ? { ...plan, name } : plan)),
        })),

      deletePlan: (id) =>
        set((state) => {
          const remaining = state.plans.filter((plan) => plan.id !== id);
          if (state.activePlanId !== id) {
            return { plans: remaining };
          }
          const next = remaining[0] ?? null;
          return {
            plans: remaining,
            activePlanId: next?.id ?? null,
            title: next?.title ?? '',
            items: next?.items ?? [],
            exportOptions: next?.exportOptions ?? DEFAULT_EXPORT_OPTIONS,
          };
        }),
    }),
    {
      name: 'timeline-pptx-export-storage',
      partialize: (state) => ({
        title: state.title,
        items: state.items,
        comments: state.comments,
        exportOptions: state.exportOptions,
        plans: state.plans,
        activePlanId: state.activePlanId,
      }),
    },
  ),
);
