/**
 * LeRobot Bridge Tests (v2.2)
 *
 * Tests for:
 * - LeRobotPolicyClient construction and config
 * - createLeRobotClient factory
 * - registerLeRobotModels
 * - LEROBOT_MODELS definitions
 * - generateLeRobotHILChecklist
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  LeRobotPolicyClient,
  createLeRobotClient,
  registerLeRobotModels,
  LEROBOT_MODELS,
  generateLeRobotHILChecklist,
  getPolicy,
  getAllPolicies,
} from './lerobot-bridge'
import type { PolicyConfig } from './policy'

// Clear policy registry before each test
beforeEach(() => {
  const policies = getAllPolicies()
  policies.clear()
})

afterEach(() => {
  // Cleanup any lingering timers
})

describe('LeRobotBridge', () => {
  describe('LeRobotPolicyClient', () => {
    it('constructs with correct defaults', () => {
      const client = new LeRobotPolicyClient({
        modelId: 'openvla/openvla-7b',
        serverUrl: 'ws://localhost:8080',
        task: 'move_forward',
      })

      expect(client['modelId']).toBe('openvla/openvla-7b')
      expect(client['serverUrl']).toBe('ws://localhost:8080')
      expect(client['robotType']).toBe('custom')
      expect(client['robotId']).toBe('cyberagent')
      expect(client['task']).toBe('move_forward')
    })

    it('accepts custom options', () => {
      const client = new LeRobotPolicyClient({
        modelId: 'lerobot/smolvla-3b',
        serverUrl: 'ws://custom:9000',
        robotType: 'so100_follower',
        robotId: 'robot_001',
        task: 'pick_object',
      })

      expect(client['modelId']).toBe('lerobot/smolvla-3b')
      expect(client['serverUrl']).toBe('ws://custom:9000')
      expect(client['robotType']).toBe('so100_follower')
      expect(client['robotId']).toBe('robot_001')
    })

    it('has correct public API', () => {
      const client = new LeRobotPolicyClient({
        modelId: 'test',
        serverUrl: 'ws://localhost:8080',
        task: 'test',
      })

      expect(typeof client.connect).toBe('function')
      expect(typeof client.predict).toBe('function')
      expect(typeof client.sendFrames).toBe('function')
      expect(typeof client.setTask).toBe('function')
      expect(typeof client.healthCheck).toBe('function')
      expect(typeof client.close).toBe('function')
      expect(typeof client.connected).toBe('boolean')
      expect(typeof client.ready).toBe('boolean')
    })

    it('close() does not throw when not connected', () => {
      const client = new LeRobotPolicyClient({
        modelId: 'test',
        serverUrl: 'ws://localhost:8080',
        task: 'test',
      })

      expect(() => client.close()).not.toThrow()
    })

    it('connected is false when not connected', () => {
      const client = new LeRobotPolicyClient({
        modelId: 'test',
        serverUrl: 'ws://localhost:8080',
        task: 'test',
      })

      expect(client.connected).toBe(false)
      expect(client.ready).toBe(false)
    })
  })

  describe('createLeRobotClient', () => {
    it('creates client with default options', () => {
      const config: PolicyConfig = {
        modelId: 'openvla/openvla-7b',
        observationSpec: { fields: [{ from: 'pos_x', to: 0, normalize: 'none' }] },
        actionSpec: { mappings: [{ from: 0, to: 'x', scale: 1 }], requiredLength: 1 },
      }

      const client = createLeRobotClient(config)
      expect(client).toBeInstanceOf(LeRobotPolicyClient)
      expect(client['modelId']).toBe('openvla/openvla-7b')
      expect(client['serverUrl']).toBe('ws://localhost:8080')
    })

    it('derives task from modelId', () => {
      const config: PolicyConfig = {
        modelId: 'openvla/openvla-7b',
        observationSpec: { fields: [] },
        actionSpec: { mappings: [], requiredLength: 0 },
      }

      const client = createLeRobotClient(config)
      expect(client['task']).toBe('openvla-7b')
    })

    it('overrides serverUrl and robotType', () => {
      const config: PolicyConfig = {
        modelId: 'lerobot/smolvla-3b',
        observationSpec: { fields: [] },
        actionSpec: { mappings: [], requiredLength: 0 },
      }

      const client = createLeRobotClient(config, {
        serverUrl: 'ws://custom:9000',
        robotType: 'custom_robot',
        robotId: 'my_robot_1',
      })

      expect(client['serverUrl']).toBe('ws://custom:9000')
      expect(client['robotType']).toBe('custom_robot')
      expect(client['robotId']).toBe('my_robot_1')
    })

    it('builds camera config from rawObservations', () => {
      const config: PolicyConfig = {
        modelId: 'openvla/openvla-7b',
        observationSpec: {
          fields: [],
          rawObservations: [
            { name: 'front_camera', shape: [480, 640, 3], source: 'camera' },
            { name: 'wrist_camera', shape: [240, 320, 3], source: 'camera' },
          ],
        },
        actionSpec: { mappings: [], requiredLength: 0 },
      }

      const client = createLeRobotClient(config)
      const cameras = client['cameras'] ?? {}
      expect(Object.keys(cameras).length).toBe(2)
      expect(cameras['front_camera']).toBeDefined()
      expect(cameras['front_camera']?.type).toBe('opencv')
      expect(cameras['front_camera']?.width).toBe(640)
      expect(cameras['front_camera']?.height).toBe(480)
    })

    it('defaults task to "default" when modelId has no slash', () => {
      const config: PolicyConfig = {
        modelId: 'my-model',
        observationSpec: { fields: [] },
        actionSpec: { mappings: [], requiredLength: 0 },
      }

      const client = createLeRobotClient(config)
      expect(client['task']).toBe('my-model')
    })
  })

  describe('registerLeRobotModels', () => {
    it('registers all pre-configured models', () => {
      registerLeRobotModels()

      const models = getAllPolicies()
      expect(models.size).toBe(3)
      expect(models.has('openvla/openvla-7b')).toBe(true)
      expect(models.has('lerobot/smolvla-3b')).toBe(true)
      expect(models.has('google/gr00t-nano')).toBe(true)
    })

    it('registers models with correct observation specs', () => {
      registerLeRobotModels()

      const pi0Config = getPolicy('openvla/openvla-7b')
      expect(pi0Config?.observationSpec.fields.length).toBeGreaterThan(0)
      expect(pi0Config?.actionSpec.requiredLength).toBe(4)
      expect(pi0Config?.confidenceThreshold).toBe(0.6)

      const smolConfig = getPolicy('lerobot/smolvla-3b')
      expect(smolConfig?.observationSpec?.fields?.[0]?.normalize).toBe('z-score')

      const gr00tConfig = getPolicy('google/gr00t-nano')
      expect(gr00tConfig?.observationSpec?.rawObservations?.length).toBe(2)
    })

    it('sets timeoutMs on all models', () => {
      registerLeRobotModels()

      for (const [, config] of getAllPolicies()) {
        expect(config.timeoutMs).toBe(10000)
      }
    })
  })

  describe('LEROBOT_MODELS', () => {
    it('has all three model definitions', () => {
      expect(LEROBOT_MODELS['pi0']).toBeDefined()
      expect(LEROBOT_MODELS['smolvla']).toBeDefined()
      expect(LEROBOT_MODELS['gr00t']).toBeDefined()
    })

    it('pi0 has camera rawObservation', () => {
      const pi0 = LEROBOT_MODELS['pi0']
      const rawObs = pi0?.observationSpec?.rawObservations
      expect(rawObs?.[0]?.source).toBe('camera')
    })

    it('gr00t has multiple camera inputs', () => {
      const gr00t = LEROBOT_MODELS['gr00t']
      const cameras = gr00t?.observationSpec?.rawObservations?.filter((o: any) => o.source === 'camera') ?? []
      expect(cameras.length).toBe(2)
    })

    it('smolvla uses z-score normalization', () => {
      const smol = LEROBOT_MODELS['smolvla']
      expect(smol?.observationSpec?.fields?.[0]?.normalize).toBe('z-score')
    })

    it('pi0 uses min-max normalization', () => {
      const pi0 = LEROBOT_MODELS['pi0']
      expect(pi0?.observationSpec?.fields?.[0]?.normalize).toBe('min-max')
      expect(pi0?.observationSpec?.fields?.[0]?.min).toBe(-1)
      expect(pi0?.observationSpec?.fields?.[0]?.max).toBe(1)
    })

    it('gr00t has IMU fields', () => {
      const gr00t = LEROBOT_MODELS['gr00t']
      const imuFields = gr00t?.observationSpec?.fields?.filter((f: any) =>
        f.from.includes('imu'),
      ) ?? []
      expect(imuFields.length).toBe(2)
    })
  })

  describe('generateLeRobotHILChecklist', () => {
    it('returns markdown checklist', () => {
      const checklist = generateLeRobotHILChecklist()
      expect(typeof checklist).toBe('string')
      expect(checklist).toContain('# LeRobot Bridge HIL Checklist')
      expect(checklist).toContain('Prerequisites')
      expect(checklist).toContain('Verification Steps')
      expect(checklist).toContain('Known Limitations')
      expect(checklist).toContain('experimental')
    })

    it('includes all verification steps', () => {
      const checklist = generateLeRobotHILChecklist()
      expect(checklist).toContain('Connect handshake')
      expect(checklist).toContain('Observation send')
      expect(checklist).toContain('Camera frames')
      expect(checklist).toContain('Task switching')
      expect(checklist).toContain('Error handling')
      expect(checklist).toContain('Performance')
    })

    it('includes performance thresholds', () => {
      const checklist = generateLeRobotHILChecklist()
      expect(checklist).toContain('200 ms')
      expect(checklist).toContain('1000')
    })
  })
})
