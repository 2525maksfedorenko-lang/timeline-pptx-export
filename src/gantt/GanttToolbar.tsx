import { buttonBaseClass } from '../components/systemUi';
import { PlanMenu } from '../components/PlanMenu';
import { useTimelineStore } from '../store/timelineStore';
import { TIME_SCALE_LABELS, TIME_SCALES } from './scale';
import { useGanttViewStore } from './viewStore';

interface GanttToolbarProps {
  /** Opens the export settings. Handed to the plan menu, which is where the
   * app's own plan-level actions live now that the toolbar has none. */
  onOpenSettings: () => void;
  /** The app's own actions — import, settings and the two exports — rendered
   * at the right of the row after the plan's own controls. Passed in rather
   * than built here so this file stays about the plan and not about what
   * surrounds it. */
  actions?: React.ReactNode;
  /** False on any view that is not the plan: the scale switch and Today
   * belong to the timeline and to nothing else. */
  showTimelineControls: boolean;
}

/** The app's one header, in a single row: what the plan *is* on the left, how
 * it is scaled and what can be done to it on the right.
 *
 * The handoff puts a search box and status chips on a second row beneath.
 * Neither is here — the plan screen shows the whole plan, and nothing narrows
 * it but a fold or a focus — so the row the handoff needed for them is gone
 * and the header is one 50px band.
 *
 * It carries more than the handoff's toolbar does: this app also has an
 * import, an export in two formats and a settings panel, and the handoff has
 * no slot for any of them. They sit at the right in their most compact
 * legible form — icons where the glyph says it, short labels where it does
 * not — so the row still clears its width budget.
 */
export function GanttToolbar({ actions, showTimelineControls, onOpenSettings }: GanttToolbarProps) {
  const title = useTimelineStore((state) => state.title);
  const items = useTimelineStore((state) => state.items);

  const scale = useGanttViewStore((state) => state.scale);
  const setScale = useGanttViewStore((state) => state.setScale);
  const requestToday = useGanttViewStore((state) => state.requestToday);

  // A group is an item something else calls its parent; everything else is a
  // work item. Two passes over the list rather than one, because the counts
  // are read once per render and the list is a plan, not a feed.
  const groupCount = items.filter((item) => items.some((child) => child.parentId === item.id)).length;
  const taskCount = items.length - groupCount;

  return (
    <div className="flex-none border-b border-border bg-background">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 50, padding: '0 14px' }}>
        <PlanMenu onOpenSettings={onOpenSettings}>
          <div
            className="bg-primary text-primary-foreground"
            aria-hidden="true"
            style={{
              width: 24,
              height: 24,
              flex: 'none',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {/* The plan's initial. The handoff sets a fixed "C" for
                Coordinator; here the mark belongs to the plan on screen,
                which is the thing that changes. */}
            {title.trim().charAt(0).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, flex: 'none', maxWidth: 220 }}>
            <span
              title={title}
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </span>
            <span
              className="text-muted-foreground"
              style={{ fontSize: 10.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {taskCount} work items · {groupCount} groups
            </span>
          </div>
        </PlanMenu>

        <div style={{ flex: '1 1 auto', minWidth: 12 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
          {showTimelineControls && (
            <>
              {/* The system has no segmented control, so this is the handoff's
                  own recipe over primitives: a muted tray at 8px radius
                  holding three buttons, the active one filled, the rest
                  ghost. */}
              <div className="bg-muted" style={{ display: 'flex', borderRadius: 8, padding: 2, gap: 2 }}>
                {TIME_SCALES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setScale(option)}
                    aria-pressed={scale === option}
                    className={buttonBaseClass(
                      scale === option ? 'default' : 'ghost',
                      'h-7 whitespace-nowrap px-3 text-[11px] font-semibold',
                    )}
                  >
                    {TIME_SCALE_LABELS[option]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={requestToday}
                className={buttonBaseClass('outline', 'h-8 whitespace-nowrap px-3 text-xs font-semibold')}
              >
                Today
              </button>
              <span className="h-5 w-px flex-none bg-border" />
            </>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
}
