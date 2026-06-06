/**
 * PluginManagerPage — Component Tests
 *
 * Tests the PluginManagerPage component's rendering and basic interactions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PluginManagerPage } from './PluginManagerPage'

// ─── Component Tests ────────────────────────────────────────────

describe('PluginManagerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the header', () => {
    render(<PluginManagerPage />)
    expect(screen.getByText('Plugin Manager')).toBeInTheDocument()
    expect(screen.getByText(/Manage and inspect loaded plugins/)).toBeInTheDocument()
  })

  it('shows empty state when no plugins', () => {
    render(<PluginManagerPage />)
    expect(screen.getByText('No plugins loaded.')).toBeInTheDocument()
    expect(screen.getByText('Load a plugin manifest below to get started.')).toBeInTheDocument()
  })

  it('shows stats with plugin counts', () => {
    render(<PluginManagerPage />)
    expect(screen.getByText(/Total/)).toBeInTheDocument()
  })

  it('shows filter buttons', () => {
    render(<PluginManagerPage />)
    expect(screen.getByText(/All/)).toBeInTheDocument()
    expect(screen.getByText(/BT Node/)).toBeInTheDocument()
    expect(screen.getByText(/Adapter/)).toBeInTheDocument()
    expect(screen.getByText(/Sensor/)).toBeInTheDocument()
    expect(screen.getByText(/Hook/)).toBeInTheDocument()
    expect(screen.getByText(/Character/)).toBeInTheDocument()
  })

  it('shows load form with textarea', () => {
    render(<PluginManagerPage />)
    const loadBtns = screen.getAllByText('Load Plugin')
    expect(loadBtns.length).toBeGreaterThan(0)
    const textarea = screen.getByPlaceholderText(/name.*version.*type/) as HTMLTextAreaElement
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveAttribute('rows', '8')
  })

  it('shows plugin type badges', () => {
    render(<PluginManagerPage />)
    // The badges should be visible in the filter bar
    expect(screen.getByText(/BT Node/)).toBeInTheDocument()
    expect(screen.getByText(/Adapter/)).toBeInTheDocument()
    expect(screen.getByText(/Sensor/)).toBeInTheDocument()
    expect(screen.getByText(/Hook/)).toBeInTheDocument()
    expect(screen.getByText(/Character/)).toBeInTheDocument()
  })

  it('filter buttons are clickable', () => {
    render(<PluginManagerPage />)
    const allBtn = screen.getByText(/All/)
    expect(allBtn).toBeInTheDocument()

    // Click on BT Node filter
    const btNodeBtn = screen.getByText(/BT Node/)
    expect(btNodeBtn).toBeInTheDocument()
    fireEvent.click(btNodeBtn)

    // Click on Adapter filter
    const adapterBtn = screen.getByText(/Adapter/)
    expect(adapterBtn).toBeInTheDocument()
    fireEvent.click(adapterBtn)
  })
})
