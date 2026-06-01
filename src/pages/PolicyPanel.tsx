/**
 * PolicyPanel — Debug panel for VLA / diffusion policy events (v2.2).
 *
 * Displays:
 * - Policy invocation history (model, confidence, latency, action vector)
 * - Action vector visualization as a bar chart
 * - Confidence timeline sparkline
 * - Filtering by model ID
 */

import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { tracer, type TracerEvent, type PolicyEvent } from '@/engine/tracer'
import type { PolicyConfig, PolicyResult } from '@/engine/policy'

// ─── Types ──────────────────────────────────────────────────────

interface PolicyPanelData {
  invocations: PolicyEvent[]
  configs: Map<string, PolicyConfig>
  totalInvocations: number
  avgConfidence: number
  avgLatency: number
  successRate: number
  latestResult: PolicyResult | null
}

// ─── Component ──────────────────────────────────────────────────

interface PolicyPanelProps {
  width?: number
  height?: number
}

export function PolicyPanel({ width = 800, height = 300 }: PolicyPanelProps) {
  const [data, setData] = useState<PolicyPanelData>({
    invocations: [],
    configs: new Map(),
    totalInvocations: 0,
    avgConfidence: 0,
    avgLatency: 0,
    successRate: 0,
    latestResult: null,
  })
  const [filterModel, setFilterModel] = useState<string>('')
  const [showActions, setShowActions] = useState(true)
  const [showConfidence, setShowConfidence] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Subscribe to policy events
  useEffect(() => {
    const unsub = tracer.subscribe((event: TracerEvent) => {
      if (!['policy.invoke', 'policy.success', 'policy.failure', 'policy.low_confidence'].includes(event.type)) {
        return
      }

      const payload = event.payload as Record<string, unknown> | undefined
      const modelId = (payload?.modelId as string) ?? event.label
      const actionVector = Array.isArray(payload?.actionVector) ? payload.actionVector as number[] : null
      const confidence = typeof payload?.confidence === 'number' ? payload.confidence : 0
      const latencyMs = typeof payload?.latencyMs === 'number' ? payload.latencyMs : 0
      const error = payload?.error as string | undefined

      const policyEvent: PolicyEvent = {
        modelId,
        actionVector,
        confidence,
        latencyMs,
        error,
        timestamp: event.t,
      }

      setData(prev => {
        const invocations = [...prev.invocations, policyEvent]
        // Keep last 500 invocations
        const trimmed = invocations.length > 500 ? invocations.slice(-500) : invocations

        const successes = trimmed.filter(e => e.actionVector && e.confidence > 0).length
        const total = trimmed.length
        const avgConfidence = total > 0 ? trimmed.reduce((s, e) => s + e.confidence, 0) / total : 0
        const avgLatency = total > 0 ? trimmed.reduce((s, e) => s + e.latencyMs, 0) / total : 0

        return {
          invocations: trimmed,
          configs: prev.configs,
          totalInvocations: total,
          avgConfidence,
          avgLatency,
          successRate: total > 0 ? successes / total : 0,
          latestResult: actionVector
            ? {
                modelId,
                actionVector,
                confidence,
                latencyMs,
                timestamp: event.t,
              }
            : prev.latestResult,
        }
      })
    })

    return unsub
  }, [])

  // Render canvas visualization
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = width ?? 800
    const h = height ?? 300
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.scale(dpr, dpr)

    // Clear
    ctx.clearRect(0, 0, width, height)

    // Background
    ctx.fillStyle = 'var(--bg-surface, #1a1a2e)'
    ctx.fillRect(0, 0, width, height)

    const invocations = filterModel
      ? data.invocations.filter(e => e.modelId === filterModel)
      : data.invocations

    if (invocations.length === 0) {
      ctx.fillStyle = 'var(--text-tertiary, #6b7280)'
      ctx.font = '14px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('No policy events recorded yet', width / 2, height / 2)
      return
    }

    const padding = { top: 40, right: 20, bottom: 40, left: 60 }
    const chartW = w - padding.left - padding.right
    const chartH = h - padding.top - padding.bottom

    // Grid lines
    ctx.strokeStyle = 'var(--border, #2d2d44)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartH / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(padding.left + chartW, y)
      ctx.stroke()
    }

    // Y-axis labels (confidence 0-1)
    ctx.fillStyle = 'var(--text-tertiary, #6b7280)'
    ctx.font = '11px system-ui'
    ctx.textAlign = 'right'
    for (let i = 0; i <= 5; i++) {
      const val = 1 - i / 5
      const y = padding.top + (chartH / 5) * i
      ctx.fillText(val.toFixed(1), padding.left - 8, y + 4)
    }

    // Confidence sparkline
    if (showConfidence && invocations.length > 1) {
      ctx.beginPath()
      ctx.strokeStyle = '#8b5cf6'
      ctx.lineWidth = 2

      for (let i = 0; i < invocations.length; i++) {
        const evt = invocations[i]
        if (!evt) continue
        const x = padding.left + (i / (invocations.length - 1)) * chartW
        const y = padding.top + (1 - evt.confidence) * chartH
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      // Dots at each point
      for (let i = 0; i < invocations.length; i++) {
        const evt = invocations[i]
        if (!evt) continue
        const x = padding.left + (i / (invocations.length - 1)) * chartW
        const y = padding.top + (1 - evt.confidence) * chartH
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fillStyle = evt.confidence > 0.7 ? '#22c55e' : '#ef4444'
        ctx.fill()
      }
    }

    // Action vector bar chart (latest invocation)
    if (showActions && data.latestResult) {
      const actionVec = data.latestResult.actionVector
      const barWidth = Math.max(2, Math.min(20, chartW / actionVec.length - 2))
      const startX = padding.left + (chartW - actionVec.length * (barWidth + 2)) / 2
      const barBaseY = padding.top + chartH

      ctx.font = '10px system-ui'
      ctx.textAlign = 'center'

      for (let i = 0; i < actionVec.length; i++) {
        const val = actionVec[i] ?? 0
        const barH = Math.abs(val) * 50 // Scale for visibility
        const x = startX + i * (barWidth + 2)
        const y = val >= 0 ? barBaseY - barH : barBaseY

        ctx.fillStyle = val >= 0 ? '#3b82f688' : '#ef444488'
        ctx.fillRect(x, y, barWidth, barH)

        ctx.fillStyle = 'var(--text-secondary, #9ca3af)'
        ctx.fillText(i.toString(), x + barWidth / 2, barBaseY + 12)
      }
    }

    // Title
    ctx.fillStyle = 'var(--text-primary, #e5e7eb)'
    ctx.font = 'bold 12px system-ui'
    ctx.textAlign = 'left'
    ctx.fillText(`Policy Events (${invocations.length})`, padding.left, 16)

    // Legend
    if (showConfidence) {
      ctx.fillStyle = '#22c55e'
      ctx.fillRect(w - 100, 8, 8, 8)
      ctx.fillStyle = 'var(--text-tertiary, #6b7280)'
      ctx.font = '10px system-ui'
      ctx.textAlign = 'left'
      ctx.fillText('Confident', w - 88, 15)

      ctx.fillStyle = '#ef4444'
      ctx.fillRect(w - 100, 20, 8, 8)
      ctx.fillStyle = 'var(--text-tertiary, #6b7280)'
      ctx.fillText('Low conf.', w - 88, 27)
    }
  }, [data, width, height, filterModel, showConfidence, showActions])

  // Filtered invocations
  const filteredInvocations = useMemo(
    () =>
      filterModel
        ? data.invocations.filter(e => e.modelId === filterModel)
        : data.invocations,
    [data.invocations, filterModel],
  )

  // Unique model IDs
  const modelIds = useMemo(
    () => Array.from(new Set(data.invocations.map(e => e.modelId))),
    [data.invocations],
  )

  const handleClear = useCallback(() => {
    setData({
      invocations: [],
      configs: new Map(),
      totalInvocations: 0,
      avgConfidence: 0,
      avgLatency: 0,
      successRate: 0,
      latestResult: null,
    })
  }, [])

  return (
    <div className="policy-panel">
      {/* Header */}
      <div className="policy-panel-header">
        <span className="policy-panel-title">🤖 Policy Inference</span>
        <div className="policy-panel-stats">
          <span className="policy-stat">
            <span className="policy-stat-label">Events</span>
            <span className="policy-stat-value">{data.totalInvocations}</span>
          </span>
          <span className="policy-stat">
            <span className="policy-stat-label">Avg Confidence</span>
            <span className="policy-stat-value">{(data.avgConfidence * 100).toFixed(1)}%</span>
          </span>
          <span className="policy-stat">
            <span className="policy-stat-label">Avg Latency</span>
            <span className="policy-stat-value">{data.avgLatency.toFixed(1)} ms</span>
          </span>
          <span className="policy-stat">
            <span className="policy-stat-label">Success Rate</span>
            <span className={`policy-stat-value ${data.successRate >= 0.8 ? '' : 'policy-stat-warning'}`}>
              {(data.successRate * 100).toFixed(1)}%
            </span>
          </span>
        </div>
        <div className="policy-panel-controls">
          <select
            className="policy-select"
            value={filterModel}
            onChange={e => setFilterModel(e.target.value)}
          >
            <option value="">All Models</option>
            {modelIds.map(id => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <label className="policy-checkbox">
            <input
              type="checkbox"
              checked={showConfidence}
              onChange={e => setShowConfidence(e.target.checked)}
            />
            Confidence
          </label>
          <label className="policy-checkbox">
            <input
              type="checkbox"
              checked={showActions}
              onChange={e => setShowActions(e.target.checked)}
            />
            Actions
          </label>
          <button className="policy-btn policy-btn-clear" onClick={handleClear}>
            Clear
          </button>
        </div>
      </div>

      {/* Canvas visualization */}
      <canvas ref={canvasRef} className="policy-canvas" />

      {/* Latest result detail */}
      {data.latestResult && (
        <div className="policy-latest">
          <div className="policy-latest-header">Latest Result</div>
          <div className="policy-latest-grid">
            <div className="policy-latest-item">
              <span className="policy-latest-label">Model</span>
              <span className="policy-latest-value">{data.latestResult.modelId}</span>
            </div>
            <div className="policy-latest-item">
              <span className="policy-latest-label">Confidence</span>
              <span className={`policy-latest-value ${data.latestResult.confidence >= 0.7 ? 'policy-success' : 'policy-fail'}`}>
                {(data.latestResult.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="policy-latest-item">
              <span className="policy-latest-label">Latency</span>
              <span className="policy-latest-value">{data.latestResult.latencyMs.toFixed(1)} ms</span>
            </div>
            <div className="policy-latest-item">
              <span className="policy-latest-label">Action Vector</span>
              <span className="policy-latest-value policy-action-vector">
                [{data.latestResult.actionVector.map(v => v.toFixed(2)).join(', ')}]
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Event log */}
      {filteredInvocations.length > 0 && (
        <div className="policy-event-log">
          <div className="policy-event-log-header">Event Log (last {filteredInvocations.length})</div>
          <div className="policy-event-log-rows">
            {filteredInvocations.slice(-50).reverse().map((evt, i) => (
              <div
                key={i}
                className={`policy-event-row ${evt.actionVector && evt.confidence > 0 ? 'policy-event-success' : 'policy-event-fail'}`}
              >
                <span className="policy-event-time">{evt.timestamp.toFixed(0)}ms</span>
                <span className="policy-event-model">{evt.modelId}</span>
                <span className="policy-event-confidence">
                  {(evt.confidence * 100).toFixed(1)}%
                </span>
                <span className="policy-event-latency">{evt.latencyMs.toFixed(1)}ms</span>
                {evt.error && <span className="policy-event-error">{evt.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
