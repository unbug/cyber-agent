/**
 * v2.0 — DomainRandomizationPanel component tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DomainRandomizationPanel } from './DomainRandomizationPanel'
import { DEFAULT_RANDOMIZATION } from '@/sim/types'

describe('DomainRandomizationPanel', () => {
  const baseRandomization = {
    mass: { ...DEFAULT_RANDOMIZATION.mass, current: 1.0 },
    friction: { ...DEFAULT_RANDOMIZATION.friction, current: 0.0 },
    latency: { ...DEFAULT_RANDOMIZATION.latency, current: 0 },
    sensorNoise: { ...DEFAULT_RANDOMIZATION.sensorNoise, current: 0 },
  }

  it('renders all four slider labels', () => {
    render(
      <DomainRandomizationPanel
        randomization={baseRandomization}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    )
    expect(screen.getByText('Mass')).toBeInTheDocument()
    expect(screen.getByText('Friction')).toBeInTheDocument()
    expect(screen.getByText('Latency')).toBeInTheDocument()
    expect(screen.getByText('Sensor Noise')).toBeInTheDocument()
  })

  it('renders reset button', () => {
    render(
      <DomainRandomizationPanel
        randomization={baseRandomization}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    )
    expect(screen.getByText('Reset')).toBeInTheDocument()
  })

  it('reset button is disabled when no randomization is active', () => {
    render(
      <DomainRandomizationPanel
        randomization={baseRandomization}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    )
    const resetBtn = screen.getByText('Reset')
    expect(resetBtn).toBeDisabled()
  })

  it('reset button is enabled when randomization is active', () => {
    const randomized = {
      mass: { ...DEFAULT_RANDOMIZATION.mass, current: 1.5 },
      friction: { ...DEFAULT_RANDOMIZATION.friction, current: 0.0 },
      latency: { ...DEFAULT_RANDOMIZATION.latency, current: 0 },
      sensorNoise: { ...DEFAULT_RANDOMIZATION.sensorNoise, current: 0 },
    }
    render(
      <DomainRandomizationPanel
        randomization={randomized}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    )
    const resetBtn = screen.getByText('Reset')
    expect(resetBtn).toBeEnabled()
  })

  it('shows warning when randomization is active', () => {
    const randomized = {
      mass: { ...DEFAULT_RANDOMIZATION.mass, current: 1.5 },
      friction: { ...DEFAULT_RANDOMIZATION.friction, current: 0.0 },
      latency: { ...DEFAULT_RANDOMIZATION.latency, current: 0 },
      sensorNoise: { ...DEFAULT_RANDOMIZATION.sensorNoise, current: 0 },
    }
    render(
      <DomainRandomizationPanel
        randomization={randomized}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    )
    expect(
      screen.getByText('⚠ Randomization active — sim→real gap will be measurable'),
    ).toBeInTheDocument()
  })

  it('does not show warning when all defaults', () => {
    render(
      <DomainRandomizationPanel
        randomization={baseRandomization}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    )
    expect(
      screen.queryByText('⚠ Randomization active — sim→real gap will be measurable'),
    ).not.toBeInTheDocument()
  })

  it('calls onChange when slider changes', () => {
    const onChange = vi.fn()
    render(
      <DomainRandomizationPanel
        randomization={baseRandomization}
        onChange={onChange}
        onReset={vi.fn()}
      />,
    )
    const sliders = screen.getAllByRole('slider')
    fireEvent.input(sliders[0]!, { target: { value: '1.5' } })
    expect(onChange).toHaveBeenCalled()
  })

  it('calls onReset when reset button is clicked', () => {
    const onReset = vi.fn()
    const randomized = {
      mass: { ...DEFAULT_RANDOMIZATION.mass, current: 1.5 },
      friction: { ...DEFAULT_RANDOMIZATION.friction, current: 0.0 },
      latency: { ...DEFAULT_RANDOMIZATION.latency, current: 0 },
      sensorNoise: { ...DEFAULT_RANDOMIZATION.sensorNoise, current: 0 },
    }
    render(
      <DomainRandomizationPanel
        randomization={randomized}
        onChange={vi.fn()}
        onReset={onReset}
      />,
    )
    fireEvent.click(screen.getByText('Reset'))
    expect(onReset).toHaveBeenCalled()
  })
})
