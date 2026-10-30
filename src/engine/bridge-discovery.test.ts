import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  probeBridge,
  scanBridges,
  defaultCandidateUrls,
  getRecentBridges,
  rememberBridge,
  forgetBridge,
} from './bridge-discovery'

/** Minimal WebSocket double: constructor records the instance; tests accept or fail it. */
class FakeWS {
  static instances: FakeWS[] = []
  url: string
  readyState = 0
  onopen: (() => void) | null = null
  onmessage: ((ev: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null

  constructor(url: string) {
    this.url = url
    FakeWS.instances.push(this)
  }
  hello(platform = 'cyberbrick', name = 'Mini T') {
    this.readyState = 1
    this.onopen?.()
    this.onmessage?.({
      data: JSON.stringify({ type: 'hello', payload: { platform, name, port: 8765 } }),
    })
  }
  junk() {
    this.onmessage?.({ data: 'not json' })
  }
  fail() {
    this.onerror?.()
    this.onclose?.()
  }
  close() {
    this.readyState = 3
  }
}

beforeEach(() => {
  FakeWS.instances = []
  vi.stubGlobal('WebSocket', FakeWS as unknown as typeof WebSocket)
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('probeBridge', () => {
  it('resolves with bridge info on hello', async () => {
    const p = probeBridge('ws://192.168.1.50:8765')
    const ws = FakeWS.instances[0]!
    ws.hello('cyberbrick', 'Mini T')
    const info = await p
    expect(info).toEqual({
      url: 'ws://192.168.1.50:8765',
      platform: 'cyberbrick',
      name: 'Mini T',
      discoveredAt: expect.any(Number),
    })
  })

  it('accepts legacy status messages too', async () => {
    const p = probeBridge('ws://host:8766')
    const ws = FakeWS.instances[0]!
    ws.readyState = 1
    ws.onmessage?.({
      data: JSON.stringify({ type: 'status', payload: { platform: 'robomaster', state: 'ready' } }),
    })
    const info = await p
    expect(info?.platform).toBe('robomaster')
    expect(info?.name).toBe('robomaster') // falls back to platform when no name
  })

  it('ignores junk messages and still resolves on later hello', async () => {
    const p = probeBridge('ws://host:8765')
    const ws = FakeWS.instances[0]!
    ws.junk()
    ws.hello('dummy', 'dummy')
    expect((await p)?.platform).toBe('dummy')
  })

  it('resolves null on connection error', async () => {
    const p = probeBridge('ws://dead:8765')
    FakeWS.instances[0]!.fail()
    expect(await p).toBeNull()
  })

  it('resolves null on timeout', async () => {
    vi.useFakeTimers()
    const p = probeBridge('ws://silent:8765', 100)
    vi.advanceTimersByTime(150)
    expect(await p).toBeNull()
    vi.useRealTimers()
  })

  it('rejects non-ready status quickly', async () => {
    const p = probeBridge('ws://busy:8765')
    const ws = FakeWS.instances[0]!
    ws.onmessage?.({
      data: JSON.stringify({ type: 'status', payload: { platform: 'x', state: 'busy' } }),
    })
    expect(await p).toBeNull()
  })

  it('never rejects when the constructor throws', async () => {
    vi.stubGlobal(
      'WebSocket',
      class {
        constructor() {
          throw new Error('bad url')
        }
      },
    )
    expect(await probeBridge('not-a-url')).toBeNull()
  })
})

describe('scanBridges', () => {
  it('finds live bridges in parallel and drops dead ones', async () => {
    const p = scanBridges(['ws://a:8765', 'ws://b:8765'])
    // defaults (localhost probes) are appended automatically
    const a = FakeWS.instances.find((w) => w.url === 'ws://a:8765')!
    const b = FakeWS.instances.find((w) => w.url === 'ws://b:8765')!
    a.hello('cyberbrick', 'Mini T')
    b.fail()
    const hits = await p
    expect(hits).toHaveLength(1)
    expect(hits[0]!.url).toBe('ws://a:8765')
  })

  it('dedupes URLs (recent + extra + defaults)', () => {
    const cands = defaultCandidateUrls(['ws://127.0.0.1:8765', 'ws://x:1'])
    const dupes = cands.filter((u) => u === 'ws://127.0.0.1:8765')
    expect(dupes).toHaveLength(1)
    expect(cands).toContain('ws://x:1')
    expect(cands.length).toBe(new Set(cands).size)
  })
})

describe('recent bridges', () => {
  it('remembers newest first, dedupes by url, caps at 5', () => {
    for (let i = 0; i < 7; i++) {
      rememberBridge({ url: `ws://r${i}:8765`, platform: 'ws', name: `R${i}` })
    }
    const list = getRecentBridges()
    expect(list).toHaveLength(5)
    expect(list[0]!.url).toBe('ws://r6:8765')

    rememberBridge({ url: 'ws://r4:8765', platform: 'cyberbrick', name: 'R4 again' })
    const again = getRecentBridges()
    expect(again).toHaveLength(5)
    expect(again[0]!.url).toBe('ws://r4:8765')
    expect(again[0]!.name).toBe('R4 again')
  })

  it('forgets a bridge by url', () => {
    rememberBridge({ url: 'ws://gone:8765', platform: 'ws', name: 'gone' })
    expect(getRecentBridges()).toHaveLength(1)
    forgetBridge('ws://gone:8765')
    expect(getRecentBridges()).toHaveLength(0)
  })

  it('survives corrupt storage', () => {
    localStorage.setItem('cyberagent.recentBridges', '{definitely not an array')
    expect(getRecentBridges()).toEqual([])
  })
})
