import { useSyncExternalStore } from 'react';

/** The app's one adaptive breakpoint: below this, the UI is laid out for a
 * phone. Deliberately the same 768px as Tailwind's `md`, because most of the
 * adaptation is done with `max-md:` utility classes and only the places where
 * JS itself owns the decision read it from here — one number, so the CSS and
 * the JS can't drift into disagreeing about what "mobile" means.
 *
 * On the plan screen those places are: whether the task column is a grid
 * column or a drawer over the canvas, whether the header is one row or two,
 * whether a bar answers a drag, whether a bar too narrow to hold its name sets
 * it alongside instead, and whether the Edit Task panel is a 348px column or
 * the whole screen. Each is a layout the same media query decides. */
export const MOBILE_MEDIA_QUERY = '(max-width: 767px)';

/** Non-reactive read of the same query — the hook's own snapshot, and
 * available to anything that needs the answer outside a render. Guards on
 * `window` so importing this in a non-browser context — the export modules
 * are exercised headless in Node — can't throw. */
export function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

function subscribe(onStoreChange: () => void) {
  const query = window.matchMedia(MOBILE_MEDIA_QUERY);
  query.addEventListener('change', onStoreChange);
  return () => query.removeEventListener('change', onStoreChange);
}

/** True while the viewport is phone-sized, re-rendering on the crossing.
 * Always false outside a browser, so the desktop layout is the fallback
 * rather than a phone layout on a machine that never asked for one. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, isMobileViewport, () => false);
}
