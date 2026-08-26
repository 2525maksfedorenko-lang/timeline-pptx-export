import type { TaskComment, TimelineItem } from '../types/timeline';
import { COLORS, withHash } from '../export/theme';
import { TASK_STATUS_SCALE } from '../types/timeline';

/**
 * Example data for this prototype only — not part of the store's logic.
 * A product integration should replace this whole file (or make the store
 * start empty) instead of editing timelineStore.ts's engine code.
 */

export const DEV_SEED_TITLE = 'Демо-проект';

export const DEV_SEED_ITEMS: TimelineItem[] = [
  {
    id: '1',
    label: 'Research',
    start: '2026-08-01',
    end: '2026-08-05',
    progress: 100,
    status: 'done',
    group: 'Phase 1',
    color: withHash(COLORS.kindTask),
  },
  {
    id: '2',
    label: 'Design',
    start: '2026-08-04',
    end: '2026-08-10',
    progress: 60,
    status: 'in_progress',
    group: 'Phase 1',
    color: withHash(COLORS.kindProject),
    dependencies: ['1'],
  },
  {
    id: '3',
    label: 'Development',
    start: '2026-08-08',
    end: '2026-08-20',
    progress: 30,
    status: 'in_progress',
    group: 'Phase 2',
    color: withHash(COLORS.kindPhase),
    dependencies: ['2'],
  },
  {
    id: '4',
    label: 'Testing',
    start: '2026-08-18',
    end: '2026-08-25',
    progress: 0,
    status: 'todo',
    group: 'Phase 2',
    color: TASK_STATUS_SCALE.todo.accent,
    dependencies: ['3'],
  },
  {
    id: '3a',
    label: 'Backend API',
    start: '2026-08-08',
    end: '2026-08-14',
    progress: 50,
    status: 'in_progress',
    group: 'Phase 2',
    color: withHash(COLORS.kindPhase),
    parentId: '3',
  },
  {
    id: '3b',
    label: 'Frontend UI',
    start: '2026-08-12',
    end: '2026-08-20',
    progress: 20,
    status: 'in_progress',
    group: 'Phase 2',
    color: withHash(COLORS.kindPhase),
    parentId: '3',
  },
  {
    id: '5',
    label: 'Internal Notes',
    start: '2026-08-01',
    end: '2026-08-02',
    progress: 100,
    status: 'done',
    group: 'Internal',
    color: TASK_STATUS_SCALE.todo.accent,
    includeInExport: false,
  },
];

export const DEV_SEED_COMMENTS: TaskComment[] = [
  {
    id: 'c1',
    taskId: '2',
    body: 'Initial design review looks good, ready for sign-off.',
    isPinned: true,
    createdAt: '2026-08-05T10:00:00.000Z',
  },
  {
    id: 'c2',
    taskId: '2',
    body: 'Updated color palette per client feedback.',
    createdAt: '2026-08-07T09:30:00.000Z',
  },
  {
    id: 'c3',
    taskId: '3',
    body: 'Backend API contracts finalized with the mobile team.',
    createdAt: '2026-08-10T14:00:00.000Z',
  },
];
