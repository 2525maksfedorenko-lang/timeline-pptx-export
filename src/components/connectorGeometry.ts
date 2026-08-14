// Shared bracket-path geometry for the two on-screen SVG connector overlays
// (DependencyConnectors.tsx, HierarchyConnectors.tsx) — same "┐ / └" elbow
// shape either way, only each caller's color/width and (fromId, toId) pairs
// differ, so that part stays out of this module.

export const CONNECTOR_JOG_PX = 4;

/** Bracket path from one bar's right edge to another's left edge: a short
 * stub right, down/up to the target row, then right into the target bar —
 * or a straight line when both are on the same row. No arrowhead — this is
 * a structural bracket connector, not a directional arrow. */
export function buildConnectorPath(x1: number, y1: number, x2: number, y2: number): string {
  if (y1 === y2) return `M ${x1} ${y1} L ${x2} ${y2}`;
  const jogX = x1 + CONNECTOR_JOG_PX;
  return `M ${x1} ${y1} L ${jogX} ${y1} L ${jogX} ${y2} L ${x2} ${y2}`;
}
