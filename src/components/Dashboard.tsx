import { useEffect, useRef } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { withHash } from '../export/theme';
import {
  getAtRiskTasks,
  getDashboardKpis,
  getDaysOverdue,
  getDelayedTasks,
  getStatusSegments,
  type StatusSegment,
} from '../utils/dashboardMetrics';
import { formatShortDate } from '../export/dateScale';
import type { TimelineItem } from '../types/timeline';

export type DashboardSection = 'status' | 'delayed' | 'atrisk';

interface DashboardProps {
  /** Deep-linked section (from the ?dashboardView= URL param) to scroll to
   * and highlight on mount — see App.tsx. */
  highlightSection?: DashboardSection | null;
}

const CARD_CLASSES = 'rounded-lg border border-[#E5E5E1] bg-white p-4';
const HIGHLIGHT_CLASSES = 'ring-2 ring-[#2A9D90] ring-offset-2';

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className={CARD_CLASSES}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold tracking-tight" style={{ color: accent ?? '#1E2B38' }}>
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
              stroke="#E5E5E1"
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
          <span className="text-2xl font-bold tracking-tight text-[#1E2B38]">{total}</span>
          <span className="text-xs text-slate-500">tasks</span>
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
            {/* The status tier: a notch smaller than the row's text-sm,
                medium weight, tracked out and uppercased — the one place a
                status is rendered as real text on screen (elsewhere it's a
                colored dot's tooltip or a native <select> option, neither of
                which can carry this styling). */}
            <span className="text-xs font-medium uppercase tracking-[0.06em] text-[#1E2B38]">
              {segment.label}
            </span>
            <span className="text-slate-500">
              {segment.count} ({segment.percent}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function assigneeText(item: TimelineItem): string {
  return item.assignee?.name ?? '—';
}

function DelayedTable({ items, today }: { items: TimelineItem[]; today: Date }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No delayed tasks.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#E5E5E1] text-xs font-medium uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-3 font-medium">Task</th>
            <th className="py-2 pr-3 font-medium">End date</th>
            <th className="py-2 pr-3 font-medium">Days overdue</th>
            <th className="py-2 font-medium">Assignee</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-[#E5E5E1] last:border-0">
              <td className="py-2 pr-3 font-medium text-[#1E2B38]">{item.label}</td>
              <td className="py-2 pr-3 font-mono text-xs tracking-[0.02em] text-slate-500">{formatShortDate(new Date(item.end))}</td>
              <td className="py-2 pr-3 font-medium text-[#E76E50]">{getDaysOverdue(item, today)}</td>
              <td className="py-2 text-slate-500">{assigneeText(item)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AtRiskTable({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No at-risk tasks.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#E5E5E1] text-xs font-medium uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-3 font-medium">Task</th>
            <th className="py-2 pr-3 font-medium">End date</th>
            <th className="py-2 font-medium">Assignee</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-[#E5E5E1] last:border-0">
              <td className="py-2 pr-3 font-medium text-[#1E2B38]">{item.label}</td>
              <td className="py-2 pr-3 font-mono text-xs tracking-[0.02em] text-slate-500">{formatShortDate(new Date(item.end))}</td>
              <td className="py-2 text-slate-500">{assigneeText(item)}</td>
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
  const atRiskTasks = getAtRiskTasks(items);

  const statusRef = useRef<HTMLDivElement>(null);
  const delayedRef = useRef<HTMLDivElement>(null);
  const atRiskRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!highlightSection) return;
    const target = { status: statusRef, delayed: delayedRef, atrisk: atRiskRef }[highlightSection];
    target.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightSection]);

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold tracking-tight text-[#1E2B38]">Dashboard</h2>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total tasks" value={`${kpis.total}`} />
        <KpiCard label="Completed" value={`${kpis.completed} (${kpis.completedPercent}%)`} accent="#2A9D90" />
        <KpiCard label="Delayed" value={`${kpis.delayed}`} accent={kpis.delayed > 0 ? '#E76E50' : undefined} />
        <KpiCard label="At risk" value={`${kpis.atRisk}`} accent={kpis.atRisk > 0 ? '#E76E50' : undefined} />
      </div>

      <div
        ref={statusRef}
        className={`${CARD_CLASSES} mb-6 transition-shadow ${highlightSection === 'status' ? HIGHLIGHT_CLASSES : ''}`}
      >
        <h3 className="mb-4 text-sm font-semibold tracking-tight text-[#1E2B38]">Status breakdown</h3>
        <StatusDonut segments={segments} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div
          ref={delayedRef}
          className={`${CARD_CLASSES} transition-shadow ${highlightSection === 'delayed' ? HIGHLIGHT_CLASSES : ''}`}
        >
          <h3 className="mb-3 text-sm font-semibold tracking-tight text-[#1E2B38]">Delayed tasks</h3>
          <DelayedTable items={delayedTasks} today={today} />
        </div>

        <div
          ref={atRiskRef}
          className={`${CARD_CLASSES} transition-shadow ${highlightSection === 'atrisk' ? HIGHLIGHT_CLASSES : ''}`}
        >
          <h3 className="mb-3 text-sm font-semibold tracking-tight text-[#1E2B38]">At risk tasks</h3>
          <AtRiskTable items={atRiskTasks} />
        </div>
      </div>
    </div>
  );
}
