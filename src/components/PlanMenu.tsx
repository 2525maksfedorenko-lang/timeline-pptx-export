import { useRef, useState } from 'react';
import { Check, ChevronDown, Pencil, Plus, X } from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import {
  buttonBaseClass,
  buttonClass,
  INPUT_SHELL_CLASS,
  MENU_ITEM_CLASS,
  MENU_SEPARATOR_CLASS,
  MENU_SURFACE_CLASS,
} from './systemUi';
import { useMenuDismiss } from './useDismiss';

interface PlanMenuProps {
  /** What the plan is: its name, and the two counts under it. Rendered by
   * the caller so the toolbar keeps its own type scale; this component owns
   * only the trigger's behaviour and the menu. */
  children: React.ReactNode;
}

/** Switching, creating, renaming and deleting plans, behind the plan's own
 * name in the toolbar.
 *
 * This replaces the tab strip that used to sit in its own band above the
 * chart. The band cost a row of the window to show what the toolbar already
 * says — the plan's name — so the name became the control, and what the strip
 * offered moved into the menu behind it.
 *
 * Plans, and nothing else. Two file actions used to live down here as well —
 * the export settings and "Save as JSON" — and neither was a plan: one is a
 * panel about the deck, the other is one of four files the Export button
 * makes. Both moved to the toolbar's right-hand end, where the app's actions
 * are, which leaves this menu answering exactly the question its trigger asks.
 *
 * The trigger is the design system's own: a ghost Button, so it fills with
 * `--accent` on hover and takes the system focus ring, with a chevron on the
 * end. It was a bare div with a hover fill and no chevron before — hoverable
 * but not legible as a control, which is the one thing a menu's trigger has
 * to be.
 */
