import QRCode from 'qrcode';

/** The origin used when there is no page to read one from — the coverage check
 * builds a whole deck in Node, and a QR still has to encode *something*.
 *
 * It is only ever seen headless. Every deck a person exports is exported from
 * the running app, which answers with its own origin below. Change this line
 * if a headless run should quote a particular public URL. */
const HEADLESS_FALLBACK_ORIGIN = 'https://timeline-pptx-export.vercel.app';

/** Where an exported deck's QR codes point: the origin the export is running
 * in, not a host written down at build time.
 *
 * Read at call time rather than fixed as a constant because the deployment can
 * move — it has, from Vercel to Netlify — and a deck carrying the old host is
 * a dead link that nothing in the file admits to. Whatever origin serves the
 * app is the origin its reader needs. */
function exportOrigin(): string {
  if (typeof window === 'undefined') return HEADLESS_FALLBACK_ORIGIN;
  const { origin } = window.location;
  return origin.startsWith('http') ? origin : HEADLESS_FALLBACK_ORIGIN;
}

/** The same origin as the caption printed under a QR code: no scheme, since
 * the scheme is noise to someone reading a slide. */
function exportOriginDisplay(): string {
  return exportOrigin().replace(/^https?:\/\//, '');
}

/** Deep link into a specific on-screen Dashboard section (see App.tsx's
 * readDashboardViewParam). Lives here alongside the base export link so
 * every exported QR target — the dashboard slides' per-table links and the
 * summary slide's status link — is built the same way, in one place. */
export function dashboardDeepLink(view: 'status' | 'delayed'): { url: string; display: string } {
  const path = `/?dashboardView=${view}`;
  return { url: `${exportOrigin()}${path}`, display: `${exportOriginDisplay()}${path}` };
}

const cachedQrDataUrls = new Map<string, Promise<string>>();

/** Generates (and caches, per URL) a QR code PNG data URL. Shared by the
 * summary slide's fixed export link and the dashboard slides' per-table
 * deep links (see dashboardSlides.ts) — one QR generator, many URLs. */
export function getQrCodeDataUrl(url: string): Promise<string> {
  let cached = cachedQrDataUrls.get(url);
  if (!cached) {
    cached = QRCode.toDataURL(url, { margin: 1, width: 256 });
    cachedQrDataUrls.set(url, cached);
  }
  return cached;
}

/** A rendered QR code plus the caption drawn beneath it. */
export interface QrCodeModel {
  dataUrl: string;
  display: string;
}

/** The QR codes shown side by side on the summary slide of both exporters:
 * the plain export link, and a deep link into the on-screen status view.
 * The latter is why there's no separate "Status breakdown" slide any more —
 * the summary already shows the same segments, so that slide's only unique
 * content was this link (see dashboardSlides.ts). Defined here, once, so
 * both exporters render the same pair. */
export function getSummaryQrCodes(): Promise<QrCodeModel[]> {
  const statusLink = dashboardDeepLink('status');

  return Promise.all([
    getQrCodeDataUrl(exportOrigin()).then((dataUrl) => ({ dataUrl, display: exportOriginDisplay() })),
    getQrCodeDataUrl(statusLink.url).then((dataUrl) => ({ dataUrl, display: 'View status details' })),
  ]);
}
