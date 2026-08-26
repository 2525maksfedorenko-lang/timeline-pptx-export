import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clampListWidth, DEFAULT_LIST_WIDTH_PX } from './geometry';
import type { TimeScale } from './scale';

/* What the plan screen remembers about how it is being looked at.
 *
 * Deliberately separate from `timelineStore`: none of it is part of a plan.
 * Almost all of it is session-only, too — a collapsed group, a focused branch
 * and a selected row describe where someone is in a plan right now, and
 * reopening the app should show the whole plan again rather than where they
 * left off looking at it.
 *
 * `listWidth` is the one exception, and it is a different kind of thing: not
 * a place in a plan but the shape of the workspace, like a window's size. It
 * is the only key `partialize` lets through to localStorage.
 */
interface GanttViewStore {
  scale: TimeScale;
  setScale: (scale: TimeScale) => void;

  /** The task column's width, dragged on the seam between it and the chart
   * and kept between sessions. Always within `clampListWidth`'s range. */
  listWidth: number;
  setListWidth: (width: number) => void;

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

  /** Bumped by the toolbar's Today button. The scroll container lives in the
   * canvas and the button in the header, and they are no longer parent and
   * child — so the ask travels as a counter the canvas watches, rather than
   * as a ref handed up through the tree. */
  todayNonce: number;
  requestToday: () => void;
}

export const useGanttViewStore = create<GanttViewStore>()(
  persist(
    (set) => ({
      scale: 'week',
      setScale: (scale) => set({ scale }),

      listWidth: DEFAULT_LIST_WIDTH_PX,
      setListWidth: (width) => set({ listWidth: clampListWidth(width) }),

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

      todayNonce: 0,
      requestToday: () => set((state) => ({ todayNonce: state.todayNonce + 1 })),
    }),
    {
      name: 'timeline-pptx-export-view',
      partialize: (state) => ({ listWidth: state.listWidth }),
      // Clamped again on the way out of storage: the bounds can move with a
      // release, and a width written by an older one would otherwise come back
      // outside them.
      merge: (persisted, current) => ({
        ...current,
        listWidth: clampListWidth((persisted as { listWidth?: number } | undefined)?.listWidth ?? current.listWidth),
      }),
    },
  ),
);
