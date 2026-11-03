/**
 * Tiny SVG QR generator for in-page pairing codes (scan-to-remote handoff).
 * Wraps qrcode-generator (MIT, type 0 = auto-size). Returns an inline SVG
 * string we generate ourselves — safe to inject, no network.
 */
import qrcode from 'qrcode-generator'

export function qrSvg(data: string, cellSize = 4, margin = 8): string {
  const qr = qrcode(0, 'M')
  qr.addData(data)
  qr.make()
  return qr.createSvgTag(cellSize, margin)
}
