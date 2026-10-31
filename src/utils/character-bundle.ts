/**
 * Character bundle — signed, portable character definition.
 *
 * Format:
 * {
 *   "$schema": "cyberagent/character-bundle/v1",
 *   "version": "1",
 *   "character": { ... character definition ... },
 *   "signature": {
 *     "algorithm": "ES256",
 *     "publicKey": "<base64>",
 *     "signature": "<base64>"
 *   },
 *   "metadata": {
 *     "author": "string",
 *     "publishedAt": "ISO-8601",
 *     "tags": ["string"]
 *   }
 * }
 *
 * Signing uses Web Crypto API (ES256 via P-256).
 * Verification reconstructs the signature input and verifies against the public key.
 */

// ─── Types ────────────────────────────────────────────────────────

export interface CharacterSignature {
  algorithm: 'ES256'
  publicKey: string // base64-encoded SPKI
  signature: string // base64-encoded signature
}

export interface CharacterBundleMetadata {
  author?: string
  publishedAt?: string
  tags?: string[]
}

export type BundleSchema = 'cyberagent/character-bundle/v1' | 'cyberagent/character-bundle/v2'

/** Per-robot-platform drive gains shipped with the character (v2). */
export type BundleDriveTuning = Record<string, {
  maxSpeed?: number
  maxSteer?: number
  speedRefPx?: number
  yawRefDeg?: number
}>

export interface SignedCharacterBundle {
  $schema: BundleSchema
  version: '1' | '2'
  character: Record<string, unknown>
  /** v2 only: platformId → embodied drive gains */
  driveTuning?: BundleDriveTuning
  signature: CharacterSignature
  metadata: CharacterBundleMetadata
}

/** Recursive key-sorted JSON — deterministic across writers/loaders. */
export function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(',')}]`
  const entries = Object.keys(value as Record<string, unknown>)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalStringify((value as Record<string, unknown>)[k])}`)
  return `{${entries.join(',')}}`
}

/** The exact bytes that get signed/verified for a bundle payload. */
function signatureInput(
  schema: BundleSchema,
  character: Record<string, unknown>,
  driveTuning?: BundleDriveTuning,
): string {
  if (schema === 'cyberagent/character-bundle/v2') {
    return canonicalStringify({ c: character, t: driveTuning ?? null })
  }
  // v1 legacy: shallow key sort over character only
  return JSON.stringify(character, Object.keys(character).sort())
}

export interface UnpackedCharacterBundle {
  character: Record<string, unknown>
  signature: CharacterSignature
  metadata: CharacterBundleMetadata
  verified: boolean
}

// ─── Signing ─────────────────────────────────────────────────────

/** Get or generate an ES256 key pair stored in IndexedDB */
async function getOrCreateKeyPair(): Promise<CryptoKeyPair> {
  const store = indexedDB.open('cyberagent-keys', 1)
  store.onupgradeneeded = () => {
    store.result.createObjectStore('keys')
  }
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    store.onsuccess = () => resolve(store.result)
    store.onerror = () => reject(store.error)
  })

  return new Promise<CryptoKeyPair>((resolve, reject) => {
    const tx = db.transaction('keys', 'readwrite')
    const store2 = tx.objectStore('keys')
    const req = store2.get('author-key')

    req.onsuccess = async () => {
      if (req.result) {
        // Import existing key pair
        const raw = req.result as { pub: Uint8Array; priv: Uint8Array }
        const pubKey = await crypto.subtle.importKey(
          'spki', raw.pub, { name: 'ECDSA', namedCurve: 'P-256' },
          true, ['verify'],
        )
        const privKey = await crypto.subtle.importKey(
          'pkcs8', raw.priv, { name: 'ECDSA', namedCurve: 'P-256' },
          false, ['sign'],
        )
        resolve({ publicKey: pubKey, privateKey: privKey })
      } else {
        // Generate new key pair
        const kp = await crypto.subtle.generateKey(
          { name: 'ECDSA', namedCurve: 'P-256' },
          true, ['sign', 'verify'],
        )
        const pubRaw = await crypto.subtle.exportKey('spki', kp.publicKey)
        const privRaw = await crypto.subtle.exportKey('pkcs8', kp.privateKey)
        store2.put({ pub: new Uint8Array(pubRaw), priv: new Uint8Array(privRaw) }, 'author-key')
        resolve(kp)
      }
    }
    req.onerror = () => reject(req.error)
  })
}

/** Sign a character definition and return a complete bundle */
export async function signCharacterBundle(
  character: Record<string, unknown>,
  metadata: CharacterBundleMetadata = {},
  driveTuning?: BundleDriveTuning,
): Promise<SignedCharacterBundle> {
  const kp = await getOrCreateKeyPair()

  const hasTuning = !!driveTuning && Object.keys(driveTuning).length > 0
  const schema: BundleSchema = hasTuning
    ? 'cyberagent/character-bundle/v2'
    : 'cyberagent/character-bundle/v1'
  const encoder = new TextEncoder()
  const data = encoder.encode(signatureInput(schema, character, driveTuning))

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    kp.privateKey,
    data,
  )

  const pubRaw = await crypto.subtle.exportKey('spki', kp.publicKey)

  return {
    $schema: schema,
    version: hasTuning ? '2' : '1',
    character,
    ...(hasTuning ? { driveTuning } : {}),
    signature: {
      algorithm: 'ES256',
      publicKey: btoa(String.fromCharCode(...new Uint8Array(pubRaw))),
      signature: btoa(String.fromCharCode(...new Uint8Array(signature))),
    },
    metadata: {
      ...metadata,
      publishedAt: metadata.publishedAt ?? new Date().toISOString(),
    },
  }
}

/** Verify a signed character bundle */
export async function verifyBundle(bundle: SignedCharacterBundle): Promise<boolean> {
  try {
    const { signature, character, driveTuning, $schema } = bundle
    if (signature.algorithm !== 'ES256') return false

    const pubRaw = Uint8Array.from(atob(signature.publicKey), c => c.charCodeAt(0))
    const sigRaw = Uint8Array.from(atob(signature.signature), c => c.charCodeAt(0))

    const pubKey = await crypto.subtle.importKey(
      'spki', pubRaw, { name: 'ECDSA', namedCurve: 'P-256' },
      true, ['verify'],
    )

    const data = new TextEncoder().encode(signatureInput($schema, character, driveTuning))

    return await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pubKey, sigRaw, data,
    )
  } catch {
    return false
  }
}

/** Export bundle as downloadable JSON file */
export function downloadBundle(bundle: SignedCharacterBundle, filename?: string): void {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `${bundle.character.id || 'character'}-bundle.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Import bundle from JSON (e.g. from file upload or clipboard) */
export function parseBundle(json: string): { bundle: SignedCharacterBundle; error?: string } {
  try {
    const data = JSON.parse(json)
    if (
      data.$schema !== 'cyberagent/character-bundle/v1' &&
      data.$schema !== 'cyberagent/character-bundle/v2'
    ) {
      return { bundle: data as unknown as SignedCharacterBundle, error: 'Unknown schema version' }
    }
    if (!data.version || !data.character || !data.signature) {
      return { bundle: data as unknown as SignedCharacterBundle, error: 'Missing required fields' }
    }
    return { bundle: data as SignedCharacterBundle }
  } catch (e) {
    return { bundle: {} as SignedCharacterBundle, error: `Invalid JSON: ${(e as Error).message}` }
  }
}
