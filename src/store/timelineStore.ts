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

interface TimelineStore {
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
}

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

export const useTimelineStore = create<TimelineStore>((set) => ({
  items: mockItems,
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  updateItem: (id, patch) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })),
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((item) => item.id !== id) })),

  exportOptions: {
    theme: 'default',
    scale: 'days',
    showProgress: true,
    showDependencies: true,
  },
  updateExportOptions: (patch) =>
    set((state) => ({ exportOptions: { ...state.exportOptions, ...patch } })),

  ui: {
    selectedItemId: null,
    zoomLevel: 1,
    editingItemId: null,
  },
  selectItem: (id) => set((state) => ({ ui: { ...state.ui, selectedItemId: id } })),
  setZoomLevel: (zoomLevel) => set((state) => ({ ui: { ...state.ui, zoomLevel } })),
  setEditingItem: (id) => set((state) => ({ ui: { ...state.ui, editingItemId: id } })),
}));
