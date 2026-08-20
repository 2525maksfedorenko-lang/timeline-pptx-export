import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { rowPaddingLeft, ROW_HEIGHT_PX } from './geometry';
import type { GanttRowModel } from './rows';
import { STATUS_LABEL } from './tone';
import { StatusIcon } from './StatusIcon';

interface TaskListRowProps {
  row: GanttRowModel;
  /** The row's own percentage, or a group's roll-up. */
  progress: number;
  isSelected: boolean;
  isCollapsed: boolean;
  /** On the critical path *and* the toolbar's switch is on. */
  showsCriticalBadge: boolean;
  isEditing: boolean;
  editText: string;
  onEditTextChange: (value: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onBeginEdit: () => void;
  onSelect: () => void;
  onToggleCollapse: () => void;
  onCycleStatus: () => void;
}

/** The drag-to-reorder grip: a 2×3 grid of 3px dots.
 *
 * Drawn and not wired, exactly as in the handoff, whose own README lists
 * "row reordering by the drag-dots handle is drawn but not wired" as one of
 * its three known gaps. It keeps the row's spacing and the affordance the
 * design shows; what it does when dragged is a question the handoff leaves
 * open rather than one to answer here. */
function DragGrip() {
  return (
    <span
      title="Drag to reorder"
      style={{ display: 'grid', gridTemplateColumns: '3px 3px', gap: 3, flex: 'none', cursor: 'grab', opacity: 0.85 }}
    >
      {Array.from({ length: 6 }, (_, index) => (
        <span
          key={index}
          style={{ width: 3, height: 3, borderRadius: 9, background: 'var(--gantt-text-faint)' }}
        />
      ))}
    </span>
  );
}

/** One line of the task list: what the row is, who has to act on it, and how
 * far along it is — in that order, left to right.
 *
 * A group starts hard against the column's edge because its caret occupies
 * that space; a task starts where the caret would have ended. A task's name
 * is a pill so the eye can pick a task out of a phase at a glance; a group's
 * is plain text one step larger. */
export function TaskListRow({
  row,
  progress,
  isSelected,
  isCollapsed,
  showsCriticalBadge,
  isEditing,
  editText,
  onEditTextChange,
  onCommitEdit,
  onCancelEdit,
  onBeginEdit,
  onSelect,
  onToggleCollapse,
  onCycleStatus,
}: TaskListRowProps) {
  const { item, depth, isGroup, childCount, status } = row;
  const blocked = status === 'blocked';

  const nameStyle: React.CSSProperties = isGroup
    ? {
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontSize: 15,
        fontWeight: 500,
        color: 'var(--gantt-text)',
      }
    : {
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontSize: 14,
        // An untouched task is set in the muted grey; anything under way,
        // done or blocked takes the primary text colour.
        color: status === 'todo' ? 'var(--gantt-text-muted)' : 'var(--gantt-text)',
        border: `1px solid var(${blocked ? '--gantt-pill-border-blocked' : '--gantt-pill-border'})`,
        background: `var(${blocked ? '--gantt-pill-bg-blocked' : '--gantt-pill-bg'})`,
        borderRadius: 6,
        padding: '6px 10px',
        boxSizing: 'border-box',
        lineHeight: '17px',
      };

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: ROW_HEIGHT_PX,
        boxSizing: 'border-box',
        padding: `0 10px 0 ${rowPaddingLeft(depth, isGroup)}px`,
        borderBottom: '1px solid var(--gantt-rule-soft)',
        cursor: 'pointer',
        background: isSelected ? 'var(--gantt-row-selected)' : 'var(--gantt-surface)',
      }}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleCollapse();
        }}
        title="Show / hide sub-tasks"
        aria-label="Show / hide sub-tasks"
        aria-expanded={!isCollapsed}
        style={{
          width: 16,
          height: 16,
          flex: 'none',
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
          display: isGroup ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isCollapsed ? (
          <ChevronRight size={14} strokeWidth={2.2} color="var(--gantt-text-secondary)" />
        ) : (
          <ChevronDown size={14} strokeWidth={2.2} color="var(--gantt-text-secondary)" />
        )}
      </button>

      <DragGrip />

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onCycleStatus();
        }}
        // A group's status is its children's, so there is nothing here to
        // change; the title says so instead of the control lying about it.
        title={`${STATUS_LABEL[status]}${isGroup ? ' (rolled up)' : ' — click to change'}`}
        aria-label={`${item.label}: ${STATUS_LABEL[status]}`}
        style={{
          width: 20,
          height: 20,
          flex: 'none',
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <StatusIcon status={status} />
      </button>

      {isEditing ? (
        <input
          type="text"
          value={editText}
          autoFocus
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onEditTextChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onCommitEdit();
            if (event.key === 'Escape') onCancelEdit();
          }}
          onBlur={onCommitEdit}
          aria-label="Task name"
          style={{
            flex: 1,
            minWidth: 0,
            height: 30,
            boxSizing: 'border-box',
            border: '1px solid var(--gantt-edit-focus)',
            borderRadius: 6,
            fontSize: 14,
            padding: '0 10px',
            outline: 'none',
            background: 'var(--gantt-pill-bg)',
            color: 'var(--gantt-text)',
          }}
        />
      ) : (
        <span
          onDoubleClick={(event) => {
            event.stopPropagation();
            onBeginEdit();
          }}
          title={item.label}
          style={nameStyle}
        >
          {item.label}
        </span>
      )}

      <span
        title={isGroup ? 'Rolled up from sub-tasks' : 'Percent complete'}
        style={{
          flex: 'none',
          fontSize: 11,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          color:
            progress === 100
              ? 'var(--gantt-pct-complete)'
              : progress > 0
                ? 'var(--gantt-pct-started)'
                : 'var(--gantt-pct-zero)',
        }}
      >
        {progress}%
      </span>

      {isGroup && (
        <span
          title={`${childCount} sub-tasks`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            flex: 'none',
            minWidth: 18,
            height: 17,
            padding: '0 6px',
            borderRadius: 999,
            background: 'var(--gantt-subcount-bg)',
            color: 'var(--gantt-surface)',
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          <Layers size={10} strokeWidth={2.4} aria-hidden="true" />
          {childCount}
        </span>
      )}

      {showsCriticalBadge && (
        <span
          title="On the critical path"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            flex: 'none',
            height: 15,
            padding: '0 4px',
            borderRadius: 3,
            background: 'var(--gantt-cp-bg)',
            color: 'var(--gantt-cp-fg)',
            fontSize: 8.5,
            fontWeight: 800,
            letterSpacing: '.06em',
          }}
        >
          CP
        </span>
      )}
    </div>
  );
}
