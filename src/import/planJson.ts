import type { SavedPlan } from '../store/planStorage';
import { DEFAULT_EXPORT_OPTIONS, type ExportOptions } from '../store/timelineStore';
import { parseImportedTasks } from './importTasks';

/** Triggers a browser download of `plan` as a formatted JSON file. */
export function exportPlanToJsonFile(plan: SavedPlan): void {
  const json = JSON.stringify(plan, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const safeName = plan.name.trim().replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_') || 'plan';

  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}.json`;
  link.click();

  URL.revokeObjectURL(url);
}

export interface ParsedPlan {
  plan: SavedPlan;
  /** Passed straight through from parseImportedTasks: statuses this build
   * doesn't recognize, dropped rather than carried into the plan. */
  warnings: string[];
}

/** Parses and validates a JSON string as a SavedPlan, throwing a descriptive error
 * on the first missing or invalid field. Item validation — and status
 * normalization with it — is delegated to parseImportedTasks so the rules
 * aren't duplicated. */
export function parsePlanJson(json: string): ParsedPlan {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('The file is not valid JSON.');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('The JSON file must contain a plan object.');
  }

  const record = parsed as Record<string, unknown>;

  if (typeof record.name !== 'string' || record.name.trim() === '') {
    throw new Error('The plan is missing a valid "name" field.');
  }

  if (!Array.isArray(record.items)) {
    throw new Error('The plan is missing a valid "items" field (expected an array of tasks).');
  }

  const { items, warnings } = parseImportedTasks(JSON.stringify(record.items));

  const exportOptions: ExportOptions =
    typeof record.exportOptions === 'object' && record.exportOptions !== null && !Array.isArray(record.exportOptions)
      ? ({ ...DEFAULT_EXPORT_OPTIONS, ...record.exportOptions } as ExportOptions)
      : DEFAULT_EXPORT_OPTIONS;

  const now = new Date().toISOString();

  return {
    plan: {
      id: crypto.randomUUID(),
      name: record.name,
      items,
      exportOptions,
      createdAt: typeof record.createdAt === 'string' ? record.createdAt : now,
      updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : now,
    },
    warnings,
  };
}
