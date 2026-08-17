import { useCallback } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { savePlan as savePlanToDb } from '../store/planStorage';
import { parseExcelFile } from './excelImport';
import { parseImportedTasks } from './importTasks';
import { parsePlanJson } from './planJson';

/** Everything the app knows how to read, in the order a person would list
 * them. Also what the "unsupported format" message quotes back. */
export const IMPORTABLE_EXTENSIONS = ['.json', '.xlsx', '.csv'] as const;

/** The file's extension including the dot, lowercased, or '' when the name
 * has none — a dotless name must not be read as though the whole name were
 * an extension. */
function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read the file.'));
    reader.readAsText(file);
  });
}

/** Imports one file, whichever way it arrived — a file picker or a drop.
 *
 * This is the single path for all of it: picking a file and dropping one
 * differ only in how the File is obtained, so the routing, the parsing and
 * the error reporting live here once and every entry point behaves the
 * same. Errors are surfaced with alert(), as the import buttons already
 * did.
 *
 * Format comes from the extension, never from sniffing the contents: an
 * unsupported file is refused outright rather than half-parsed into a
 * confusing error about its innards.
 */
export function useFileImport() {
  const items = useTimelineStore((state) => state.items);
  const addItem = useTimelineStore((state) => state.addItem);
  const loadPlans = useTimelineStore((state) => state.loadPlans);
  const switchToPlan = useTimelineStore((state) => state.switchToPlan);

  return useCallback(
    async (file: File): Promise<void> => {
      const extension = fileExtension(file.name);

      if (extension !== '.json' && extension !== '.xlsx' && extension !== '.csv') {
        alert(
          `Unsupported file format: ${extension || file.name}. ` +
            `Supported formats: ${IMPORTABLE_EXTENSIONS.join(', ')}`,
        );
        return;
      }

      try {
        if (extension === '.json') {
          const text = await readText(file);

          try {
            // The whole-plan shape first: name, items and export options,
            // which replaces whatever plan is open.
            const plan = parsePlanJson(text);
            await savePlanToDb(plan);
            await loadPlans();
            await switchToPlan(plan.id);
          } catch (planError) {
            // The other JSON this app understands is a bare array of tasks,
            // which joins the open plan instead of replacing it. Only tried
            // when the file actually is an array — otherwise the plan
            // parser's own message is the one worth showing, and "must
            // contain an array of tasks" would just be misleading.
            if (!text.trim().startsWith('[')) throw planError;

            parseImportedTasks(text).forEach((item) => addItem(item));
          }
          return;
        }

        const { items: importedItems, errors } = await parseExcelFile(file, items);
        importedItems.forEach((item) => addItem(item));

        if (errors.length > 0) {
          const summary = `Imported ${importedItems.length} task${importedItems.length === 1 ? '' : 's'}.`;
          alert(
            `${summary}\n\n${errors.length} row${errors.length === 1 ? '' : 's'} skipped:\n${errors.join('\n')}`,
          );
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to import the file.');
      }
    },
    [items, addItem, loadPlans, switchToPlan],
  );
}
