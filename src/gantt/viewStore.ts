import { create } from 'zustand';
import type { StatusFilter } from './rows';
import type { TimeScale } from './scale';

/* What the plan screen remembers about how it is being looked at.
 *
 * Deliberately separate from `timelineStore`, and deliberately not persisted:
 * none of it is part of a plan. A search box, a collapsed group and a
 * selected row describe this session's view, and reopening the app should
 * show the whole plan again rather than someone's half-finished filter.
 *
 * `showDependencies` is the one view flag that is *not* here — the toolbar's
 * "Links" switch drives `exportOptions.showDependencies`, which the export
 * slides read too, and splitting it in two would let the screen and the file
 * disagree about the same setting.
 */
interface GanttViewStore {
  scale: TimeScale;
  setScale: (scale: TimeScale) => void;

  search: string;
  setSearch: (search: string) => void;

  filter: StatusFilter;
  setFilter: (filter: StatusFilter) => void;

  /** Group ids folded away. Absent means expanded. */
  collapsed: Record<string, boolean>;
  toggleCollapsed: (id: string) => void;

  /** The row the Edit Task panel is open on. */
  selectedId: string | null;
  select: (id: string | null) => void;

  showCriticalPath: boolean;
  setShowCriticalPath: (value: boolean) => void;

  /** The panel's expanded width.  */
  panelWide: boolean;
  togglePanelWide: () => void;

  /** Bumped by the toolbar's Today button. The scroll container lives in the
   * canvas and the button in the header, and they are no longer parent and
   * child — so the ask travels as a counter the canvas watches, rather than
   * as a ref handed up through the tree. */
  todayNonce: number;
  requestToday: () => void;
}

export const useGanttViewStore = create<GanttViewStore>()((set) => ({
  scale: 'week',
  setScale: (scale) => set({ scale }),

  search: '',
  setSearch: (search) => set({ search }),

  filter: 'all',
  setFilter: (filter) => set({ filter }),

  collapsed: {},
  toggleCollapsed: (id) =>
    set((state) => ({ collapsed: { ...state.collapsed, [id]: !state.collapsed[id] } })),

  selectedId: null,
  select: (selectedId) => set({ selectedId }),

  showCriticalPath: false,
  setShowCriticalPath: (showCriticalPath) => set({ showCriticalPath }),

  panelWide: false,
  togglePanelWide: () => set((state) => ({ panelWide: !state.panelWide })),

  todayNonce: 0,
  requestToday: () => set((state) => ({ todayNonce: state.todayNonce + 1 })),
}));
