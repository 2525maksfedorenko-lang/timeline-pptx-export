import { AlertTriangle, X } from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';

/** Stable empty array, so a plan with nothing to report doesn't hand the
 * selector a new reference on every render. */
const NO_NOTICES: string[] = [];

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** What loading this plan had to repair in it, said once, above the chart it
 * changed.
 *
 * Opening a plan saved by an older build silently rewrites it — a status this
 * app doesn't know is dropped, and the task lands as "to do" (see
 * normalizeItemStatuses). An import says so in its own dialog; a reload had
 * nowhere to say it at all, so the person met a plan that sorted differently
 * than they left it with no way to find out why.
 *
 * Deliberately not a toast, an alert component or a notification queue: this
 * app has no such system and the design system has no primitive for one. It is
 * the card the rest of the app is built from (border, bg-card, rounded-lg), a
 * lucide icon and a ghost icon button — the same three pieces ImportModal
 * already assembles its warnings from — showing one specific message about the
 * open plan. Anything more general would be the start of a second UI system.
 *
 * Session-scoped by construction: `planNotices` is not persisted, so this
 * cannot come back tomorrow for a repair that already happened. It does come
 * back on the next reload while the plan is still unsaved, which is right —
 * the repair happens again on that load too. */
export function PlanNotice() {
  const activePlanId = useTimelineStore((state) => state.activePlanId);
  const notices = useTimelineStore((state) => state.planNotices[activePlanId ?? ''] ?? NO_NOTICES);
  const dismissPlanNotices = useTimelineStore((state) => state.dismissPlanNotices);

  if (notices.length === 0) return null;

  return (
    <div
      // Polite rather than assertive: nothing is broken and nothing is
      // waiting on the reader — the plan is already open and already repaired.
      role="status"
      // Tighter on a phone, where this sits between the plan switcher and the
      // chart it is about: the point is to explain the order the chart is in,
      // so it must not be what stops you seeing the chart.
      className="mb-4 flex items-start gap-3 rounded-lg border border-border bg-card p-3 max-md:mb-2 max-md:gap-2 max-md:p-2.5"
    >
      <AlertTriangle
        size={16}
        strokeWidth={2}
        aria-hidden="true"
        className="mt-0.5 flex-shrink-0 text-muted-foreground"
      />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">Some tasks were repaired when this plan opened.</p>
        <ul className="mt-1 flex flex-col gap-1 max-md:mt-0.5">
          {notices.map((notice) => (
            <li key={notice} className="text-xs text-muted-foreground max-md:text-sm">
              {notice}
            </li>
          ))}
        </ul>
        {/* Said on every screen, because it is the one thing here that cannot
            be undone later: the repair keeps no copy of what it replaced. The
            plan is repaired again on every load until it is saved, but nothing
            anywhere holds the original spelling once it has been. */}
        <p className="mt-1.5 text-xs text-muted-foreground max-md:text-sm">
          The original values are kept only in the file this plan came from.
        </p>
        {/* Hidden on a phone, not shortened: it is the one line here that is
            context rather than fact, and on a 375px screen those four lines
            are the difference between the first bar being on screen and being
            under the fold. The facts above it still say what changed. */}
        <p className="mt-1 text-xs text-muted-foreground max-md:hidden">
          The chart and the export both order tasks by status, so check these before exporting.
        </p>
      </div>

      <button
        type="button"
        onClick={dismissPlanNotices}
        aria-label="Dismiss"
        className={`-mr-1 -mt-1 inline-flex flex-shrink-0 items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground max-md:min-h-11 max-md:min-w-11 ${focusRing}`}
      >
        <X size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
