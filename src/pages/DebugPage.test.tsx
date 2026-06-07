/**
 * DebugPage component tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import * as useDebugModule from '@/hooks/useDebug'
import { DebugPage } from './DebugPage'

const mockState = {
  tree: null,
  breadcrumb: [],
  blackboard: null,
  prevBlackboard: null,
  adapterEvents: [],
  perceptionEvents: [],
  socialEvents: [],
  tickTimes: [],
  errors: [],
  totalEvents: 0,
  isRunning: false,
  tickRate: 0,
  avgLatency: 0,
  captureBlackboard: vi.fn(),
  updateTree: vi.fn(),
  reset: vi.fn(),
  safetyState: null,
  eStopActive: false,
  safetyEvents: [],
  memories: [],
  valState: null,
  valHistory: [],
}

// Mock localStorage so collapsible sections are expanded in tests
const localStorageMock: Record<string, string> = {}
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (key: string) => localStorageMock[key] ?? null,
    setItem: (key: string, value: string) => { localStorageMock[key] = value },
    removeItem: (key: string) => { delete localStorageMock[key] },
    clear: () => { Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]) },
    get length() { return Object.keys(localStorageMock).length },
    key: (n: number) => Object.keys(localStorageMock)[n] ?? null,
  },
  writable: true,
})

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('DebugPage', () => {
  beforeEach(() => {
    vi.spyOn(useDebugModule, 'useDebug').mockReturnValue(mockState as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders without crashing', () => {
    renderWithRouter(<DebugPage />)
    expect(screen.getByText('Behavior Tree')).toBeInTheDocument()
    expect(screen.getByText('Actuator Timeline')).toBeInTheDocument()
    expect(screen.getByText('Blackboard')).toBeInTheDocument()
  })

  it('shows empty states when no data', () => {
    renderWithRouter(<DebugPage />)
    expect(screen.getByText('No blackboard data yet')).toBeInTheDocument()
  })

  it('shows tick rate stat', () => {
    vi.spyOn(useDebugModule, 'useDebug').mockReturnValue({
      ...mockState,
      tickRate: 10.5,
      avgLatency: 1.23,
    } as any)
    renderWithRouter(<DebugPage />)
    expect(screen.getByText('10.5 fps')).toBeInTheDocument()
    expect(screen.getByText('1.23 ms')).toBeInTheDocument()
    expect(screen.getByText('Events', { selector: '.statLabel' })).toBeInTheDocument()
  })

  it('shows controls', () => {
    renderWithRouter(<DebugPage />)
    expect(screen.getByText('⏸ Pause')).toBeInTheDocument()
    expect(screen.getByText('🗑 Clear')).toBeInTheDocument()
  })

  it('shows collapsible sections', () => {
    vi.spyOn(useDebugModule, 'useDebug').mockReturnValue(mockState as any)
    renderWithRouter(<DebugPage />)
    expect(screen.getByText('Performance & Tracing')).toBeInTheDocument()
    expect(screen.getByText('Hardware & Safety')).toBeInTheDocument()
    expect(screen.getByText('AI & Perception')).toBeInTheDocument()
    expect(screen.getByText('Character & Memory')).toBeInTheDocument()
    expect(screen.getByText('Tools')).toBeInTheDocument()
  })
})
