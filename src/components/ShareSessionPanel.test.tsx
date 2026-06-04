/**
 * Tests for ShareSessionPanel component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ShareSessionPanel } from './ShareSessionPanel'
import type { TracerEvent } from '@/engine/tracer'

// Mock window.location
const mockLocation = {
  hash: '',
  origin: 'https://example.com',
  pathname: '/cyber-agent/debug',
} as Location

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
})

// Mock clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  writable: true,
})

// Mock CompressionStream
class MockCompressionStream {
  writable: WritableStream
  readable: ReadableStream
  constructor() {
    this.writable = new WritableStream()
    this.readable = new ReadableStream()
  }
}

class MockDecompressionStream {
  readable: ReadableStream
  constructor() {
    this.readable = new ReadableStream()
  }
}

vi.stubGlobal('CompressionStream', MockCompressionStream)
vi.stubGlobal('DecompressionStream', MockDecompressionStream)

const mockProps = {
  character: 'fox',
  btTree: null,
  blackboard: null,
  recentEvents: [] as TracerEvent[],
  valState: null,
  valHistory: [] as Array<{ t: number; valence: number; arousal: number; dominance: number }>,
  diffs: [] as Array<{ field: string; oldValue: unknown; newValue: unknown }>,
  onSessionLoaded: vi.fn(),
}

describe('ShareSessionPanel', () => {
  beforeEach(() => {
    mockLocation.hash = ''
    vi.clearAllMocks()
  })

  it('renders the share panel with generate button', () => {
    render(<ShareSessionPanel {...mockProps} />)
    expect(screen.getByText('🔗 Share Session')).toBeInTheDocument()
    expect(screen.getByText('🔗 Generate Share URL')).toBeInTheDocument()
  })

  it('shows description text', () => {
    render(<ShareSessionPanel {...mockProps} />)
    expect(screen.getByText(/Generate a URL that captures your current debug state/)).toBeInTheDocument()
  })

  it('disables button when no character', () => {
    render(<ShareSessionPanel {...mockProps} character="" />)
    const btn = screen.getByText('🔗 Generate Share URL')
    expect(btn).toBeDisabled()
  })

  it('shows loading state when generating', () => {
    vi.useFakeTimers()
    render(<ShareSessionPanel {...mockProps} />)
    const btn = screen.getByText('🔗 Generate Share URL')

    // Mock fetch to never resolve (we're testing the loading state)
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))

    fireEvent.click(btn)
    expect(screen.getByText('⏳ Compressing...')).toBeInTheDocument()

    vi.useRealTimers()
    globalThis.fetch = originalFetch
  })
})
