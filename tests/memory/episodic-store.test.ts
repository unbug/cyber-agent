/**
 * Episodic Memory — Unit tests for the in-memory store, forgetting curve,
 * and recall query system.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryEpisodicStore, computeMemoryStats } from '@/memory/episodic-store'
import type { EpisodicMemory, RecallQuery } from '@/memory/types'

// ─── Helpers ─────────────────────────────────────────────────────

function makeBaseMemory(): Omit<EpisodicMemory, 'id' | 'recallCount' | 'lastRecalledAt' | 'relevance' | 'pruned'> {
  return {
    timestamp: Date.now(),
    event: { category: 'see.face', payload: { confidence: 0.9, emotion: 'happy' }, source: 'webcam' },
    emotion: { valence: 0.5, arousal: 0.3, dominance: 0.4 },
    label: 'test memory',
    salience: 0.7,
    tags: ['see.face'],
  }
}

// ─── Encode ──────────────────────────────────────────────────────

describe('InMemoryEpisodicStore — encode', () => {
  let store: InMemoryEpisodicStore

  beforeEach(() => {
    store = new InMemoryEpisodicStore()
  })

  it('creates a memory with auto-generated id and defaults', () => {
    const mem = store.encode(makeBaseMemory())
    expect(mem.id).toMatch(/^mem_/)
    expect(mem.recallCount).toBe(0)
    expect(mem.relevance).toBe(1.0) // initialRelevance
    expect(mem.pruned).toBe(false)
    expect(mem.lastRecalledAt).toBeGreaterThan(0)
  })

  it('stores the memory and retrieves it by id', () => {
    const mem = store.encode(makeBaseMemory())
    const retrieved = store.get(mem.id)
    expect(retrieved).not.toBeNull()
    expect(retrieved!.label).toBe('test memory')
  })

  it('increments total count after encode', () => {
    store.encode(makeBaseMemory())
    store.encode(makeBaseMemory())
    const all = store.getAll()
    expect(all.length).toBe(2)
  })
})

// ─── Recall by Query ─────────────────────────────────────────────

describe('InMemoryEpisodicStore — recall(query)', () => {
  let store: InMemoryEpisodicStore

  beforeEach(() => {
    store = new InMemoryEpisodicStore()
    // Seed with diverse memories
    store.encode({ ...makeBaseMemory(), event: { category: 'see.face', payload: { confidence: 0.9 }, source: 'webcam' }, label: 'face from webcam', tags: ['see.face'] })
    store.encode({ ...makeBaseMemory(), event: { category: 'hear.word', payload: { confidence: 0.8, text: 'hello' }, source: 'mic' }, label: 'word hello', tags: ['hear.word', 'word:hello'] })
    store.encode({ ...makeBaseMemory(), event: { category: 'see.object', payload: { confidence: 0.6, class: 'ball' }, source: 'webcam' }, label: 'ball detected', tags: ['see.object', 'object:ball'] })
    store.encode({ ...makeBaseMemory(), event: { category: 'hear.sound', payload: { confidence: 0.5, type: 'clap' }, source: 'mic' }, label: 'clap sound', tags: ['hear.sound', 'sound:clap'] })
  })

  it('returns top-K by relevance when no filter', () => {
    const result = store.recall({ limit: 2 })
    expect(result).toBeDefined()
    expect(result!.memories.length).toBe(2)
    expect(result!.totalMatches).toBe(4)
  })

  it('filters by category', () => {
    const result = store.recall({ category: 'see.face', limit: 5 })
    expect(result!.memories.length).toBe(1)
    expect(result!.memories[0].event.category).toBe('see.face')
  })

  it('filters by keywords (case-insensitive)', () => {
    const result = store.recall({ keywords: ['hello'], limit: 5 })
    expect(result!.memories.length).toBe(1)
    expect(result!.memories[0].event.category).toBe('hear.word')
  })

  it('filters by valence range', () => {
    store.encode({
      ...makeBaseMemory(),
      event: { category: 'see.face', payload: { confidence: 0.5 }, source: 'webcam' },
      emotion: { valence: -0.8, arousal: 0.2, dominance: 0.1 },
      label: 'scary face',
      tags: ['see.face'],
    })
    const result = store.recall({ valenceMin: -1, valenceMax: -0.5, limit: 5 })
    expect(result!.memories.some((m) => m.label === 'scary face')).toBe(true)
  })

  it('sorts by recency when requested', () => {
    const result = store.recall({ sortBy: 'recency', limit: 5 })
    expect(result!.memories.length).toBeGreaterThan(0)
  })

  it('increments recall count on returned memories', () => {
    const mem = store.encode(makeBaseMemory())
    // First recall
    store.recall({ limit: 10 })
    // Second recall
    store.recall({ limit: 10 })
    const updated = store.get(mem.id)!
    expect(updated.recallCount).toBe(2)
  })
})

// ─── Recall by ID ────────────────────────────────────────────────

describe('InMemoryEpisodicStore — recall(id)', () => {
  let store: InMemoryEpisodicStore

  beforeEach(() => {
    store = new InMemoryEpisodicStore()
  })

  it('increments recall count for a specific memory', () => {
    const mem = store.encode(makeBaseMemory())
    store.recall(mem.id)
    const retrieved = store.get(mem.id)
    expect(retrieved!.recallCount).toBe(1)
  })

  it('does nothing for pruned memory', () => {
    const mem = store.encode(makeBaseMemory())
    store.prune(mem.id)
    store.recall(mem.id)
    const retrieved = store.get(mem.id)
    expect(retrieved).toBeNull()
  })
})

// ─── Forgetting Curve ────────────────────────────────────────────

describe('Forgetting curve', () => {
  let store: InMemoryEpisodicStore

  beforeEach(() => {
    store = new InMemoryEpisodicStore()
  })

  it('decays relevance when forgetting is applied', () => {
    const mem = store.encode(makeBaseMemory())
    const initialRelevance = mem.relevance
    const decayed = store.forget(3_600_000) // 1 hour
    expect(decayed).toBe(1)
    const updated = store.get(mem.id)!
    expect(updated.relevance).toBeLessThan(initialRelevance)
    expect(updated.relevance).toBeGreaterThanOrEqual(0.01) // minRelevance
  })

  it('does not decay pruned memories', () => {
    const mem = store.encode(makeBaseMemory())
    store.prune(mem.id)
    const decayed = store.forget(3_600_000)
    expect(decayed).toBe(0)
  })

  it('high-salience memories decay slower', () => {
    const highSalience = store.encode({ ...makeBaseMemory(), salience: 1.0 })
    const lowSalience = store.encode({ ...makeBaseMemory(), salience: 0.1 })
    store.forget(3_600_000)
    const hs = store.get(highSalience.id)!.relevance
    const ls = store.get(lowSalience.id)!.relevance
    expect(hs).toBeGreaterThan(ls)
  })

  it('recalled memories get a boost', () => {
    const mem = store.encode(makeBaseMemory())
    store.recall(mem.id)
    const boosted = store.get(mem.id)!
    expect(boosted.recallCount).toBe(1)
    expect(boosted.relevance).toBeGreaterThanOrEqual(mem.relevance)
  })
})

// ─── Purge ───────────────────────────────────────────────────────

describe('Purge', () => {
  let store: InMemoryEpisodicStore

  beforeEach(() => {
    store = new InMemoryEpisodicStore()
  })

  it('removes pruned memories', () => {
    const m1 = store.encode(makeBaseMemory())
    const m2 = store.encode(makeBaseMemory())
    store.prune(m1.id)
    const purged = store.purge()
    expect(purged).toBe(1)
    expect(store.getAll().length).toBe(1)
  })

  it('returns 0 when no pruned memories', () => {
    store.encode(makeBaseMemory())
    const purged = store.purge()
    expect(purged).toBe(0)
  })
})

// ─── Memory Stats ────────────────────────────────────────────────

describe('computeMemoryStats', () => {
  it('computes correct stats for a set of memories', () => {
    const mems: EpisodicMemory[] = [
      {
        id: 'mem_1', timestamp: Date.now() - 1000,
        event: { category: 'see.face', payload: {}, source: 'webcam' },
        emotion: { valence: 0.5, arousal: 0.3, dominance: 0.4 },
        label: 'test', salience: 0.7, recallCount: 1, lastRecalledAt: Date.now(),
        relevance: 0.8, tags: [], pruned: false,
      },
      {
        id: 'mem_2', timestamp: Date.now() - 2000,
        event: { category: 'hear.sound', payload: {}, source: 'mic' },
        emotion: { valence: -0.3, arousal: 0.6, dominance: 0.2 },
        label: 'test2', salience: 0.3, recallCount: 0, lastRecalledAt: Date.now(),
        relevance: 0.5, tags: [], pruned: true,
      },
    ]
    const stats = computeMemoryStats(mems)
    expect(stats.active).toBe(1)
    expect(stats.pruned).toBe(1)
    expect(stats.recalledCount).toBe(1)
    expect(stats.avgRelevance).toBeGreaterThan(0)
    expect(stats.avgSalience).toBeGreaterThan(0)
  })
})

// ─── Custom Forgetting Curve Params ──────────────────────────────

describe('Custom forgetting curve params', () => {
  it('respects custom half-life', () => {
    const store = new InMemoryEpisodicStore({
      initialRelevance: 1.0,
      halfLifeMs: 60_000, // 1 minute
      minRelevance: 0.05,
      salienceBoost: 0.3,
    })
    const mem = store.encode(makeBaseMemory())
    store.forget(60_000) // 1 half-life
    const updated = store.get(mem.id)!
    // With half-life of 1 min, relevance should be ~0.5 * salienceFactor
    expect(updated.relevance).toBeLessThan(0.8)
    expect(updated.relevance).toBeGreaterThanOrEqual(0.05)
  })
})

// ─── Reset ───────────────────────────────────────────────────────

describe('Reset', () => {
  it('clears all memories', () => {
    const store = new InMemoryEpisodicStore()
    store.encode(makeBaseMemory())
    store.encode(makeBaseMemory())
    store.reset()
    expect(store.getAll().length).toBe(0)
    expect(store.stats().total).toBe(0)
  })
})

// ─── Edge Cases ──────────────────────────────────────────────────

describe('Edge cases', () => {
  it('handles empty recall query', () => {
    const store = new InMemoryEpisodicStore()
    const result = store.recall({})
    expect(result!.memories.length).toBe(0)
  })

  it('get returns null for non-existent id', () => {
    const store = new InMemoryEpisodicStore()
    expect(store.get('nonexistent')).toBeNull()
  })

  it('getRecent returns the N most recent', () => {
    const store = new InMemoryEpisodicStore()
    store.encode({ ...makeBaseMemory(), timestamp: Date.now() - 3000 })
    store.encode({ ...makeBaseMemory(), timestamp: Date.now() - 2000 })
    store.encode({ ...makeBaseMemory(), timestamp: Date.now() - 1000 })
    const recent = store.getRecent(2)
    expect(recent.length).toBe(2)
    expect(recent[0].timestamp).toBeGreaterThan(recent[1].timestamp)
  })
})
