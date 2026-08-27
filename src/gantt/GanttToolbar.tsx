import { buttonBaseClass } from '../components/systemUi';
import { PlanMenu } from '../components/PlanMenu';
import { useTimelineStore } from '../store/timelineStore';
import { TIME_SCALE_LABELS, TIME_SCALES } from './scale';
import { useGanttViewStore } from './viewStore';

interface GanttToolbarProps {
  /** The app's own actions — import, export and the settings gear — rendered
   * at the right of the row after the plan's own controls. Passed in rather
   * than built here so this file stays about the plan and not about what
   * surrounds it. */
  actions?: React.ReactNode;
  /** False on any view that is not the plan: the scale switch and Today
   * belong to the timeline and to nothing else. */
  showTimelineControls: boolean;
}

/** The app's one header, in a single row and three zones: whose product this
 * is and what the plan *is* on the left, how the timeline is read in the
 * middle, and what can be done to the plan on the right.
 *
 * The two side zones are `flex: 1 1 0`, so they share the row's free space
 * equally and the middle group sits on the row's centre line at every width —
 * not near it, on it.
 *
 * What pays for that is the left zone, which shrinks: the plan's name is
 * capped at 220px and ellipsises from there, so a long name can neither push
 * the middle group off centre nor reach it. Measured, the name starts giving
 * ground at 1062px and the 12px gap in front of the scale switch holds all
 * the way down.
 *
 * The right zone cannot do the same — Import and Export are words, not
 * things to truncate — so it is the one that eventually runs out of room:
 * below ~695px its buttons overflow their half and reach back over the middle
 * group. That is 73px under the 768px this app calls mobile
 * (MOBILE_MEDIA_QUERY), so no viewport laid out as a desktop reaches it, and
 * a phone layout is a separate question from this row's balance.
 *
 * The handoff puts a search box and status chips on a second row beneath.
 * Neither is here — the plan screen shows the whole plan, and nothing narrows
 * it but a fold or a focus — so the row the handoff needed for them is gone
 * and the header is one 50px band.
 *
 * It carries more than the handoff's toolbar does: this app also has an
 * import, an export in four formats and a settings panel, and the handoff has
 * no slot for any of them. They sit at the right in their most compact
 * legible form — icons where the glyph says it, short labels where it does
 * not — so the row still clears its width budget.
 */
export function GanttToolbar({ actions, showTimelineControls }: GanttToolbarProps) {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 0', minWidth: 0 }}>
          {/* The product's mark, then the plan's. They are two different
              identities and the rule between them says so: aicoo is what this
              is, and the name beside it is what is open in it.

              `design-system/assets/` holds ten variants; this is the orbit mark
              with the wordmark in the brand's deep navy, which is the one for a
              light surface — the design system's own sidebar uses the pale twin
              because that sidebar is navy. Copied into `public/` rather than
              imported from `design-system/`, which is reference material and not
              app source. */}
          {/* Both axes are given, and neither is `auto`, because the file's
              `width`/`height` (1260×684) disagree with its `viewBox`
              (2200×684): sizing by one axis letterboxes the mark inside a box
              the wrong shape instead of filling it. 71×22 is the viewBox's own
              3.22:1 at a height that sits comfortably in a 50px row. The file
              is left byte-identical to the design system's copy. */}
          <img
            src="/aicoo-logo.svg"
            alt="aicoo"
            width={71}
            height={22}
            // In the style and not only in the attributes: the CSS reset sets
            // `img { height: auto }`, which outranks a plain height attribute
            // and would put the letterbox straight back.
            style={{ width: 71, height: 22, flex: 'none', display: 'block' }}
          />
          <span className="h-5 w-px flex-none bg-border" />

          <PlanMenu>
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
            {/* Capped at 220 so a long name cannot push the timeline controls
                off the row's centre, and shrinkable below that so a narrow
                window ellipsises the name rather than overrunning them. */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                lineHeight: 1.2,
                flex: '0 1 auto',
                minWidth: 0,
                maxWidth: 220,
              }}
            >
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
                // The weight is stated because the trigger around this is now a
                // Button, and `font-medium` comes with that contract; the counts
                // are a subline and read as one at 400.
                style={{
                  fontSize: 10.5,
                  fontWeight: 400,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {taskCount} work items · {groupCount} groups
              </span>
            </div>
          </PlanMenu>
        </div>

        {/* How the timeline is read — the scale it is drawn at, and the way
            back to now. Neither acts on the plan the way Import and Export
            do; they are the chart's own controls, so they sit over the chart,
            on the row's centre line.

            The zone is rendered even on a view that has no timeline, empty,
            so the logo and the actions keep the positions they hold on the
            plan screen instead of shifting when the tab changes. */}
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
            </>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flex: '1 1 0',
            minWidth: 0,
            justifyContent: 'flex-end',
          }}
        >
          {actions}
        </div>
      </div>
    </div>
  );
}
