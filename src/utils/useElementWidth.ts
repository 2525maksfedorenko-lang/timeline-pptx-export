import { useEffect, useState, type RefObject } from 'react';

/** The live content width of an element, in CSS px, re-rendering when it
 * changes. 0 until the first measurement lands (one frame after mount), so
 * callers need a sensible answer for "not measured yet".
 *
 * The Gantt chart needs this to know how much *time* is on screen at once —
 * viewport width divided by pixels-per-day — which is what its grid density
 * adapts to. Nothing else can supply that: the plan's own length says how
 * much there is to show, not how much of it fits. */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    setWidth(element.clientWidth);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
