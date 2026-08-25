import { buttonBaseClass, INPUT_SHELL_CLASS } from '../components/systemUi';
import { PlanMenu } from '../components/PlanMenu';
import { Switch } from '../components/Switch';
import { useTimelineStore } from '../store/timelineStore';
import { SELECTABLE_TASK_STATUS_VALUES } from '../types/timeline';
import { TIME_SCALE_LABELS, TIME_SCALES } from './scale';
import { STATUS_LABEL } from './tone';
import type { StatusFilter } from './rows';
import { useGanttViewStore } from './viewStore';

interface GanttToolbarProps {
  /** Opens the export settings. Handed to the plan menu, which is where the
   * app's own plan-level actions live now that the toolbar has none. */
  onOpenSettings: () => void;
  /** The app's own actions — import, settings, the two exports, and the
   * view switch — rendered at the right of the top row after the plan's
   * own controls. Passed in rather than built here so this file stays about
   * the plan and not about what surrounds it. */
  actions?: React.ReactNode;
  /** False on any view that is not the plan: the scale switch, Today, and
   * the whole second row belong to the timeline and to nothing else. */
  showTimelineControls: boolean;
}

/** Which statuses get a filter chip, in the handoff's order. "All" first,
 * then the states worth singling out; "Not started" has no chip, because the
 * plan is mostly that and the chip would select nearly everything.
 *
 * Built from the choosable statuses, so there is no Blocked chip: a status
 * nothing in the app can set is not something to filter a plan down to. A
 * blocked task imported into the plan is still reachable — under All, where it
 * draws in its own colour like everything else. */
const FILTER_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  ...SELECTABLE_TASK_STATUS_VALUES.filter((status) => status !== 'todo').map((status) => ({
    value: status as StatusFilter,
    label: STATUS_LABEL[status],
  })),
];

/** The app's one header, in two rows.
 *
 * Two rows and not one because a single row overflows at about 950px — the
 * handoff says so in as many words, and names the failure: the search box
 * gets squeezed under 130px long before anything else gives. So the top row
 * is what the plan *is*, how it is scaled and what can be done to it, and the
 * second is what is being looked for in it.
 *
 * It carries more than the handoff's toolbar does: this app also has an
 * import, an export in two formats, a settings panel and a second view, and
 * the handoff has no slot for any of them. They sit at the right of the top
 * row in their most compact legible form — icons where the glyph says it,
 * short labels where it does not — so that row still clears its width budget.
 */
export function GanttToolbar({ actions, showTimelineControls, onOpenSettings }: GanttToolbarProps) {
  const title = useTimelineStore((state) => state.title);
  const items = useTimelineStore((state) => state.items);

  const scale = useGanttViewStore((state) => state.scale);
  const setScale = useGanttViewStore((state) => state.setScale);
  const requestToday = useGanttViewStore((state) => state.requestToday);
  const search = useGanttViewStore((state) => state.search);
  const setSearch = useGanttViewStore((state) => state.setSearch);
  const filter = useGanttViewStore((state) => state.filter);
  const setFilter = useGanttViewStore((state) => state.setFilter);

  // "Links" is the same setting the export slides read, not a second copy of
  // it — turning the arrows off on screen turns them off in the deck.
  const showDependencies = useTimelineStore((state) => state.exportOptions.showDependencies);
  const updateExportOptions = useTimelineStore((state) => state.updateExportOptions);

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

      {showTimelineControls && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            height: 42,
            padding: '0 14px',
            borderTop: '1px solid hsl(var(--border))',
          }}
        >
          <div style={{ flex: '0 1 230px', minWidth: 140 }}>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tasks…"
              aria-label="Search tasks"
              className={`${INPUT_SHELL_CLASS} h-8 text-xs`}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: '0 0 auto' }}>
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => setFilter(chip.value)}
                aria-pressed={filter === chip.value}
                className={buttonBaseClass(
                  filter === chip.value ? 'secondary' : 'ghost',
                  'h-7 whitespace-nowrap rounded-full px-3 text-[11px] font-semibold',
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div style={{ flex: '1 1 auto', minWidth: 8 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: '0 0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Switch
                id="gantt-links"
                checked={showDependencies}
                onCheckedChange={(checked) => updateExportOptions({ showDependencies: checked })}
                label="Links"
              />
              <label htmlFor="gantt-links" className="text-[11px] font-medium text-muted-foreground">
                Links
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
