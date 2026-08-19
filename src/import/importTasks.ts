import type { TimelineItem } from '../types/timeline';
import { normalizePlanItems } from '../utils/normalizePlanItems';

const REQUIRED_STRING_FIELDS: (keyof TimelineItem)[] = ['id', 'label', 'start', 'end'];

/** Validates one candidate task against the rules a TimelineItem has to
 * satisfy, whatever produced it, and throws the first thing wrong with it.
 *
 * `location` names the offending entry the way its own source counts them —
 * "Task at index 3" for a JSON array, "Row 5" for a spreadsheet — so the
 * rules live here once while each importer keeps error messages its user
 * can act on. */
export function validateTimelineItem(raw: unknown, location: string): TimelineItem {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`${location} is not an object.`);
  }

  const record = raw as Record<string, unknown>;

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof record[field] !== 'string' || record[field] === '') {
      throw new Error(`${location} is missing a valid "${field}" field.`);
    }
  }

  if (record.progress !== undefined && typeof record.progress !== 'number') {
    throw new Error(`${location} has an invalid "progress" field (expected a number).`);
  }

  if (record.group !== undefined && typeof record.group !== 'string') {
    throw new Error(`${location} has an invalid "group" field (expected a string).`);
  }

  if (record.color !== undefined && typeof record.color !== 'string') {
    throw new Error(`${location} has an invalid "color" field (expected a string).`);
  }

  if (record.parentId !== undefined && typeof record.parentId !== 'string') {
    throw new Error(`${location} has an invalid "parentId" field (expected a string).`);
  }

  if (record.milestone !== undefined && typeof record.milestone !== 'boolean') {
    throw new Error(`${location} has an invalid "milestone" field (expected a boolean).`);
  }

  if (record.includeInExport !== undefined && typeof record.includeInExport !== 'boolean') {
    throw new Error(`${location} has an invalid "includeInExport" field (expected a boolean).`);
  }

  // `status` is deliberately not checked here, and neither is what `parentId`
  // points at. One is a field a person writes in their own words ("In
  // Progress", "done") and the other is a shape only the whole list can show
  // (a parent loop), so both are repaired rather than judged — see
  // normalizePlanItems, the pass every importer and both persistence layers
  // run their tasks through.

  if (
    record.dependencies !== undefined &&
    (!Array.isArray(record.dependencies) || !record.dependencies.every((dep) => typeof dep === 'string'))
  ) {
    throw new Error(`${location} has an invalid "dependencies" field (expected an array of strings).`);
  }

  return record as unknown as TimelineItem;
}

export interface ImportedTasks {
  items: TimelineItem[];
  /** What had to be repaired to make a plan of the list — an unknown status,
   * a circular parent link (see normalizePlanItems). Not errors: every task
   * is in `items`. */
  warnings: string[];
}

/** Parses and validates a JSON string as an array of TimelineItem, throwing a
 * descriptive error on the first invalid entry rather than importing partial
 * data — then running the list through the shared normalization pass, so a
 * hand-written file saying "In Progress", or describing two tasks as each
 * other's parent, lands as something the app can actually draw. */
export function parseImportedTasks(json: string): ImportedTasks {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('The file is not valid JSON.');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('The JSON file must contain an array of tasks.');
  }

  if (parsed.length === 0) {
    throw new Error('The JSON file contains no tasks.');
  }

  const items = parsed.map((item, index) => validateTimelineItem(item, `Task at index ${index}`));

  return normalizePlanItems(items, (_item, index) => `Task at index ${index}`);
}
