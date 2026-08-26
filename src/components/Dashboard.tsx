import { useEffect, useRef } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { withHash } from '../export/theme';
import {
  getDashboardKpis,
  getDaysOverdue,
  getDelayedTasks,
  getStatusSegments,
  type StatusSegment,
} from '../utils/dashboardMetrics';
import { formatShortDate } from '../export/dateScale';
import type { TimelineItem } from '../types/timeline';

export type DashboardSection = 'status' | 'delayed';

interface DashboardProps {
  /** Deep-linked section (from the ?dashboardView= URL param) to scroll to
   * and highlight on mount — see App.tsx. */
  highlightSection?: DashboardSection | null;
}

const CARD_CLASSES = 'rounded-lg border border-border bg-card p-4 shadow-xs';
const HIGHLIGHT_CLASSES = 'ring-2 ring-ring ring-offset-2';

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className={CARD_CLASSES}>
      <div className="text-sm font-medium">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  );
}

const DONUT_SIZE = 168;
const DONUT_STROKE = 26;
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
const DONUT_SEGMENT_GAP = 3;

function StatusDonut({ segments }: { segments: StatusSegment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);

  let cumulative = 0;

  return (
    <div className="flex items-center gap-6 max-md:flex-col max-md:items-start max-md:gap-4">
      <div className="relative shrink-0" style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
        <svg width={DONUT_SIZE} height={DONUT_SIZE} viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}>
          <g transform={`rotate(-90 ${DONUT_SIZE / 2} ${DONUT_SIZE / 2})`}>
            <circle
              cx={DONUT_SIZE / 2}
              cy={DONUT_SIZE / 2}
              r={DONUT_RADIUS}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth={DONUT_STROKE}
            />
            {total > 0 &&
              segments.map((segment) => {
                const fullDash = (segment.count / total) * DONUT_CIRCUMFERENCE;
                const dash = Math.max(fullDash - DONUT_SEGMENT_GAP, 0);
                const offset = -cumulative;
                cumulative += fullDash;
                return (
                  <circle
                    key={segment.status}
                    cx={DONUT_SIZE / 2}
                    cy={DONUT_SIZE / 2}
                    r={DONUT_RADIUS}
                    fill="none"
                    stroke={withHash(segment.color)}
                    strokeWidth={DONUT_STROKE}
                    strokeDasharray={`${dash} ${DONUT_CIRCUMFERENCE - dash}`}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                  />
                );
              })}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight text-foreground">{total}</span>
          <span className="text-xs text-muted-foreground">tasks</span>
        </div>
      </div>

      <ul className="space-y-2">
        {segments.map((segment) => (
          <li key={segment.status} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: withHash(segment.color) }}
              aria-hidden="true"
            />
            {/* The status tier: a notch smaller than the row's text-sm and
                medium weight. Left lowercase, which is the product's
                convention for status words — this is the one place a status is
                rendered as real text on screen (elsewhere it's a colored dot's
                tooltip or a native <select> option). */}
            <span className="text-xs font-medium text-foreground">
              {segment.label}
            </span>
            <span className="text-muted-foreground">
              {segment.count} ({segment.percent}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DelayedTable({ items, today }: { items: TimelineItem[]; today: Date }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No delayed tasks.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs font-medium text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Task</th>
            <th className="py-2 pr-3 font-medium">End date</th>
            <th className="py-2 pr-3 font-medium">Days overdue</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border last:border-0">
              <td className="py-2 pr-3 font-medium text-foreground">{item.label}</td>
              <td className="py-2 pr-3 font-mono text-xs tabular-nums text-muted-foreground">{formatShortDate(new Date(item.end))}</td>
              <td className="py-2 pr-3 font-medium text-destructive">{getDaysOverdue(item, today)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Dashboard({ highlightSection }: DashboardProps) {
  const items = useTimelineStore((state) => state.items);
  const today = new Date();

  const kpis = getDashboardKpis(items, today);
  const segments = getStatusSegments(items);
  const delayedTasks = getDelayedTasks(items, today);

  const statusRef = useRef<HTMLDivElement>(null);
  const delayedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!highlightSection) return;
    const target = { status: statusRef, delayed: delayedRef }[highlightSection];
    target.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightSection]);

  return (
    // List pages in the product centre on --content-max; the timeline doesn't,
    // because a plan needs every pixel of width it can get.
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total tasks" value={`${kpis.total}`} />
        <KpiCard label="Completed" value={`${kpis.completed} (${kpis.completedPercent}%)`}  />
        <KpiCard label="Delayed" value={`${kpis.delayed}`} accent={kpis.delayed > 0 ? 'hsl(var(--destructive))' : undefined} />
      </div>

      <div
        ref={statusRef}
        className={`${CARD_CLASSES} mb-6 transition-shadow ${highlightSection === 'status' ? HIGHLIGHT_CLASSES : ''}`}
      >
        <h3 className="mb-4 text-sm font-semibold tracking-tight text-foreground">Status breakdown</h3>
        <StatusDonut segments={segments} />
      </div>

      <div
        ref={delayedRef}
        className={`${CARD_CLASSES} mb-6 transition-shadow ${highlightSection === 'delayed' ? HIGHLIGHT_CLASSES : ''}`}
      >
        <h3 className="mb-3 text-sm font-semibold tracking-tight text-foreground">Delayed tasks</h3>
        <DelayedTable items={delayedTasks} today={today} />
      </div>
    </div>
  );
}
