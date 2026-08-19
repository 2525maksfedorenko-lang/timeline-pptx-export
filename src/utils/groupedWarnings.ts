/** One thing an importer had to say about, and where it was. */
export interface LocatedValue {
  /** Named the way its own source counts them — "Row 5" for a spreadsheet,
   * "Task at index 3" for a JSON array. */
  location: string;
  /** What the warning groups by: the offending text, or the name of the rule
   * that was applied. Entries sharing a value become one line. */
  value: string;
}

/** How many locations a single line names before it starts counting them. */
const LOCATIONS_NAMED = 3;

/** One line per distinct value rather than per occurrence: a file with the same
 * thing wrong in four hundred rows has one thing wrong with it, and says so
 * once. Up to LOCATIONS_NAMED places are named, which keeps a line actionable
 * without letting one bad column fill the import dialog.
 *
 * `sentence` receives the value, the places rendered as "Row 3, Row 5 and 9
 * more", and how many there were in total, so each caller keeps its own wording
 * while the grouping and the counting stay in one place. */
export function groupedWarnings(
  entries: LocatedValue[],
  sentence: (value: string, where: string, count: number) => string,
): string[] {
  const locationsByValue = new Map<string, string[]>();
  entries.forEach(({ location, value }) => {
    locationsByValue.set(value, [...(locationsByValue.get(value) ?? []), location]);
  });

  return [...locationsByValue.entries()].map(([value, locations]) => {
    const remaining = locations.length - LOCATIONS_NAMED;
    const where =
      remaining > 0
        ? `${locations.slice(0, LOCATIONS_NAMED).join(', ')} and ${remaining} more`
        : locations.join(', ');

    return sentence(value, where, locations.length);
  });
}
