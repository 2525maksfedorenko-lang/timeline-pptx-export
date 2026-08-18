import { useState, type ReactNode } from 'react';
import { IMPORTABLE_EXTENSIONS, useFileImport } from '../import/useFileImport';

/** Wraps the page so a file dragged from a folder can be dropped anywhere on
 * it. Dropping is only another way to hand over a File — everything after
 * that is useFileImport, the same routing the import buttons use.
 *
 * Both onDragOver and onDrop must preventDefault: without the first the drop
 * never fires, and without the second the browser navigates away to display
 * the file, which loses whatever is in the app. */
export function FileDropZone({ children }: { children: ReactNode }) {
  const importFile = useFileImport();
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const isFileDrag = (event: React.DragEvent) => event.dataTransfer.types.includes('Files');

  const handleDragEnter = (event: React.DragEvent) => {
    if (isFileDrag(event)) setIsDraggingFile(true);
  };

  // dragenter/dragleave fire for every element the pointer crosses inside
  // the zone, so "left" has to mean left the zone, not left a row. That's
  // what relatedTarget answers — the element the pointer moved *to*, and
  // null when it left the window entirely.
  //
  // Answering it from the event rather than by counting enters and leaves
  // is the point: a count drifts the moment one leave goes missing (a drag
  // ending outside the window, a hot reload mid-drag) and then the
  // highlight is stuck on with nothing able to clear it.
  const handleDragLeave = (event: React.DragEvent) => {
    const movedTo = event.relatedTarget;
    if (movedTo instanceof Node && event.currentTarget.contains(movedTo)) return;
    setIsDraggingFile(false);
  };

  const handleDragOver = (event: React.DragEvent) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (event: React.DragEvent) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    setIsDraggingFile(false);

    // One file per drop: a plan replaces what's open while tasks join it, so
    // a mixed handful would have no sensible combined meaning.
    const [file] = Array.from(event.dataTransfer.files);
    if (file) void importFile(file);
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {isDraggingFile && (
        // pointer-events-none matters: an overlay that could itself become
        // the drag target would swallow the drop and leave the highlight
        // stuck on.
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center border-4 border-dashed border-primary/50 bg-primary/10 p-6">
          <div className="rounded-lg border border-primary bg-background px-6 py-4 text-center shadow-lg">
            <p className="text-sm font-semibold tracking-tight text-foreground">Drop to import</p>
            <p className="mt-1 text-xs text-muted-foreground">{IMPORTABLE_EXTENSIONS.join(', ')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
