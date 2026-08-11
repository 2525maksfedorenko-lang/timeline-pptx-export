import { useState } from 'react';
import { useTimelineStore } from '../store/timelineStore';

export function PlanSwitcher() {
  const savedPlans = useTimelineStore((state) => state.savedPlans);
  const activePlanId = useTimelineStore((state) => state.activePlanId);
  const switchToPlan = useTimelineStore((state) => state.switchToPlan);
  const saveCurrentAsPlan = useTimelineStore((state) => state.saveCurrentAsPlan);
  const deletePlan = useTimelineStore((state) => state.deletePlan);

  const [isCreating, setIsCreating] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');

  const handleCreate = async () => {
    const name = newPlanName.trim();
    if (!name) return;
    await saveCurrentAsPlan(name);
    setNewPlanName('');
    setIsCreating(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete plan "${name}"? This cannot be undone.`)) return;
    await deletePlan(id);
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-[#E5E5E1] pb-3">
      {savedPlans.map((plan) => (
        <div
          key={plan.id}
          className={`group flex items-center gap-2 rounded-t-md border border-b-0 px-3 py-1.5 text-sm transition-colors ${
            plan.id === activePlanId
              ? 'border-[#E5E5E1] bg-white font-medium text-[#1E2B38]'
              : 'border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={() => switchToPlan(plan.id)}
            className="max-w-[12rem] truncate"
            title={plan.name}
          >
            {plan.name}
          </button>
          <button
            type="button"
            onClick={() => handleDelete(plan.id, plan.name)}
            className="text-slate-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
            aria-label={`Delete plan ${plan.name}`}
          >
            ×
          </button>
        </div>
      ))}

      {isCreating ? (
        <div className="flex items-center gap-1.5">
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
            className="rounded-md border border-[#E5E5E1] px-2 py-1 text-sm text-[#1E2B38] focus:border-[#2A9D90] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void handleCreate()}
            className="rounded-md bg-[#2A9D90] px-2 py-1 text-xs font-medium text-white hover:bg-[#238277]"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setIsCreating(false);
              setNewPlanName('');
            }}
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="rounded-md border border-dashed border-[#E5E5E1] px-3 py-1.5 text-sm text-slate-500 transition-colors hover:border-[#2A9D90] hover:text-[#2A9D90]"
        >
          + New plan
        </button>
      )}
    </div>
  );
}
