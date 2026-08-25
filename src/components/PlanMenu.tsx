import { useEffect, useRef, useState } from 'react';
import { Check, Download, Plus, Settings, X } from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { exportPlanToJsonFile } from '../import/planJson';
import {
  buttonClass,
  INPUT_SHELL_CLASS,
  MENU_ITEM_CLASS,
  MENU_SEPARATOR_CLASS,
  MENU_SURFACE_CLASS,
} from './systemUi';

interface PlanMenuProps {
  /** What the plan is: its name, and the two counts under it. Rendered by
   * the caller so the toolbar keeps its own type scale; this component owns
   * only the trigger's behaviour and the menu. */
  children: React.ReactNode;
  /** Opens the export settings panel. */
  onOpenSettings: () => void;
}

/** Switching, creating, deleting, configuring and saving out a plan, behind
 * the plan's own name in the toolbar.
 *
 * This replaces the tab strip that used to sit in its own band above the
 * chart. The band cost a row of the window to show what the toolbar already
 * says — the plan's name — so the name became the control, and the rest of
 * what the strip offered moved into the menu behind it.
 *
 * The export settings live here too, now that the toolbar's gear is gone.
 * They belong with the plan rather than beside the chart: what to export, in
 * what order, over what window and with which comments are all facts about
 * the plan, and the toolbar's right-hand end is for what is being done to the
 * timeline on screen.
 */
export function PlanMenu({ children, onOpenSettings }: PlanMenuProps) {
  const savedPlans = useTimelineStore((state) => state.savedPlans);
  const activePlanId = useTimelineStore((state) => state.activePlanId);
  const switchToPlan = useTimelineStore((state) => state.switchToPlan);
  const saveCurrentAsPlan = useTimelineStore((state) => state.saveCurrentAsPlan);
  const deletePlan = useTimelineStore((state) => state.deletePlan);

  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    // pointerdown, not mousedown: the plan's canvas calls preventDefault() on
    // its own pointerdown to start a pan, which suppresses the compatibility
    // mouse events — so a mousedown listener never hears a press on the chart
    // and this menu stayed open over it.
    const onPointerDown = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const activePlan = savedPlans.find((plan) => plan.id === activePlanId);

  const handleCreate = async () => {
    const name = newPlanName.trim();
    if (name === '') return;
    await saveCurrentAsPlan(name);
    setNewPlanName('');
    setIsCreating(false);
  };

  return (
    <div ref={rootRef} className="relative flex-none">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title="Switch plan"
        className="flex items-center gap-2.5 rounded-md px-1 py-1 text-left transition-colors hover:bg-accent"
      >
        {children}
      </button>

      {isOpen && (
        <div className={`absolute left-0 top-[calc(100%+4px)] w-64 ${MENU_SURFACE_CLASS}`}>
          <div className="max-h-72 overflow-y-auto">
            {savedPlans.length === 0 && (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">No saved plans</p>
            )}
            {savedPlans.map((plan) => (
              <div key={plan.id} className="group flex items-center gap-1 rounded-sm hover:bg-accent">
                <button
                  type="button"
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
                <button
                  type="button"
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
            ))}
          </div>

          <div className={MENU_SEPARATOR_CLASS} />

          <div>
            {isCreating ? (
              <div className="flex items-center gap-1.5 p-1">
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
                  className={`${INPUT_SHELL_CLASS} h-9 text-sm`}
                />
                <button type="button" onClick={() => void handleCreate()} className={buttonClass('default', 'sm')}>
                  Save
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setIsCreating(true)} className={MENU_ITEM_CLASS}>
                <Plus size={14} strokeWidth={2} aria-hidden="true" />
                New plan
              </button>
            )}
            {/* Saving the plan out, only. Importing is one button in the
                toolbar rather than a second icon here: two entry points for
                one action meant the format had to be chosen before the file
                was. */}
            <button
              type="button"
              onClick={() => {
                onOpenSettings();
                setIsOpen(false);
              }}
              className={MENU_ITEM_CLASS}
            >
              <Settings size={14} strokeWidth={2} aria-hidden="true" />
              Export settings
            </button>
            <button
              type="button"
              onClick={() => {
                if (activePlan) exportPlanToJsonFile(activePlan);
                setIsOpen(false);
              }}
              disabled={!activePlan}
              className={MENU_ITEM_CLASS}
            >
              <Download size={14} strokeWidth={2} aria-hidden="true" />
              Save as JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
