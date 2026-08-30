import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/* The plan canvas is three panes that must behave as one surface.
 *
 * The handoff builds it as a single `overflow: auto` box with the list stuck
 * to its left and the header stuck to its top, and says so in as many words:
 * "vertical alignment between list and bars is structural, not synchronised
 * in JS". That is the better architecture, and it has one consequence that
 * rules it out here — a single scroller's horizontal scrollbar spans the
 * whole box, so it runs under the task list as well as under the bars, and
 * it sits at the bottom of the *content* rather than at the bottom of the
 * timeline. The bar has to belong to the timeline zone alone and stay in
 * view, so the panes are split and the sync moves into JS.
 *
 * There is exactly one scroller: the body. The header pane and the list pane
 * are `overflow: hidden` boxes whose scroll offset is written from the body's
 * — the header follows it horizontally, the list vertically, and the corner
 * follows neither. Everything else here exists to keep that one scroller
 * usable: a grab-to-pan, a shift-wheel, wheel forwarding from the list, and
 * a scale change that keeps the date under the middle of the zone.
 *
 * Below the mobile breakpoint the list pane becomes a drawer lying over the
 * canvas, which puts the body out of reach while it is open — so there the
 * list scrolls itself and writes its offset back to the body. It is still one
 * offset and the body still holds it; the only difference is which end the
 * finger is on. Both writes are guarded on the value actually changing, so
 * the two cannot bounce off each other.
 *
 * There are two grab-pans, and the body's is the one that matters. A drag on
 * the canvas moves the plan in both axes — that is the primary way through a
 * plan, and it was briefly taken away when a drag there drew a task instead;
 * drawing has gone back to its own strip (see CreateLane) so the canvas can
 * mean one thing again. The header keeps the pan it was given in the
 * meantime: it is the ruler the plan is measured against, pulling it sideways
 * is a fair reading of the same gesture, and it costs nothing to keep. It
 * pans horizontally only, which is all a ruler can mean.
 */

export interface ScrollPanes {
  /** The one scroller: the timeline body. */
  bodyRef: React.RefObject<HTMLDivElement | null>;
  /** Follows the body horizontally. */
  headerRef: React.RefObject<HTMLDivElement | null>;
  /** Follows the body vertically. */
  listRef: React.RefObject<HTMLDivElement | null>;
  /** How much of the body's box its scrollbars take. The header and the list
   * reserve the same, or they would show a strip of content the body has
   * hidden under a scrollbar. */
  gutter: { vertical: number; horizontal: number };
  /** How wide the body's *content* area is — the zone the visible days are
   * counted against, and what a scroll target is centred in. 0 before the
   * first measurement. */
  viewportWidth: number;
  /** Puts a day index at `TODAY_SCROLL_LEAD_PX` from the zone's left edge. */
  scrollToDay: (dayIndex: number, columnWidth: number, lead: number, behavior: ScrollBehavior) => void;
  /** True while a grab-pan is in flight, so the caller can suppress the click
   * it would otherwise end with. */
  isPanningRef: React.RefObject<boolean>;
}

/** Marks the elements a grab-pan must not start on: the bars, which own the
 * pointer for moving and resizing. Everything else in the body — empty track,
 * the grid, the today band — is fair game to pan from. */
export const BAR_HIT_ATTRIBUTE = 'data-gantt-bar';

/** Marks the create lane, the strip under the last row where a drag draws a
 * new task's dates. It owns its press for the same reason a bar does, and for
 * a sharper one: a press that both panned the canvas and drew a task would
 * mean every scroll ended at a name field. Panning gives up this one 46px
 * strip; every other pixel of the canvas still pans. */
export const CREATE_LANE_ATTRIBUTE = 'data-gantt-create';

/** Everything in the body that answers its own pointer. */
const OWNS_PRESS_SELECTOR = `[${BAR_HIT_ATTRIBUTE}],[${CREATE_LANE_ATTRIBUTE}]`;

interface Options {
  /** Pixels per day at the current scale. A change to it is a scale change,
   * which is what the centre-preserving effect keys on. */
  columnWidth: number;
}

