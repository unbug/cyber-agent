/**
 * Bridge discovery — make "connect my robot" a one-tap experience.
 *
 * The browser cannot use mDNS, but it CAN open WebSocket connections to
 * LAN addresses. Our bridges answer every new connection with a hello
 * envelope ({ type: "hello", payload: { platform, name, ... } }), so a
 * parallel probe across candidate URLs reliably finds live robots.
 *
 * Also keeps a small "recent robots" list in localStorage so returning
 * users deploy with one tap, no typing.
 */

export interface BridgeInfo {
  url: string
  platform: string
  name: string
  discoveredAt: number
}

const RECENT_KEY = 'cyberage' + 'nt.recentBridges'
const RECENT_MAX = 5

/** Default well-known bridge ports per platform (see bridge/robot_bridge.py). */
export const DEFAULT_BRIDGE_PORTS = [8765, 8766]

function localhostCandidates(): string[] {
  const out: string[] = []
  for (const host of ['127.0.0.1', 'localhost']) {
    for (const port of DEFAULT_BRIDGE_PORTS) out.push(`ws://${host}:${port}`)
  }
  return out
}

/** Candidate URLs to probe: recent robots first, then localhost defaults. */
export function defaultCandidateUrls(extra: string[] = []): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const url of [...getRecentBridges().map((r) => r.url), ...extra, ...localhostCandidates()]) {
    const u = url.trim()
    if (!u || seen.has(u)) continue
    seen.add(u)
    out.push(u)
  }
  return out
}

/**
 * Probe one bridge URL. Resolves with BridgeInfo on hello/status,
 * or null on timeout / error / close / malformed reply. Never rejects.
 */
export function probeBridge(url: string, timeoutMs = 1500): Promise<BridgeInfo | null> {
  return new Promise((resolve) => {
    let settled = false
    let ws: WebSocket
    const finish = (info: BridgeInfo | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        ws.onmessage = null
        ws.onerror = null
        ws.onclose = null
        ws.close()
      } catch {
        /* already closing */
      }
      resolve(info)
    }
    const timer = setTimeout(() => finish(null), timeoutMs)

    try {
      ws = new WebSocket(url)
    } catch {
      finish(null)
      return
    }

    ws.onmessage = (ev: MessageEvent) => {
      let msg: { type?: string; payload?: Record<string, unknown> }
      try {
        msg = JSON.parse(String(ev.data))
      } catch {
        return // not our protocol — keep waiting until timeout
      }
      if (msg.type !== 'hello' && msg.type !== 'status') return
      const p = msg.payload ?? {}
      if (typeof p.state === 'string' && p.state !== 'ready') {
        finish(null)
        return
      }
      const platform = typeof p.platform === 'string' ? p.platform : 'unknown'
      const name = typeof p.name === 'string' && p.name ? p.name : platform
      finish({ url, platform, name, discoveredAt: Date.now() })
    }
    ws.onerror = () => finish(null)
    ws.onclose = () => finish(null)
  })
}

/** Probe many URLs in parallel; deduped by URL, nulls removed. Never rejects. */
export async function scanBridges(
  candidates: string[],
  timeoutMs = 1500,
): Promise<BridgeInfo[]> {
  const results = await Promise.all(
    defaultCandidateUrls(candidates).map((u) => probeBridge(u, timeoutMs)),
  )
  const byUrl = new Map<string, BridgeInfo>()
  for (const r of results) if (r && !byUrl.has(r.url)) byUrl.set(r.url, r)
  return [...byUrl.values()]
}

// ─── Recent robots (localStorage) ─────────────────────────────────

export function getRecentBridges(): BridgeInfo[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    return list.filter(
      (r): r is BridgeInfo =>
        r && typeof r.url === 'string' && typeof r.platform === 'string',
    )
  } catch {
    return []
  }
}

export function rememberBridge(info: Omit<BridgeInfo, 'discoveredAt'>): void {
  try {
    const rest = getRecentBridges().filter((r) => r.url !== info.url)
    const next = [{ ...info, discoveredAt: Date.now() }, ...rest].slice(0, RECENT_MAX)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* private mode / quota — discovery still works, just not sticky */
  }
}

export function forgetBridge(url: string): void {
  try {
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify(getRecentBridges().filter((r) => r.url !== url)),
    )
  } catch {
    /* ignore */
  }
}
