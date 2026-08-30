import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ExportOptions, TaskComment, TimelineItem } from '../types/timeline';
import { copyBranch, droppedDependencyNotice, uniquePlanName } from '../utils/branchPlan';
import { normalizePlanItems } from '../utils/normalizePlanItems';
import { repairNotice, type PlanNotice } from '../utils/planNotice';
import { getDescendantIds } from '../utils/taskHierarchy';
import {
  deletePlan as deletePlanFromDb,
  getAllPlans,
  savePlan as persistPlan,
  type SavedPlan,
} from './planStorage';

export type { SavedPlan };

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

  // What each plan has to say about itself this session, keyed by plan id —
  // a repair on the way in, or the links a plan made from a branch could not
  // bring with it. See utils/planNotice.ts and PlanNotice. Deliberately
  // absent from `partialize`: it describes this session's view of a plan, so
  // it must not outlive the session that found it.
  planNotices: Record<string, PlanNotice>;
  dismissPlanNotices: () => void;

  // Multiple plans, persisted locally in IndexedDB (see planStorage.ts).
  activePlanId: string | null;
  savedPlans: SavedPlan[];
  loadPlans: () => Promise<void>;
  /** A new, empty plan, saved beside the others and opened.
   *
   * Not "save the current one under another name": that is what this used to
   * be, and it meant the menu's "New plan" handed back a copy of whatever was
   * already open — the store switched, but to identical items, so the screen
   * looked as though nothing had happened. A new plan has nothing in it; there
   * is nothing else it could have. */
  createPlan: (name: string) => Promise<void>;
  /** Gives one plan a new name and changes nothing else about it — in
   * particular it does not mint a second plan, which is what renaming used to
   * mean back when the only way to name one was to save the current one under
   * a new name. */
  renamePlan: (id: string, name: string) => Promise<void>;
  switchToPlan: (id: string) => Promise<void>;
  /** Copies one task and its whole sub-tree into a plan of its own, saves it
   * beside the others and opens it. The plan it was taken from is left
   * exactly as it was — see utils/branchPlan.ts for what is copied. */
  createPlanFromBranch: (rootId: string) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  theme: 'default',
  scale: 'days',
  showProgress: true,
  showDependencies: true,
  commentMode: 'latest',
  sortMode: 'status',
  exportTimeframe: null,
};

/** What the one plan a first-time visitor is given is called. A placeholder
 * rather than a description, because there is nothing in it to describe yet:
 * the app opens on an empty plan, not on a sample of someone else's. */
const DEFAULT_PLAN_NAME = 'Unnamed';

/** Which bucket of `planNotices` a repair belongs to before any plan has been
 * loaded — the mirror can hold items with no plan id beside them. */
const UNNAMED_PLAN_KEY = '';

/** Both doors into a plan repair it, so both can report the same thing about
 * the same plan in one load. The lines are plain sentences, so identical text
 * is identical news: a Set is the whole deduplication rule. The headline the
 * plan already had is kept — a second report on one plan is the same report
 * arriving twice, and its own headline is the same sentence. */
function mergePlanNotices(
  existing: Record<string, PlanNotice>,
  incoming: Record<string, PlanNotice>,
): Record<string, PlanNotice> {
  const merged = { ...existing };
  Object.entries(incoming).forEach(([planId, notice]) => {
    const held = merged[planId];
    merged[planId] = held
      ? { ...held, lines: [...new Set([...held.lines, ...notice.lines])] }
      : notice;
  });
  return merged;
}

/** Moves a plan's notices to the id it ends up with. The mirror keys what it
 * repaired by the plan id it was saved with, and the bootstrap path below
 * mints a *new* id for those same items — without this the notice would be
 * filed under a plan that no longer exists and nobody would ever see it. */
function renamePlanNotices(
  notices: Record<string, PlanNotice>,
  from: string,
  to: string,
): Record<string, PlanNotice> {
  if (from === to || notices[from] === undefined) return notices;

  const renamed = { ...notices };
  delete renamed[from];
  return mergePlanNotices(renamed, { [to]: notices[from] });
}

/** The active plan with the working copy written back into it, ready to be
 * persisted — or null when nothing is active to write back.
 *
 * Leaving a plan has to save it first, and there are two ways to leave one
 * now: switching to another, and making a new one out of a branch of this
 * one. Both flush the same way, so the rule lives here rather than in each.
 *
 * Exported for the third caller, which does not leave the plan at all: saving
 * it out as a JSON file. `savedPlans` holds each plan as of the last flush, so
 * reading that record directly would write a file missing every edit made
 * since — while the deck, the PDF and the CSV beside it all read the working
 * copy. Call it through `useTimelineStore.getState()` at the moment of the
 * click, never as a selector: it builds a new object every call. */
export function flushedActivePlan(state: TimelineStore): SavedPlan | null {
  const outgoing = state.savedPlans.find((plan) => plan.id === state.activePlanId);
  if (!outgoing) return null;

  return {
    ...outgoing,
    items: state.items,
    exportOptions: state.exportOptions,
    updatedAt: new Date().toISOString(),
  };
}

