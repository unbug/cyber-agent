import { describe, it, expect } from 'vitest'
import { analyzeTraceQuality, isTraceHealthy } from './trace-quality'
import type { TracerEvent, TracerEventType } from '@/engine/tracer'

function evt(
  t: number,
  type: TracerEventType,
  label: string = type,
  payload?: Record<string, unknown>,
): TracerEvent {
  return { t, type, label, payload }
}

/** Healthy synthetic trace: steady 20ms ticks, actions, perception, adapter acks */
function healthyTrace(ticks = 30): TracerEvent[] {
  const events: TracerEvent[] = []
  for (let i = 0; i < ticks; i++) {
    const t = i * 20
    events.push(evt(t, 'tick.start', `tick ${i}`))
    events.push(evt(t + 1, 'perception', 'sonar', { distance: 42 }))
    events.push(evt(t + 2, 'node.enter', 'Root'))
    events.push(evt(t + 3, 'action.dispatch', 'move_forward'))
    events.push(evt(t + 5, 'adapter.tx', 'move'))
    events.push(evt(t + 8, 'adapter.rx', 'ack'))
    events.push(evt(t + 9, 'node.exit', 'Root'))
  }
  return events
}

describe('analyzeTraceQuality', () => {
  it('returns zeroed report for empty input', () => {
    const r = analyzeTraceQuality([])
    expect(r.totalEvents).toBe(0)
    expect(r.tickCount).toBe(0)
    expect(r.avgTickIntervalMs).toBe(0)
    expect(r.healthScore).toBeGreaterThanOrEqual(0)
  })

  it('counts ticks and computes tick intervals', () => {
    const r = analyzeTraceQuality(healthyTrace(10))
    expect(r.tickCount).toBe(10)
    expect(r.avgTickIntervalMs).toBe(20)
    expect(r.medianTickIntervalMs).toBe(20)
    expect(r.maxTickIntervalMs).toBe(20)
  })

  it('detects slow ticks (>50ms gap)', () => {
    const withGap: TracerEvent[] = []
    for (let i = 0; i < 10; i++) {
      const offset = i >= 6 ? 200 : 0
      const t = i * 20 + offset
      withGap.push(evt(t, 'tick.start', `tick ${i}`))
      withGap.push(evt(t + 3, 'action.dispatch', 'move_forward'))
    }
    const r = analyzeTraceQuality(withGap)
    expect(r.slowTicks.length).toBeGreaterThanOrEqual(1)
    expect(r.maxTickIntervalMs).toBeGreaterThanOrEqual(200)
    expect(r.recommendations.join(' ')).toMatch(/tick gap/)
  })

  it('computes adapter tx/rx fail rate', () => {
    const events: TracerEvent[] = [
      evt(0, 'tick.start'),
      evt(1, 'adapter.tx'),
      evt(2, 'adapter.tx'),
      evt(3, 'adapter.tx'),
      evt(4, 'adapter.rx'),
    ]
    const r = analyzeTraceQuality(events)
    expect(r.adapterTxCount).toBe(3)
    expect(r.adapterRxCount).toBe(1)
    expect(r.adapterRxFailRate).toBeCloseTo(2 / 3, 2)
  })

  it('computes perception density per second', () => {
    const events = healthyTrace(50) // 49*20ms ≈ 0.98s, 50 perception events
    const r = analyzeTraceQuality(events)
    expect(r.perceptionEventsPerSec).toBeGreaterThan(40)
  })

  it('aggregates policy stats and average confidence', () => {
    const events: TracerEvent[] = [
      evt(0, 'tick.start'),
      evt(1, 'policy.invoke'),
      evt(2, 'policy.success', 'p', { confidence: 0.9 }),
      evt(10, 'tick.start'),
      evt(11, 'policy.invoke'),
      evt(12, 'policy.failure', 'p', { confidence: 0.3 }),
    ]
    const r = analyzeTraceQuality(events)
    expect(r.policyInvokeCount).toBe(2)
    expect(r.policySuccessCount).toBe(1)
    expect(r.policyFailureCount).toBe(1)
    expect(r.policyConfidenceAvg).toBeCloseTo(0.6, 2)
  })

  it('null confidence average when no confidence payloads', () => {
    const r = analyzeTraceQuality([evt(0, 'tick.start'), evt(1, 'policy.invoke')])
    expect(r.policyConfidenceAvg).toBeNull()
  })

  it('recommends action dispatch check when BT dispatches nothing', () => {
    const events: TracerEvent[] = []
    for (let i = 0; i < 20; i++) events.push(evt(i * 20, 'tick.start'))
    const r = analyzeTraceQuality(events)
    expect(r.recommendations.join(' ')).toMatch(/No action dispatches/)
    expect(r.recommendations.join(' ')).toContain('20 ticks')
  })

  it('collects error events', () => {
    const events = healthyTrace(10)
    events.push(evt(250, 'error', 'adapter timeout'))
    const r = analyzeTraceQuality(events)
    expect(r.errorEvents.length).toBe(1)
    expect(r.errorEvents[0]!.label).toBe('adapter timeout')
  })

  it('healthy trace scores high', () => {
    const r = analyzeTraceQuality(healthyTrace(50))
    expect(r.healthScore).toBeGreaterThanOrEqual(90)
    expect(isTraceHealthy(healthyTrace(50))).toBe(true)
  })

  it('trace with many errors scores lower and fails health check', () => {
    const events = healthyTrace(50)
    for (let i = 0; i < 60; i++) events.push(evt(1000 + i, 'error', 'boom'))
    expect(isTraceHealthy(events)).toBe(false)
  })
})

describe('isTraceHealthy', () => {
  it('empty events: no errors but zero score path still boolean', () => {
    expect(typeof isTraceHealthy([])).toBe('boolean')
  })

  it('healthy minimal trace passes', () => {
    expect(isTraceHealthy(healthyTrace(30))).toBe(true)
  })
})
