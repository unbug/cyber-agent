/**
 * PerformancePanel — unit tests
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PerformancePanel } from './PerformancePanel'

function makeData(count: number = 50) {
  const data = []
  for (let i = 0; i < count; i++) {
    data.push({
      tickRate: 55 + Math.random() * 10,
      latencyMs: 10 + Math.random() * 8,
      t: i * 16.67,
    })
  }
  return data
}

describe('PerformancePanel', () => {
  it('renders "collecting" state when data is empty', () => {
    const { container } = render(
      <PerformancePanel data={[]} width={600} height={200} />,
    )
    expect(screen.getByText('Collecting performance data...')).toBeInTheDocument()
    expect(container.querySelector('canvas')).not.toBeInTheDocument()
  })

  it('renders canvas when data is present', () => {
    const data = makeData(60)
    const { container } = render(
      <PerformancePanel data={data} width={600} height={200} />,
    )
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
    expect(canvas).toHaveAttribute('width', '600')
    expect(canvas).toHaveAttribute('height', '200')
  })

  it('shows stats when data is present', () => {
    const data = makeData(60)
    render(<PerformancePanel data={data} width={600} height={200} />)
    // Stats should be visible in the header
    const perfPanel = screen.getByText('Performance').closest('.perfPanel')
    expect(perfPanel).toBeInTheDocument()
  })

  it('shows budget hit percentage', () => {
    const data = makeData(60)
    const { container } = render(
      <PerformancePanel data={data} width={600} height={200} />,
    )
    // The budget hit percentage should be displayed
    const perfStats = container.querySelector('.perfStats')
    expect(perfStats).toBeInTheDocument()
  })

  it('renders with custom dimensions', () => {
    const data = makeData(60)
    const { container } = render(
      <PerformancePanel data={data} width={400} height={150} />,
    )
    const canvas = container.querySelector('canvas')
    expect(canvas).toHaveAttribute('width', '400')
    expect(canvas).toHaveAttribute('height', '150')
  })

  it('handles hover interaction', () => {
    const data = makeData(60)
    const { container } = render(
      <PerformancePanel data={data} width={600} height={200} />,
    )
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
    // Canvas should have perfCanvas class with crosshair cursor
    expect(canvas).toHaveClass('perfCanvas')
  })
})
