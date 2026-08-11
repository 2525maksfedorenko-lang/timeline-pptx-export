import { create } from 'zustand';
import type { Timeline, TimelineItem } from '../types/timeline';

export interface ExportOptions {
  theme: string;
  scale: Timeline['scale'];
  showProgress: boolean;
  showDependencies: boolean;
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
];

const initialPlan: SavedPlan = {
  id: 'plan-1',
  name: 'Демо-проект',
  title: 'Демо-проект',
  items: mockItems,
  exportOptions: DEFAULT_EXPORT_OPTIONS,
  updatedAt: new Date().toISOString(),
};

export const useTimelineStore = create<TimelineStore>((set) => ({
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
}));
