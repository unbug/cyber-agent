import { describe, it, expect } from 'vitest'
import { qrSvg } from './qr'

describe('qrSvg', () => {
  it('renders an inline SVG for a URL', () => {
    const svg = qrSvg('http://192.168.1.170:9765/remote')
    expect(svg.startsWith('<svg'))
    expect(svg).toContain('</svg>')
    expect(svg.length).toBeGreaterThan(500)
  })

  it('auto-sizes for longer payloads', () => {
    const short = qrSvg('http://a/1')
    const long = qrSvg('http://very.long.host.example.com:65000/remote?token=' + 'x'.repeat(200))
    expect(long.length).toBeGreaterThan(short.length)
  })
})
