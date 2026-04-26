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
  tickTimes: [],
  errors: [],
  totalEvents: 0,
  isRunning: false,
  tickRate: 0,
  avgLatency: 0,
  captureBlackboard: vi.fn(),
  updateTree: vi.fn(),
  reset: vi.fn(),
}

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
    expect(screen.getByText('Events')).toBeInTheDocument()
  })

  it('shows controls', () => {
    renderWithRouter(<DebugPage />)
    expect(screen.getByText('⏸ Pause')).toBeInTheDocument()
    expect(screen.getByText('🗑 Clear')).toBeInTheDocument()
  })

  it('shows error toggle when errors exist', () => {
    vi.spyOn(useDebugModule, 'useDebug').mockReturnValue({
      ...mockState,
      errors: [
        { t: 1000, type: 'error' as const, label: 'error', payload: { message: 'test error' } },
      ],
      totalEvents: 1,
    } as any)
    renderWithRouter(<DebugPage />)
    expect(screen.getByText('⚠ 1 error')).toBeInTheDocument()
  })
})
