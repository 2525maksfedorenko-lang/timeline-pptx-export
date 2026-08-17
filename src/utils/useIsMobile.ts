import { useSyncExternalStore } from 'react';

/** The app's one adaptive breakpoint: below this, the UI is laid out for a
 * phone. Deliberately the same 768px as Tailwind's `md`, because most of the
 * adaptation is done with `max-md:` utility classes and only the handful of
 * places where JS itself owns a pixel measurement (the Gantt's zone widths,
 * which the row layout, the day header and the SVG overlays all have to
 * agree on) read it from here — one number, so the CSS and the JS can't
 * drift into disagreeing about what "mobile" means. */
export const MOBILE_MEDIA_QUERY = '(max-width: 767px)';

/** Non-reactive read of the same query, for the one caller that needs it
 * before React is running (the store's initial zoom level). Guards on
 * `window` so importing the store in a non-browser context — the export
 * modules are exercised headless in Node — can't throw. */
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