/** Serialises `loadPlans` against itself.
 *
 * The bootstrap inside it is a check-then-write — "the database holds no
 * plans, so write one" — with an `await` sitting between the check and the
 * write. Two calls overlapping there both read an empty database, and both go
 * on to write a plan of their own, so a first visit opens on two identical
 * "Unnamed" plans.
 *
 * The guard is here rather than on whatever called twice, because what called
 * twice is not the defect. React's StrictMode double-invokes the mount effect
 * in development, which is how this was found, but a remount, a second
 * component asking for the list, or an import calling this while a mount is
 * still resolving would all reach the same window. Nothing may bootstrap a
 * second plan, whatever the reason there are two callers.
 *
 * Queued rather than shared. Handing a late caller the in-flight run's promise
 * would close the race just as well, but it would answer a question asked
 * before that caller existed: applying an imported plan writes it to IndexedDB
 * and *then* calls this to pick it up, and it would be handed a list compiled
 * before its own write. So every call runs, one after another — which closes
 * the race too, since the second run finds the plan the first one wrote. */
let planLoadQueue: Promise<void> = Promise.resolve();

/**
 * First-run bootstrap: persists `seed` (whatever is currently in memory —
 * an empty plan on a truly first visit, or in-memory state recovered from
 * localStorage if IndexedDB's plan list is empty for some other reason) as
 * the first saved plan. Kept as a standalone function, separate from the
 * store's closure, so a product integration can call a different bootstrap
 * (e.g. fetch the user's real plan from an API) instead of editing the
 * store engine itself.
 *
 * **Kept on purpose** (docs/cleanup-audit.md, category C): its only caller is
 * `loadPlans` below, in this same file, so a call graph reports the `export`
 * as unused. The export is the seam, not an oversight — it is what a host app
 * replaces to bring its own first plan.
 */
