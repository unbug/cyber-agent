/**
 * Episodic Recall — BT primitive that queries the episodic memory store.
 *
 * Action: `memorize.episodic` — encode the latest perception event as
 * an episodic memory with emotion context.
 *
 * Action: `recall(query)` — query the episodic store and write top-K
 * results to the blackboard under `recentMemories` + `recallStats`.
 *
 * Condition: `hasMemory(keyword)` — true if a memory matching the
 * keyword exists with relevance above threshold.
 */

import { registerAction, registerCondition } from '../engine/executor'
import type { Blackboard } from '../engine/types'
import type { EpisodicStoreBackend } from './types'
import { InMemoryEpisodicStore } from './episodic-store'

// ─── Helpers ──────────────────────────────────────────────────────

function getStore(bb: Blackboard): EpisodicStoreBackend {
  if (!(bb.episodicStore as EpisodicStoreBackend)) {
    bb.episodicStore = new InMemoryEpisodicStore()
  }
  return bb.episodicStore as EpisodicStoreBackend
}

function getRecentPerceptionEvent(bb: Blackboard): {
  category: string
  payload: Record<string, unknown>
  source: string
} | null {
  const lastFace = bb.lastFace as { category?: string; payload?: Record<string, unknown>; source?: string } | null
  if (lastFace?.category) return { category: lastFace.category, payload: lastFace.payload ?? {}, source: lastFace.source ?? 'unknown' }

  const lastObjects = bb.lastObjects as Array<{ category: string; payload: Record<string, unknown>; source: string }> | undefined
  if (lastObjects && lastObjects.length > 0) {
    const last = lastObjects[lastObjects.length - 1]
    if (!last) return null
    return { category: last.category, payload: last.payload, source: last.source }
  }

  const lastWord = bb.lastWord as { category?: string; payload?: Record<string, unknown>; source?: string } | null
  if (lastWord?.category) return { category: lastWord.category, payload: lastWord.payload ?? {}, source: lastWord.source ?? 'unknown' }

  const lastSound = bb.lastSound as { category?: string; payload?: Record<string, unknown>; source?: string } | null
  if (lastSound?.category) return { category: lastSound.category, payload: lastSound.payload ?? {}, source: lastSound.source ?? 'unknown' }

  const lastProx = bb.lastProximity as { category?: string; payload?: Record<string, unknown>; source?: string } | null
  if (lastProx?.category) return { category: lastProx.category, payload: lastProx.payload ?? {}, source: lastProx.source ?? 'unknown' }

  return null
}

function inferEmotion(bb: Blackboard): { valence: number; arousal: number; dominance: number } {
  // Simple heuristic: derive emotion from blackboard state
  const energy = (bb.energy as number) ?? 0.5
  const emotion = (bb.emotion as string) ?? 'neutral'
  // position used for spatial reasoning in future VAL extensions

  let valence = 0 // neutral
  let arousal = 0 // calm
  let dominance = 0.5 // neutral

  switch (emotion) {
    case 'happy':
      valence = 0.7; arousal = 0.5; break
    case 'excited':
      valence = 0.8; arousal = 0.9; break
    case 'sad':
      valence = -0.6; arousal = 0.2; break
    case 'angry':
      valence = -0.8; arousal = 0.8; dominance = 0.9; break
    case 'fear':
      valence = -0.7; arousal = 0.7; dominance = 0.1; break
    case 'curious':
      valence = 0.3; arousal = 0.6; break
    case 'shy':
      valence = 0.1; arousal = 0.3; dominance = 0.2; break
    case 'playful':
      valence = 0.6; arousal = 0.7; break
    case 'stoic':
      valence = 0.0; arousal = 0.1; dominance = 0.8; break
  }

  // Energy modulates arousal
  arousal = Math.max(0, Math.min(1, arousal * (0.5 + energy * 0.5)))

  return { valence, arousal, dominance }
}

function inferSalience(event: { category: string; payload: Record<string, unknown> }): number {
  // Higher salience for more distinctive events
  switch (event.category) {
    case 'see.face':
      return (event.payload?.confidence as number) ?? 0.7
    case 'hear.word':
      return (event.payload?.confidence as number) ?? 0.8
    case 'see.object':
      return (event.payload?.confidence as number) ?? 0.6
    case 'hear.sound':
      return (event.payload?.confidence as number) ?? 0.5
    default:
      return 0.5
  }
}

function inferTags(event: { category: string; payload: Record<string, unknown> }): string[] {
  const tags: string[] = [event.category]
  if (event.category === 'see.face' && event.payload?.emotion) {
    tags.push(`emotion:${event.payload.emotion}`)
  }
  if (event.category === 'see.object' && event.payload?.class) {
    tags.push(`object:${event.payload.class}`)
  }
  if (event.category === 'hear.word' && event.payload?.text) {
    tags.push(`word:${String(event.payload.text).toLowerCase()}`)
  }
  if (event.category === 'hear.sound' && event.payload?.type) {
    tags.push(`sound:${event.payload.type}`)
  }
  return tags
}

// ─── Actions ──────────────────────────────────────────────────────

registerAction('memorize.episodic', (bb) => {
  const event = getRecentPerceptionEvent(bb)
  if (!event) return 'failure'

  const store = getStore(bb)
  const emotion = inferEmotion(bb)
  const salience = inferSalience(event)
  const tags = inferTags(event)

  const label = `${event.category} from ${event.source}`

  store.encode({
    timestamp: Date.now(),
    event,
    emotion,
    label,
    salience,
    tags,
  })

  // Update blackboard with memory count
  bb.memoryCount = (bb.memoryCount as number) + 1
  return 'success'
})

registerAction('recall', (bb, args) => {
  const store = getStore(bb)
  const rawArgs = args as unknown as Record<string, unknown>
  const query: import('./types').RecallQuery = {
    keywords: rawArgs?.keywords
      ? [rawArgs.keywords as string]
      : undefined,
    category: rawArgs?.category as string | undefined,
    limit: rawArgs?.limit as number | undefined,
    sortBy: rawArgs?.sortBy as 'relevance' | 'recency' | undefined,
    valenceMin: rawArgs?.valenceMin as number | undefined,
    valenceMax: rawArgs?.valenceMax as number | undefined,
    arousalMin: rawArgs?.arousalMin as number | undefined,
    arousalMax: rawArgs?.arousalMax as number | undefined,
    since: rawArgs?.since as number | undefined,
    until: rawArgs?.until as number | undefined,
  }

  const result = store.recall(query)
  if (!result) return 'failure'

  // Write results to blackboard
  bb.recentMemories = result.memories.map((m: import('./types').EpisodicMemory) => ({
    id: m.id,
    label: m.label,
    relevance: m.relevance,
    timestamp: m.timestamp,
    emotion: m.emotion,
    tags: m.tags,
    event: m.event,
  }))
  bb.recallStats = {
    totalMatches: result.totalMatches,
    elapsedMs: result.elapsedMs,
    queryKeywords: query.keywords,
  }

  return result.memories.length > 0 ? 'success' : 'failure'
})

// ─── Conditions ───────────────────────────────────────────────────

registerCondition('hasMemory', (bb, args) => {
  const store = getStore(bb)
  const rawArgs = args as unknown as Record<string, unknown>
  const keywords = [rawArgs?.keyword as string].filter(Boolean)
  const threshold = rawArgs?.threshold as number ?? 0.1

  if (keywords.length === 0) return false

  const result = store.recall({ keywords, limit: 1 })
  if (!result) return false
  return result.memories.some((m: import('./types').EpisodicMemory) => m.relevance >= threshold)
})
