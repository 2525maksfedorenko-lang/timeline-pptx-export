import { useState } from 'react';
import { useTimelineStore, type ExportOptions } from '../store/timelineStore';
import { getTaskStatus, TASK_STATUS_LABELS, type SortMode, type TaskStatus } from '../types/timeline';
import { toHtml } from '../utils/renderMarkdown';
import { buildTaskHierarchy } from '../utils/taskHierarchy';

const COMMENT_BODY_CLASSES =
  '[&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_em]:italic ' +
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-0.5 ' +
  '[&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold ' +
  '[&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs ' +
  '[&_a]:text-[#2A9D90] [&_a]:underline';

const COMMENT_MODE_OPTIONS: { value: ExportOptions['commentMode']; label: string }[] = [
  { value: 'latest', label: 'Latest comment only' },
  { value: 'pinned', label: 'Pinned only' },
  { value: 'all', label: 'All comments' },
  { value: 'none', label: 'No comments' },
];

const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = (
  Object.keys(TASK_STATUS_LABELS) as TaskStatus[]
).map((value) => ({ value, label: TASK_STATUS_LABELS[value] }));

const SORT_MODE_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'status', label: 'Status' },
  { value: 'date', label: 'Start date' },
  { value: 'parent', label: 'Parent group' },
  { value: 'progress', label: 'Progress' },
];

export function ExportSettingsPanel() {
  const [isOpen, setIsOpen] = useState(true);
  const items = useTimelineStore((state) => state.items);
  const updateItem = useTimelineStore((state) => state.updateItem);
  const comments = useTimelineStore((state) => state.comments);
  const commentMode = useTimelineStore((state) => state.exportOptions.commentMode);
  const sortMode = useTimelineStore((state) => state.exportOptions.sortMode);
  const exportTimeframe = useTimelineStore((state) => state.exportOptions.exportTimeframe);
  const updateExportOptions = useTimelineStore((state) => state.updateExportOptions);

  const rows = buildTaskHierarchy(items).flat;
  const allIncluded = items.every((item) => item.includeInExport !== false);

  const handleToggleAll = () => {
    const nextValue = !allIncluded;
    items.forEach((item) => updateItem(item.id, { includeInExport: nextValue }));
  };

  return (
    <div className="mb-6 rounded-lg border border-[#E5E5E1] bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="flex items-center gap-2 text-left"
        >
          <span className="text-sm font-semibold text-[#1E2B38]">Export settings</span>
          <span className="text-[#1E2B38]">{isOpen ? '▲' : '▼'}</span>
        </button>

        <div className="flex items-center gap-2">
          <label htmlFor="sort-mode-select" className="text-xs font-medium text-slate-500">
            Sort by
          </label>
          <select
            id="sort-mode-select"
            value={sortMode}
            onChange={(event) => updateExportOptions({ sortMode: event.target.value as SortMode })}
            className="rounded-md border border-[#E5E5E1] px-2 py-1 text-sm text-[#1E2B38] focus:border-[#2A9D90] focus:outline-none"
          >
            {SORT_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-[#E5E5E1] px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Tasks included in export
            </span>
            <button
              type="button"
              onClick={handleToggleAll}
              className="rounded-md border border-[#2A9D90] px-3 py-1 text-xs font-medium text-[#2A9D90] transition-colors hover:bg-[#2A9D90]/10"
            >
              {allIncluded ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <ul className="mb-4 max-h-64 space-y-1 overflow-y-auto">
            {rows.map(({ item, depth }) => (
              <li
                key={item.id}
                className="flex items-center gap-2 py-0.5"
                style={{ paddingLeft: depth * 20 }}
              >
                <input
                  type="checkbox"
                  checked={item.includeInExport !== false}
                  onChange={(event) =>
                    updateItem(item.id, { includeInExport: event.target.checked })
                  }
                  className="h-4 w-4 rounded border-[#E5E5E1] text-[#2A9D90] focus:ring-[#2A9D90]"
                />
                <span className="flex-1 truncate text-sm text-[#1E2B38]">{item.label}</span>
                <select
                  value={getTaskStatus(item)}
                  onChange={(event) =>
                    updateItem(item.id, { status: event.target.value as TaskStatus })
                  }
                  className="rounded border border-[#E5E5E1] px-1.5 py-0.5 text-xs text-[#1E2B38] focus:border-[#2A9D90] focus:outline-none"
                >
                  {TASK_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>

          <label
            htmlFor="comment-mode-select"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500"
          >
            Comments in export
          </label>
          <select
            id="comment-mode-select"
            value={commentMode}
            onChange={(event) =>
              updateExportOptions({ commentMode: event.target.value as ExportOptions['commentMode'] })
            }
            className="w-full rounded-md border border-[#E5E5E1] px-3 py-2 text-sm text-[#1E2B38] focus:border-[#2A9D90] focus:outline-none"
          >
            {COMMENT_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="mt-4 border-t border-[#E5E5E1] pt-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Export timeframe (optional)
              </span>
              {exportTimeframe && (
                <button
                  type="button"
                  onClick={() => updateExportOptions({ exportTimeframe: null })}
                  className="text-xs font-medium text-[#2A9D90] hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                aria-label="Export timeframe start"
                value={exportTimeframe?.start ?? ''}
                onChange={(event) =>
                  updateExportOptions({
                    exportTimeframe: { start: event.target.value, end: exportTimeframe?.end ?? event.target.value },
                  })
                }
                className="flex-1 rounded-md border border-[#E5E5E1] px-2 py-1.5 text-sm text-[#1E2B38] focus:border-[#2A9D90] focus:outline-none"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                aria-label="Export timeframe end"
                value={exportTimeframe?.end ?? ''}
                onChange={(event) =>
                  updateExportOptions({
                    exportTimeframe: { start: exportTimeframe?.start ?? event.target.value, end: event.target.value },
                  })
                }
                className="flex-1 rounded-md border border-[#E5E5E1] px-2 py-1.5 text-sm text-[#1E2B38] focus:border-[#2A9D90] focus:outline-none"
              />
            </div>
          </div>

          {comments.length > 0 && (
            <div className="mt-4 border-t border-[#E5E5E1] pt-4">
              <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Comments
              </span>
              <ul className="space-y-3">
                {comments.map((comment) => {
                  const task = items.find((item) => item.id === comment.taskId);
                  return (
                    <li key={comment.id} className="rounded-md border border-[#E5E5E1] p-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                        <span className="font-medium text-[#1E2B38]">
                          {task?.label ?? 'Unknown task'}
                        </span>
                        <span>
                          {comment.isPinned ? '📌 ' : ''}
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div
                        className={`text-sm text-[#1E2B38] ${COMMENT_BODY_CLASSES}`}
                        dangerouslySetInnerHTML={{ __html: toHtml(comment.body) }}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
