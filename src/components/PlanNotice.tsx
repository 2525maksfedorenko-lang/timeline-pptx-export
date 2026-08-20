import { AlertTriangle, X } from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { buttonClass, CARD_CLASS } from './systemUi';

/** Stable empty array, so a plan with nothing to report doesn't hand the
 * selector a new reference on every render. */
const NO_NOTICES: string[] = [];

/** What loading this plan had to repair in it, said once, above the chart it
 * changed.
 *
 * Opening a plan saved by an older build silently rewrites it — a status this
 * app doesn't know is dropped, and the task lands as "to do" (see
 * normalizeItemStatuses). An import says so in its own dialog; a reload had
 * nowhere to say it at all, so the person met a plan that sorted differently
 * than they left it with no way to find out why.
 *
 * Deliberately not a toast, an alert component or a notification queue: the
 * design system has no primitive for one — no toast, no banner, no inline alert
 * (its only overlays are AlertDialog and ConfirmationPopover, both of which
 * interrupt). So this is composed from primitives that do exist: the system's
 * card at rest (1px --border, 8px radius, --card fill, --shadow-sm), a lucide
 * icon, and its ghost icon button. Anything more general would be the start of
 * a second UI system.
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
      className={`mb-4 flex items-start gap-3 p-3 ${CARD_CLASS}`}
    >
      <AlertTriangle
        size={16}
        strokeWidth={2}
        aria-hidden="true"
        className="mt-0.5 flex-shrink-0 text-muted-foreground"
      />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">Some tasks were repaired when this plan opened.</p>
        <ul className="mt-1 flex flex-col gap-1">
          {notices.map((notice) => (
            <li key={notice} className="text-xs text-muted-foreground max-md:text-sm">
              {notice}
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-xs text-muted-foreground max-md:text-sm">
          The chart and the export both order tasks by status, so check these before exporting.
        </p>
      </div>

      <button
        type="button"
        onClick={dismissPlanNotices}
        aria-label="Dismiss"
        className={buttonClass(
          'ghost',
          'icon',
          '-mr-1 -mt-1 flex-shrink-0 text-muted-foreground max-md:h-11 max-md:w-11',
        )}
      >
        <X size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
