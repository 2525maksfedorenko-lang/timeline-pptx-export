import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clampListWidth, DEFAULT_LIST_WIDTH_PX } from './geometry';
import type { TimeScale } from './scale';

/* What the plan screen remembers about how it is being looked at.
 *
 * Deliberately separate from `timelineStore`: none of it is part of a plan.
 * Almost all of it is session-only, too — a collapsed group and a selected
 * row describe where someone is in a plan right now, and reopening the app
 * should show the whole plan again rather than where they left off looking
 * at it.
 *
 * `listWidth` is the one exception, and it is a different kind of thing: not
 * a place in a plan but the shape of the workspace, like a window's size. It
 * is the only key `partialize` lets through to localStorage, and the one to
 * check against before adding anything here: a half-written comment
 * (`commentDrafts`) is session-only on purpose, and so is everything else.
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

  /** Half-written comments, by the id of the task they belong to.
   *
   * Here rather than in the panel because the panel is the one thing that
   * cannot hold it: the panel unmounts the moment it closes, and the whole
   * point is that a comment typed but not posted survives the close — the X,
   * a press outside, Escape — and is still there when the task is opened
   * again. Every other control in the panel writes to the plan as it is
   * changed and needs no draft at all; a comment is the exception because
   * posting it is an explicit act, and one nobody should perform by accident
   * on the way out of the panel.
   *
   * Keyed by task, not a single string, because the panel switches between
   * tasks without closing — a click on another bar — and a draft must not
   * follow the panel onto a task it was not written about.
   *
   * **Session-only, deliberately.** It is not in `partialize` below and must
   * not be added: a half-written comment is a thought in progress, and one
   * from last week surfacing when a task is reopened is not a recovered draft,
   * it is a surprise. It shares that with `planNotices` in the plan store, and
   * for the same reason. A reload is where it ends.
   *
   * An entry outlives its task by nothing: `dropCommentDrafts` is called with
   * the whole branch when a task is deleted, so a key here always names a task
   * the plan still has. That matters beyond tidiness — a plan exported to JSON
   * and imported back brings its tasks *with their original ids*, so a draft
   * left behind under a deleted id could surface under the task that came
   * back. */
  commentDrafts: Record<string, string>;
  setCommentDraft: (taskId: string, body: string) => void;
  /** Forgets the drafts of `taskIds` — the task a comment was just posted on,
   * and every task in a branch being deleted. */
  dropCommentDrafts: (taskIds: string[]) => void;

  /** Bumped by the toolbar's Today button. The scroll container lives in the
   * canvas and the button in the header, and they are no longer parent and
   * child — so the ask travels as a counter the canvas watches, rather than
   * as a ref handed up through the tree. */
  todayNonce: number;
  requestToday: () => void;

  /** Whether the task drawer is out, below the mobile breakpoint. Above it
   * this is not read at all: the task list is a column there and cannot be
   * put away.
   *
   * Here for the same reason `todayNonce` is: the button that opens the
   * drawer is in the app header and the drawer is in the canvas, and the two
   * are siblings rather than parent and child. Session-only, like everything
   * else in this store bar `listWidth` — a drawer left open is where someone
   * was a moment ago, not a setting. */
  isTaskDrawerOpen: boolean;
  setTaskDrawerOpen: (isOpen: boolean) => void;
  toggleTaskDrawer: () => void;
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

      commentDrafts: {},
      setCommentDraft: (taskId, body) =>
        set((state) => ({ commentDrafts: { ...state.commentDrafts, [taskId]: body } })),
      dropCommentDrafts: (taskIds) =>
        set((state) => {
          const next = { ...state.commentDrafts };
          let changed = false;
          taskIds.forEach((id) => {
            if (id in next) {
              delete next[id];
              changed = true;
            }
          });
          // A new object only when one was actually dropped, so deleting a
          // task nobody was writing about re-renders nothing.
          return changed ? { commentDrafts: next } : {};
        }),

      todayNonce: 0,
      requestToday: () => set((state) => ({ todayNonce: state.todayNonce + 1 })),

      isTaskDrawerOpen: false,
      setTaskDrawerOpen: (isTaskDrawerOpen) => set({ isTaskDrawerOpen }),
      toggleTaskDrawer: () => set((state) => ({ isTaskDrawerOpen: !state.isTaskDrawerOpen })),
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
