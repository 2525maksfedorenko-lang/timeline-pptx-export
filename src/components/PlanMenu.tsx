import { useEffect, useRef, useState } from 'react';
import { Check, Download, Plus, X } from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { exportPlanToJsonFile } from '../import/planJson';
import { buttonClass, INPUT_SHELL_CLASS } from './systemUi';

interface PlanMenuProps {
  /** What the plan is: its name, and the two counts under it. Rendered by
   * the caller so the toolbar keeps its own type scale; this component owns
   * only the trigger's behaviour and the menu. */
  children: React.ReactNode;
}

/** Switching, creating, deleting and saving out a plan, behind the plan's own
 * name in the toolbar.
 *
 * This replaces the tab strip that used to sit in its own band above the
 * chart. The band cost a row of the window to show what the toolbar already
 * says — the plan's name — so the name became the control, and the rest of
 * what the strip offered moved into the menu behind it.
 */
export function PlanMenu({ children }: PlanMenuProps) {
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
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
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
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-64 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
          <div className="max-h-72 overflow-y-auto p-1">
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

          <div className="border-t border-border p-1">
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
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
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
                if (activePlan) exportPlanToJsonFile(activePlan);
                setIsOpen(false);
              }}
              disabled={!activePlan}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
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
