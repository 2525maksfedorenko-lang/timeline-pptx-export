import { HEADER_HEIGHT_PX } from './geometry';
import type { HeaderCell } from './scale';

interface TimelineHeaderProps {
  cells: HeaderCell[];
  columnWidth: number;
  width: number;
}

/** The period strip above the bars: one cell per week (or day, or month),
 * each captioned twice — "Week 31" over "Aug 17 '26".
 *
 * The strip itself never moves: it is the content of a pane the shell keeps
 * fixed at the top of the timeline zone, whose horizontal offset is written
 * from the body's as it scrolls (see useScrollPanes). So a cell's x is a
 * column index times the column width and nothing else. */
export function TimelineHeader({ cells, columnWidth, width }: TimelineHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        width,
        height: HEADER_HEIGHT_PX,
        boxSizing: 'border-box',
      }}
    >
      {cells.map((cell) => (
        <div
          key={cell.index}
          style={{
            flex: 'none',
            width: cell.days * columnWidth,
            boxSizing: 'border-box',
            // The day scale rules every column, so its separators drop to the
            // softer weight the row lines use; a week or month cell keeps the
            // strong one.
            borderRight: `1px solid var(${cell.days === 1 ? '--gantt-rule-soft' : '--gantt-rule-strong'})`,
            background: cell.isWeekend ? 'var(--gantt-weekend-head)' : 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: HEADER_HEIGHT_PX,
            overflow: 'hidden',
          }}
        >
          <span style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--gantt-text)', whiteSpace: 'nowrap' }}>
            {cell.top}
          </span>
          <span
            style={{ fontSize: 11, color: 'var(--gantt-text-muted)', whiteSpace: 'nowrap', marginTop: 2 }}
          >
            {cell.sub}
          </span>
        </div>
      ))}
    </div>
  );
}
