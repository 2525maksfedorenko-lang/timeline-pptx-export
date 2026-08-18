import { useEffect } from 'react';
import type { ExportMode } from '../export/timelineExportModel';

interface ExportOverflowModalProps {
  /** In-range top-level tasks — more than `capacity`, or this modal
   * shouldn't be shown at all. */
  totalTasks: number;
  /** How many of them fit on a single overview slide. */
  capacity: number;
  onSelect: (mode: ExportMode) => void;
  onCancel: () => void;
}

function ModeOption({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-md border border-border px-4 py-3 text-left transition-colors hover:bg-accent hover:bg-muted/50"
    >
      <span className="block text-sm font-medium text-foreground">{title}</span>
      <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
    </button>
  );
}

/** Asked before an export whose top-level tasks outnumber one overview
 * slide's capacity: keep the single slide and note the rest as omitted, or
 * page them across several overview slides. */
export function ExportOverflowModal({ totalTasks, capacity, onSelect, onCancel }: ExportOverflowModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-overflow-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl"
      >
        <h2 id="export-overflow-title" className="text-lg font-semibold tracking-tight text-foreground">
          More tasks than fit on one slide
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Your plan has {totalTasks} tasks, only {capacity} fit on a single slide.
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <ModeOption
            title="Compact — single slide"
            description={`Show first ${capacity} tasks, rest noted as omitted`}
            onClick={() => onSelect('compact')}
          />
          <ModeOption
            title="Full — multiple slides"
            description={`Show all ${totalTasks} tasks across multiple pages`}
            onClick={() => onSelect('full')}
          />
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
