import { useRef, useState } from 'react';
import { AlertTriangle, Upload, X } from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { formatShortDate } from '../export/dateScale';
import { IMPORT_ACCEPT, IMPORTABLE_EXTENSIONS } from '../import/detectFormat';
import { prepareImport, type ImportPreview } from '../import/prepareImport';
import { buttonClass } from './systemUi';
import { useApplyImport } from '../import/useApplyImport';
import { useFocusTrap } from '../utils/useFocusTrap';
import { useEscapeKey } from './useDismiss';

/** How many skipped rows are listed before the rest are counted. Enough to
 * show a pattern — the same column wrong all the way down — without the list
 * pushing the Import button off a phone screen. */
const SKIPPED_SHOWN = 5;

/** The one way into the app for a file, whichever of the three formats it is.
 *
 * Same overlay+backdrop pattern as ExportOverflowModal and SettingsFlyout,
 * with two things they don't need. It traps focus, because it is the only
 * dialog here whose controls change as it goes (choose a file, then confirm
 * an import) and Tab must not walk out to the page underneath in either
 * state. And the whole panel is the drop target, not a rectangle inside it:
 * a person dragging a file aims at the dialog, and a drop that lands two
 * pixels outside a smaller zone reads as the app refusing the file.
 *
 * Nothing is applied until Import is pressed. The summary in between is not
 * decoration: a spreadsheet is hand-kept, and "42 tasks, 3 rows skipped" is
 * the only moment the difference between what the file says and what the
 * plan will hold is visible while it can still be called off. */
