import { describe, it, expect } from 'vitest'
import { RoomSession } from './room'
import type { RobotAdapterV2 } from '@cyber-agent/sdk/adapter/contract'
import type { BehaviorNodeDef } from './types'

class FakeRobot implements RobotAdapterV2 {
  readonly type = 'fake'
  name = 'fake'
  readonly contractVersion = 'v2' as const
  commands: Array<{ type: string; payload: Record<string, unknown> }> = []
  connectImpl: () => Promise<void> = () => Promise.resolve()
  init() {}
  update() {}
  destroy() {}
  sendCommand(c: { type: string; payload: Record<string, unknown> }) {
    this.commands.push({ type: c.type, payload: c.payload })
  }
  capabilities() {
    return { motors: false, led: false, sound: false } as never
  }
  connect() {
    return this.connectImpl()
  }
  disconnect() {
    return Promise.resolve()
  }
  onTelemetry() {
    return () => undefined
  }
  selfTest() {
    return { status: 'healthy', checks: [] } as never
  }
}

const idleTree: BehaviorNodeDef = { type: 'action', name: 'noop' } as unknown as BehaviorNodeDef

function roomWithFakes() {
  const made: FakeRobot[] = []
  const room = new RoomSession((url) => {
    const r = new FakeRobot()
    r.name = url
    made.push(r)
    void url
    return r
  })
  return { room, made }
}

describe('RoomSession', () => {
  it('adds loopback + bridge members and snapshots both', async () => {
    const { room, made } = roomWithFakes()
    const a = room.addMember({ characterId: 'puppy', tree: idleTree, emoji: '🐶' })
    const b = room.addMember({ characterId: 'cat', tree: idleTree, emoji: '🐱', url: 'ws://x:8765' })
    expect(room.memberCount).toBe(2)

    await Promise.resolve() // let the fake connect promise settle
    const snap = room.snapshot()
    expect(snap.members.map((m) => m.id).sort()).toEqual([a, b].sort())
    const cat = snap.members.find((m) => m.id === b)!
    expect(cat.link).toBe('ok')
    expect(made).toHaveLength(1) // loopback used no transport
    await room.destroy()
  })

  it('marks link error when the bridge connect fails', async () => {
    const r = new RoomSession(() => {
      const f = new FakeRobot()
      f.connectImpl = () => Promise.reject(new Error('ECONNREFUSED'))
      return f
    })
    const id = r.addMember({ characterId: 'puppy', tree: idleTree, url: 'ws://dead:1' })
    await new Promise((res) => setTimeout(res, 10))
    expect(r.snapshot().members.find((m) => m.id === id)!.link).toBe('error')
    expect(r.snapshot().members.find((m) => m.id === id)!.lastError).toContain('ECONNREFUSED')
    await r.destroy()
  })

  it('runs ticks and embodies motion to every member', async () => {
    const { room } = roomWithFakes()
    const moveTree = {
      type: 'action',
      name: 'setBlackboard',
      args: { key: 'x', value: 999 },
    } as unknown as BehaviorNodeDef
    room.addMember({ characterId: 'puppy', tree: idleTree })
    room.addMember({ characterId: 'cat', tree: moveTree, url: 'ws://y:8765' })
    room.start()
    await new Promise((res) => setTimeout(res, 150))
    const snap = room.snapshot()
    expect(snap.running).toBe(true)
    expect(snap.ticks).toBeGreaterThan(1)
    room.stop()
    await room.destroy()
  })

  it('estopAll sends stop to every member robot (3x)', async () => {
    const { room, made } = roomWithFakes()
    room.addMember({ characterId: 'cat', tree: idleTree, url: 'ws://z:8765' })
    room.estopAll()
    await new Promise((res) => setTimeout(res, 400))
    const stops = made[0]!.commands.filter((c) => c.type === 'stop')
    expect(stops.length).toBeGreaterThanOrEqual(3)
    expect(room.running).toBe(false)
    await room.destroy()
  })

  it('removing a member stops it and shrinks the world', async () => {
    const { room, made } = roomWithFakes()
    const id = room.addMember({ characterId: 'puppy', tree: idleTree, url: 'ws://w:1' })
    room.removeMember(id)
    expect(room.memberCount).toBe(0)
    expect(room.world.getAgent(id)).toBeUndefined()
    expect(made[0]!.commands.some((c) => c.type === 'stop')).toBe(true)
    await room.destroy()
  })

  it('exposes the shared world on blackboards for social primitives', async () => {
    const { room } = roomWithFakes()
    room.addMember({ characterId: 'puppy', tree: idleTree })
    const snap = room.snapshot()
    const id = snap.members[0]!.id
    expect((room.world.getAgent(id)!.blackboard as Record<string, unknown>).world).toBe(room.world)
    await room.destroy()
  })
})
