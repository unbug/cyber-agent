import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

/**
 * VLA-Hybrid Guardian — blends rule-based patrol with learned VLA observation.
 *
 * Logic:
 *   1. If policy is confident → use learned "observe" action
 *   2. Else if near edge → patrol to center
 *   3. Else → rule-based patrol with emotion modulation
 *   4. Low energy → rest
 *
 * This character demonstrates v2.2 checkbox 5: interleaving authored BT
 * behavior with a learned VLA primitive.
 */
export const behavior: CharacterBehavior = {
  characterId: 'vla-hybrid-guardian',
  tickIntervalMs: 150,
  defaults: { speed: 2, energy: 0.95 },
  tree: sel('VLA Guardian Root',
    // ── Priority 1: Use learned policy when confident ──
    seq('Learned Observe',
      cond('whenPolicyConfident', { threshold: 0.7 }),
      act('runPolicy', {
        modelId: 'pi0',
        observationSpec: {
          fields: [
            { from: 'x', to: 0, normalize: 'min-max', min: 0, max: 800 },
            { from: 'y', to: 1, normalize: 'min-max', min: 0, max: 600 },
            { from: 'rotation', to: 2, normalize: 'none' },
            { from: 'valence', to: 3, normalize: 'none' },
            { from: 'arousal', to: 4, normalize: 'none' },
            { from: 'dominance', to: 5, normalize: 'none' },
          ],
          rawObservations: [
            { name: 'front_camera', shape: [480, 640, 3], source: 'camera' },
          ],
        },
        actionSpec: {
          mappings: [
            { from: 0, to: 'base_velocity.x', scale: 1.5 },
            { from: 1, to: 'base_velocity.y', scale: 1.5 },
            { from: 2, to: 'base_velocity.z', scale: 0.5 },
            { from: 3, to: 'gimbal_pitch', scale: 2.0 },
            { from: 4, to: 'gimbal_yaw', scale: 2.0 },
          ],
          requiredLength: 5,
        },
        confidenceThreshold: 0.7,
      }),
    ),

    // ── Priority 2: Near edge → return to center ──
    seq('Edge Recovery',
      cond('atEdge'),
      act('setEmotion', { emotion: 'alert' }),
      act('moveToCenter'),
      act('drainEnergy', { rate: 0.001 }),
    ),

    // ── Priority 3: Rule-based patrol ──
    seq('Rule Patrol',
      cond('energyAbove', { threshold: 0.2 }),
      act('setEmotion', { emotion: 'vigilant' }),
      act('patrol', { waypoints: ['center', 'left', 'right', 'center'] }),
      act('drainEnergy', { rate: 0.0005 }),
      act('restoreEnergy', { rate: 0.0003 }),
    ),

    // ── Priority 4: Low energy → rest ──
    seq('Rest',
      cond('energyBelow', { threshold: 0.2 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('idle'),
      act('restoreEnergy', { rate: 0.005 }),
    ),
  ),
}