export function PlanMenu({ children }: PlanMenuProps) {
  const savedPlans = useTimelineStore((state) => state.savedPlans);
  const activePlanId = useTimelineStore((state) => state.activePlanId);
  const switchToPlan = useTimelineStore((state) => state.switchToPlan);
  const createPlan = useTimelineStore((state) => state.createPlan);
  const renamePlan = useTimelineStore((state) => state.renamePlan);
  const deletePlan = useTimelineStore((state) => state.deletePlan);

  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  // The plan whose row is currently a name field, and the text in it. One at a
  // time, and never at the same time as the new-plan field below: two open
  // name fields in one menu is two places an Enter could go.
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Escape does more here than close: the name field inside handles its own
  // Escape (it cancels the draft and keeps the menu open) and stops nothing
  // from reaching this one, so a menu in that state closes on the same press
  // — which is what Escape is expected to do at the level it is pressed — and
  // takes the half-typed name with it. A press that simply landed elsewhere
  // leaves the draft standing, which is why the two are separate callbacks.
  // See useDismiss.ts.
  useMenuDismiss({
    isOpen,
    rootRef,
    triggerRef,
    onOutsidePress: () => setIsOpen(false),
    onEscape: () => {
      setIsOpen(false);
      setIsCreating(false);
      setNewPlanName('');
      setRenamingId(null);
      setRenameDraft('');
    },
  });

  const handleCreate = async () => {
    const name = newPlanName.trim();
    if (name === '') return;
    await createPlan(name);
    setNewPlanName('');
    setIsCreating(false);
  };

  const beginRename = (id: string, name: string) => {
    setIsCreating(false);
    setNewPlanName('');
    setRenamingId(id);
    setRenameDraft(name);
  };

  const handleRename = async () => {
    if (renamingId !== null) await renamePlan(renamingId, renameDraft);
    setRenamingId(null);
    setRenameDraft('');
  };

  return (
    // Shrinkable, and `min-w-0` with it: the toolbar centres the timeline
    // controls between this trigger and the app's actions, and a trigger that
    // refused to give ground would spill over them on a narrow window instead
    // of letting the plan's name ellipsise.
    <div ref={rootRef} className="relative min-w-0 shrink">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Switch plan"
        title="Switch plan"
        // buttonBaseClass, not buttonClass: the row is 50px and none of the
        // system's three button heights fits the two-line plan block, so the
        // size is left out and given here — the same deliberate omission the
        // toolbar's other controls make. Only the height and the padding are
        // added, and neither is in the base: stacking a second `gap` or
        // `justify` on top would leave two utilities fighting over one
        // property. Everything else is the system's — the radius, the
        // colour-only transition, the accent hover, the focus ring.
        // `max-md:max-w-full` is the phone's: an inline-flex box sizes itself
        // to its content and will happily overrun a header row 375px wide,
        // where this trigger shares one with the scale switch. Capped at the
        // container, the name inside it ellipsises instead. Above the
        // breakpoint the left zone is wider than the trigger ever is, so the
        // cap never binds and nothing changes.
        className={buttonBaseClass('ghost', 'h-10 min-w-0 px-2 text-left max-md:max-w-full')}
      >
        {children}
        {/* The whole point of this change: something that says "press me".
            It does not rotate on open — hover and open are colour here, as
            everywhere else on this screen. */}
        <ChevronDown
          size={14}
          strokeWidth={2}
          aria-hidden="true"
          className="ml-0.5 flex-none text-muted-foreground"
        />
      </button>

      {isOpen && (
        <div
          // The roles the system's own DropdownMenu sets, and which this menu
          // never had: the trigger promised `aria-haspopup="menu"` and opened
          // a plain box of buttons, so a screen reader announced a list of
          // controls with no menu around them. The wrappers are `none` so the
          // rows stay direct children of the menu, as ARIA requires.
          role="menu"
          aria-label="Plans"
          className={`absolute left-0 top-[calc(100%+4px)] w-64 ${MENU_SURFACE_CLASS}`}
        >
          <div role="none" className="max-h-72 overflow-y-auto">
            {savedPlans.length === 0 && (
              <p role="none" className="px-2 py-1.5 text-sm text-muted-foreground">
                No saved plans
              </p>
            )}
            {savedPlans.map((plan) =>
              // A row is either the plan or its name field, never both: the
              // field takes the row's own place, so the list keeps its length
              // and nothing below it moves while a name is being typed.
              plan.id === renamingId ? (
                <div key={plan.id} role="none" className="flex items-center gap-1.5 p-1">
                  <input
                    autoFocus
                    type="text"
                    value={renameDraft}
                    onChange={(event) => setRenameDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void handleRename();
                      if (event.key === 'Escape') {
                        setRenamingId(null);
                        setRenameDraft('');
                      }
                    }}
                    placeholder="Plan name"
                    aria-label={`Rename plan ${plan.name}`}
                    className={`${INPUT_SHELL_CLASS} h-9 text-sm max-md:text-base`}
                  />
                  <button type="button" onClick={() => void handleRename()} className={buttonClass('default', 'sm')}>
                    Save
                  </button>
                </div>
              ) : (
                <div key={plan.id} role="none" className="group flex items-center gap-1 rounded-sm hover:bg-accent">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      void switchToPlan(plan.id);
                      setIsOpen(false);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm"
                  >
                    <span className="inline-flex h-3.5 w-3.5 flex-none items-center justify-center">
                      {plan.id === activePlanId && <Check size={14} strokeWidth={2} />}
                    </span>
                    <span className="truncate" title={plan.name}>
                      {plan.name}
                    </span>
                  </button>
                  {/* The two things done to a plan rather than with it, on the
                      row they act on and revealed by the same hover. A rename
                      is not destructive, so it takes the neutral hover the
                      delete beside it does not. */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => beginRename(plan.id, plan.name)}
                    aria-label={`Rename plan ${plan.name}`}
                    className="flex-none text-muted-foreground/70 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                  >
                    <Pencil size={13} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      if (!window.confirm(`Delete plan "${plan.name}"? This cannot be undone.`)) return;
                      void deletePlan(plan.id);
                    }}
                    aria-label={`Delete plan ${plan.name}`}
                    className="mr-1 flex-none text-muted-foreground/70 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                </div>
              ),
            )}
          </div>

          <div className={MENU_SEPARATOR_CLASS} />

          <div role="none">
            {isCreating ? (
              <div role="none" className="flex items-center gap-1.5 p-1">
                <input
                  autoFocus
                  type="text"
                  value={newPlanName}
                  onChange={(event) => setNewPlanName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void handleCreate();
                    if (event.key === 'Escape') {
                      setIsCreating(false);
                      setNewPlanName('');
                    }
                  }}
                  placeholder="Plan name"
                  aria-label="Plan name"
                  className={`${INPUT_SHELL_CLASS} h-9 text-sm max-md:text-base`}
                />
                <button type="button" onClick={() => void handleCreate()} className={buttonClass('default', 'sm')}>
                  Save
                </button>
              </div>
            ) : (
              <button type="button" role="menuitem" onClick={() => setIsCreating(true)} className={MENU_ITEM_CLASS}>
                <Plus size={14} strokeWidth={2} aria-hidden="true" />
                New plan
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
