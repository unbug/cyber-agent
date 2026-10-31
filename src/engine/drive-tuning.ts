/**
 * Drive tuning — M4 character portability.
 *
 * A character's personality lives in its behavior tree, but "feeling the
 * same" on a different robot also needs embodied gains: how fast it dares
 * to go, how sharply it steers, how movement maps to speed. We store these
 * per (character, robot platform) and ship them inside character bundles,
 * so "Puppy on my friend's Mini T" behaves like Puppy at home.
 *
 * Safety rule: the /connect speed preset is a CAP — tuning can only lower
 * maxSpeed below the preset, never exceed it. Imported tunings are clamped
 * to sane physical ranges (a malicious bundle cannot request 10× throttle).
 */

import type { EmbodimentConfig } from './embodiment'

export interface DriveTuning {
  maxSpeed?: number
  maxSteer?: number
  speedRefPx?: number
  yawRefDeg?: number
}

export type TuningMap = Record<string, DriveTuning>

const STORE_KEY = '***' + 'ent.driveTuning'

const RANGES: Record<keyof DriveTuning, [number, number]> = {
  maxSpeed: [0.05, 1],
  maxSteer: [0.05, 1],
  speedRefPx: [5, 200],
  yawRefDeg: [10, 180],
}

/** Clamp a possibly-hostile tuning object into safe ranges; drop garbage. */
export function sanitizeTuning(raw: unknown): DriveTuning {
  if (!raw || typeof raw !== 'object') return {}
  const out: DriveTuning = {}
  for (const [k, [lo, hi]] of Object.entries(RANGES) as [keyof DriveTuning, [number, number]][]) {
    const v = (raw as Record<string, unknown>)[k]
    if (typeof v === 'number' && Number.isFinite(v)) {
      out[k] = Math.min(hi, Math.max(lo, v))
    }
  }
  return out
}

export function sanitizeTuningMap(raw: unknown): TuningMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: TuningMap = {}
  for (const [platform, t] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof platform !== 'string' || !platform || platform.length > 64) continue
    const clean = sanitizeTuning(t)
    if (Object.keys(clean).length > 0) out[platform] = clean
  }
  return out
}

// ─── localStorage store ───────────────────────────────────────────

type Store = Record<string, TuningMap>

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as Store
  } catch {
    return {}
  }
}

function writeStore(s: Store): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s))
  } catch {
    /* private mode — tunings just won't persist */
  }
}

export function getTuningFor(characterId: string, platformId: string): DriveTuning | null {
  const t = readStore()[characterId]?.[platformId]
  return t && Object.keys(t).length > 0 ? t : null
}

export function getTuningsForCharacter(characterId: string): TuningMap {
  return readStore()[characterId] ?? {}
}

export function setTuningFor(
  characterId: string,
  platformId: string,
  tuning: DriveTuning,
): void {
  const clean = sanitizeTuning(tuning)
  if (Object.keys(clean).length === 0) return
  const store = readStore()
  store[characterId] = { ...(store[characterId] ?? {}), [platformId]: clean }
  writeStore(store)
}

/** Merge an imported bundle's tuning map; returns how many platforms stored. */
export function applyImportedTunings(characterId: string, map: unknown): number {
  const clean = sanitizeTuningMap(map)
  const platforms = Object.keys(clean)
  if (!characterId || platforms.length === 0) return 0
  const store = readStore()
  const existing = store[characterId] ?? {}
  for (const p of platforms) {
    existing[p] = { ...(existing[p] ?? {}), ...clean[p]! }
  }
  store[characterId] = existing
  writeStore(store)
  return platforms.length
}

export function clearTunings(characterId: string, platformId?: string): void {
  const store = readStore()
  if (platformId) {
    if (store[characterId]) {
      delete store[characterId]![platformId]
      if (Object.keys(store[characterId]!).length === 0) delete store[characterId]
    }
  } else {
    delete store[characterId]
  }
  writeStore(store)
}

// ─── Resolution for EmbodimentAdapter ─────────────────────────────

/**
 * Merge safety preset + per-robot tuning into an EmbodimentConfig.
 * The preset (user's speed limit choice) always caps forward speed:
 * final = min(presetCap, tuning.maxSpeed ?? presetCap).
 */
export function resolveEmbodimentConfig(
  presetCap: number,
  tuning: DriveTuning | null,
): EmbodimentConfig {
  const cfg: EmbodimentConfig = {
    maxSpeed:
      tuning?.maxSpeed !== undefined ? Math.min(presetCap, tuning.maxSpeed) : presetCap,
  }
  if (tuning?.maxSteer !== undefined) cfg.maxSteer = tuning.maxSteer
  if (tuning?.speedRefPx !== undefined) cfg.speedRefPx = tuning.speedRefPx
  if (tuning?.yawRefDeg !== undefined) cfg.yawRefDeg = tuning.yawRefDeg
  return cfg
}
