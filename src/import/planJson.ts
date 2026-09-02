import type { SavedPlan } from '../store/planStorage';
import type { TaskComment, TimelineItem } from '../types/timeline';
import { DEFAULT_EXPORT_OPTIONS } from '../store/timelineStore';
import { normalizeExportOptions } from '../utils/normalizeExportOptions';
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

/** The comments in a plan file, keeping the ones a plan can actually hold.
 *
 * A plan file carries its comments now, because a comment is part of a plan —
 * `exportPlanToJsonFile` writes the whole record, so a file written by this
 * app already has them, and a round trip through it has to bring them home.
 * Ids survive that trip: a JSON plan's tasks keep the ids they were written
 * with (see validateTimelineItem), so a comment still finds its task.
 *
 * Unlike a task, a bad comment is not worth failing an import over — the plan
 * is the tasks, and a malformed note about one of them is a line to drop and
 * mention, not a reason to refuse the file. Three ways to be dropped, each
 * counted rather than listed, since a file can hold a great many:
 *
 * - not an object with the four strings a comment is made of;
 * - naming a task this plan does not contain, which has nothing left to be
 *   about — the same rule `copyBranch` applies to a comment left behind;
 * - a file whose `comments` is not an array at all, which is the whole field
 *   gone rather than an entry.
 */
function parsePlanComments(raw: unknown, items: TimelineItem[]): { comments: TaskComment[]; warnings: string[] } {
  if (raw === undefined) return { comments: [], warnings: [] };
  if (!Array.isArray(raw)) {
    return { comments: [], warnings: ['"comments" is not an array — the plan is imported without any.'] };
  }

  const taskIds = new Set(items.map((item) => item.id));
  const comments: TaskComment[] = [];
  let malformed = 0;
  let orphaned = 0;

  raw.forEach((entry) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      malformed += 1;
      return;
    }
    const record = entry as Record<string, unknown>;
    const isShaped =
      typeof record.id === 'string' &&
      typeof record.taskId === 'string' &&
      typeof record.body === 'string' &&
      typeof record.createdAt === 'string';
    if (!isShaped) {
      malformed += 1;
      return;
    }
    if (!taskIds.has(record.taskId as string)) {
      orphaned += 1;
      return;
    }

    const comment: TaskComment = {
      id: record.id as string,
      taskId: record.taskId as string,
      body: record.body as string,
      createdAt: record.createdAt as string,
    };
    // Optional, and only carried when it is the boolean it claims to be.
    if (typeof record.isPinned === 'boolean') comment.isPinned = record.isPinned;
    comments.push(comment);
  });

  const warnings: string[] = [];
  if (malformed > 0) {
    warnings.push(
      `${malformed} comment${malformed === 1 ? '' : 's'} could not be read and ${malformed === 1 ? 'was' : 'were'} dropped.`,
    );
  }
  if (orphaned > 0) {
    warnings.push(
      `${orphaned} comment${orphaned === 1 ? '' : 's'} named a task that is not in this plan and ${orphaned === 1 ? 'was' : 'were'} dropped.`,
    );
  }

  return { comments, warnings };
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

  // Merged over the defaults, but not blindly: a flag holding something that
  // isn't true or false falls back to its default and says so, rather than
  // being taken at its falsy word (see normalizeExportOptions).
  const { options: exportOptions, warnings: optionWarnings } = normalizeExportOptions(
    record.exportOptions,
    DEFAULT_EXPORT_OPTIONS,
  );

  const { comments, warnings: commentWarnings } = parsePlanComments(record.comments, items);

  const now = new Date().toISOString();

  return {
    plan: {
      id: crypto.randomUUID(),
      name: record.name,
      items,
      comments,
      exportOptions,
      createdAt: typeof record.createdAt === 'string' ? record.createdAt : now,
      updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : now,
    },
    warnings: [...warnings, ...optionWarnings, ...commentWarnings],
  };
}
