/**
 * SessionShare — Encode / decode debug session state into a shareable URL.
 *
 * Use case: a contributor runs a character locally, clicks "Share Session",
 * and sends the URL to a teammate who opens it to see the exact same BT
 * tree, blackboard snapshot, and recent events.
 *
 * Encoding pipeline:
 *   state → JSON → deflate → base64url → #share/<encoded>
 *
 * Decoding:
 *   #share/<encoded> → base64url → inflate → JSON → restore state
 *
 * Size budget: ~1.5 MB URL hash (sufficient for ~500 tracer events + BB).
 *   Real-world: 200 BB fields + 100 events ≈ 15–50 KB compressed.
 */

// ─── Types ────────────────────────────────────────────────────────────

export interface SharedSessionState {
  /** Character / behavior being debugged */
  character?: string
  /** BT definition (minimal: root node + children) */
  btTree?: string
  /** Blackboard snapshot */
  blackboard?: Record<string, unknown>
  /** Last N tracer events (type, label, payload) */
  recentEvents?: Array<{
    t: number
    type: string
    label: string
    payload?: Record<string, unknown>
  }>
  /** VAL state */
  valState?: {
    valence: number
    arousal: number
    dominance: number
  }
  /** VAL history */
  valHistory?: Array<{ t: number; valence: number; arousal: number; dominance: number }>
  /** Blackboard diffs */
  diffs?: Array<{ field: string; oldValue: unknown; newValue: unknown }>
  /** Timestamp of capture */
  capturedAt: string
  /** Version of the share format */
  version: 1
}

// ─── Compression helpers ─────────────────────────────────────────────

/** Compress a string with Compression Streams API (deflate) */
async function compress(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const input = encoder.encode(str)

  const cs = new CompressionStream('deflate')
  const writer = cs.writable.getWriter()
  writer.write(input)
  writer.close()

  const decoder = new DecompressionStream('deflate')
  const reader = decoder.readable.getReader()

  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  const total = chunks.reduce((sum, c) => sum + c.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    result.set(c, offset)
    offset += c.length
  }

  return btoa(String.fromCharCode(...Array.from(result)))
}

/** Decompress a base64-encoded deflate blob */
async function decompress(b64: string): Promise<string> {
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))

  const cs = new CompressionStream('deflate')
  const writer = cs.writable.getWriter()
  writer.write(bytes)
  writer.close()

  const decoder = new DecompressionStream('deflate')
  const reader = decoder.readable.getReader()

  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  const total = chunks.reduce((sum, c) => sum + c.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    result.set(c, offset)
    offset += c.length
  }

  return new TextDecoder().decode(result)
}

// ─── Encoding ─────────────────────────────────────────────────────────

const SHARE_PREFIX = '#share/'

/**
 * Encode the current debug state into a URL hash string.
 * Returns the full URL with the hash appended (without changing history).
 */
export async function encodeSession(
  state: Partial<SharedSessionState>,
): Promise<string> {
  const payload: SharedSessionState = {
    version: 1,
    capturedAt: new Date().toISOString(),
    ...state,
  }

  const json = JSON.stringify(payload)
  const compressed = await compress(json)
  return SHARE_PREFIX + compressed
}

/**
 * Decode a share URL hash back into session state.
 * Returns null if the hash is not a valid share URL.
 */
export async function decodeSession(
  hash: string,
): Promise<SharedSessionState | null> {
  if (!hash.startsWith(SHARE_PREFIX)) return null

  const b64 = hash.slice(SHARE_PREFIX.length)
  if (!b64) return null

  try {
    const json = await decompress(b64)
    const parsed = JSON.parse(json) as SharedSessionState

    // Validate version
    if (parsed.version !== 1) return null

    return parsed
  } catch {
    return null
  }
}

/**
 * Check if the current URL hash is a share URL.
 */
export function isShareUrl(): boolean {
  return window.location.hash.startsWith(SHARE_PREFIX)
}

/**
 * Clear the share hash from the URL without reloading.
 */
export function clearShareHash(): void {
  if (window.location.hash.startsWith(SHARE_PREFIX)) {
    const url = new URL(window.location.href)
    url.hash = ''
    history.replaceState(null, '', url.toString())
  }
}

/**
 * Get the share hash from the current URL.
 */
export function getShareHash(): string {
  return window.location.hash
}
