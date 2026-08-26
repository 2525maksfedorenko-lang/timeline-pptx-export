import QRCode from 'qrcode';

export const EXPORT_LINK_DISPLAY = 'timeline-pptx-export.vercel.app';
export const EXPORT_LINK_URL = `https://${EXPORT_LINK_DISPLAY}`;

/** Deep link into a specific on-screen Dashboard section (see App.tsx's
 * readDashboardViewParam). Lives here alongside the base export link so
 * every exported QR target — the dashboard slides' per-table links and the
 * summary slide's status link — is built the same way, in one place. */
export function dashboardDeepLink(view: 'status' | 'delayed'): { url: string; display: string } {
  const path = `/?dashboardView=${view}`;
  return { url: `${EXPORT_LINK_URL}${path}`, display: `${EXPORT_LINK_DISPLAY}${path}` };
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
    getQrCodeDataUrl(EXPORT_LINK_URL).then((dataUrl) => ({ dataUrl, display: EXPORT_LINK_DISPLAY })),
    getQrCodeDataUrl(statusLink.url).then((dataUrl) => ({ dataUrl, display: 'View status details' })),
  ]);
}