export async function initializeStore(seed: {
  title: string;
  items: TimelineItem[];
  exportOptions: ExportOptions;
}): Promise<SavedPlan> {
  const now = new Date().toISOString();
  const plan: SavedPlan = {
    id: crypto.randomUUID(),
    name: seed.title || DEFAULT_PLAN_NAME,
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
      title: DEFAULT_PLAN_NAME,
      setTitle: (title) => set({ title }),

      items: [],
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

      comments: [],
      addComment: (comment) => set((state) => ({ comments: [...state.comments, comment] })),
      removeComment: (id) =>
        set((state) => ({ comments: state.comments.filter((comment) => comment.id !== id) })),

      exportOptions: DEFAULT_EXPORT_OPTIONS,
      updateExportOptions: (patch) =>
        set((state) => ({ exportOptions: { ...state.exportOptions, ...patch } })),

      planNotices: {},
      dismissPlanNotices: () =>
        set((state) => {
          const key = state.activePlanId ?? UNNAMED_PLAN_KEY;
          if (state.planNotices[key] === undefined) return state;

          const remaining = { ...state.planNotices };
          delete remaining[key];
          return { planNotices: remaining };
        }),

      activePlanId: null,
      savedPlans: [],

      loadPlans: () => {
        const run = async () => {
          const { plans, noticesByPlanId } = await getAllPlans();

          // Merged rather than assigned, and deduplicated: the active plan
          // usually arrives twice in one load — once through the localStorage
          // mirror below, once from here — and the same repair said twice is
          // two lines about one thing.
          set((state) => ({ planNotices: mergePlanNotices(state.planNotices, noticesByPlanId) }));

          if (plans.length === 0) {
            const state = get();
            const defaultPlan = await initializeStore({
              title: state.title,
              items: state.items,
              exportOptions: state.exportOptions,
            });
            set((current) => ({
              savedPlans: [defaultPlan],
              activePlanId: defaultPlan.id,
              planNotices: renamePlanNotices(
                current.planNotices,
                current.activePlanId ?? UNNAMED_PLAN_KEY,
                defaultPlan.id,
              ),
            }));
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
        };

        // `.then(run, run)` on both settle paths: one load that threw must not
        // leave every later one refusing to start.
        planLoadQueue = planLoadQueue.then(run, run);
        return planLoadQueue;
      },

      createPlan: async (name) => {
        const state = get();
        // Unique for the same reason a rename's is: two plans answering to one
        // name are two rows in the switcher that cannot be told apart.
        const unique = uniquePlanName(
          name.trim() || DEFAULT_PLAN_NAME,
          state.savedPlans.map((plan) => plan.name),
        );

        const now = new Date().toISOString();
        const plan: SavedPlan = {
          id: crypto.randomUUID(),
          name: unique,
          items: [],
          // The one thing a new plan does inherit. Theme, scale, order, window
          // and comment mode are facts about how a deck is read rather than
          // about which tasks are in one — the same reason a plan made from a
          // branch carries them across.
          exportOptions: state.exportOptions,
          createdAt: now,
          updatedAt: now,
        };

        // The plan being left is written down first, exactly as switching away
        // from one does. Starting a new plan is not a way of abandoning the
        // edits made to the old one.
        const flushed = flushedActivePlan(state);
        if (flushed) await persistPlan(flushed);
        await persistPlan(plan);

        set((current) => ({
          savedPlans: [
            ...(flushed
              ? current.savedPlans.map((saved) => (saved.id === flushed.id ? flushed : saved))
              : current.savedPlans),
            plan,
          ],
          activePlanId: plan.id,
          title: plan.name,
          items: plan.items,
          exportOptions: plan.exportOptions,
        }));
      },

      renamePlan: async (id, name) => {
        const state = get();
        const target = state.savedPlans.find((plan) => plan.id === id);
        if (!target) return;

        // Unique for the same reason a branch's plan name is: two plans
        // answering to one name are two rows in the switcher that cannot be
        // told apart.
        const unique = uniquePlanName(
          name.trim(),
          state.savedPlans.filter((plan) => plan.id !== id).map((plan) => plan.name),
        );
        if (unique === '' || unique === target.name) return;

        // The name and nothing else — the working copy is left for the flush
        // that a switch, an export or a branch already does. A rename is not a
        // save.
        const renamed: SavedPlan = { ...target, name: unique, updatedAt: new Date().toISOString() };
        await persistPlan(renamed);

        set((current) => ({
          savedPlans: current.savedPlans.map((plan) => (plan.id === id ? renamed : plan)),
          // The toolbar reads `title`, so the plan on screen has to be told its
          // own new name; renaming any other plan leaves it alone.
          title: id === current.activePlanId ? unique : current.title,
        }));
      },

      switchToPlan: async (id) => {
        const state = get();
        if (id === state.activePlanId) return;

        const targetPlan = state.savedPlans.find((plan) => plan.id === id);
        if (!targetPlan) return;

        // Flush in-progress edits on the outgoing plan before switching away.
        const flushed = flushedActivePlan(state);
        if (flushed) await persistPlan(flushed);

        set((current) => ({
          savedPlans: flushed
            ? current.savedPlans.map((plan) => (plan.id === flushed.id ? flushed : plan))
            : current.savedPlans,
          activePlanId: targetPlan.id,
          title: targetPlan.name,
          items: targetPlan.items,
          exportOptions: targetPlan.exportOptions,
        }));
      },

      createPlanFromBranch: async (rootId) => {
        const state = get();
        const root = state.items.find((item) => item.id === rootId);
        if (!root) return;

        const branch = copyBranch(state.items, state.comments, rootId);
        if (!branch) return;

        const now = new Date().toISOString();
        const plan: SavedPlan = {
          id: crypto.randomUUID(),
          name: uniquePlanName(
            root.label,
            state.savedPlans.map((saved) => saved.name),
          ),
          items: branch.items,
          // The settings the branch was already going to be exported under:
          // theme, scale, order, window and comment mode are facts about how a
          // deck is read, not about which tasks are in one.
          exportOptions: state.exportOptions,
          createdAt: now,
          updatedAt: now,
        };

        // The plan this came out of is saved on the way past, exactly as it is
        // when one is switched away from: taking a copy of a branch changes
        // nothing about the plan that branch is still in.
        const flushed = flushedActivePlan(state);
        if (flushed) await persistPlan(flushed);
        await persistPlan(plan);

        const notice = droppedDependencyNotice(branch.droppedDependencies, root.label);

        set((current) => ({
          savedPlans: [
            ...(flushed
              ? current.savedPlans.map((saved) => (saved.id === flushed.id ? flushed : saved))
              : current.savedPlans),
            plan,
          ],
          activePlanId: plan.id,
          title: plan.name,
          items: plan.items,
          exportOptions: plan.exportOptions,
          // Comments belong to the app rather than to one plan — they are kept
          // in one list, keyed by task id — so the copies simply join them,
          // and the ones on the original tasks stay where they were.
          comments: [...current.comments, ...branch.comments],
          planNotices: notice
            ? mergePlanNotices(current.planNotices, { [plan.id]: notice })
            : current.planNotices,
        }));
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
        });
      },
    }),
    {
      // Two persistence layers exist by design, not by accident:
      // - localStorage (this `persist` middleware) mirrors only the
      //   *currently active* plan's working state. It's synchronous, so it
      //   restores instantly on reload — before IndexedDB has even opened —
      //   avoiding a flash of an empty plan while `loadPlans()` (async)
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
        if (!persisted.items) return { ...currentState, ...persisted };

        const { items, warnings } = normalizePlanItems(persisted.items);
        const key = persisted.activePlanId ?? UNNAMED_PLAN_KEY;

        return {
          ...currentState,
          ...persisted,
          items,
          planNotices:
            warnings.length > 0
              ? mergePlanNotices(currentState.planNotices, { [key]: repairNotice(warnings) })
              : currentState.planNotices,
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
