/**
 * Episodic Memory — Types for CyberAgent's episodic store.
 *
 * Episodic memories are keyed by (event, emotion, time) and support:
 *   - Semantic recall: query by keyword / category / time range
 *   - Emotional recall: filter by emotion valence / arousal
 *   - Forgetting curve: older memories decay in relevance
 *   - Purge: manual / automatic eviction of forgotten memories
 *
 * Backend pluggable:
 *   - Default: in-memory store (src/memory/episodic-store.ts)
 *   - Production: SQLite-WASM (future)
 *   - Dev: OpenClaw memory (future)
 */

// ─── Emotion (VAL) ────────────────────────────────────────────────

export interface ValenceArousalDominance {
  valence: number  // -1 (negative) to +1 (positive)
  arousal: number  // 0 (calm) to +1 (aroused)
  dominance: number // 0 (submissive) to +1 (dominant)
}

// ─── Episodic Memory Entry ────────────────────────────────────────

export interface EpisodicMemory {
  /** Unique memory ID */
  id: string
  /** Timestamp of the original event (ms) */
  timestamp: number
  /** Perception event that triggered encoding */
  event: {
    category: string
    payload: Record<string, unknown>
    source: string
  }
  /** Emotional state at encoding time (VAL) */
  emotion: ValenceArousalDominance
  /** Short textual label for display / search */
  label: string
  /** Richness score: how memorable this event was (0-1) */
  salience: number
  /** How many times this memory has been recalled */
  recallCount: number
  /** Time since last recall (ms) — updated on recall */
  lastRecalledAt: number
  /** Forgetting curve decay factor (0-1, lower = more forgotten) */
  relevance: number
  /** Tags for semantic search */
  tags: string[]
  /** Whether this memory has been pruned */
  pruned: boolean
}

// ─── Recall Query ─────────────────────────────────────────────────

export interface RecallQuery {
  /** Search keywords (case-insensitive substring match) */
  keywords?: string[]
  /** Filter by perception category */
  category?: string
  /** Filter by emotion valence range [-1, +1] */
  valenceMin?: number
  valenceMax?: number
  /** Filter by emotion arousal range [0, +1] */
  arousalMin?: number
  arousalMax?: number
  /** Time window: only memories from this timestamp onward */
  since?: number
  /** Time window: only memories up to this timestamp */
  until?: number
  /** Maximum number of results (default: 5) */
  limit?: number
  /** Sort by relevance (default) or recency */
  sortBy?: 'relevance' | 'recency'
}

// ─── Recall Result ────────────────────────────────────────────────

export interface RecallResult {
  /** The matched memories, sorted by relevance */
  memories: EpisodicMemory[]
  /** Total matches before limit */
  totalMatches: number
  /** Query used */
  query: RecallQuery
  /** Time taken to recall (ms) */
  elapsedMs: number
}

// ─── Memory Store Interface ───────────────────────────────────────

export interface EpisodicStoreBackend {
  /** Store an episodic memory */
  encode(memory: Omit<EpisodicMemory, 'id' | 'recallCount' | 'lastRecalledAt' | 'relevance' | 'pruned'>): EpisodicMemory
  /** Recall memories matching a query (overloaded: by query or by id) */
  recall(queryOrId: RecallQuery | string): RecallResult | void
  /** Get a memory by ID */
  get(id: string): EpisodicMemory | null
  /** Get all memories (excluding pruned) */
  getAll(): EpisodicMemory[]
  /** Get recent memories (by timestamp) */
  getRecent(count?: number): EpisodicMemory[]
  /** Manually prune a memory */
  prune(id: string): void
  /** Purge all pruned memories */
  purge(): number
  /** Apply forgetting curve: decay relevance of unrecalled memories */
  forget(elapsedMs: number): number
  /** Get store stats */
  stats(): { total: number; pruned: number; avgRelevance: number }
  /** Reset the store */
  reset(): void
}

// ─── Forgetting Curve Parameters ──────────────────────────────────

export interface ForgettingCurveParams {
  /** Initial relevance for a new memory */
  initialRelevance: number
  /** Half-life in ms (default: 1 hour) */
  halfLifeMs: number
  /** Minimum relevance floor */
  minRelevance: number
  /** Decay is faster for low-salience memories */
  salienceBoost: number
}

export const DEFAULT_FORGETTING_PARAMS: ForgettingCurveParams = {
  initialRelevance: 1.0,
  halfLifeMs: 3_600_000, // 1 hour
  minRelevance: 0.01,
  salienceBoost: 0.5,
}

// ─── Memory Stats ─────────────────────────────────────────────────

export interface MemoryStats {
  /** Total active (non-pruned) memories */
  active: number
  /** Total pruned memories */
  pruned: number
  /** Average relevance across active memories */
  avgRelevance: number
  /** Average salience across active memories */
  avgSalience: number
  /** Oldest memory age in ms */
  oldestAgeMs: number
  /** Newest memory age in ms */
  newestAgeMs: number
  /** Memories recalled at least once */
  recalledCount: number
}
