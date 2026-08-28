/** The dark pill that floats above a gesture in flight, reading out the dates
 * it is currently proposing.
 *
 * One component for both gestures that propose dates — moving or resizing a
 * bar, and drawing a new one on the create lane — so the two cannot drift into
 * two slightly different pills. */
export function DragPill({ left, top, label }: { left: number; top: number; label: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        zIndex: 20,
        background: 'var(--gantt-drag-pill-bg)',
        color: 'var(--gantt-drag-pill-fg)',
        fontSize: 10.5,
        fontWeight: 600,
        padding: '4px 8px',
        borderRadius: 5,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {label}
    </div>
  );
}
