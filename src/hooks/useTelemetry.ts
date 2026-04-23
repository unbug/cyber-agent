/**
 * useTelemetry — Track behavior tree snapshots for the telemetry dashboard.
 *
 * Maintains a rolling window of snapshots with timestamps, exposing
 * emotion history, energy levels, position data, and TPS trends.
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import type { RunnerSnapshot } from '../engine'

const MAX_HISTORY = 120 // ~12 seconds at 10 FPS

export interface TelemetrySnapshot {
  emotion: string
  energy: number
  x: number
  y: number
  excitement: number
  timestamp: number
}

export interface TelemetryData {
  history: TelemetrySnapshot[]
  currentEmotion: string
  currentEnergy: number
  currentX: number
  currentY: number
  currentExcitement: number
  currentTPS: number
  avgTPS: number
  minTPS: number
  maxTPS: number
  emotionHistory: { emotion: string; timestamp: number }[]
  energyHistory: { energy: number; timestamp: number }[]
  positionHistory: { x: number; y: number; timestamp: number }[]
  tpsHistory: { tps: number; timestamp: number }[]
}

export function useTelemetry(): {
  data: TelemetryData | null
  isActive: boolean
  reset: () => void
  addSnapshot: (snap: RunnerSnapshot | null) => void
} {
  const [history, setHistory] = useState<TelemetrySnapshot[]>([])
  const [isActive, setIsActive] = useState(false)
  const tpsRef = useRef<number[]>([])

  const addSnapshot = useCallback((snap: RunnerSnapshot | null) => {
    if (!snap || !snap.blackboard) return
    setIsActive(true)

    const entry: TelemetrySnapshot = {
      emotion: snap.blackboard.emotion ?? 'neutral',
      energy: snap.blackboard.energy ?? 1,
      x: snap.blackboard.x ?? 0,
      y: snap.blackboard.y ?? 0,
      excitement: snap.blackboard.excitement ?? 0,
      timestamp: Date.now(),
    }

    setHistory((prev) => {
      const next = [...prev, entry]
      return next.slice(-MAX_HISTORY)
    })

    tpsRef.current.push(snap.ticksPerSecond)
    if (tpsRef.current.length > MAX_HISTORY) {
      tpsRef.current = tpsRef.current.slice(-MAX_HISTORY)
    }
  }, [])

  const reset = useCallback(() => {
    setHistory([])
    setIsActive(false)
    tpsRef.current = []
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setHistory([])
      setIsActive(false)
    }
  }, [])

  const data: TelemetryData | null = history.length > 0 ? (() => {
    const tpsArr = tpsRef.current.length > 0 ? tpsRef.current : [0]
    const avgTPS = Math.round(tpsArr.reduce((a, b) => a + b, 0) / tpsArr.length * 10) / 10
    const minTPS = Math.round(Math.min(...tpsArr) * 10) / 10
    const maxTPS = Math.round(Math.max(...tpsArr) * 10) / 10

    return {
      history,
      currentEmotion: history[history.length - 1]?.emotion ?? 'neutral',
      currentEnergy: history[history.length - 1]?.energy ?? 1,
      currentX: history[history.length - 1]?.x ?? 0,
      currentY: history[history.length - 1]?.y ?? 0,
      currentExcitement: history[history.length - 1]?.excitement ?? 0,
      currentTPS: tpsArr[tpsArr.length - 1] ?? 0,
      avgTPS,
      minTPS,
      maxTPS,
      emotionHistory: history.map((h) => ({ emotion: h.emotion, timestamp: h.timestamp })),
      energyHistory: history.map((h) => ({ energy: h.energy, timestamp: h.timestamp })),
      positionHistory: history.map((h) => ({ x: h.x, y: h.y, timestamp: h.timestamp })),
      tpsHistory: history.map((h, i) => ({
        tps: tpsArr[i] ?? 0,
        timestamp: h.timestamp,
      })),
    }
  })() : null

  return { data, isActive, reset, addSnapshot }
}
