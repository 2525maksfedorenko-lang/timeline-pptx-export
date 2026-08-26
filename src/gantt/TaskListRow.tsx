import { ChevronDown, ChevronRight, Layers, Plus } from 'lucide-react';
import { rowPaddingLeft, ROW_HEIGHT_PX } from './geometry';
import type { GanttRowModel } from './rows';
import { STATUS_LABEL } from './tone';
import { StatusIcon } from './StatusIcon';

interface TaskListRowProps {
  row: GanttRowModel;
  isSelected: boolean;
  isCollapsed: boolean;
  isEditing: boolean;
  editText: string;
  onEditTextChange: (value: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onBeginEdit: () => void;
  onSelect: () => void;
  onToggleCollapse: () => void;
  onCycleStatus: () => void;
  /** Lift this row and everything under it out into a plan of its own. Only
   * ever called from a group's count badge, which is the one row element that
   * names the sub-tasks it would take with it. */
  onMakePlan: () => void;
  /** Create a sub-task under this row and start renaming it. */
  onAddSubtask: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
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

/** One line of the task list: what the row is, and what can be done to it.
 *
 * A group starts hard against the column's edge because its caret occupies
 * that space; a task starts where the caret would have ended. A task's name
 * is a pill so the eye can pick a task out of a phase at a glance; a group's
 * is plain text one step larger. */
export function TaskListRow({
  row,
  isSelected,
  isCollapsed,
  isEditing,
  editText,
  onEditTextChange,
  onCommitEdit,
  onCancelEdit,
  onBeginEdit,
  onSelect,
  onToggleCollapse,
  onCycleStatus,
  onMakePlan,
  onAddSubtask,
  onContextMenu,
}: TaskListRowProps) {
  const { item, depth, isGroup, childCount, isSubtask, status } = row;

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
        // An untouched task is set in the muted grey; anything under way or
        // done takes the primary text colour.
        color: status === 'todo' ? 'var(--gantt-text-muted)' : 'var(--gantt-text)',
        border: '1px solid var(--gantt-pill-border)',
        background: 'var(--gantt-pill-bg)',
        borderRadius: 6,
        padding: '6px 10px',
        boxSizing: 'border-box',
        lineHeight: '17px',
      };

  return (
    <div
      onClick={onSelect}
      onContextMenu={onContextMenu}
      className="gantt-row"
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
          // Selected, not just focused: a row that was created a moment ago
          // opens this field on a placeholder name, and typing has to replace
          // it rather than run on the end of it. A rename works the same way,
          // which is what an inline rename does everywhere else.
          onFocus={(event) => event.target.select()}
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

      {/* The count badge is also the way to lift this branch out into a plan
          of its own: it is the one thing on the row that already names the
          sub-tasks that would come along, so it carries the click rather than
          a second control appearing beside it. Looking at the branch without
          copying it is the context menu's "Show only sub-tasks". */}
      {isGroup && (
        <button
          type="button"
          className="gantt-subcount"
          onClick={(event) => {
            event.stopPropagation();
            onMakePlan();
          }}
          title="Make a separate plan from this branch"
          aria-label={`Make a separate plan from ${item.label} and everything under it`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            flex: 'none',
            minWidth: 18,
            height: 17,
            padding: '0 6px',
            border: 'none',
            borderRadius: 999,
            background: 'var(--gantt-subcount-bg)',
            color: 'var(--gantt-surface)',
            fontSize: 10,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Layers size={10} strokeWidth={2.4} aria-hidden="true" />
          {childCount}
        </button>
      )}

      {/* A top-level row can take a sub-task — a task with one is simply a
          group from then on — and a sub-task cannot: the plan is built one
          level deep, so the control is absent rather than present and
          refusing. Out of the way until the pointer is on the row: at rest
          the column is names, not controls.

          The slot stays behind it, empty. The button is invisible at rest
          already (see .gantt-row-add), so taking its 18px away as well would
          widen a sub-task's name pill past its parent's and leave the column
          with two right edges — for a control the eye never sees anyway. */}
      {isSubtask ? (
        <span aria-hidden="true" style={{ width: 18, height: 18, flex: 'none' }} />
      ) : (
        <button
          type="button"
          className="gantt-row-add"
          onClick={(event) => {
            event.stopPropagation();
            onAddSubtask();
          }}
          title="Add sub-task"
          aria-label={`Add a sub-task under ${item.label}`}
          style={{
            width: 18,
            height: 18,
            flex: 'none',
            border: 'none',
            borderRadius: 4,
            background: 'transparent',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={14} strokeWidth={2.2} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
