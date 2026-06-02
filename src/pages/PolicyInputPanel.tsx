/**
 * PolicyInputPanel — Shows policy input frames (observations) alongside BT tree.
 *
 * Displays:
 * - Latest policy observation vector (what the model "saw")
 * - Policy input tensor visualization
 * - Corresponding BT node that triggered the policy
 * - Timeline of recent policy invocations with observation snapshots
 *
 * This panel fulfills v2.2 checkbox 4: "/debug shows policy input frames
 * + action vector alongside BT."
 */

import { useMemo, useState } from 'react'
import type { TracerEvent } from '@/engine/tracer'
import type { PolicyResult } from '@/engine/policy'

// ─── Types ──────────────────────────────────────────────────────

interface PolicyObservation {
  /** Timestamp */
  t: number
  /** Blackboard fields extracted as observations */
  fields: Record<string, number>
  /** Source BT node name (if available) */
  sourceNode?: string
  /** Confidence of the policy result */
  confidence?: number
  /** Action vector returned */
  actionVector?: number[]
}

// ─── Component ──────────────────────────────────────────────────

interface PolicyInputPanelProps {
  policyResults: PolicyResult[]
  policyEvents: TracerEvent[]
  width?: number
  height?: number
}

export function PolicyInputPanel({
  policyResults,
  policyEvents,
  width = 600,
  height = 280,
}: PolicyInputPanelProps) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [showObservations, setShowObservations] = useState(true)
  const [showActions, setShowActions] = useState(true)

  // Build observation list from policy events
  const observations = useMemo((): PolicyObservation[] => {
    const result: PolicyObservation[] = []
    for (const evt of policyEvents) {
      if (!evt.payload || evt.type !== 'policy.invoke') continue
      const payload = evt.payload as Record<string, unknown>
      if (!payload.modelId) continue

      const fields: Record<string, number> = {}
      const obs = payload.observation as Record<string, unknown> | undefined
      if (obs) {
        for (const [key, val] of Object.entries(obs)) {
          if (typeof val === 'number') fields[key] = val
        }
      }

      // Find the source node from breadcrumb (last node.enter before this event)
      let sourceNode: string | undefined
      for (let i = policyEvents.length - 1; i >= 0; i--) {
        const prevEvt = policyEvents[i]
        if (prevEvt.t <= evt.t && prevEvt.type === 'node.enter') {
          sourceNode = prevEvt.label
          break
        }
      }

      result.push({
        t: evt.t,
        fields,
        sourceNode,
        confidence: (payload.confidence as number) ?? 0,
        actionVector: Array.isArray(payload.actionVector) ? payload.actionVector : undefined,
      })
    }
    return result
  }, [policyEvents])

  const latest = observations[selectedIdx] ?? observations[0]

  // Normalize fields for visualization
  const normalizedFields = useMemo(() => {
    if (!latest || Object.keys(latest.fields).length === 0) return []
    const entries = Object.entries(latest.fields)
    const values = entries.map(([, v]) => v)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1

    return entries.map(([key, val]) => ({
      key,
      value: val,
      normalized: (val - min) / range,
    }))
  }, [latest])

  return (
    <div className="policy-input-panel">
      {/* Header */}
      <div className="policy-input-header">
        <span className="policy-input-title">📊 Policy Input Frames</span>
        <div className="policy-input-controls">
          <label className="policy-checkbox">
            <input
              type="checkbox"
              checked={showObservations}
              onChange={e => setShowObservations(e.target.checked)}
            />
            Observations
          </label>
          <label className="policy-checkbox">
            <input
              type="checkbox"
              checked={showActions}
              onChange={e => setShowActions(e.target.checked)}
            />
            Actions
          </label>
          <span className="policy-input-count">
            {observations.length} frame{observations.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="policy-input-body">
        {/* Observation visualization */}
        {showObservations && latest && (
          <div className="policy-input-section">
            <div className="policy-input-section-title">Observation Input</div>
            <div className="policy-input-grid">
              {normalizedFields.map(({ key, value, normalized }) => (
                <div key={key} className="policy-input-field">
                  <div className="policy-input-field-label">{key}</div>
                  <div className="policy-input-field-bar">
                    <div
                      className="policy-input-field-fill"
                      style={{
                        width: `${Math.abs(normalized) * 100}%`,
                        backgroundColor: normalized >= 0 ? '#3b82f6' : '#ef4444',
                        justifyContent: normalized >= 0 ? 'flex-end' : 'flex-start',
                      }}
                    />
                  </div>
                  <div className="policy-input-field-value">{value.toFixed(2)}</div>
                </div>
              ))}
            </div>
            {latest.sourceNode && (
              <div className="policy-input-source">
                Triggered by: <span className="policy-input-node">{latest.sourceNode}</span>
              </div>
            )}
          </div>
        )}

        {/* Action vector visualization */}
        {showActions && latest?.actionVector && (
          <div className="policy-input-section">
            <div className="policy-input-section-title">Action Output</div>
            <div className="policy-input-action-bars">
              {latest.actionVector.map((val, i) => {
                const absMax = Math.max(...(latest.actionVector.map(Math.abs) as number[]), 0.01)
                const norm = val / absMax
                return (
                  <div key={i} className="policy-input-action-bar">
                    <div className="policy-input-action-label">{i}</div>
                    <div className="policy-input-action-track">
                      <div
                        className="policy-input-action-fill"
                        style={{
                          width: `${Math.abs(norm) * 100}%`,
                          backgroundColor: val >= 0 ? '#22c55e' : '#ef4444',
                          justifyContent: val >= 0 ? 'flex-end' : 'flex-start',
                        }}
                      />
                    </div>
                    <div className="policy-input-action-value">{val.toFixed(3)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Confidence indicator */}
        {latest?.confidence !== undefined && (
          <div className="policy-input-confidence">
            <span className="policy-input-confidence-label">Confidence</span>
            <div className="policy-input-confidence-bar">
              <div
                className="policy-input-confidence-fill"
                style={{
                  width: `${latest.confidence * 100}%`,
                  backgroundColor: latest.confidence >= 0.7 ? '#22c55e' : '#f59e0b',
                }}
              />
            </div>
            <span className="policy-input-confidence-value">
              {(latest.confidence * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Frame selector */}
      {observations.length > 1 && (
        <div className="policy-input-selector">
          <span className="policy-input-selector-label">Frame</span>
          <input
            type="range"
            min={0}
            max={observations.length - 1}
            value={selectedIdx}
            onChange={e => setSelectedIdx(Number(e.target.value))}
            className="policy-input-range"
          />
          <span className="policy-input-selector-value">{selectedIdx + 1} / {observations.length}</span>
        </div>
      )}

      {/* Empty state */}
      {observations.length === 0 && (
        <div className="policy-input-empty">
          No policy invocations recorded yet. Start a behavior tree with a policy-enabled character.
        </div>
      )}
    </div>
  )
}
