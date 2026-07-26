import * as QRCode from 'qrcode';

/**
 * Renders a ticket QR as a PNG. Black on white with a quiet zone, per
 * DESIGN.md's "Ticket QR" rule - a tinted or bleeding QR does not scan
 * reliably off a phone screen, and email clients cannot be trusted to leave a
 * transparent background alone.
 */
export function renderQrPng(payload: string): Promise<Buffer> {
  return QRCode.toBuffer(payload, {
    width: 512,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });
}
