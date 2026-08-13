import QRCode from 'qrcode';

export const EXPORT_LINK_DISPLAY = 'timeline-pptx-export.vercel.app';
export const EXPORT_LINK_URL = `https://${EXPORT_LINK_DISPLAY}`;

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

/** Generates (and caches) a QR code PNG data URL for the fixed export link,
 * shown on the summary slide of both the PPTX and PDF exporters. */
export function getExportQrCodeDataUrl(): Promise<string> {
  return getQrCodeDataUrl(EXPORT_LINK_URL);
}
