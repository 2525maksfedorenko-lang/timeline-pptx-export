import { useCallback } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { savePlan as savePlanToDb } from '../store/planStorage';
import type { ImportPreview } from './prepareImport';

/** Commits an already-confirmed import to the store.
 *
 * The other half of prepareImport, and deliberately the only half that
 * writes: everything that can fail — reading, sniffing, parsing, validating —
 * has happened by the time this runs, so a failed import can never have left
 * the open plan half-replaced.
 *
 * Both paths go through the store rather than around it, which is what makes
 * the chart and the exporters pick the import up with no reload: the Gantt
 * renders from `items`, and both exporters read the same `items` when the
 * export button is pressed. */
export function useApplyImport() {
  const addItem = useTimelineStore((state) => state.addItem);
  const loadPlans = useTimelineStore((state) => state.loadPlans);
  const switchToPlan = useTimelineStore((state) => state.switchToPlan);

  return useCallback(
    async (preview: ImportPreview): Promise<void> => {
      if (preview.action === 'replace-plan' && preview.plan) {
        await savePlanToDb(preview.plan);
        await loadPlans();
        await switchToPlan(preview.plan.id);
        return;
      }

      // Parent-before-child, which prepareImport already guarantees: the
      // sheet parser resolves a Parent against rows above it, and
      // buildTaskHierarchy reads parentId rather than array order anyway.
      preview.items.forEach((item) => addItem(item));
    },
    [addItem, loadPlans, switchToPlan],
  );
}
