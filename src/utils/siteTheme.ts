import { useSyncExternalStore } from 'react';

/* Light or dark, decided the way the aicoo website decides it.
 *
 * The website keeps the choice in `localStorage` under `theme` and applies it
 * as a `dark` class on `<html>` (`contexts/ThemeContext.tsx`); with no stored
 * value it falls back to `prefers-color-scheme`. Embedded under
 * `/tools/timeline-pptx-export` this app is served from the site's own origin,
 * so that key is simply readable — there is no message to pass and no API to
 * call. Standalone the key is absent and the fallback answers instead, which
 * is the same rule rather than a second one.
 *
 * The class is what the styling actually hangs off: `design-system/` ships a
 * full `.dark` block of its own, and `gantt/tokens.css` now carries one too,
 * so setting the class is the whole of it — no component reads a theme prop.
 *
 * What this deliberately does **not** touch is `src/export/theme.ts`. A slide
 * is printed on white whoever generated it, so the exporters keep their own
 * palette and none of the values here reach them. The boundary is one-way and
 * it is worth stating: the screen follows the visitor, the deck does not.
 */

export type SiteTheme = 'light' | 'dark';

/** The key the website writes, and the class it writes on `<html>`. Both are
 * the site's, not ours; changing either here changes nothing there. */
const STORAGE_KEY = 'theme';
const DARK_CLASS = 'dark';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Non-reactive read, and the same order of preference the site uses: a stored
 * choice first, the system otherwise. Guards on `window` because the export
 * modules are exercised headless in Node, and wraps the storage read because a
 * browser told to block site data throws on the *access* rather than returning
 * null. */
export function readSiteTheme(): SiteTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    /* storage unavailable — fall through to the system preference */
  }
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/** Put the answer on `<html>`, where every `.dark` rule in the stylesheet is
 * waiting for it. Idempotent, so the inline script in `index.html` doing this
 * before first paint and React doing it again on mount is not a double
 * application — it is the same class arriving at the same element twice. */
export function applySiteTheme(theme: SiteTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle(DARK_CLASS, theme === 'dark');
}

function subscribe(onStoreChange: () => void) {
  /* Two ways the answer changes under us, and both have to be heard.
     `storage` fires when the site's own header toggles the theme in another
     tab — the common case, because the tool is opened from the Tools page and
     that page stays open behind it. `change` on the media query covers the
     visitor who has never touched the site's toggle and flips their OS. */
  const query = window.matchMedia(DARK_QUERY);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) onStoreChange();
  };
  window.addEventListener('storage', onStorage);
  query.addEventListener('change', onStoreChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    query.removeEventListener('change', onStoreChange);
  };
}

/** The current theme, re-rendering when it changes, and applied to `<html>` as
 * a side effect of being read.
 *
 * Applying it here rather than in an effect is deliberate: the class has to be
 * on the element before the paint that shows the new value, and an effect runs
 * after it. `readSiteTheme` is what React calls to get the snapshot, so this
 * wrapper is the one place both the answer and its application can be kept in
 * step without a second render. */
function getSnapshotAndApply(): SiteTheme {
  const theme = readSiteTheme();
  applySiteTheme(theme);
  return theme;
}

export function useSiteTheme(): SiteTheme {
  return useSyncExternalStore(subscribe, getSnapshotAndApply, () => 'light');
}
