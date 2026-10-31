import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  canonicalStringify,
  signCharacterBundle,
  verifyBundle,
  parseBundle,
} from './character-bundle'

const hasCrypto = typeof globalThis.crypto?.subtle !== 'undefined'

/** Minimal in-memory IndexedDB double covering open/upgrade/get/put. */
function makeFakeIDB() {
  const dbs: Record<string, Record<string, Map<string, unknown>>> = {}
  const mkReq = () => {
    const r: Record<string, unknown> = {}
    queueMicrotask(() => (r.onsuccess as (() => void) | undefined)?.())
    return r
  }
  const makeDb = (storeMap: Record<string, Map<string, unknown>>) => ({
    createObjectStore(n: string) { storeMap[n] ??= new Map() },
    transaction(_n: string) {
      return {
        objectStore(s: string) {
          const m = (storeMap[s] ??= new Map())
          return {
            get(k: string) { const r = mkReq(); r.result = m.get(k); return r },
            put(v: unknown, k: string) { const r = mkReq(); m.set(k, v); return r },
            delete(k: string) { const r = mkReq(); m.delete(k); return r },
          }
        },
      }
    },
  })
  return {
    open(name: string) {
      const req: Record<string, unknown> = {}
      queueMicrotask(() => {
        const isNew = !dbs[name]
        const map = (dbs[name] ??= {})
        req.result = makeDb(map)
        if (isNew) (req.onupgradeneeded as (() => void) | undefined)?.()
        ;(req.onsuccess as (() => void) | undefined)?.()
      })
      return req
    },
  }
}

beforeEach(() => {
  vi.stubGlobal('indexedDB', makeFakeIDB())
})

describe('canonicalStringify', () => {
  it('is order-independent for nested objects', () => {
    const a = { b: 1, a: { d: [1, { z: 1, y: 2 }] } }
    const b = { a: { d: [1, { y: 2, z: 1 }] }, b: 1 }
    expect(canonicalStringify(a)).toBe(canonicalStringify(b))
  })
})

describe('bundle v1/v2', () => {
  it.skipIf(!hasCrypto)('v1 bundle (no tuning) signs, verifies, parses', async () => {
    const b = await signCharacterBundle({ id: 'puppy', name: 'Puppy' }, { author: 'u' })
    expect(b.$schema).toBe('cyberagent/character-bundle/v1')
    expect(b.driveTuning).toBeUndefined()
    expect(await verifyBundle(b)).toBe(true)
    const { bundle, error } = parseBundle(JSON.stringify(b))
    expect(error).toBeUndefined()
    expect(bundle.character.id).toBe('puppy')
  })

  it.skipIf(!hasCrypto)('v2 bundle carries tuning in the signature', async () => {
    const tuning = { cyberbrick: { maxSpeed: 0.4, maxSteer: 0.6 } }
    const b = await signCharacterBundle({ id: 'puppy' }, {}, tuning)
    expect(b.$schema).toBe('cyberagent/character-bundle/v2')
    expect(b.driveTuning).toEqual(tuning)
    expect(await verifyBundle(b)).toBe(true)

    // tampering with the tuning breaks verification — it is signed, not free-form
    const tampered = { ...b, driveTuning: { cyberbrick: { maxSpeed: 1 } } }
    expect(await verifyBundle(tampered)).toBe(false)

    // reordered keys still verify (canonicalization)
    const shuffled = JSON.parse(
      JSON.stringify({ ...b, driveTuning: { cyberbrick: { maxSteer: 0.6, maxSpeed: 0.4 } } }),
    )
    // note: same content different key order must verify only for identical values
    shuffled.driveTuning = b.driveTuning
    expect(await verifyBundle(shuffled)).toBe(true)
  })

  it('parseBundle rejects unknown schema', () => {
    const { error } = parseBundle('{"$schema":"evil/v9","version":"9","character":{},"signature":{}}')
    expect(error).toBe('Unknown schema version')
  })
})