export function ImportModal({ onClose }: { onClose: () => void }) {
  const items = useTimelineStore((state) => state.items);
  const applyImport = useApplyImport();

  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useFocusTrap(panelRef);

  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  useEscapeKey(onClose);

  const readFile = async (file: File) => {
    setIsBusy(true);
    setError(null);
    try {
      setPreview(await prepareImport(file, items));
    } catch (cause) {
      // The plan is untouched either way — nothing has been applied yet — so
      // this is a message and a second chance, not a failure state to escape.
      setPreview(null);
      setError(cause instanceof Error ? cause.message : 'The file could not be read. Please try another file.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setIsBusy(true);
    try {
      await applyImport(preview);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The import could not be applied. Please try again.');
      setIsBusy(false);
    }
  };

  const isFileDrag = (event: React.DragEvent) => event.dataTransfer.types.includes('Files');

  // dragenter/dragleave fire for every element the pointer crosses inside the
  // panel, so "left" has to mean left the panel — which is what relatedTarget
  // answers, and why this doesn't count enters against leaves: a count drifts
  // the moment one leave goes missing and the highlight is then stuck on.
  const handleDragLeave = (event: React.DragEvent) => {
    const movedTo = event.relatedTarget;
    if (movedTo instanceof Node && event.currentTarget.contains(movedTo)) return;
    setIsDraggingFile(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    setIsDraggingFile(false);
    // One file per drop: a plan replaces what's open while tasks join it, so
    // a mixed handful would have no sensible combined meaning.
    const [file] = Array.from(event.dataTransfer.files);
    if (file) void readFile(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-scrim p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onDragEnter={(event) => {
          if (isFileDrag(event)) setIsDraggingFile(true);
        }}
        onDragOver={(event) => {
          if (!isFileDrag(event)) return;
          // Without this the drop never fires at all; without it on the drop
          // itself the browser navigates away to display the file.
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex max-h-[85vh] w-full max-w-lg flex-col gap-5 rounded-lg border bg-background p-6 shadow-lg transition-colors max-md:p-4 ${
          isDraggingFile ? 'border-primary' : 'border-border'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="import-title" className="text-lg font-semibold tracking-tight text-foreground">
              Import tasks
            </h2>
            <p className="mt-1 text-sm text-muted-foreground max-md:text-base">
              A JSON plan, an Excel workbook, or a CSV table.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={buttonClass('ghost', 'icon', '-mr-1 -mt-1 text-muted-foreground max-md:h-11 max-md:w-11')}
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={IMPORT_ACCEPT}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Cleared so picking the same file twice still fires a change.
            event.target.value = '';
            if (file) void readFile(file);
          }}
        />

        {preview ? (
          <ImportSummary preview={preview} />
        ) : (
          <div
            // The system's one "add" idiom is a dashed border (readme.md,
            // "Visual foundations"); there is no file-drop primitive, so the
            // zone is that border plus a lucide icon and a Button.
            className={`flex flex-col items-center gap-4 rounded-md border border-dashed px-6 py-10 text-center transition-colors max-md:py-6 ${
              isDraggingFile ? 'border-primary bg-primary/5' : 'border-border'
            }`}
          >
            <Upload
              size={24}
              strokeWidth={2}
              aria-hidden="true"
              className={isDraggingFile ? 'text-primary' : 'text-muted-foreground'}
            />
            {/* Dragging a file is a desktop gesture — on a phone there is no
                file manager to drag from, so the picker is the whole story
                there and the drop copy is not shown at all. */}
            <p className="text-sm text-muted-foreground max-md:hidden">
              {isDraggingFile ? 'Drop the file to read it' : 'Drop a file here, or choose one'}
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
              className={buttonClass('default', 'default', 'max-md:h-11 max-md:w-full max-md:text-base')}
            >
              {isBusy ? 'Reading...' : 'Choose File'}
            </button>
            <p className="font-mono text-xs tabular-nums text-muted-foreground max-md:text-sm">
              {IMPORTABLE_EXTENSIONS.join('  ')}
            </p>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive max-md:text-base"
          >
            <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 max-md:flex-col-reverse">
          <button
            type="button"
            onClick={onClose}
            className={buttonClass('outline', 'default', 'max-md:h-11 max-md:text-base')}
          >
            Cancel
          </button>
          {preview && (
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={isBusy || preview.items.length === 0}
              className={buttonClass('default', 'default', 'max-md:h-11 max-md:text-base')}
            >
              {preview.action === 'replace-plan' ? 'Replace Plan' : `Import ${preview.items.length} Tasks`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <span className="text-sm text-muted-foreground max-md:text-base">{label}</span>
      <span className="text-right text-sm font-medium text-foreground max-md:text-base">{children}</span>
    </div>
  );
}

/** What the file turned out to hold, before any of it is applied. */
function ImportSummary({ preview }: { preview: ImportPreview }) {
  const { items, skipped, warnings, dateRange, levels, rootCount } = preview;

  return (
    <div className="min-h-0 overflow-y-auto">
      <p className="truncate font-mono text-xs tabular-nums text-muted-foreground max-md:text-sm">
        {preview.fileName}
      </p>

      <div className="mt-3">
        <SummaryRow label="Tasks recognised">{items.length}</SummaryRow>
        <SummaryRow label="Rows skipped">
          {skipped.length === 0 ? <span className="text-muted-foreground">None</span> : skipped.length}
        </SummaryRow>
        <SummaryRow label="Dates">
          {dateRange ? (
            <span className="font-mono text-xs tabular-nums max-md:text-sm">
              {formatShortDate(new Date(dateRange.start))} – {formatShortDate(new Date(dateRange.end))}
            </span>
          ) : (
            <span className="text-muted-foreground">None</span>
          )}
        </SummaryRow>
        {/* Levels and top-level counts, because "42 tasks" reads the same
            whether the file describes a hierarchy or a flat list, and only
            one of those is what a person exporting a Gantt chart wants. */}
        <SummaryRow label="Structure">
          {levels > 1 ? `${rootCount} top-level, ${levels} levels deep` : `${rootCount} tasks, no subtasks`}
        </SummaryRow>
        <SummaryRow label="Applies to">
          {preview.action === 'replace-plan' ? 'Replaces the open plan' : 'Adds to the open plan'}
        </SummaryRow>
      </div>

      {items.length === 0 && (
        // The button is disabled in this state, and a disabled button with no
        // reason beside it just reads as broken.
        <p className="mt-3 text-sm text-muted-foreground max-md:text-base">
          There is nothing to import from this file. The open plan is unchanged.
        </p>
      )}

      {warnings.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {warnings.map((warning) => (
            <li key={warning} className="flex items-start gap-2 text-xs text-muted-foreground max-md:text-base">
              <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
              {warning}
            </li>
          ))}
        </ul>
      )}

      {skipped.length > 0 && (
        <div className="mt-3 rounded-md bg-muted p-3">
          <p className="text-xs font-medium text-foreground max-md:text-base">
            {skipped.length} row{skipped.length === 1 ? '' : 's'} will not be imported
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {skipped.slice(0, SKIPPED_SHOWN).map((reason) => (
              <li key={reason} className="text-xs text-muted-foreground max-md:text-sm">
                {reason}
              </li>
            ))}
            {skipped.length > SKIPPED_SHOWN && (
              <li className="text-xs text-muted-foreground max-md:text-sm">
                and {skipped.length - SKIPPED_SHOWN} more
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
