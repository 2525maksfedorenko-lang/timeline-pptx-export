import { AlertTriangle, X } from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { buttonClass, CARD_CLASS } from './systemUi';

/** What this plan has to say about itself, said once, above the chart it is
 * about. See utils/planNotice.ts for the shape and who writes one.
 *
 * Opening a plan saved by an older build silently rewrites it — a status this
 * app doesn't know is dropped, and the task lands as "to do" (see
 * normalizeItemStatuses). An import says so in its own dialog; a reload had
 * nowhere to say it at all, so the person met a plan that sorted differently
 * than they left it with no way to find out why. A plan lifted out of another
 * one's branch has the same problem with the links it could not bring, and
 * says so here for the same reason.
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
  const notice = useTimelineStore((state) => state.planNotices[activePlanId ?? '']);
  const dismissPlanNotices = useTimelineStore((state) => state.dismissPlanNotices);

  if (!notice) return null;

  return (
    <div
      // Polite rather than assertive: nothing is broken and nothing is
      // waiting on the reader — the plan is already open and already repaired.
      role="status"
      // Tighter on a phone, where this sits between the plan switcher and the
      // chart it is about: the point is to explain what the chart is showing,
      // so it must not be what stops you seeing the chart.
      className={`mb-4 flex items-start gap-3 p-3 max-md:mb-2 max-md:gap-2 max-md:p-2.5 ${CARD_CLASS}`}
    >
      <AlertTriangle
        size={16}
        strokeWidth={2}
        aria-hidden="true"
        className="mt-0.5 flex-shrink-0 text-muted-foreground"
      />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{notice.headline}</p>
        {notice.lines.length > 0 && (
          <ul className="mt-1 flex flex-col gap-1 max-md:mt-0.5">
            {notice.lines.map((line) => (
              <li key={line} className="text-xs text-muted-foreground max-md:text-sm">
                {line}
              </li>
            ))}
          </ul>
        )}
        {/* Said on every screen, because it is the one thing here that cannot
            be recovered from the app later. */}
        {notice.fact !== undefined && (
          <p className="mt-1.5 text-xs text-muted-foreground max-md:text-sm">{notice.fact}</p>
        )}
        {/* Hidden on a phone, not shortened: it is the line here that is
            context rather than fact, and on a 375px screen those few lines are
            the difference between the first bar being on screen and being
            under the fold. The facts above it still say what changed. */}
        {notice.hint !== undefined && (
          <p className="mt-1 text-xs text-muted-foreground max-md:hidden">{notice.hint}</p>
        )}
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
