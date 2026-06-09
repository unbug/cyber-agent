/**
 * DebugReportPanel — unit tests for the debug report UI component.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ─── Default mock: no errors, no events ──────────────────

vi.mock('@/hooks/useDebug', () => ({
  useDebug: vi.fn(() => ({
    tree: null,
    blackboard: null,
    errors: [] as any[],
    totalEvents: 0,
    tickRate: 12.5,
    avgLatency: 3.2,
    perceptionEvents: [],
    policyResults: [],
    policyEvents: [],
    adapterEvents: [],
    emotionPreset: 'playful-dog',
    valConfig: undefined,
    memoryConfig: undefined,
    perceptionConfig: undefined,
  })),
}))

vi.mock('@/hooks/useDebugReport', () => ({
  useDebugReport: vi.fn(() => ({
    generate: vi.fn(() => ({ $schema: 'cyberagent/debug-report/v1' })),
    download: vi.fn(),
    copyToClipboard: vi.fn(async () => true),
  })),
}))

// ─── Tests ────────────────────────────────────────────────

describe('DebugReportPanel', () => {
  it('renders panel title and subtitle', async () => {
    const { DebugReportPanel } = await import('./DebugReportPanel')
    render(<DebugReportPanel />)
    expect(screen.getByText('📋 Debug Report')).toBeInTheDocument()
    expect(
      screen.getByText('Export BT state + blackboard + errors for root-cause analysis'),
    ).toBeInTheDocument()
  })

  it('shows quick stats', async () => {
    const { DebugReportPanel } = await import('./DebugReportPanel')
    render(<DebugReportPanel />)
    expect(screen.getByText('Errors')).toBeInTheDocument()
    expect(screen.getByText('Perception')).toBeInTheDocument()
    expect(screen.getByText('Policy calls')).toBeInTheDocument()
    expect(screen.getByText('Tick rate')).toBeInTheDocument()
  })

  it('shows character name when emotionPreset is set', async () => {
    const { DebugReportPanel } = await import('./DebugReportPanel')
    render(<DebugReportPanel />)
    expect(screen.getByText('playful-dog')).toBeInTheDocument()
  })

  it('renders action buttons', async () => {
    const { DebugReportPanel } = await import('./DebugReportPanel')
    render(<DebugReportPanel />)
    expect(screen.getByRole('button', { name: /download report/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy to clipboard/i })).toBeInTheDocument()
  })

  it('shows preview structure in collapsible section', async () => {
    const { DebugReportPanel } = await import('./DebugReportPanel')
    render(<DebugReportPanel />)
    const summary = screen.getByText('Preview report structure')
    fireEvent.click(summary)
    expect(screen.getByText(/cyberagent\/debug-report\/v1/)).toBeInTheDocument()
  })

  it('shows empty state when no events', async () => {
    const { DebugReportPanel } = await import('./DebugReportPanel')
    render(<DebugReportPanel />)
    expect(
      screen.getByText('No debug data yet. Start a behavior tree to generate a report.'),
    ).toBeInTheDocument()
  })

  it('disables copy button when totalEvents is 0', async () => {
    const { DebugReportPanel } = await import('./DebugReportPanel')
    render(<DebugReportPanel />)
    const copyBtn = screen.getByRole('button', { name: /copy to clipboard/i })
    expect(copyBtn).toBeDisabled()
  })

  it('calls download on button click', async () => {
    const { DebugReportPanel } = await import('./DebugReportPanel')
    render(<DebugReportPanel />)
    const downloadBtn = screen.getByRole('button', { name: /download report/i })
    fireEvent.click(downloadBtn)
  })




})
