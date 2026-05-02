/**
 * In-memory Episodic Store — default backend for CyberAgent's episodic memory.
 *
 * Implements the EpisodicStoreBackend interface with:
 *   - O(n) storage in a Map for fast lookup
 *   - Ebbinghaus-style forgetting curve: relevance decays exponentially
 *   - Boost on recall: frequently recalled memories decay slower
 *   - Automatic purge of pruned memories
 *
 * Backend swap: replace this with SQLite-WASM by implementing the
 * EpisodicStoreBackend interface and passing it to EpisodicMemoryStore.
 */

import { nanoid } from 'nanoid'
import type {
  EpisodicMemory,
  RecallQuery,
  RecallResult,
  EpisodicStoreBackend,
  ForgettingCurveParams,
} from './types'
import { DEFAULT_FORGETTING_PARAMS } from './types'

// ─── Forgetting Curve ─────────────────────────────────────────────

function computeRelevance(
  ageMs: number,
  salience: number,
  recallCount: number,
  params: ForgettingCurveParams,
): number {
  const { initialRelevance, halfLifeMs, minRelevance, salienceBoost } = params

  // Ebbinghaus forgetting curve: relevance = initialRelevance * 2^(-age/halfLife)
  const decayFactor = Math.pow(2, -ageMs / halfLifeMs)
  const baseRelevance = initialRelevance * decayFactor

  // Boost for frequently recalled memories (memory consolidation)
  const recallBoost = 1 + recallCount * salienceBoost * 0.1

  // Boost for high-salience memories
  const salienceFactor = 1 + salience * salienceBoost

  return Math.max(minRelevance, baseRelevance * recallBoost * salienceFactor)
}

// ─── ID Generator ─────────────────────────────────────────────────

let memoryIdCounter = 0
function nextMemoryId(): string {
  return `mem_${Date.now()}_${++memoryIdCounter}_${nanoid(6)}`
}

// ─── In-Memory Store ──────────────────────────────────────────────

export class InMemoryEpisodicStore implements EpisodicStoreBackend {
  private memories: Map<string, EpisodicMemory>
  private readonly params: ForgettingCurveParams

  constructor(params?: ForgettingCurveParams) {
    this.memories = new Map()
    this.params = { ...DEFAULT_FORGETTING_PARAMS, ...params }
  }

  encode(
    memory: Omit<EpisodicMemory, 'id' | 'recallCount' | 'lastRecalledAt' | 'relevance' | 'pruned'>,
  ): EpisodicMemory {
    const now = Date.now()
    const entry: EpisodicMemory = {
      ...memory,
      id: nextMemoryId(),
      recallCount: 0,
      lastRecalledAt: now,
      relevance: this.params.initialRelevance,
      pruned: false,
    }
    this.memories.set(entry.id, entry)
    return entry
  }

