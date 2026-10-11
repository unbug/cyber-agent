/**
 * Trace Quality Analyzer
 *
 * Analyzes tracer event streams to identify coverage gaps,
 * performance issues, and structural problems — without needing
 * real hardware.
 *
 * Use cases:
 * - "Why did my robot freeze?" → check tick rate drops
 * - "Is perception working?" → check perception event density
 * - "Are adapter commands reaching the robot?" → check tx/rx ratio
 * - "Is the BT making decisions?" → check action dispatch frequency
 */

import type { TracerEvent } from '@/engine/tracer'

// ─── Types ──────────────────────────────────────────────────────

export interface TickGap {
  /** Index of the tick.start event that started this gap */
  tickIndex: number
  /** Timestamp of the first tick */
  startMs: number
  /** Timestamp of the next tick */
  endMs: number
  /** Gap duration in ms */
  durationMs: number
  /** Events between ticks (non-tick events) */
  interveningEvents: TracerEvent[]
}

export interface EventDensity {
  eventType: string
  count: number
  percentage: number
}

export interface TickCoverage {
  tickIndex: number
  hasAdapterTx: boolean
  hasAdapterRx: boolean
  hasPerception: boolean
  hasPolicy: boolean
  hasAction: boolean
  eventCount: number
}

export interface TraceQualityReport {
  /** Total events analyzed */
  totalEvents: number
  /** Number of ticks observed */
  tickCount: number
  /** Average tick interval in ms */
  avgTickIntervalMs: number
  /** Median tick interval in ms */
  medianTickIntervalMs: number
  /** Max tick interval (freeze indicator) */
  maxTickIntervalMs: number
  /** Ticks with >50ms gap (potential freeze) */
  slowTicks: TickGap[]
  /** Event type distribution */
  eventDistribution: EventDensity[]
  /** Per-tick coverage analysis */
  tickCoverage: TickCoverage[]
  /** Adapter tx/rx ratio */
  adapterTxCount: number
  adapterRxCount: number
  adapterRxFailRate: number // unacknowledged tx / tx — high = commands not reaching hardware
  /** Perception event density per second */
  perceptionEventsPerSec: number
  /** Policy invocation count and success rate */
  policyInvokeCount: number
  policySuccessCount: number
  policyFailureCount: number
  policyConfidenceAvg: number | null
  /** Error events with context */
  errorEvents: TracerEvent[]
  /** Overall health score (0-100) */
  healthScore: number
  /** Recommendations for improvement */
  recommendations: string[]
}

// ─── Analysis Functions ─────────────────────────────────────────

/**
 * Analyze a trace event stream and produce a quality report.
 */
