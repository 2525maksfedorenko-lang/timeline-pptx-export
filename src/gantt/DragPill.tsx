import { useLayoutEffect, useRef } from 'react';

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

/** And the clearance it keeps from the edge of the visible chart, so a pill
 * pushed against one does not look wedged into it. */
const EDGE_INSET_PX = 4;

interface DragPillProps {
  /** The canvas's scroller. What "off screen" is measured against — see the
   * placement note below. */
  scrollerRef: React.RefObject<HTMLElement | null>;
  /** Where the pill would like to start: the left edge of what it describes. */
  anchorLeft: number;
  /** The top edge of what the pill describes — the bar being dragged, or the
   * ghost being drawn — in canvas coordinates. */
  anchorTop: number;
  /** That same thing's height. The pill clears the whole of it, on whichever
   * side it ends up. */
  anchorHeight: number;
  label: string;
}

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);

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
 * could not see what you were typing).
 *
 * **Placed against the visible chart, not against the canvas.** The canvas is
 * both taller and wider than the window onto it, so "inside the canvas" is not
 * the same question as "on screen", and an earlier version of this that asked
 * the first one was wrong twice over: scroll a row to the top of the viewport
 * and drag its bar, and the pill went 25px above the visible area; park a bar
 * against the right-hand edge and 69px of the pill went past it. The scroller's
 * own `scrollTop` / `scrollLeft` and client box give the band that is actually
 * on screen, in the same coordinates the pill is positioned in, and everything
 * below is decided against that band.
 *
 * Which is also why the placement is measured rather than computed: the pill's
 * width depends on the dates in it — "Aug 3 → Aug 9  (7d)" is not the width of
 * "Aug 28 → Sep 14  (18d)" — so there is no arithmetic that keeps it inside the
 * right-hand edge without asking the DOM how wide it came out. It is asked in a
 * layout effect, which runs before the browser paints, so nothing is ever drawn
 * at the unplaced position. */
export function DragPill({ scrollerRef, anchorLeft, anchorTop, anchorHeight, label }: DragPillProps) {
  const pillRef = useRef<HTMLDivElement | null>(null);

  // Deliberately on every render and with no dependency list: `anchorLeft` and
  // `anchorTop` change with every column the gesture crosses, and the label —
  // and so the width — changes with them. The scroll listener is here for the
  // one case a render does not cover: the create lane keeps the pill up while
  // its name field is open, and the canvas can be wheeled underneath it.
  useLayoutEffect(() => {
    const pill = pillRef.current;
    const scroller = scrollerRef.current;
    if (!pill) return;

    const place = () => {
      const width = pill.offsetWidth;
      // With no scroller to ask, fall back to the preferred position rather
      // than to nothing: a pill in the right place for the canvas beats a pill
      // in the corner.
      const visibleTop = scroller ? scroller.scrollTop + EDGE_INSET_PX : -Infinity;
      const visibleBottom = scroller
        ? scroller.scrollTop + scroller.clientHeight - EDGE_INSET_PX
        : Infinity;
      const visibleLeft = scroller ? scroller.scrollLeft + EDGE_INSET_PX : -Infinity;
      const visibleRight = scroller
        ? scroller.scrollLeft + scroller.clientWidth - EDGE_INSET_PX
        : Infinity;

      const above = anchorTop - PILL_HEIGHT_PX - PILL_GAP_PX;
      const below = anchorTop + anchorHeight + PILL_GAP_PX;
      // Above unless it would be off the top; below unless that is off the
      // bottom too, which only happens on a chart shorter than about a hundred
      // pixels — and there the pill is pushed inside the band rather than
      // being left outside it.
      const top =
        above >= visibleTop
          ? above
          : below + PILL_HEIGHT_PX <= visibleBottom
            ? below
            : clamp(above, visibleTop, Math.max(visibleTop, visibleBottom - PILL_HEIGHT_PX));

      // Horizontally there is no other side to flip to — the pill starts where
      // the thing it describes starts — so it slides along instead, staying
      // level with its anchor for as long as it can and then stopping at the
      // edge. `Math.max` last, so a pill wider than the window loses its right
      // end rather than its left, where the first date is.
      const left = Math.max(visibleLeft, Math.min(anchorLeft, visibleRight - width));

      pill.style.top = `${top}px`;
      pill.style.left = `${left}px`;
    };

    place();
    scroller?.addEventListener('scroll', place, { passive: true });
    return () => scroller?.removeEventListener('scroll', place);
  });

  return (
    <div
      ref={pillRef}
      style={{
        position: 'absolute',
        // `top` and `left` are the layout effect's, not React's: they are a
        // measurement, and writing them here as well would mean two sources
        // for one number.
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