  recall(
    queryOrId: RecallQuery | string,
  ): RecallResult | void {
    // Overload: recall by memoryId
    if (typeof queryOrId === 'string') {
      const mem = this.memories.get(queryOrId)
      if (!mem || mem.pruned) return
      mem.recallCount++
      mem.lastRecalledAt = Date.now()
      mem.relevance = computeRelevance(
        Date.now() - mem.timestamp,
        mem.salience,
        mem.recallCount,
        this.params,
      )
      return
    }

    // Overload: recall by query
    const query = queryOrId
    const start = performance.now()
    const limit = query.limit ?? 5
    const sortBy = query.sortBy ?? 'relevance'

    let results: EpisodicMemory[] = []

    for (const mem of this.memories.values()) {
      if (mem.pruned) continue

      // Filter by keywords
      if (query.keywords?.length) {
        const text = `${mem.label} ${mem.event.category} ${mem.event.source} ${mem.tags.join(' ')}`.toLowerCase()
        const keywordMatch = query.keywords.every((kw) =>
          text.includes(kw.toLowerCase()),
        )
        if (!keywordMatch) continue
      }

      // Filter by category
      if (query.category && mem.event.category !== query.category) continue

      // Filter by emotion valence
      if (
        query.valenceMin !== undefined &&
        mem.emotion.valence < query.valenceMin
      )
        continue
      if (
        query.valenceMax !== undefined &&
        mem.emotion.valence > query.valenceMax
      )
        continue

      // Filter by emotion arousal
      if (
        query.arousalMin !== undefined &&
        mem.emotion.arousal < query.arousalMin
      )
        continue
      if (
        query.arousalMax !== undefined &&
        mem.emotion.arousal > query.arousalMax
      )
        continue

      // Filter by time window
      if (query.since !== undefined && mem.timestamp < query.since) continue
      if (query.until !== undefined && mem.timestamp > query.until) continue

      results.push(mem)
    }

    // Sort
    if (sortBy === 'recency') {
      results.sort((a, b) => b.timestamp - a.timestamp)
    } else {
      results.sort((a, b) => b.relevance - a.relevance)
    }

    const totalMatches = results.length
    results = results.slice(0, limit)

    // Increment recall count for returned memories
    const now = Date.now()
    for (const mem of results) {
      mem.recallCount++
      mem.lastRecalledAt = now
      // Update relevance after recall (consolidation)
      mem.relevance = computeRelevance(
        now - mem.timestamp,
        mem.salience,
        mem.recallCount,
        this.params,
      )
    }

    return {
      memories: results,
      totalMatches,
      query,
      elapsedMs: performance.now() - start,
    }
  }

  get(id: string): EpisodicMemory | null {
    const mem = this.memories.get(id)
    return mem && !mem.pruned ? mem : null
  }

  getAll(): EpisodicMemory[] {
    return Array.from(this.memories.values()).filter((m) => !m.pruned)
  }

  getRecent(count: number = 20): EpisodicMemory[] {
    return this.getAll()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count)
  }

  prune(id: string): void {
    const mem = this.memories.get(id)
    if (mem) mem.pruned = true
  }

  purge(): number {
    const before = this.memories.size
    for (const [id, mem] of this.memories) {
      if (mem.pruned) this.memories.delete(id)
    }
    return before - this.memories.size
  }

  forget(elapsedMs: number): number {
    const now = Date.now()
    let decayed = 0
    for (const mem of this.memories.values()) {
      if (mem.pruned) continue
      const age = now - mem.timestamp
      const newRelevance = computeRelevance(
        age + elapsedMs,
        mem.salience,
        mem.recallCount,
        this.params,
      )
      if (newRelevance < mem.relevance) {
        mem.relevance = newRelevance
        decayed++
      }
    }
    return decayed
  }

  stats(): { total: number; pruned: number; avgRelevance: number } {
    const all = Array.from(this.memories.values())
    const active = all.filter((m) => !m.pruned)
    const pruned = all.filter((m) => m.pruned).length
    const avgRelevance =
      active.length > 0
        ? active.reduce((sum, m) => sum + m.relevance, 0) / active.length
        : 0
    return {
      total: active.length,
      pruned,
      avgRelevance: Math.round(avgRelevance * 1000) / 1000,
    }
  }

  reset(): void {
    this.memories.clear()
  }
}

// ─── MemoryStats Helper ───────────────────────────────────────────

export function computeMemoryStats(
  memories: EpisodicMemory[] | undefined,
): import('./types').MemoryStats {
  if (!memories) memories = []
  const now = Date.now()
  const active = memories.filter((m) => !m.pruned)
  const oldest = active.length > 0 ? Math.max(...active.map((m) => now - m.timestamp)) : 0
  const newest = active.length > 0 ? Math.min(...active.map((m) => now - m.timestamp)) : 0
  const recalled = active.filter((m) => m.recallCount > 0).length

  return {
    active: active.length,
    pruned: memories.filter((m) => m.pruned).length,
    avgRelevance:
      active.length > 0
        ? active.reduce((s, m) => s + m.relevance, 0) / active.length
        : 0,
    avgSalience:
      active.length > 0
        ? active.reduce((s, m) => s + m.salience, 0) / active.length
        : 0,
    oldestAgeMs: oldest,
    newestAgeMs: newest,
    recalledCount: recalled,
  }
}
