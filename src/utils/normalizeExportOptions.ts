import type { ExportOptions } from '../store/timelineStore';

/** The export options that are plain on/off switches. Spelled out rather than
 * derived from the type, because the rest of ExportOptions is not booleans and
 * each of those fields would need a rule of its own. */
const FLAG_FIELDS = ['showProgress', 'showDependencies'] as const;

type FlagField = (typeof FLAG_FIELDS)[number];

/** What the file actually held, short enough to quote back in one line. */
function describe(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'object') return Array.isArray(value) ? 'a list' : 'an object';
  return String(value);
}

export interface NormalizedExportOptions {
  options: ExportOptions;
  /** One line per field that had to be replaced — the same "say what the file
   * cost you" contract the status and progress rules follow (see
   * unknownStatusWarnings), so the import dialog can show them together. */
  warnings: string[];
}

/** The export options a plan file carries, with anything unusable in a flag
 * field replaced by that flag's default and reported.
 *
 * Merging a file's options over the defaults is what makes a plan written by
 * an older build — or by hand, or by another tool — open at all: a field it
 * never heard of simply keeps the default. But the merge alone trusts whatever
 * is *present*, and `"showDependencies": null` is present. It is falsy, so it
 * read as "off" and quietly took every dependency arrow out of the export,
 * with nothing said about it. A missing key was safe; a null one was not, and
 * the difference was invisible to the person who wrote the file.
 *
 * `defaults` is passed in rather than imported so this stays a pure rule with
 * no dependency on the store (which imports from this directory itself).
 */
export function normalizeExportOptions(raw: unknown, defaults: ExportOptions): NormalizedExportOptions {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { options: defaults, warnings: [] };
  }

  const record = raw as Record<string, unknown>;
  const options: ExportOptions = { ...defaults, ...record } as ExportOptions;
  const warnings: string[] = [];

  FLAG_FIELDS.forEach((field: FlagField) => {
    if (!(field in record) || typeof record[field] === 'boolean') return;

    options[field] = defaults[field];
    warnings.push(
      `"${field}" is not true or false (${describe(record[field])}) — using the default ` +
        `(${defaults[field] ? 'on' : 'off'}).`,
    );
  });

  return { options, warnings };
}
