/**
 * TelemetryDashboard — Real-time visualization of behavior tree telemetry.
 *
 * Displays:
 * - Emotion sparkline (color-coded by emotion type)
 * - Energy bar with gradient
 * - Position heatmap (mini canvas trail)
 * - TPS trend sparkline
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TelemetryDashboard } from '@/components/TelemetryDashboard'
import type { TelemetryData } from '@/hooks/useTelemetry'

const mockData: TelemetryData = {
  history: [
    { emotion: 'happy', energy: 0.8, x: 100, y: 200, excitement: 0.5, timestamp: Date.now() - 5000 },
    { emotion: 'excited', energy: 0.7, x: 110, y: 190, excitement: 0.6, timestamp: Date.now() - 4000 },
    { emotion: 'calm', energy: 0.6, x: 120, y: 180, excitement: 0.4, timestamp: Date.now() - 3000 },
    { emotion: 'happy', energy: 0.5, x: 130, y: 170, excitement: 0.7, timestamp: Date.now() - 2000 },
    { emotion: 'neutral', energy: 0.4, x: 140, y: 160, excitement: 0.3, timestamp: Date.now() - 1000 },
  ],
  currentEmotion: 'neutral',
  currentEnergy: 0.4,
  currentX: 140,
  currentY: 160,
  currentExcitement: 0.3,
  currentTPS: 60,
  avgTPS: 58,
  minTPS: 55,
  maxTPS: 62,
  emotionHistory: [],
  energyHistory: [],
  positionHistory: [],
  tpsHistory: [],
}

describe('TelemetryDashboard', () => {
  it('shows empty state when no data', () => {
    render(<TelemetryDashboard data={null} />)
    expect(screen.getByText('Start the behavior tree to see telemetry')).toBeDefined()
  })

  it('renders dashboard with data', () => {
    render(<TelemetryDashboard data={mockData} />)
    expect(screen.getByText('Emotion')).toBeDefined()
    expect(screen.getByText('Energy')).toBeDefined()
    expect(screen.getByText('Excitement')).toBeDefined()
    expect(screen.getByText('Position')).toBeDefined()
    expect(screen.getByText('Performance')).toBeDefined()
    expect(screen.getByText('60 tps')).toBeDefined()
  })

  it('shows emotion icon and badge', () => {
    render(<TelemetryDashboard data={mockData} />)
    // The neutral emotion icon
    expect(screen.getByText('😐 neutral')).toBeDefined()
  })
})