export function analyzeTraceQuality(events: TracerEvent[]): TraceQualityReport {
  const totalEvents = events.length

  // Extract tick timestamps
  const tickIndices: number[] = []
  for (let i = 0; i < events.length; i++) {
    if (events[i]!.type === 'tick.start') {
      tickIndices.push(i)
    }
  }

  const tickCount = tickIndices.length

  // Calculate tick intervals
  const intervals: number[] = []
  for (let i = 1; i < tickIndices.length; i++) {
    const prevT = events[tickIndices[i - 1]!]!.t
    const currT = events[tickIndices[i]!]!.t
    intervals.push(currT - prevT)
  }

  const avgTickIntervalMs = intervals.length > 0
    ? intervals.reduce((a, b) => a + b, 0) / intervals.length
    : 0

  // Median calculation
  const sortedIntervals = [...intervals].sort((a, b) => a - b)
  const medianTickIntervalMs = sortedIntervals.length > 0
    ? (sortedIntervals[Math.floor(sortedIntervals.length / 2)] ?? 0)
    : 0

  const maxTickIntervalMs = sortedIntervals.length > 0
    ? (sortedIntervals[sortedIntervals.length - 1] ?? 0)
    : 0

  // Find slow ticks (>50ms gap)
  const slowTicks: TickGap[] = []
  for (let i = 1; i < tickIndices.length; i++) {
    const prevIdx = tickIndices[i - 1]!
    const currIdx = tickIndices[i]!
    const durationMs = events[currIdx]!.t - events[prevIdx]!.t

    if (durationMs > 50) {
      slowTicks.push({
        tickIndex: prevIdx,
        startMs: events[prevIdx]!.t,
        endMs: events[currIdx]!.t,
        durationMs,
        interveningEvents: events.slice(prevIdx + 1, currIdx),
      })
    }
  }

  // Event type distribution
  const typeCounts = new Map<string, number>()
  for (const evt of events) {
    const baseType = evt.type.split('.')[0]!
    typeCounts.set(baseType, (typeCounts.get(baseType) ?? 0) + 1)
  }

  const eventDistribution: EventDensity[] = Array.from(typeCounts.entries())
    .map(([eventType, count]) => ({
      eventType,
      count,
      percentage: totalEvents > 0 ? (count / totalEvents * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // Per-tick coverage analysis
  const tickCoverage: TickCoverage[] = []
  for (let i = 0; i < tickIndices.length; i++) {
    const tickIdx = tickIndices[i]!
    const nextTickIdx = i + 1 < tickIndices.length ? tickIndices[i + 1]! : events.length

    let hasAdapterTx = false
    let hasAdapterRx = false
    let hasPerception = false
    let hasPolicy = false
    let hasAction = false
    let eventCount = 0

    for (let j = tickIdx; j < nextTickIdx && j < events.length; j++) {
      const evt = events[j]!
      eventCount++
      switch (evt.type) {
        case 'adapter.tx': hasAdapterTx = true; break
        case 'adapter.rx': hasAdapterRx = true; break
        case 'perception': hasPerception = true; break
        case 'policy.invoke': hasPolicy = true; break
        case 'action.dispatch': hasAction = true; break
      }
    }

    tickCoverage.push({
      tickIndex: tickIdx,
      hasAdapterTx,
      hasAdapterRx,
      hasPerception,
      hasPolicy,
      hasAction,
      eventCount,
    })
  }

  // Adapter tx/rx analysis — unacknowledged command rate
  const adapterTxCount = events.filter(e => e.type === 'adapter.tx').length
  const adapterRxCount = events.filter(e => e.type === 'adapter.rx').length
  const totalAdapterEvents = adapterTxCount + adapterRxCount
  const adapterRxFailRate = adapterTxCount > 0
    ? Math.max(0, adapterTxCount - adapterRxCount) / adapterTxCount
    : 0

  // Perception density
  const perceptionEvents = events.filter(e => e.type === 'perception')
  const timeSpanSec = tickCount > 1 && events.length > 1
    ? (events[events.length - 1]!.t - events[0]!.t) / 1000
    : 1
  const perceptionEventsPerSec = perceptionEvents.length / Math.max(timeSpanSec, 0.001)

  // Policy analysis
  const policyInvokeCount = events.filter(e => e.type === 'policy.invoke').length
  const policySuccessCount = events.filter(e => e.type === 'policy.success').length
  const policyFailureCount = events.filter(e => e.type === 'policy.failure').length

  let policyConfidenceAvg: number | null = null
  if (events.length > 0) {
    const confidenceValues: number[] = []
    for (const evt of events) {
      if ((evt.type === 'policy.success' || evt.type === 'policy.failure' || evt.type === 'policy.invoke') && evt.payload) {
        const conf = (evt.payload as Record<string, unknown>).confidence as number | undefined
        if (typeof conf === 'number') confidenceValues.push(conf)
      }
    }
    policyConfidenceAvg = confidenceValues.length > 0
      ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
      : null
  }

  // Error events
  const errorEvents = events.filter(e => e.type === 'error')

  // ─── Health Score Calculation ──────────────────────────────

  let healthScore = 100
  const recommendations: string[] = []

  // Penalize for slow ticks (freeze indicators)
  if (slowTicks.length > 0) {
    const penalty = Math.min(30, slowTicks.length * 5)
    healthScore -= penalty
    recommendations.push(
      `⚠️ ${slowTicks.length} tick gap(s) >50ms detected — check for blocking operations or GC pauses`,
    )
  }

  // Penalize for high adapter failure rate
  if (adapterRxFailRate > 0.3 && totalAdapterEvents > 0) {
    const penalty = Math.min(25, Math.round(adapterRxFailRate * 40))
    healthScore -= penalty
    recommendations.push(
      `⚠️ Adapter RX failure rate ${Math.round(adapterRxFailRate * 100)}% — commands may not reach hardware`,
    )
  }

  // Penalize for no perception events in long traces
  if (timeSpanSec > 5 && perceptionEventsPerSec < 0.1) {
    healthScore -= 10
    recommendations.push(
      '💡 Very low perception event density — verify sensor adapters are connected',
    )
  }

  // Penalize for no action dispatches (BT not making decisions)
  const actionCount = events.filter(e => e.type === 'action.dispatch').length
  if (tickCount > 10 && actionCount === 0) {
    healthScore -= 20
    recommendations.push(
      `⚠️ No action dispatches in ${tickCount} ticks — BT may be stuck in conditions or waiting`,
    )
  }

  // Penalize for high error rate
  if (totalEvents > 100) {
    const errorRate = errorEvents.length / totalEvents
    if (errorRate > 0.05) {
      healthScore -= Math.min(20, Math.round(errorRate * 100))
      recommendations.push(
        `⚠️ Error rate ${Math.round(errorRate * 100)}% — review error events for root cause`,
      )
    }
  }

  // Penalize for no adapter events (sim-only)
  if (totalAdapterEvents === 0 && totalEvents > 50) {
    healthScore -= 10
    recommendations.push(
      'ℹ️ No adapter events — running in simulation mode; connect hardware for full validation',
    )
  }

  // Bonus: good policy confidence
  if (policyConfidenceAvg !== null && policyConfidenceAvg > 0.8) {
    healthScore += 5
    recommendations.push(
      `✅ Policy confidence avg ${Math.round(policyConfidenceAvg * 100)}% — VLA model performing well`,
    )
  }

  // Clamp score
  healthScore = Math.max(0, Math.min(100, healthScore))

  return {
    totalEvents,
    tickCount,
    avgTickIntervalMs: Math.round(avgTickIntervalMs * 10) / 10,
    medianTickIntervalMs: Math.round(medianTickIntervalMs * 10) / 10,
    maxTickIntervalMs: Math.round(maxTickIntervalMs * 10) / 10,
    slowTicks,
    eventDistribution,
    tickCoverage,
    adapterTxCount,
    adapterRxCount,
    adapterRxFailRate: Math.round(adapterRxFailRate * 1000) / 1000,
    perceptionEventsPerSec: Math.round(perceptionEventsPerSec * 100) / 100,
    policyInvokeCount,
    policySuccessCount,
    policyFailureCount,
    policyConfidenceAvg: policyConfidenceAvg !== null ? Math.round(policyConfidenceAvg * 1000) / 1000 : null,
    errorEvents,
    healthScore,
    recommendations,
  }
}

/**
 * Quick health check — returns true if trace looks healthy.
 */
export function isTraceHealthy(events: TracerEvent[]): boolean {
  const report = analyzeTraceQuality(events)
  return report.healthScore >= 70 && report.errorEvents.length === 0
}
