import { useState } from 'react';
import { StatusSelect } from './StatusSelect';
import { useIsMobile } from '../utils/useIsMobile';
import { useTimelineStore, type ExportOptions } from '../store/timelineStore';
import {
  getTaskStatus,
  SELECTABLE_TASK_STATUS_VALUES,
  TASK_STATUS_LABELS,
  type SortMode,
  type TaskStatus,
} from '../types/timeline';
import { toHtml } from '../utils/renderMarkdown';
import { buildTaskHierarchy } from '../utils/taskHierarchy';
import { firstDayOfMonthIso, getDateRange, lastDayOfMonthIso } from '../export/dateScale';
import { ChevronDown, ChevronRight, Pin } from 'lucide-react';
import { buttonClass, CHECKBOX_CLASS, INPUT_CLASS_AUTO } from './systemUi';
import { BAR_HEIGHT_PX } from './ganttLayout';
import { labelIndent } from '../utils/barNesting';

/** How much of each task row the status chip takes. Wide enough for the
 * longest label ("In progress") plus the chip's padding and caret. */
const STATUS_CHIP_WIDTH_PX = 104;

const COMMENT_BODY_CLASSES =
  '[&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_em]:italic ' +
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-0.5 ' +
  '[&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold ' +
  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs ' +
  '[&_a]:text-primary [&_a]:underline';

const COMMENT_MODE_OPTIONS: { value: ExportOptions['commentMode']; label: string }[] = [
  { value: 'latest', label: 'Latest comment only' },
  { value: 'pinned', label: 'Pinned only' },
  { value: 'all', label: 'All comments' },
  { value: 'none', label: 'No comments' },
];

// The bulk setter offers what a person can choose, which no longer includes
// blocked — see SELECTABLE_TASK_STATUS_VALUES. The per-row chips below use
// statusOptionsFor instead, so a task that is already blocked still says so.
const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] =
  SELECTABLE_TASK_STATUS_VALUES.map((value) => ({ value, label: TASK_STATUS_LABELS[value] }));

const SORT_MODE_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'status', label: 'Status' },
  { value: 'date', label: 'Start date' },
  { value: 'parent', label: 'Parent group' },
  { value: 'progress', label: 'Progress' },
];

const MONTH_OPTIONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
  (label, value) => ({ value, label }),
);

/** The panel's long sections, collapsed independently on a phone. Flat on a
 * desktop, where the whole panel is half a wide screen and reads fine as one
 * list; stacked on a phone it runs to several screens of scrolling, most of
 * it settings you aren't currently touching. */
type MobileSection = 'tasks' | 'timeframe' | 'comments';

const MOBILE_SECTION_DEFAULTS: Record<MobileSection, boolean> = {
  // The task list is the one people actually come here for, so it's the one
  // that starts open.
  tasks: true,
  timeframe: false,
  comments: false,
};

/** The chevron control that collapses one section. Rendered only below the
 * breakpoint — a desktop header has no such element at all, rather than a
 * hidden one — and as its own button rather than a click handler on the
 * header row, which would swallow the taps meant for the action button
 * (e.g. "Select all") sitting in that same row. */
