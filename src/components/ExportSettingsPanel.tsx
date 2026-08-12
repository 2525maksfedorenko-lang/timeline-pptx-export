import { useState } from 'react';
import { useTimelineStore, type ExportOptions } from '../store/timelineStore';
import { getTaskStatus, TASK_STATUS_LABELS, type TaskStatus, type TimelineItem } from '../types/timeline';

const COMMENT_MODE_OPTIONS: { value: ExportOptions['commentMode']; label: string }[] = [
  { value: 'latest', label: 'Latest comment only' },
  { value: 'pinned', label: 'Pinned only' },
  { value: 'all', label: 'All comments' },
  { value: 'none', label: 'No comments' },
];

const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = (
  Object.keys(TASK_STATUS_LABELS) as TaskStatus[]
).map((value) => ({ value, label: TASK_STATUS_LABELS[value] }));

interface ItemRow {
  item: TimelineItem;
  depth: number;
}

/** Orders items so each parent is followed by its children, indented by depth. */
function buildOrderedRows(items: TimelineItem[]): ItemRow[] {
  const childrenByParent = new Map<string | undefined, TimelineItem[]>();
  items.forEach((item) => {
    const siblings = childrenByParent.get(item.parentId) ?? [];
    siblings.push(item);
    childrenByParent.set(item.parentId, siblings);
  });

  const rows: ItemRow[] = [];
  function visit(parentId: string | undefined, depth: number) {
    for (const item of childrenByParent.get(parentId) ?? []) {
      rows.push({ item, depth });
      visit(item.id, depth + 1);
    }
  }
  visit(undefined, 0);

  return rows;
}

export function ExportSettingsPanel() {
  const [isOpen, setIsOpen] = useState(true);
  const items = useTimelineStore((state) => state.items);
  const updateItem = useTimelineStore((state) => state.updateItem);
  const commentMode = useTimelineStore((state) => state.exportOptions.commentMode);
  const updateExportOptions = useTimelineStore((state) => state.updateExportOptions);

  const rows = buildOrderedRows(items);
  const allIncluded = items.every((item) => item.includeInExport !== false);

  const handleToggleAll = () => {
    const nextValue = !allIncluded;
    items.forEach((item) => updateItem(item.id, { includeInExport: nextValue }));
  };

  return (
    <div className="mb-6 rounded-lg border border-[#E5E5E1] bg-white">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-[#1E2B38]">Export settings</span>
        <span className="text-[#1E2B38]">{isOpen ? '▲' : '▼'}</span>
      </button>

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
        </div>
      )}
    </div>
  );
}
