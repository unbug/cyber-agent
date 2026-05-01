/**
 * Perception BT Primitives tests
 *
 * Tests the perceive.* conditions and memorize.* actions.
 */

import { describe, it, expect, vi } from 'vitest'
import { createBlackboard } from '../../src/engine/types'
import { tick, hydrate } from '../../src/engine/executor'
import { PerceptionBus } from '../../src/perception/bus'
// Register perception nodes
import '../../src/perception/nodes'
// Register builtins
import '../../src/engine/builtins'

// Minimal mock adapter
const mockAdapter: any = {
  capabilities: () => ({}),
  selfTest: async () => ({ ok: true }),
  init: () => {},
  update: () => {},
  destroy: () => {},
  sendCommand: () => {},
  onTelemetry: () => () => {},
}

describe('Perception BT Primitives', () => {
  let bus: PerceptionBus
  let bb: any

  beforeEach(() => {
    bus = new PerceptionBus()
    bb = createBlackboard()
    bb.perceptionBus = bus
    bb.tickTimestamp = performance.now()
  })

  describe('perceive.face condition', () => {
    it('returns true when face seen within window', () => {
      bus.publish({
        category: 'see.face',
        payload: { bbox: [0, 0, 100, 100] },
        source: 'webcam',
        timestamp: performance.now() - 100,
      })
      bb.lastFace = { timestamp: performance.now() - 100 }

      const tree = hydrate({
        type: 'condition',
        check: 'perceive.face',
        args: { within: 500 },
      })

      const result = tick(tree, bb, mockAdapter)
      expect(result).toBe('success')
    })

    it('returns false when face seen outside window', () => {
      bb.lastFace = { timestamp: performance.now() - 600 }

      const tree = hydrate({
        type: 'condition',
        check: 'perceive.face',
        args: { within: 500 },
      })

      const result = tick(tree, bb, mockAdapter)
      expect(result).toBe('failure')
    })

    it('returns false when no face', () => {
      bb.lastFace = null

      const tree = hydrate({
        type: 'condition',
        check: 'perceive.face',
        args: { within: 500 },
      })

      const result = tick(tree, bb, mockAdapter)
      expect(result).toBe('failure')
    })
  })

  describe('perceive.object condition', () => {
    it('returns true when matching object seen', () => {
      bus.publish({
        category: 'see.object',
        payload: { class: 'person', confidence: 0.9 },
        source: 'webcam',
        timestamp: performance.now() - 100,
      })
      bb.lastObjects = [
        { category: 'see.object', class: 'person', timestamp: performance.now() - 100 },
      ]

      const tree = hydrate({
        type: 'condition',
        check: 'perceive.object',
        args: { class: 'person', within: 500 },
      })

      const result = tick(tree, bb, mockAdapter)
      expect(result).toBe('success')
    })

    it('returns false for non-matching class', () => {
      bb.lastObjects = [
        { category: 'see.object', class: 'chair', timestamp: performance.now() - 100 },
      ]

      const tree = hydrate({
        type: 'condition',
        check: 'perceive.object',
        args: { class: 'person', within: 500 },
      })

      const result = tick(tree, bb, mockAdapter)
      expect(result).toBe('failure')
    })
  })

  describe('perceive.word condition', () => {
    it('returns true when keyword matches', () => {
      bus.publish({
        category: 'hear.word',
        payload: { text: 'hello world', confidence: 0.85 },
        source: 'microphone',
        timestamp: performance.now() - 200,
      })
      bb.lastWord = {
        timestamp: performance.now() - 200,
        payload: { text: 'hello world' },
      }

      const tree = hydrate({
        type: 'condition',
        check: 'perceive.word',
        args: { keyword: 'hello', within: 1000 },
      })

      const result = tick(tree, bb, mockAdapter)
      expect(result).toBe('success')
    })

    it('returns false when keyword does not match', () => {
      bb.lastWord = {
        timestamp: performance.now() - 200,
        payload: { text: 'goodbye world' },
      }

      const tree = hydrate({
        type: 'condition',
        check: 'perceive.word',
        args: { keyword: 'hello', within: 1000 },
      })

      const result = tick(tree, bb, mockAdapter)
      expect(result).toBe('failure')
    })
  })

  describe('perceive.sound condition', () => {
    it('returns true for matching sound type', () => {
      bus.publish({
        category: 'hear.sound',
        payload: { type: 'clap', confidence: 0.9 },
        source: 'microphone',
        timestamp: performance.now() - 100,
      })
      bb.lastSound = {
        timestamp: performance.now() - 100,
        payload: { type: 'clap' },
      }

      const tree = hydrate({
        type: 'condition',
        check: 'perceive.sound',
        args: { type: 'clap', within: 5000 },
      })

      const result = tick(tree, bb, mockAdapter)
      expect(result).toBe('success')
    })
  })

  describe('perceive.near condition', () => {
    it('returns true when within threshold', () => {
      bb.lastProximity = {
        timestamp: performance.now() - 100,
        payload: { distance: 20 },
      }

      const tree = hydrate({
        type: 'condition',
        check: 'perceive.near',
        args: { distance: 50 },
      })

      const result = tick(tree, bb, mockAdapter)
      expect(result).toBe('success')
    })

    it('returns false when outside threshold', () => {
      bb.lastProximity = {
        timestamp: performance.now() - 100,
        payload: { distance: 100 },
      }

      const tree = hydrate({
        type: 'condition',
        check: 'perceive.near',
        args: { distance: 50 },
      })

      const result = tick(tree, bb, mockAdapter)
      expect(result).toBe('failure')
    })
  })

  describe('memorize action', () => {
    it('stores face event to blackboard', () => {
      bus.publish({
        category: 'see.face',
        payload: { bbox: [0, 0, 100, 100], emotion: 'happy' },
        source: 'webcam',
        timestamp: performance.now() - 100,
      })
      bb.lastFace = null
      bb.perceptionCount = 0

      const tree = hydrate({ type: 'action', action: 'memorize' })
      const result = tick(tree, bb, mockAdapter)

      expect(result).toBe('success')
      expect(bb.lastFace).not.toBeNull()
      expect(bb.lastFace?.category).toBe('see.face')
      expect(bb.perceptionCount).toBe(1)
    })

    it('stores object event to blackboard', () => {
      bus.publish({
        category: 'see.object',
        payload: { class: 'person', confidence: 0.9 },
        source: 'webcam',
        timestamp: performance.now() - 100,
      })
      bb.lastObjects = []
      bb.perceptionCount = 0

      const tree = hydrate({ type: 'action', action: 'memorize' })
      tick(tree, bb, mockAdapter)

      expect(bb.lastObjects?.length).toBe(1)
      expect(bb.perceptionCount).toBe(1)
    })

    it('returns failure when no recent events', () => {
      bb.perceptionCount = 0

      const tree = hydrate({ type: 'action', action: 'memorize' })
      const result = tick(tree, bb, mockAdapter)

      expect(result).toBe('failure')
    })
  })

  describe('memorize.face action', () => {
    it('stores face event when available', () => {
      bus.publish({
        category: 'see.face',
        payload: { bbox: [50, 50, 80, 80] },
        source: 'webcam',
        timestamp: performance.now() - 100,
      })
      bb.lastFace = null
      bb.perceptionCount = 0

      const tree = hydrate({ type: 'action', action: 'memorize.face' })
      const result = tick(tree, bb, mockAdapter)

      expect(result).toBe('success')
      expect(bb.lastFace?.payload.bbox).toEqual([50, 50, 80, 80])
    })

    it('returns failure when no face events', () => {
      bus.publish({
        category: 'see.object',
        payload: { class: 'person', confidence: 0.9 },
        source: 'webcam',
        timestamp: performance.now() - 100,
      })
      bb.perceptionCount = 0

      const tree = hydrate({ type: 'action', action: 'memorize.face' })
      const result = tick(tree, bb, mockAdapter)

      expect(result).toBe('failure')
    })
  })
})
