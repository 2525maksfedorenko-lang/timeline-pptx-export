import QRCode from 'qrcode';

export const EXPORT_LINK_DISPLAY = 'timeline-pptx-export.vercel.app';
export const EXPORT_LINK_URL = `https://${EXPORT_LINK_DISPLAY}`;

let cachedQrDataUrl: Promise<string> | null = null;

/** Generates (and caches) a QR code PNG data URL for the fixed export link,
 * shown on the summary slide of both the PPTX and PDF exporters. */
export function getExportQrCodeDataUrl(): Promise<string> {
  if (!cachedQrDataUrl) {
    cachedQrDataUrl = QRCode.toDataURL(EXPORT_LINK_URL, { margin: 1, width: 256 });
  }
  return cachedQrDataUrl;
}