export function useScrollPanes({ columnWidth }: Options): ScrollPanes {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const isPanningRef = useRef(false);

  const [gutter, setGutter] = useState({ vertical: 0, horizontal: 0 });
  const [viewportWidth, setViewportWidth] = useState(0);

  // --- measuring -----------------------------------------------------------
  // The scrollbars' own thickness, read off the body rather than assumed: it
  // is 12px in this app's own stylesheet, but only while the element has
  // classic scrollbars, and an overlay-scrollbar platform reports 0.
  const measure = useCallback(() => {
    const body = bodyRef.current;
    if (!body) return;
    const vertical = body.offsetWidth - body.clientWidth;
    const horizontal = body.offsetHeight - body.clientHeight;
    setGutter((current) =>
      current.vertical === vertical && current.horizontal === horizontal
        ? current
        : { vertical, horizontal },
    );
    setViewportWidth((current) => (current === body.clientWidth ? current : body.clientWidth));
  }, []);

  // Deliberately on every render rather than on a dependency list. What the
  // gutters depend on is the canvas's size, which is itself derived from the
  // width this measurement produces — passing it in would be a cycle. Two DOM
  // reads per render is cheaper than untangling that, and `measure` only sets
  // state when a number actually moved, so it cannot loop.
  useLayoutEffect(measure);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    return () => observer.disconnect();
  }, [measure]);

  // The day at the middle of the zone, kept up to date as the view moves —
  // the anchor a scale change is restored around. It has to be recorded
  // *before* the change, because by the time a layout effect could read
  // `scrollLeft` the canvas has already been re-rendered at the new column
  // width and the browser has clamped the offset into its new range. Reading
  // it then gives the date the clamp happened to leave under the middle, not
  // the one that was there.
  const middleDayRef = useRef(0);
  const columnWidthRef = useRef(columnWidth);

  // --- the sync itself -----------------------------------------------------
  // Written straight to the DOM in the scroll handler. Routing it through
  // React state would re-render the whole plan once per scroll frame to move
  // two panes that React does not own the position of anyway.
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    const onScroll = () => {
      if (headerRef.current) headerRef.current.scrollLeft = body.scrollLeft;
      // Compared before it is written, which is what stops the mirror below
      // from bouncing the two panes off each other: a write that changes
      // nothing fires no scroll event, so the loop terminates on its first
      // agreement instead of running forever.
      const list = listRef.current;
      if (list && list.scrollTop !== body.scrollTop) list.scrollTop = body.scrollTop;
      middleDayRef.current = (body.scrollLeft + body.clientWidth / 2) / columnWidthRef.current;
    };

    // The list following the body is the whole arrangement above the mobile
    // breakpoint, where the list pane is an `overflow: hidden` box that never
    // scrolls itself. Below it the same pane is a drawer lying over the
    // canvas, and the canvas is then unreachable — so the drawer scrolls with
    // a finger like anything else, and what it scrolls is written back here.
    // On the desktop layout this listener still runs and never does anything:
    // the only thing that moves the list's offset is the line above, and the
    // same `!==` guard turns the answering write into a no-op.
    const onListScroll = () => {
      const list = listRef.current;
      if (list && body.scrollTop !== list.scrollTop) body.scrollTop = list.scrollTop;
    };

    onScroll();
    body.addEventListener('scroll', onScroll, { passive: true });
    const list = listRef.current;
    list?.addEventListener('scroll', onListScroll, { passive: true });
    return () => {
      body.removeEventListener('scroll', onScroll);
      list?.removeEventListener('scroll', onListScroll);
    };
  }, []);

  // --- grab the canvas to move the plan ------------------------------------
  // The primary way through a plan, and the one gesture on this screen that
  // moves both axes at once: a plan is as tall as it is long, and reaching a
  // row in it by wheel while reaching a date by scrollbar is two gestures for
  // one intent.
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    let pointerId: number | null = null;

    const onPointerDown = (event: PointerEvent) => {
      // Left button only, and never on a bar or the create lane: each owns
      // its own drag, and the two would otherwise both run on one press.
      if (event.button !== 0) return;
      if ((event.target as Element | null)?.closest(OWNS_PRESS_SELECTOR)) return;

      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startLeft = body.scrollLeft;
      startTop = body.scrollTop;
      isPanningRef.current = false;
      body.setPointerCapture(pointerId);
      // Stops the press from starting a text selection across the rows.
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      // A press that has not moved is still a click; only real movement turns
      // it into a pan and takes the cursor with it.
      if (!isPanningRef.current && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      isPanningRef.current = true;
      body.style.cursor = 'grabbing';
      body.scrollLeft = startLeft - dx;
      body.scrollTop = startTop - dy;
    };

    const endPan = (event: PointerEvent) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      body.releasePointerCapture(pointerId);
      pointerId = null;
      body.style.cursor = '';
      // Cleared a frame later, so a click fired by this same release still
      // sees that a pan happened and can bow out.
      window.setTimeout(() => {
        isPanningRef.current = false;
      }, 0);
    };

    body.addEventListener('pointerdown', onPointerDown);
    body.addEventListener('pointermove', onPointerMove);
    body.addEventListener('pointerup', endPan);
    body.addEventListener('pointercancel', endPan);
    return () => {
      body.removeEventListener('pointerdown', onPointerDown);
      body.removeEventListener('pointermove', onPointerMove);
      body.removeEventListener('pointerup', endPan);
      body.removeEventListener('pointercancel', endPan);
    };
  }, []);

  // --- grab the ruler to move through time ---------------------------------
  // On the header, and horizontal only. The body's own scrollLeft is what is
  // written, exactly as a scroll would write it, so the sync above carries the
  // header along and the two can't come apart.
  useEffect(() => {
    const header = headerRef.current;
    const body = bodyRef.current;
    if (!header || !body) return;

    let startX = 0;
    let startLeft = 0;
    let panning = false;
    let pointerId: number | null = null;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;

      pointerId = event.pointerId;
      startX = event.clientX;
      startLeft = body.scrollLeft;
      panning = false;
      header.setPointerCapture(pointerId);
      // Stops the press from starting a text selection across the date cells.
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      // A press that has not moved is still a click; only real movement turns
      // it into a pan and takes the cursor with it.
      if (!panning && Math.abs(dx) < 3) return;
      panning = true;
      header.style.cursor = 'grabbing';
      body.scrollLeft = startLeft - dx;
    };

    const endPan = (event: PointerEvent) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      header.releasePointerCapture(pointerId);
      pointerId = null;
      panning = false;
      header.style.cursor = '';
    };

    header.addEventListener('pointerdown', onPointerDown);
    header.addEventListener('pointermove', onPointerMove);
    header.addEventListener('pointerup', endPan);
    header.addEventListener('pointercancel', endPan);
    return () => {
      header.removeEventListener('pointerdown', onPointerDown);
      header.removeEventListener('pointermove', onPointerMove);
      header.removeEventListener('pointerup', endPan);
      header.removeEventListener('pointercancel', endPan);
    };
  }, []);

  // --- the wheel -----------------------------------------------------------
  // Plain vertical wheel over the body is left to the browser: the body is
  // the scroller, so it already scrolls the rows. Two cases are not free —
  // shift-wheel, handled explicitly so the browser's own interpretation of it
  // cannot double up with ours, and a wheel over the list, which is an
  // `overflow: hidden` pane and would otherwise swallow it.
  useEffect(() => {
    const body = bodyRef.current;
    const list = listRef.current;
    if (!body) return;

    const onBodyWheel = (event: WheelEvent) => {
      if (!event.shiftKey) return;
      event.preventDefault();
      body.scrollLeft += event.deltaY !== 0 ? event.deltaY : event.deltaX;
    };

    const onListWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.shiftKey) body.scrollLeft += event.deltaY !== 0 ? event.deltaY : event.deltaX;
      else body.scrollTop += event.deltaY;
    };

    body.addEventListener('wheel', onBodyWheel, { passive: false });
    list?.addEventListener('wheel', onListWheel, { passive: false });
    return () => {
      body.removeEventListener('wheel', onBodyWheel);
      list?.removeEventListener('wheel', onListWheel);
    };
  }, []);

  // --- keeping the date under the middle across a scale change -------------
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    if (columnWidthRef.current === columnWidth) {
      // Steady state. The anchor is maintained by the scroll handler, but a
      // render can arrive with no scroll before it (the first one, a plan
      // being swapped, the window being resized), so it is refreshed here too.
      middleDayRef.current = (body.scrollLeft + body.clientWidth / 2) / columnWidth;
      return;
    }

    // The zone does not move and does not resize; only how many days fit in
    // it changes. So the day at its middle is the thing to hold still —
    // anchoring on the left edge instead would slide the view sideways by
    // half a screen every time someone pressed Month.
    columnWidthRef.current = columnWidth;
    const target = middleDayRef.current * columnWidth - body.clientWidth / 2;
    body.scrollLeft = Math.max(0, Math.min(body.scrollWidth - body.clientWidth, target));
  }, [columnWidth]);

  const scrollToDay = useCallback(
    (dayIndex: number, currentColumnWidth: number, lead: number, behavior: ScrollBehavior) => {
      bodyRef.current?.scrollTo({ left: Math.max(0, dayIndex * currentColumnWidth - lead), behavior });
    },
    [],
  );

  return { bodyRef, headerRef, listRef, gutter, viewportWidth, scrollToDay, isPanningRef };
}
