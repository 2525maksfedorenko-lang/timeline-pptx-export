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
  /** Folds several groups away at once — a whole branch, rather than the one
   * level a caret folds. */
  collapseBranch: (ids: string[]) => void;

  /** The row the Edit Task panel is open on. */
  selectedId: string | null;
  select: (id: string | null) => void;

  /** The row whose name is being edited in the list, and the text in its
   * field. Here rather than in the list itself because a rename now starts
   * from three places — a double-click on the name, the row's context menu,
   * and a sub-task the moment it is created — and only the first is inside
   * the column. */
  renamingId: string | null;
  renameDraft: string;
  beginRename: (id: string, label: string) => void;
  setRenameDraft: (text: string) => void;
  endRename: () => void;

  /** The parent whose sub-tasks the plan is narrowed to, or null for the
   * whole plan. A way of looking at the current plan and nothing more — no
   * second plan is created, and leaving the focus leaves the plan exactly as
   * it was. */
  focusId: string | null;
  setFocus: (id: string | null) => void;

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
  collapseBranch: (ids) =>
    set((state) => ({
      collapsed: { ...state.collapsed, ...Object.fromEntries(ids.map((id) => [id, true])) },
    })),

  selectedId: null,
  select: (selectedId) => set({ selectedId }),

  renamingId: null,
  renameDraft: '',
  beginRename: (renamingId, label) => set({ renamingId, renameDraft: label }),
  setRenameDraft: (renameDraft) => set({ renameDraft }),
  endRename: () => set({ renamingId: null, renameDraft: '' }),

  focusId: null,
  // Entering a focus closes the Edit Task panel: the row it was open on is
  // usually the parent, which is the one row the focused view does not draw.
  setFocus: (focusId) => set({ focusId, selectedId: null }),

  panelWide: false,
  togglePanelWide: () => set((state) => ({ panelWide: !state.panelWide })),

  todayNonce: 0,
  requestToday: () => set((state) => ({ todayNonce: state.todayNonce + 1 })),
}));