function SectionToggle({ isOpen, label, onToggle }: { isOpen: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${label}`}
      className="-my-2 flex h-11 w-11 items-center justify-center rounded-md text-xs text-foreground"
    >
      {isOpen ? <ChevronDown size={16} strokeWidth={2} /> : <ChevronRight size={16} strokeWidth={2} />}
    </button>
  );
}

export function ExportSettingsPanel() {
  const isMobile = useIsMobile();
  const [openSections, setOpenSections] = useState(MOBILE_SECTION_DEFAULTS);

  // Sections only collapse below the breakpoint: on a desktop this is always
  // true, so every section body renders unconditionally as before.
  const isSectionOpen = (section: MobileSection) => !isMobile || openSections[section];
  const toggleSection = (section: MobileSection) =>
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));

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

  // Bulk status: the checkboxes beside each task are the selection, so
  // "apply" means "to every task currently checked for export" — the button
  // says how many that is rather than leaving it to be guessed. Empty until
  // a status is picked, which is also what keeps the button inert.
  const [bulkStatus, setBulkStatus] = useState<TaskStatus | ''>('');
  const includedItems = items.filter((item) => item.includeInExport !== false);

  const applyBulkStatus = () => {
    if (bulkStatus === '') return;
    includedItems.forEach((item) => updateItem(item.id, { status: bulkStatus }));
    setBulkStatus('');
  };

  // Month/year pickers default to the plan's own date range when no
  // timeframe is set yet, so touching just one dropdown produces a sensible
  // full timeframe immediately instead of an awkward half-set one.
  const itemsRange = getDateRange(items);
  const fromDefault = exportTimeframe ? new Date(exportTimeframe.start) : itemsRange.minDate;
  const toDefault = exportTimeframe ? new Date(exportTimeframe.end) : itemsRange.maxDate;
  const fromMonth = fromDefault.getUTCMonth();
  const fromYear = fromDefault.getUTCFullYear();
  const toMonth = toDefault.getUTCMonth();
  const toYear = toDefault.getUTCFullYear();

  // Year options always cover the plan's actual date range and today, plus
  // a 1-year buffer on each side — expanded further if a previously-set
  // timeframe already reaches outside that (so its year is never missing
  // from the list).
  const candidateYears = [
    itemsRange.minDate.getUTCFullYear(),
    itemsRange.maxDate.getUTCFullYear(),
    new Date().getUTCFullYear(),
    fromYear,
    toYear,
  ];
  const minYear = Math.min(...candidateYears) - 1;
  const maxYear = Math.max(...candidateYears) + 1;
  const yearOptions = Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index);

  const setTimeframe = (nextFromMonth: number, nextFromYear: number, nextToMonth: number, nextToYear: number) => {
    updateExportOptions({
      exportTimeframe: {
        start: firstDayOfMonthIso(nextFromYear, nextFromMonth),
        end: lastDayOfMonthIso(nextToYear, nextToMonth),
      },
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
          <label htmlFor="sort-mode-select" className="text-xs font-medium text-muted-foreground">
            Sort by
          </label>
          <select
            id="sort-mode-select"
            value={sortMode}
            onChange={(event) => updateExportOptions({ sortMode: event.target.value as SortMode })}
            className={`${INPUT_CLASS_AUTO} max-md:min-h-11 max-md:flex-1`}
          >
            {SORT_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
      </div>

      <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              Tasks included in export
              {isMobile && (
                <SectionToggle
                  isOpen={openSections.tasks}
                  label="tasks included in export"
                  onToggle={() => toggleSection('tasks')}
                />
              )}
            </span>
            <button
              type="button"
              onClick={handleToggleAll}
              className={buttonClass('outline', 'sm', 'border-primary text-primary max-md:min-h-11')}
            >
              {allIncluded ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          {isSectionOpen('tasks') && (
            <div className="mb-3 flex items-center gap-2">
              <select
                aria-label="Set status for checked tasks"
                value={bulkStatus}
                onChange={(event) => setBulkStatus(event.target.value as TaskStatus | '')}
                className={`${INPUT_CLASS_AUTO} min-w-0 flex-1 max-md:min-h-11`}
              >
                <option value="">Set status to…</option>
                {TASK_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={applyBulkStatus}
                disabled={bulkStatus === '' || includedItems.length === 0}
                title="Applies to every task checked below"
                className={buttonClass('default', 'sm', 'flex-shrink-0 max-md:min-h-11')}
              >
                Apply to {includedItems.length}
              </button>
            </div>
          )}

          {isSectionOpen('tasks') && (
            <ul className="mb-4 max-h-64 space-y-1 overflow-y-auto">
              {rows.map(({ item, depth }) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 py-0.5 max-md:py-1.5"
                  style={{ paddingLeft: labelIndent(BAR_HEIGHT_PX, depth) }}
                >
                  <input
                    type="checkbox"
                    checked={item.includeInExport !== false}
                    onChange={(event) =>
                      updateItem(item.id, { includeInExport: event.target.checked })
                    }
                    className={`${CHECKBOX_CLASS} max-md:h-5 max-md:w-5`}
                  />
                  <span className="flex-1 truncate text-sm font-medium text-foreground">{item.label}</span>
                  {/* The chip changes the status here as well as in the
                      plan, rather than being a read-only echo of it. */}
                  <div className="flex-shrink-0" style={{ width: STATUS_CHIP_WIDTH_PX }}>
                    <StatusSelect
                      status={getTaskStatus(item)}
                      onChange={(next) => updateItem(item.id, { status: next })}
                      label={item.label}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <label
            htmlFor="comment-mode-select"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Comments in export
          </label>
          <select
            id="comment-mode-select"
            value={commentMode}
            onChange={(event) =>
              updateExportOptions({ commentMode: event.target.value as ExportOptions['commentMode'] })
            }
            className={`${INPUT_CLASS_AUTO} w-full max-md:min-h-11`}
          >
            {COMMENT_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                Export timeframe (optional)
                {isMobile && (
                  <SectionToggle
                    isOpen={openSections.timeframe}
                    label="export timeframe"
                    onToggle={() => toggleSection('timeframe')}
                  />
                )}
              </span>
              {exportTimeframe && (
                <button
                  type="button"
                  onClick={() => updateExportOptions({ exportTimeframe: null })}
                  className="text-xs font-medium text-primary hover:underline max-md:min-h-11 max-md:px-2"
                >
                  Clear
                </button>
              )}
            </div>
            {/* Four month/year dropdowns fit one line on a desktop; on a
                phone the from/to pairs stack instead of squeezing to ~70px
                each. */}
            {isSectionOpen('timeframe') && (
            <div className="flex items-center gap-2 max-md:flex-col max-md:items-stretch">
              <div className="flex flex-1 gap-1">
                <select
                  aria-label="From month"
                  value={fromMonth}
                  onChange={(event) => setTimeframe(Number(event.target.value), fromYear, toMonth, toYear)}
                  className={`${INPUT_CLASS_AUTO} min-w-0 flex-1 max-md:min-h-11`}
                >
                  {MONTH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="From year"
                  value={fromYear}
                  onChange={(event) => setTimeframe(fromMonth, Number(event.target.value), toMonth, toYear)}
                  className={`${INPUT_CLASS_AUTO} w-20 flex-shrink-0 max-md:min-h-11`}
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-xs text-muted-foreground/70">to</span>
              <div className="flex flex-1 gap-1">
                <select
                  aria-label="To month"
                  value={toMonth}
                  onChange={(event) => setTimeframe(fromMonth, fromYear, Number(event.target.value), toYear)}
                  className={`${INPUT_CLASS_AUTO} min-w-0 flex-1 max-md:min-h-11`}
                >
                  {MONTH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="To year"
                  value={toYear}
                  onChange={(event) => setTimeframe(fromMonth, fromYear, toMonth, Number(event.target.value))}
                  className={`${INPUT_CLASS_AUTO} w-20 flex-shrink-0 max-md:min-h-11`}
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            )}
          </div>

          {comments.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <span className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                Comments
                {isMobile && (
                  <SectionToggle
                    isOpen={openSections.comments}
                    label="comments"
                    onToggle={() => toggleSection('comments')}
                  />
                )}
              </span>
              {isSectionOpen('comments') && (
              <ul className="space-y-3">
                {comments.map((comment) => {
                  const task = items.find((item) => item.id === comment.taskId);
                  return (
                    <li key={comment.id} className="rounded-md border border-border p-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {task?.label ?? 'Unknown task'}
                        </span>
                        <span className="font-mono text-xs tabular-nums">
                          {comment.isPinned ? <Pin size={11} strokeWidth={2} className="inline align-[-1px]" aria-label="Pinned" /> : null}
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div
                        className={`text-sm text-foreground ${COMMENT_BODY_CLASSES}`}
                        dangerouslySetInnerHTML={{ __html: toHtml(comment.body) }}
                      />
                    </li>
                  );
                })}
              </ul>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
