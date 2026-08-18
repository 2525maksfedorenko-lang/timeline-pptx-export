/** What the app can read, in the order a person would list them — and what
 * the file picker filters on. The extensions are a convenience for the
 * picker, never how a file is actually identified: see detectImportFormat. */
export const IMPORTABLE_EXTENSIONS = ['.json', '.xlsx', '.csv'] as const;
export const IMPORT_ACCEPT = IMPORTABLE_EXTENSIONS.join(',');

export type ImportFormat = 'json' | 'xlsx' | 'csv';

/** How a format reads in a sentence, for the "read as …" note shown when a
 * file's contents don't match its name. */
export const FORMAT_LABELS: Record<ImportFormat, string> = {
  json: 'JSON plan',
  xlsx: 'Excel workbook',
  csv: 'CSV table',
};

// Every .xlsx is a zip, and every zip starts with these four bytes. This is
// also what tells a real workbook from a text file that merely ends in .xlsx.
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];

// The separators a spreadsheet export actually produces: comma, the
// semicolon Excel writes wherever the locale's decimal mark is a comma, tab,
// and the pipe some exports use to dodge both.
const DELIMITERS = [',', ';', '\t', '|'];

/** The file's text, with a UTF-8 BOM removed.
 *
 * Excel writes that BOM on every "CSV UTF-8" save, and it is invisible in
 * every editor — but left in place it becomes part of the first heading, so
 * "Label" arrives as "﻿Label" and matches no column at all. */
export function decodeImportText(bytes: ArrayBuffer): string {
  const text = new TextDecoder('utf-8').decode(bytes);
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** The extension including the dot, lowercased, or '' when the name has none. */
export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

/** What this file actually is, judged by its bytes — or null when it is none
 * of the three.
 *
 * By content rather than by extension, because the two disagree in exactly
 * the case that costs the most: a CSV saved as `plan.json` routed on its name
 * alone reaches the JSON parser, which reports "not valid JSON" about a file
 * the app can read perfectly well. Names are a hint a person can get wrong;
 * the first bytes are not.
 *
 * The order matters. The zip signature is checked first because an .xlsx is
 * binary and any text test on it is meaningless. A JSON document then
 * announces itself with `{` or `[` — the only two characters a valid one can
 * start with. Everything left is judged as a delimited table, which is a
 * shape rather than a signature, so it is checked last and required to look
 * like an actual table: a first line split into at least two fields by one of
 * the known separators. */
export function detectImportFormat(bytes: ArrayBuffer): ImportFormat | null {
  const head = new Uint8Array(bytes.slice(0, ZIP_SIGNATURE.length));
  if (ZIP_SIGNATURE.every((byte, index) => head[index] === byte)) return 'xlsx';

  const text = decodeImportText(bytes);
  const trimmed = text.trimStart();
  if (trimmed === '') return null;

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';

  // A NUL byte means this is some other binary — an .xls, a PDF, an image
  // someone renamed. Calling that a CSV would hand the sheet parser a wall of
  // control characters and produce an error about columns.
  if (text.includes('\0')) return null;

  const firstLine = trimmed.split(/\r?\n/, 1)[0] ?? '';
  const looksTabular = DELIMITERS.some((delimiter) => firstLine.split(delimiter).length >= 2);

  return looksTabular ? 'csv' : null;
}
