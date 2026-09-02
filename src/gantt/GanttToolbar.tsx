import { PanelLeft, PanelLeftClose } from 'lucide-react';
import { buttonBaseClass } from '../components/systemUi';
import { PlanMenu } from '../components/PlanMenu';
import { useTimelineStore } from '../store/timelineStore';
import { useIsMobile } from '../utils/useIsMobile';
import { isGroup } from './rollup';
import { TIME_SCALE_LABELS, TIME_SCALES } from './scale';
import { useGanttViewStore } from './viewStore';

interface GanttToolbarProps {
  /** The app's own actions — import, export and the settings gear — rendered
   * at the right of the row after the plan's own controls. Passed in rather
   * than built here so this file stays about the plan and not about what
   * surrounds it. */
  actions?: React.ReactNode;
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
 * Neither is here — the plan screen shows the whole plan, and a fold is the
 * only thing that takes rows away — so the row the handoff needed for them is
 * gone and the header is one 50px band.
 *
 * It carries more than the handoff's toolbar does: this app also has an
 * import, an export in four formats and a settings panel, and the handoff has
 * no slot for any of them. They sit at the right in their most compact
 * legible form — icons where the glyph says it, short labels where it does
 * not — so the row still clears its width budget.
 *
 * **Below the mobile breakpoint it is two rows, and the split is by kind.**
 * One row cannot hold this: measured at 375px the fixed parts alone —
 * a drawer toggle, the scale switch, Today, Import, Export and the gear —
 * come to more than the 347px inside the padding, before the plan's name has
 * asked for a single pixel. So the row above is what is *done* to the plan
 * (open its task list, import, export, set the export up) and the row below
 * is what is being *looked at* (which plan, at what scale, and the way back
 * to now). Nothing is hidden behind an overflow menu: Import and Export stay
 * words on the surface at every width, which is the one thing this header was
 * asked to keep.
 *
 * The product mark goes at that width. It is 71px of a 347px row saying what
 * the app is, on a screen where the only thing there is room to say is what
 * the plan is; the plan's own navy initial keeps the brand present.
 */
export function GanttToolbar({ actions }: GanttToolbarProps) {
  const title = useTimelineStore((state) => state.title);
  const items = useTimelineStore((state) => state.items);

  const scale = useGanttViewStore((state) => state.scale);
  const setScale = useGanttViewStore((state) => state.setScale);
  const requestToday = useGanttViewStore((state) => state.requestToday);

  const isMobile = useIsMobile();
  const isTaskDrawerOpen = useGanttViewStore((state) => state.isTaskDrawerOpen);
  const toggleTaskDrawer = useGanttViewStore((state) => state.toggleTaskDrawer);

  // A group is an item something else calls its parent; everything else is a
  // work item. Two passes over the list rather than one, because the counts
  // are read once per render and the list is a plan, not a feed.
  const groupCount = items.filter((item) => isGroup(items, item.id)).length;
  const taskCount = items.length - groupCount;

  /* Which plan is open, and how big it is. Written once and placed twice: on
     the left of the desktop row, beside the product's mark, and on the left of
     the second row on a phone, where the mark is gone and this is what the
     header leads with. */
  const planIdentity = (
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
      {/* How big the plan is, under its name. Gone below the breakpoint: at
          375px the trigger has about seventy pixels for text, and a count
          ellipsised to "13 work…" is not a count — it only reads as something
          broken. The name is what the header has room to say there. */}
      {!isMobile && (
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
      )}
    </div>
  </PlanMenu>
  );

  /* The chart's own two controls, in the one place they are written. Which
     row they land on is the breakpoint's business, not theirs: the middle of
     the desktop row, or the second row on a phone, where they get a taller
     button because the thing pressing them is a thumb. */
  const timelineControls = (
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
              isMobile
                ? 'h-9 whitespace-nowrap px-2.5 text-[11px] font-semibold'
                : 'h-7 whitespace-nowrap px-3 text-[11px] font-semibold',
            )}
          >
            {TIME_SCALE_LABELS[option]}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={requestToday}
        className={buttonBaseClass(
          'outline',
          isMobile
            ? 'h-10 whitespace-nowrap px-3 text-xs font-semibold'
            : 'h-8 whitespace-nowrap px-3 text-xs font-semibold',
        )}
      >
        Today
      </button>
    </>
  );

  /* The one control that opens the task list, and the only new thing in this
     header. A button rather than an edge swipe: a swipe from the left edge is
     the browser's own "back" on both iOS Safari and Chrome for Android, and a
     drawer that sometimes leaves the app instead of opening is worse than no
     drawer. Rather than a tab hanging off the edge, too — a tab lives over the
     chart, in that same back-gesture strip, and this header already exists.

     It is a toggle and says which way it points: the icon is a panel coming
     out while the drawer is shut and a panel going back in while it is open,
     so the button that opened it is also one of the four ways to close it. */
  const taskDrawerToggle = (
    <button
      type="button"
      onClick={toggleTaskDrawer}
      aria-expanded={isTaskDrawerOpen}
      aria-controls="gantt-task-drawer"
      className={buttonBaseClass('outline', 'h-10 flex-none gap-1.5 whitespace-nowrap px-3 text-xs font-semibold')}
    >
      {isTaskDrawerOpen ? (
        <PanelLeftClose size={15} strokeWidth={2} aria-hidden="true" />
      ) : (
        <PanelLeft size={15} strokeWidth={2} aria-hidden="true" />
      )}
      Tasks
    </button>
  );

  return (
    <div className="flex-none border-b border-border bg-background">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 50, padding: '0 14px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flex: isMobile ? '1 1 auto' : '1 1 0',
            minWidth: 0,
          }}
        >
          {/* The product's mark, then the plan's. They are two different
              identities and the rule between them says so: aicoo is what this
              is, and the name beside it is what is open in it.

              **One file per domain, and it is not ours.** `/aicoo_logo.svg` is
              an absolute URL, so wherever this app is served it asks the site
              at the root of that origin for the mark. Embedded in the aicoo
              website that is the site's own `public/aicoo_logo.svg` — the file
              its header already uses — so replacing the logo there replaces it
              here too, which is the whole point: the mark must not have two
              copies on one domain that can drift apart.

              The path deliberately does *not* go through Vite's `base`. Only
              `index.html` gets the base prefix applied; a string in a component
              is left alone, so this stays rooted at `/` in the embed build
              (base `/tools/timeline-pptx-export/`) rather than being rewritten
              into our own folder. See `build:embed`, which also drops our copy
              from the bundle so the website receives none.

              Running standalone there is no site to ask, so `public/` carries
              the same file under the same name — the site's mark, not a
              different variant, so what the plan screen looks like in
              development is what it looks like embedded. */}
          {/* Gone below the breakpoint — see this component's own note. */}
          {!isMobile && (
          <>
          {/* Sized by height, with the width left to the file. The site's
              mark is very nearly square (155×152), so a fixed pair would
              squash it; 22px of height is what sits comfortably in a 50px row
              and it is the axis that has to agree with the rest of the row.

              The height is in the style and not only in the attribute because
              the CSS reset sets `img { height: auto }`, which outranks a plain
              attribute and would collapse the mark to its intrinsic size. */}
          <img
            src="/aicoo_logo.svg"
            alt="aicoo"
            width={22}
            height={22}
            style={{ height: 22, width: 'auto', flex: 'none', display: 'block' }}
          />
          <span className="h-5 w-px flex-none bg-border" />
          </>
          )}

          {planIdentity}
        </div>

        {/* How the timeline is read — the scale it is drawn at, and the way
            back to now. Neither acts on the plan the way Import and Export
            do; they are the chart's own controls, so they sit over the chart,
            on the row's centre line.

            Below the breakpoint there is no centre line to sit on: the
            controls are on the row beneath, with the plan they belong to. */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
            {timelineControls}
          </div>
        )}

        {/* Above the breakpoint this zone is `1 1 0`, the mirror of the left
            one, which is what puts the timeline controls between them on the
            row's centre line. Below it there is no middle group to centre and
            the row is 375px: an equal share is less than Import, Export and
            the gear actually measure, and a zero basis means they overrun it
            instead of shrinking. So there they take exactly their own width
            and the plan's name — the one thing here that can ellipsise — gets
            everything left over. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flex: isMobile ? '0 0 auto' : '1 1 0',
            minWidth: 0,
            justifyContent: 'flex-end',
          }}
        >
          {actions}
        </div>
      </div>

      {/* The second row, below the breakpoint. Everything on it is about the
          chart: the task list it can put in front of itself, the scale it is
          drawn at, and the way back to now. What the plan *is*, and the four
          things done to it, stay on the row above. 46px, so the controls here
          can be the size a thumb needs without the row above having to grow
          with them. */}
      {isMobile && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: 46,
            padding: '0 14px',
            borderTop: '1px solid hsl(var(--border))',
          }}
        >
          {taskDrawerToggle}
          <span style={{ flex: '1 1 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
            {timelineControls}
          </div>
        </div>
      )}
    </div>
  );
}
