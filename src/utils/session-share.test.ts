/**
 * Tests for session-share utility.
 *
 * CompressionStream/DecompressionStream are not available in jsdom,
 * so we test fast-path inputs (invalid prefix, bad base64) and
 * skip compression-dependent paths.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  decodeSession,
  isShareUrl,
  getShareHash,
} from './session-share'

describe('session-share', () => {
  describe('decodeSession', () => {
    it('returns null for non-share hash', async () => {
      const result = await decodeSession('#debug')
      expect(result).toBeNull()
    })

    it('returns null for empty share prefix', async () => {
      const result = await decodeSession('#share/')
      expect(result).toBeNull()
    })

    it('returns null for invalid base64', async () => {
      const result = await decodeSession('#share/!!!invalid')
      expect(result).toBeNull()
    })
  })

  describe('isShareUrl', () => {
    it('returns true for share URL', () => {
      vi.stubGlobal('window', { location: { hash: '#share/abc123' } })
      expect(isShareUrl()).toBe(true)
    })

    it('returns false for regular hash', () => {
      vi.stubGlobal('window', { location: { hash: '#/debug' } })
      expect(isShareUrl()).toBe(false)
    })

    it('returns false for no hash', () => {
      vi.stubGlobal('window', { location: { hash: '' } })
      expect(isShareUrl()).toBe(false)
    })
  })

  describe('getShareHash', () => {
    it('returns the current hash', () => {
      vi.stubGlobal('window', { location: { hash: '#share/test' } })
      expect(getShareHash()).toBe('#share/test')
    })
  })
})
