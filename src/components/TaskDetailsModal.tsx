import { createPortal } from 'react-dom';
import type { TimelineItem } from '../types/timeline';
import { AssigneeSelect } from './AssigneeSelect';

interface TaskDetailsModalProps {
  item: TimelineItem;
  /** The dialog panel itself (not the backdrop) — GanttChart holds this ref
   * to tell "clicked inside the popup" from "clicked away" in its
   * document-level mousedown handler, so a click on the backdrop still
   * counts as away. */
  panelRef: React.RefObject<HTMLDivElement | null>;
  commentText: string;
  onCommentTextChange: (value: string) => void;
  selectedAssigneeId: string;
  onSelectedAssigneeIdChange: (value: string) => void;
  newPersonName: string;
  onNewPersonNameChange: (value: string) => void;
  tagInput: string;
  onTagInputChange: (value: string) => void;
  onTagInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onRemoveTag: (tag: string) => void;
  canSave: boolean;
  onSave: () => void;
  onClose: () => void;
  // The two row actions that don't fit in the phone layout's zone 3 (see
  // GanttRow) and are hosted here instead — rendered only below the
  // breakpoint, so the desktop dialog is untouched. `onDelete` is undefined
  // exactly when the row's own trash icon is absent (a task with no
  // subtasks), rather than showing a delete the row itself doesn't offer.
  includedInExport: boolean;
  onToggleIncludeInExport: () => void;
  onDelete?: () => void;
}

/** The comment/assignee/tags editor for one task, as a centered modal —
 * same overlay+backdrop pattern as ExportOverflowModal, at a size that
 * actually gives a comment room to be read while it's being written (it used
 * to be a 16rem popup pinned beside the row's icons).
 *
 * Two things are deliberately *not* here:
 * - Escape and backdrop-click closing. Both live in GanttChart alongside the
 *   draft state, because closing is conditional (a half-written comment must
 *   not be dropped by a stray click) and only the owner of the draft can
 *   judge that. So no `onClick={onClose}` on the backdrop, unlike
 *   ExportOverflowModal, whose dialog has nothing to lose.
 * - The store writes. GanttRow keeps them, so this stays a presentational
 *   component that could be lifted into another codebase as-is.
 *
 * Portaled to <body> because its trigger lives inside the Gantt row's sticky
 * zone 3, which carries a z-index and therefore its own stacking context: a
 * `fixed` overlay rendered in place would be trapped in it and painted under
 * the sticky columns of every row below. */
export function TaskDetailsModal({
  item,
  panelRef,
  commentText,
  onCommentTextChange,
  selectedAssigneeId,
  onSelectedAssigneeIdChange,
  newPersonName,
  onNewPersonNameChange,
  tagInput,
  onTagInputChange,
  onTagInputKeyDown,
  onRemoveTag,
  canSave,
  onSave,
  onClose,
  includedInExport,
  onToggleIncludeInExport,
  onDelete,
}: TaskDetailsModalProps) {
  const titleId = `task-modal-${item.id}`;

  return createPortal(
    // `w-full` inside the overlay's own p-4 is what makes this a near-
    // full-width sheet on a phone (that padding *is* the 16px margin) and a
    // 512px dialog on a desktop — one rule, two shapes. The height cap and
    // the shorter textarea keep it inside a 667px screen once the on-screen
    // keyboard has taken its half.
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E2B38]/40 p-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-lg border border-[#E5E5E1] bg-white p-6 text-left shadow-xl max-md:max-h-[85vh] max-md:overflow-y-auto max-md:p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="min-w-0 truncate text-base font-semibold tracking-tight text-[#1E2B38]">
            {item.label}
          </h2>
          {/* Phone-only: a desktop pointer has both the Cancel button and
              the whole backdrop to click, so a second close affordance
              would be clutter there. */}
          <button
            type="button"
            onClick={onClose}
            className="hidden h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-2xl leading-none text-slate-400 max-md:flex"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-1.5 max-md:mt-4">
          <label htmlFor={`comment-${item.id}`} className="text-sm font-medium text-slate-500">
            Comment *
          </label>
          <textarea
            id={`comment-${item.id}`}
            autoFocus
            rows={6}
            value={commentText}
            onChange={(event) => onCommentTextChange(event.target.value)}
            placeholder="Add a note about this task…"
            className="resize-none rounded-md border border-[#E5E5E1] px-3 py-2 text-base leading-relaxed text-[#1E2B38] focus:border-[#2A9D90] focus:outline-none max-md:h-24"
          />
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor={`row-${item.id}-assignee`} className="text-sm font-medium text-slate-500">
            Assignee
          </label>
          <AssigneeSelect
            idPrefix={`row-${item.id}`}
            value={selectedAssigneeId}
            onChange={onSelectedAssigneeIdChange}
            newPersonName={newPersonName}
            onNewPersonNameChange={onNewPersonNameChange}
            placeholderLabel={item.assignee ? `Keep: ${item.assignee.name}` : 'Select assignee…'}
          />
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor={`tag-${item.id}`} className="text-sm font-medium text-slate-500">
            Tags
          </label>
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-sm text-slate-700"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => onRemoveTag(tag)}
                    className="leading-none text-slate-400 hover:text-slate-600"
                    aria-label={`Remove tag ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            id={`tag-${item.id}`}
            type="text"
            value={tagInput}
            onChange={(event) => onTagInputChange(event.target.value)}
            onKeyDown={onTagInputKeyDown}
            placeholder="Add a tag, press Enter…"
            className="rounded-md border border-[#E5E5E1] px-3 py-2 text-base text-[#1E2B38] focus:border-[#2A9D90] focus:outline-none"
          />
        </div>

        {/* The row actions that zone 3 gives up on a phone (see GanttRow):
            present in the DOM at every width but only displayed below the
            breakpoint, so the desktop dialog renders exactly as it did. */}
        <div className="mt-5 hidden flex-col gap-2 border-t border-[#E5E5E1] pt-4 max-md:flex">
          <button
            type="button"
            onClick={onToggleIncludeInExport}
            className="min-h-11 rounded-md border border-[#E5E5E1] px-4 text-sm font-medium text-[#1E2B38] transition-colors hover:bg-slate-50"
          >
            {includedInExport ? 'Exclude from export' : 'Include in export'}
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="min-h-11 rounded-md border border-[#E76E50] px-4 text-sm font-medium text-[#E76E50] transition-colors hover:bg-[#E76E50]/10"
            >
              Delete task and subtasks
            </button>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2 max-md:mt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 max-md:min-h-11 max-md:flex-1"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className="rounded-md bg-[#2A9D90] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#238277] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#2A9D90] max-md:min-h-11 max-md:flex-1"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
