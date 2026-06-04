/**
 * BundleStore — local IndexedDB store for published character bundles.
 *
 * Each published bundle is stored with its verification status.
 * Schema: cyberagent-bundles / v1
 */

// ─── Types ────────────────────────────────────────────────────────

export interface StoredBundle {
  /** Bundle id (character.id) */
  id: string
  /** Bundle JSON */
  bundle: Record<string, unknown>
  /** Whether the signature verified on import */
  verified: boolean
  /** When it was stored */
  storedAt: string
  /** Last verification time */
  lastVerifiedAt: string
  /** Author from metadata */
  author?: string
}

const DB_NAME = 'cyberagent-bundles'
const DB_VERSION = 1
const STORE_NAME = 'bundles'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('storedAt', 'storedAt', { unique: false })
        store.createIndex('author', 'author', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ─── CRUD ─────────────────────────────────────────────────────────

/** Publish a bundle to the local store */
export async function publishBundle(bundle: Record<string, unknown>): Promise<StoredBundle> {
  const char = bundle.character as Record<string, unknown> | undefined
  const id = (char?.id ?? bundle.id) as string
  if (!id) throw new Error('Bundle missing character.id')

  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const now = new Date().toISOString()
    const entry: StoredBundle = {
      id,
      bundle,
      verified: false,
      storedAt: now,
      lastVerifiedAt: now,
    }
    const req = store.put(entry)
    req.onsuccess = () => resolve(entry)
    req.onerror = () => reject(req.error)
  })
}

/** Get a bundle by id */
export async function getBundle(id: string): Promise<StoredBundle | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(id)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

/** List all stored bundles */
export async function listBundles(): Promise<StoredBundle[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

/** Delete a bundle */
export async function deleteBundle(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/** Verify a bundle and update stored verification status */
export async function reverifyBundle(id: string): Promise<boolean> {
  const stored = await getBundle(id)
  if (!stored) return false

  // Import the bundle type for verification
  const { verifyBundle } = await import('./character-bundle')
  const verified = await verifyBundle(stored.bundle as any)
  if (verified) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const entry = { ...stored, verified, lastVerifiedAt: new Date().toISOString() }
      const req = store.put(entry)
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  }
  return false
}

// ─── Import from file / JSON ──────────────────────────────────────

/** Import a signed bundle JSON string and store it locally */
export async function importBundle(json: string): Promise<{
  bundle: StoredBundle
  verified: boolean
  error?: string
}> {
  const { parseBundle, verifyBundle } = await import('./character-bundle')
  const parsed = parseBundle(json)
  if (parsed.error) return { bundle: {} as StoredBundle, verified: false, error: parsed.error }

  const verified = await verifyBundle(parsed.bundle)

  const stored = await publishBundle(parsed.bundle as unknown as Record<string, unknown>)
  return {
    bundle: { ...stored, verified, lastVerifiedAt: new Date().toISOString() },
    verified,
  }
}

// ─── Debug / Inspection ───────────────────────────────────────────

/** Get a summary of a stored bundle for /debug display */
export function getBundleSummary(stored: StoredBundle): {
  id: string
  name: string
  verified: boolean
  author?: string
  publishedAt: string
  tags: string[]
  nodeCount: number
} {
  const char = stored.bundle.character as Record<string, unknown> || stored.bundle
  const meta = stored.bundle.metadata as Record<string, unknown> | undefined
  const bt = char.behaviorTree as Record<string, unknown> | undefined

  return {
    id: stored.id,
    name: (char.name as string) || stored.id,
    verified: stored.verified,
    author: (meta?.author as string) || undefined,
    publishedAt: (meta?.publishedAt as string) || stored.storedAt,
    tags: Array.isArray(meta?.tags) ? meta.tags : [],
    nodeCount: countNodes(bt),
  }
}

function countNodes(node: Record<string, unknown> | undefined): number {
  if (!node) return 0
  let n = 1
  const children = node.children as Record<string, unknown>[] | undefined
  if (children) {
    n += children.reduce((s, c) => s + countNodes(c), 0)
  }
  const child = node.child as Record<string, unknown> | undefined
  if (child) n += countNodes(child)
  return n
}
