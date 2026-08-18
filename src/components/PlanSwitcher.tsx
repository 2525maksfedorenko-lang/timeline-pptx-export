import { useRef, useState } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { exportPlanToJsonFile } from '../import/planJson';
import { useFileImport } from '../import/useFileImport';

export function PlanSwitcher() {
  const savedPlans = useTimelineStore((state) => state.savedPlans);
  const activePlanId = useTimelineStore((state) => state.activePlanId);
  const switchToPlan = useTimelineStore((state) => state.switchToPlan);
  const saveCurrentAsPlan = useTimelineStore((state) => state.saveCurrentAsPlan);
  const deletePlan = useTimelineStore((state) => state.deletePlan);
  const importFile = useFileImport();

  const [isCreating, setIsCreating] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const sheetFileInputRef = useRef<HTMLInputElement>(null);

  const activePlan = savedPlans.find((plan) => plan.id === activePlanId);

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

  const handleSaveJson = () => {
    if (!activePlan) return;
    exportPlanToJsonFile(activePlan);
  };

  const handleLoadJsonClick = () => {
    jsonFileInputRef.current?.click();
  };

  const handleLoadSheetClick = () => {
    sheetFileInputRef.current?.click();
  };

  // Both inputs hand the file to the same importer a drop does (see
  // useFileImport), so picking a file and dropping one can't diverge.
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void importFile(file);
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border pb-3">
      {savedPlans.map((plan) => (
        <div
          key={plan.id}
          className={`group flex items-center gap-2 rounded-t-md border border-b-0 px-3 py-1.5 text-sm transition-colors ${
            plan.id === activePlanId
              ? 'border-border bg-card font-medium text-foreground'
              : 'border-transparent bg-muted text-muted-foreground hover:bg-border'
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
            className="text-muted-foreground/70 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100 max-md:opacity-100"
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
            className="rounded-md border border-border px-2 py-1 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
          <button
            type="button"
            onClick={() => void handleCreate()}
            className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setIsCreating(false);
              setNewPlanName('');
            }}
            className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="rounded-md border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          + New plan
        </button>
      )}

      <div className="ml-auto flex items-center gap-1">
        <input
          ref={jsonFileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={handleSaveJson}
          disabled={!activePlan}
          title="Save current plan as JSON"
          aria-label="Save current plan as JSON"
          className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent max-md:p-3"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
            <path
              d="M10 3v9m0 0-3-3m3 3 3-3M4 13v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <input
          ref={sheetFileInputRef}
          type="file"
          accept=".xlsx,.csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={handleLoadSheetClick}
          title="Import tasks from Excel or CSV (columns: Label, Start, End, Progress, Status, Assignee, Parent)"
          aria-label="Import tasks from Excel or CSV"
          className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground max-md:p-3"
        >
          {/* A grid, to read as "spreadsheet" beside the two plain
              file arrows either side of it. */}
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
            <path
              d="M3.5 4.5h13v11h-13v-11Zm0 3.7h13m-13 3.6h13M8.2 4.5v11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleLoadJsonClick}
          title="Load plan from JSON"
          aria-label="Load plan from JSON"
          className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground max-md:p-3"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
            <path
              d="M10 12V3m0 0-3 3m3-3 3 3M4 13v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
