/**
 * Perception BT Primitives — nodes that bridge perception events to the
 * behavior tree.
 *
 * Conditions:
 *   perceive.face      — true if a face was seen within N ms ago
 *   perceive.object    — true if an object of class was seen within N ms ago
 *   perceive.word      — true if a keyword was heard within N ms ago
 *   perceive.sound     — true if a sound of type was heard within N ms ago
 *   perceive.near      — true if something is within N cm
 *   perceive.bump      — true if a bump was detected within N ms ago
 *
 * Actions:
 *   memorize           — store the latest perception event to blackboard
 *   memorize.face      — store face data to blackboard
 *   memorize.object    — store object data to blackboard
 *   memorize.word      — store word data to blackboard
 */

import { registerCondition, registerAction } from '../engine/executor'
import type { Blackboard } from '../engine/types'
import type { PerceptionBus } from './bus'

// ─── Helpers ───────────────────────────────────────────────────────

function getPerceptionBus(_bb: Blackboard): PerceptionBus {
  return _bb.perceptionBus as PerceptionBus
}

function isRecent(_bb: Blackboard, event: unknown, windowMs: number): boolean {
  if (!event) return false
  const evt = event as { timestamp: number }
  return performance.now() - evt.timestamp < windowMs
}

// ─── Conditions ────────────────────────────────────────────────────

registerCondition('perceive.face', (bb, args) => {
  const windowMs = (args?.within as number) ?? 500
  const lastFace = (bb.lastFace as { timestamp: number } | null) ?? null
  return isRecent(bb, lastFace, windowMs)
})

registerCondition('perceive.object', (bb, args) => {
  const className = args?.class as string
  const windowMs = (args?.within as number) ?? 500
  const objects = (bb.lastObjects as Array<{ category: string; timestamp: number; class?: string }>) ?? []
  return objects.some(
    (o) => o.category === 'see.object' && o.class === className && isRecent(bb, o, windowMs),
  )
})

registerCondition('perceive.word', (bb, args) => {
  const keyword = args?.keyword as string
  const windowMs = (args?.within as number) ?? 1000
  const lastWord = (bb.lastWord as { timestamp: number; payload?: { text: string } } | null) ?? null
  if (!lastWord) return false
  if (!isRecent(bb, lastWord, windowMs)) return false
  if (!keyword) return true
  return (lastWord.payload?.text as string)?.toLowerCase().includes(keyword.toLowerCase())
})

registerCondition('perceive.sound', (bb, args) => {
  const soundType = args?.type as string
  const windowMs = (args?.within as number) ?? 500
  const lastSound = (bb.lastSound as { timestamp: number; payload?: { type: string } } | null) ?? null
  if (!lastSound) return false
  if (!isRecent(bb, lastSound, windowMs)) return false
  if (!soundType) return true
  return lastSound.payload?.type === soundType
})

registerCondition('perceive.near', (bb, args) => {
  const thresholdCm = (args?.distance as number) ?? 50
  const lastProx = (bb.lastProximity as { timestamp: number; payload?: { distance: number } } | null) ?? null
  if (!lastProx) return false
  if (!isRecent(bb, lastProx, 500)) return false
  return (lastProx.payload?.distance as number) < thresholdCm
})

registerCondition('perceive.bump', (bb, args) => {
  const windowMs = (args?.within as number) ?? 2000
  const lastBump = (bb.lastBump as { timestamp: number } | null) ?? null
  return isRecent(bb, lastBump, windowMs)
})

// ─── Actions ───────────────────────────────────────────────────────

registerAction('memorize', (bb, _args) => {
  const bus = getPerceptionBus(bb)
  const recent = bus?.getRecent(1) ?? []
  if (recent.length === 0) return 'failure'
  const event = recent[0]
  if (!event) return 'failure'
  // Store to blackboard based on category
  switch (event.category) {
    case 'see.face':
      bb.lastFace = event
      break
    case 'see.object':
      bb.lastObjects = [...(bb.lastObjects as any[]) ?? [], event].slice(-10)
      break
    case 'hear.word':
      bb.lastWord = event
      break
    case 'hear.sound':
      bb.lastSound = event
      break
    case 'near':
      bb.lastProximity = event
      break
    case 'tilt':
      bb.lastTilt = event
      break
    case 'bump':
      bb.lastBump = event
      break
  }
  bb.perceptionCount = (bb.perceptionCount as number) + 1
  return 'success'
})

registerAction('memorize.face', (bb) => {
  const bus = getPerceptionBus(bb)
  const recent = bus?.getRecent(5) ?? []
  const faceEvents = recent.filter((e) => e.category === 'see.face')
  if (faceEvents.length === 0) return 'failure'
  bb.lastFace = faceEvents[0]
  bb.perceptionCount = (bb.perceptionCount as number) + 1
  return 'success'
})

registerAction('memorize.object', (bb, args) => {
  const className = (args as unknown as Record<string, string>)?.['class'] ?? ''
  const bus = getPerceptionBus(bb)
  const recent = bus?.getRecent(10) ?? []
  const objEvents = className
    ? recent.filter((e) => e.category === 'see.object' && e.payload?.class === className)
    : recent.filter((e) => e.category === 'see.object')
  if (objEvents.length === 0) return 'failure'
  bb.lastObjects = [...(bb.lastObjects as any[]) ?? [], objEvents[0]].slice(-10)
  bb.perceptionCount = (bb.perceptionCount as number) + 1
  return 'success'
})

registerAction('memorize.word', (bb) => {
  const bus = getPerceptionBus(bb)
  const recent = bus?.getRecent(5) ?? []
  const wordEvents = recent.filter((e) => e.category === 'hear.word')
  if (wordEvents.length === 0) return 'failure'
  bb.lastWord = wordEvents[0]
  bb.perceptionCount = (bb.perceptionCount as number) + 1
  return 'success'
})
