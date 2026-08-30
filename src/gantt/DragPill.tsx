/** How tall the pill is, stated rather than emergent.
 *
 * It used to be whatever 10.5px text plus 4px of padding came out to — 28px in
 * this browser, and nobody's number. The callers still had to know it, to place
 * the pill clear of what it describes, and they knew it as `- 22`: six pixels
 * short, which is how a pill that was meant to sit above the create lane ended
 * up lying across it. The height is fixed here and the offset is derived from
 * it, so the two cannot disagree again. */
const PILL_HEIGHT_PX = 28;

/** The clearance between the pill and the thing it reads out. Enough to read as
 * a separate object rather than a label stuck to the bar. */
const PILL_GAP_PX = 6;

interface DragPillProps {
  left: number;
  /** The top edge of what the pill describes — the bar being dragged, or the
   * ghost being drawn — in canvas coordinates. */
  anchorTop: number;
  /** That same thing's height. The pill clears the whole of it, on whichever
   * side it ends up. */
  anchorHeight: number;
  /** The canvas's own height, which is what "off the chart" is measured
   * against. See the flip below. */
  canvasHeight: number;
  label: string;
}

/** The dark pill that floats above a gesture in flight, reading out the dates
 * it is currently proposing.
 *
 * One component for both gestures that propose dates — moving or resizing a
 * bar, and drawing a new one on the create lane — so the two cannot drift into
 * two slightly different pills.
 *
 * **Above by default, below when there is no room above.** Above is the side
 * that keeps the pill off the thing it describes: a bar has empty track over
 * it, and the create lane has a name field in it that the pill was covering
 * (a task drawn on an empty plan put the dates squarely over the field, so you
 * could not see what you were typing). At the top of the chart there is
 * nothing above to use — the first row starts at zero — so the pill goes under
 * the anchor instead of being clamped to the edge, on top of the very bar it
 * is describing, which is what it used to do.
 *
 * The flip is decided against the **canvas**, not the scroll viewport, and
 * that is exact rather than approximate: the body scrolls no further than its
 * own content, so the only way the space above an anchor is off screen is if
 * the anchor is near the canvas's own top. Below has room by construction —
 * the canvas is never shorter than MIN_BODY_HEIGHT_PX — and is clamped to the
 * bottom edge anyway for the case where a future layout makes it tight. */
export function DragPill({ left, anchorTop, anchorHeight, canvasHeight, label }: DragPillProps) {
  const above = anchorTop - PILL_HEIGHT_PX - PILL_GAP_PX;
  const below = anchorTop + anchorHeight + PILL_GAP_PX;
  const top =
    above >= 0 ? above : Math.max(0, Math.min(below, canvasHeight - PILL_HEIGHT_PX));

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        height: PILL_HEIGHT_PX,
        boxSizing: 'border-box',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        background: 'var(--gantt-drag-pill-bg)',
        color: 'var(--gantt-drag-pill-fg)',
        fontSize: 10.5,
        fontWeight: 600,
        padding: '0 8px',
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
