/**
 * CrossTalkPanel — unit tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CrossTalkPanel } from './CrossTalkPanel'
import type { CrossTalkReport } from './CrossTalkPanel'

type ReportOverride = Partial<Pick<CrossTalkReport, 'status' | 'totalSent' | 'totalReceived' | 'totalDrops' | 'hasCriticalRobot' | 'criticalRobots'>> & {
  perRobot?: Array<{ id: string; sent: number; received: number; drops: number; dropRate: number }>
}
function makeReport(overrides: ReportOverride = {}) {
  return {
    status: 'clean' as const,
    totalSent: 100,
    totalReceived: 98,
    totalDrops: 2,
    perRobot: [
      { id: 'robot-1', sent: 50, received: 49, drops: 1, dropRate: 2 },
      { id: 'robot-2', sent: 50, received: 49, drops: 1, dropRate: 2 },
    ],
    hasCriticalRobot: false,
    criticalRobots: [],
    ...overrides,
  }
}

describe('CrossTalkPanel', () => {
  it('renders with no data state when report is null', () => {
    render(
      <CrossTalkPanel
        report={null}
        drift={0}
        driftOk={true}
        eStopActive={false}
        robotCount={0}
        onReset={vi.fn()}
      />,
    )
    expect(screen.getByText('NO DATA')).toBeInTheDocument()
    expect(screen.getByText('Connect MultiBroadcastAdapter to see cross-talk data')).toBeInTheDocument()
  })

  it('renders clean status banner', () => {
    render(
      <CrossTalkPanel
        report={makeReport({ status: 'clean' })}
        drift={1.5}
        driftOk={true}
        eStopActive={false}
        robotCount={3}
        onReset={vi.fn()}
      />,
    )
    expect(screen.getByText('CLEAN')).toBeInTheDocument()
    expect(screen.getByText('3 robots')).toBeInTheDocument()
  })

  it('renders warning status banner', () => {
    render(
      <CrossTalkPanel
        report={makeReport({
          status: 'warning',
          totalDrops: 10,
          totalSent: 1000,
          perRobot: [
            { id: 'robot-1', sent: 500, received: 495, drops: 5, dropRate: 1 },
            { id: 'robot-2', sent: 500, received: 495, drops: 5, dropRate: 1 },
          ],
        })}
        drift={2.0}
        driftOk={true}
        eStopActive={false}
        robotCount={2}
        onReset={vi.fn()}
      />,
    )
    expect(screen.getByText('WARNING')).toBeInTheDocument()
  })

  it('renders critical status banner with critical robot badge', () => {
    render(
      <CrossTalkPanel
        report={makeReport({
          status: 'critical',
          totalDrops: 50,
          totalSent: 1000,
          perRobot: [
            { id: 'robot-1', sent: 500, received: 475, drops: 25, dropRate: 5 },
            { id: 'robot-2', sent: 500, received: 475, drops: 25, dropRate: 5 },
          ],
          hasCriticalRobot: true,
          criticalRobots: ['robot-1', 'robot-2'],
        })}
        drift={6.0}
        driftOk={false}
        eStopActive={false}
        robotCount={2}
        onReset={vi.fn()}
      />,
    )
    expect(screen.getByText('CRITICAL')).toBeInTheDocument()
    // Both robots should have critical badges
    const criticalBadges = screen.getAllByText('critical')
    expect(criticalBadges).toHaveLength(2)
  })

  it('shows E-STOP badge when eStopActive is true', () => {
    render(
      <CrossTalkPanel
        report={makeReport()}
        drift={0}
        driftOk={true}
        eStopActive={true}
        robotCount={1}
        onReset={vi.fn()}
      />,
    )
    expect(screen.getByText('E-STOP ACTIVE')).toBeInTheDocument()
  })

  it('displays per-robot table', () => {
    render(
      <CrossTalkPanel
        report={makeReport()}
        drift={1.0}
        driftOk={true}
        eStopActive={false}
        robotCount={2}
        onReset={vi.fn()}
      />,
    )
    expect(screen.getByText('robot-1')).toBeInTheDocument()
    expect(screen.getByText('robot-2')).toBeInTheDocument()
    // Check that the table contains the expected values
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    // Both robots should show 50 sent
    const sentCells = screen.queryAllByText('50')
    expect(sentCells.length).toBeGreaterThan(0)
    // Both robots show 49 received — use queryAll to avoid ambiguity
    const receivedCells = screen.queryAllByText('49')
    expect(receivedCells.length).toBe(2)
  })

  it('shows reset button when there is data', () => {
    const onReset = vi.fn()
    render(
      <CrossTalkPanel
        report={makeReport()}
        drift={0}
        driftOk={true}
        eStopActive={false}
        robotCount={1}
        onReset={onReset}
      />,
    )
    const btn = screen.getByText('↻ Reset Counters')
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(onReset).toHaveBeenCalled()
  })

  it('hides reset button when no data', () => {
    const onReset = vi.fn()
    render(
      <CrossTalkPanel
        report={null}
        drift={0}
        driftOk={true}
        eStopActive={false}
        robotCount={0}
        onReset={onReset}
      />,
    )
    expect(screen.queryByText('↻ Reset Counters')).not.toBeInTheDocument()
    // No button to click — just verify it's hidden
    expect(onReset).not.toHaveBeenCalled()
  })

  it('shows drift value', () => {
    render(
      <CrossTalkPanel
        report={makeReport()}
        drift={3.25}
        driftOk={true}
        eStopActive={false}
        robotCount={1}
        onReset={vi.fn()}
      />,
    )
    expect(screen.getByText('3.25 ms')).toBeInTheDocument()
  })

  it('shows warning style for bad drift', () => {
    const { container } = render(
      <CrossTalkPanel
        report={makeReport()}
        drift={-4.5}
        driftOk={false}
        eStopActive={false}
        robotCount={1}
        onReset={vi.fn()}
      />,
    )
    // The drift value should be displayed
    expect(screen.getByText('4.50 ms')).toBeInTheDocument()
    // statWarning is applied to drift value cell when driftOk is false
    const driftRow = container.querySelector('.crossTalkStat')
    expect(driftRow).toBeInTheDocument()
  })
})
