import {
  DEFAULT_TASK_STATUS,
  TASK_STATUS_LABELS,
  TASK_STATUS_VALUES,
  type TaskStatus,
  type TimelineItem,
} from '../types/timeline';

/** Status text keyed the way a person is likely to have typed it: trimmed,
 * lower case, runs of spaces and underscores collapsed — so "In Progress",
 * "in_progress" and "IN  PROGRESS" are one spelling. */
function statusKey(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, ' ');
}

/** Every spelling of a status this app accepts from outside itself: the value
 * it stores ("in_progress" -> "in progress"), and the label it displays ("In
 * progress"). A person filling in a spreadsheet — or hand-writing a JSON plan
 * — types what they see on screen, not the enum, and "To do" is not "todo"
 * until something says so. */
const STATUS_BY_TEXT = new Map<string, TaskStatus>(
  TASK_STATUS_VALUES.flatMap((value) => [
    [statusKey(value), value] as const,
    [statusKey(TASK_STATUS_LABELS[value]), value] as const,
  ]),
);

/** The spellings quoted back when nothing matches — the display labels, since
 * those are what a person would have been copying. */
export const STATUS_HINT = TASK_STATUS_VALUES.map((value) => TASK_STATUS_LABELS[value]).join(', ');

/** The app's own status for whatever a file, or a plan saved by an older
 * build, holds in a status field. Null when nothing matches. */
export function normalizeTaskStatus(value: unknown): TaskStatus | null {
  return STATUS_BY_TEXT.get(statusKey(value)) ?? null;
}

/** One task whose status wasn't recognized: what it said, and where it sat. */
export interface UnknownStatus {
  /** Named the way the task's own source counts them — "Row 5" for a
   * spreadsheet, "Task at index 3" for a JSON array. */
  location: string;
  value: string;
}

/** How many locations a single warning names before it starts counting them. */
const LOCATIONS_NAMED = 3;

/** One line per distinct unrecognized spelling rather than per task: a file
 * that calls every open task "WIP" has one thing wrong with it, and says so
 * once — the same shape as parseSheet's ambiguous-Parent warning. Up to
 * LOCATIONS_NAMED places are named, which keeps the line actionable without
 * letting one bad column fill the import dialog. */
export function unknownStatusWarnings(unknown: UnknownStatus[]): string[] {
  const locationsByValue = new Map<string, string[]>();
  unknown.forEach(({ location, value }) => {
    locationsByValue.set(value, [...(locationsByValue.get(value) ?? []), location]);
  });

  return [...locationsByValue.entries()].map(([value, locations]) => {
    const remaining = locations.length - LOCATIONS_NAMED;
    const where =
      remaining > 0
        ? `${locations.slice(0, LOCATIONS_NAMED).join(', ')} and ${remaining} more`
        : locations.join(', ');

    return (
      `"${value}" is not a status (${where}) — imported as ` +
      `"${TASK_STATUS_LABELS[DEFAULT_TASK_STATUS]}". Expected one of: ${STATUS_HINT}.`
    );
  });
}

function withoutStatus(item: TimelineItem): TimelineItem {
  const next = { ...item };
  delete next.status;
  return next;
}

export interface StatusNormalization {
  items: TimelineItem[];
  warnings: string[];
}

/** Canonicalizes every item's status, and says where it couldn't.
 *
 * One rule, in one place, for every way a task enters this app — the three
 * parsers and the two persistence layers alike. A spelling we recognize
 * becomes the app's own value; one we don't is dropped, so the task still
 * imports and reads as "to do", and the dropped spelling is reported instead
 * of kept. Keeping it is what the JSON paths used to do, and an item carrying
 * "In Progress" is worse than one carrying nothing: getTaskStatus hands that
 * string straight to the colour table, the chip, the status sort and the
 * dashboard metrics, where it matches no key at all.
 *
 * `locate` names an item the way its own source counts them; the default
 * names the task itself, which is all a saved plan can say about it. */
export function normalizeItemStatuses(
  items: TimelineItem[],
  locate: (item: TimelineItem, index: number) => string = (item) => `"${item.label}"`,
): StatusNormalization {
  const unknown: UnknownStatus[] = [];

  const normalized = items.map((item, index) => {
    const raw: unknown = item.status;
    if (raw === undefined) return item;

    // Nothing was filled in. `status` is optional and getTaskStatus falls back
    // to "to do" — but it falls back on nullish only, so an empty string would
    // sail straight past it and behave exactly like an unknown status.
    if (raw === null || String(raw).trim() === '') return withoutStatus(item);

    const status = normalizeTaskStatus(raw);
    if (status === raw) return item;

    if (status === null) {
      unknown.push({ location: locate(item, index), value: String(raw).trim() });
      return withoutStatus(item);
    }

    return { ...item, status };
  });

  return { items: normalized, warnings: unknownStatusWarnings(unknown) };
}
