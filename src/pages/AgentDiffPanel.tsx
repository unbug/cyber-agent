/**
 * AgentDiffPanel — compares blackboard states across agents.
 *
 * Shows:
 *   - Side-by-side blackboard fields for each agent
 *   - Diff highlighting (added, removed, changed values)
 *   - Per-agent summary stats
 */

import { useMemo } from 'react'
import type { AgentDebugState } from '@/hooks/useMultiAgentDebug'

interface AgentDiffPanelProps {
  agents: AgentDebugState[]
}

interface FieldDiff {
  field: string
  values: Map<string, { value: unknown; changed: boolean }>
}

function computeDiffs(agents: AgentDebugState[]): FieldDiff[] {
  const fieldMap = new Map<string, Map<string, { value: unknown; changed: boolean }>>()

  for (const agent of agents) {
    const bb = agent.currentBlackboard
    if (!bb) continue

    for (const [key, value] of Object.entries(bb)) {
      if (key.startsWith('_') || key === 'pointerX' || key === 'pointerY' ||
          key === 'pointerActive' || key === 'canvasWidth' || key === 'canvasHeight') continue

      if (!fieldMap.has(key)) {
        fieldMap.set(key, new Map())
      }
      fieldMap.get(key)!.set(agent.agentId, { value, changed: false })
    }
  }

  // Mark changed fields
  const results: FieldDiff[] = []
  for (const [field, agentValues] of fieldMap) {
    const values = new Map<string, { value: unknown; changed: boolean }>()
    let hasDiff = false

    const arr = Array.from(agentValues.entries())
    for (let i = 0; i < arr.length; i++) {
      const [agentId, { value }] = arr[i]!
      let changed = false
      for (let j = i + 1; j < arr.length; j++) {
        const [, { value: otherValue }] = arr[j]!
        if (value !== otherValue) {
          changed = true
          hasDiff = true
        }
      }
      values.set(agentId, { value, changed })
    }

    if (hasDiff) {
      results.push({ field, values })
    }
  }

  return results.sort((a, b) => a.field.localeCompare(b.field))
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return String(val)
  if (typeof val === 'boolean') return val ? 'true' : 'false'
  if (typeof val === 'number') return val.toFixed(2)
  if (typeof val === 'string') return val.length > 30 ? val.slice(0, 30) + '…' : val
  if (typeof val === 'object') {
    try { return JSON.stringify(val).slice(0, 40) } catch { return '[object]' }
  }
  return String(val)
}

const AGENT_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899']

export function AgentDiffPanel({ agents }: AgentDiffPanelProps) {
  const diffs = useMemo(() => computeDiffs(agents), [agents])

  if (agents.length === 0) {
    return (
      <div style={{
        padding: 'var(--space-3)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        minHeight: '150px',
      }}>
        <span style={{ fontSize: '2rem', opacity: 0.5 }}>🔍</span>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
          No agents to compare.
        </p>
      </div>
    )
  }

  if (diffs.length === 0) {
    return (
      <div style={{
        padding: 'var(--space-3)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
      }}>
        <span style={{ fontSize: '1.5rem' }}>✅</span>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
          All agents have identical blackboards.
        </p>
      </div>
    )
  }

  return (
    <div style={{
      padding: 'var(--space-3)',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'auto',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-2)',
      }}>
        <span style={{ fontSize: '1rem' }}>🔍</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Agent Blackboard Diff
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
          {diffs.length} differing field{diffs.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Agent legend */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-3)',
        paddingBottom: 'var(--space-2)',
        borderBottom: '1px solid var(--border)',
      }}>
        {agents.map((agent, idx) => (
          <span key={agent.agentId} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.7rem',
            color: AGENT_COLORS[idx % AGENT_COLORS.length],
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: AGENT_COLORS[idx % AGENT_COLORS.length],
            }} />
            agent-{agent.agentId.slice(-4)}
            <span style={{ color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
              ({agent.eventCount}evt)
            </span>
          </span>
        ))}
      </div>

      {/* Diff table */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)',
      }}>
        {diffs.map(diff => (
          <div key={diff.field} style={{
            display: 'grid',
            gridTemplateColumns: `100px repeat(${agents.length}, 1fr)`,
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.7rem',
            fontFamily: 'monospace',
          }}
          >
            <div style={{
              color: 'var(--text-primary)',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {diff.field}
            </div>
            {agents.map((agent) => {
              const cell = diff.values.get(agent.agentId)
              const color = AGENT_COLORS[agents.indexOf(agent) % AGENT_COLORS.length]
              return (
                <div key={agent.agentId} style={{
                  color: cell?.changed ? color : 'var(--text-tertiary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {cell ? formatValue(cell.value) : '—'}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
