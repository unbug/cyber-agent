# Cookbook: Shipping a Learned Skill Inside a Hand-Authored Character

> **v2.2 — VLA / Policy Slot-in**
>
> This guide shows how to blend a **hand-authored Behavior Tree** (personality,
> rules, emotion) with a **learned VLA policy** (Pi0 / SmolVLA / GR00T) so
> the character *chooses* when to use the learned skill and when to fall back
> to authored behavior.

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    Character Definition               │
│                                                       │
│  ┌─────────────┐    ┌──────────────┐                │
│  │ Authored BT  │    │ Learned VLA  │                │
│  │ (rules,      │    │ (Pi0/SmolVLA │                │
│  │ personality, │    │  via LeRobot │                │
│  │ emotion)     │    │  bridge)     │                │
│  └──────┬──────┘    └──────┬───────┘                │
│         │                  │                         │
│         └──────┬───────────┘                         │
│                ▼                                      │
│     ┌─────────────────────┐                          │
│     │  WhenPolicyConfident│  ← Selector branch       │
│     │  (confidence ≥ 0.7) │                          │
│     └────────┬────────────┘                          │
│              ▼                                       │
│     ┌─────────────────────┐                          │
│     │  runPolicy(<model>) │  ← BT action node       │
│     └────────┬────────────┘                          │
│              ▼                                       │
│     ┌─────────────────────┐                          │
│     │  RobotAdapter       │  ← sendCommand()         │
│     └─────────────────────┘                          │
└──────────────────────────────────────────────────────┘
```

**Key idea**: The BT is the *director*. It decides *when* to call the policy
and *when* to use authored behavior. The policy is just another action node.

---

## 2. Registering Policy Models

Before any character can use a learned skill, register the policy models:

```typescript
import { registerLeRobotModels } from '@/engine/lerobot-bridge'

// Register all pre-configured models (Pi0, SmolVLA, GR00T)
registerLeRobotModels()
```

This populates the internal `policyRegistry` with:

| Model ID | Description | Observation Spec | Action Spec |
|----------|-------------|-----------------|-------------|
| `pi0` | Google Pi0 VLA | 6 sensor fields + 2 cameras | 5-dim (vel × 3, gripper × 2) |
| `smolvla` | SmolVLA 500M | 6 sensor fields + 2 cameras | 5-dim (vel × 3, gripper × 2) |
| `gr00t` | NVIDIA GR00T | 6 sensor fields + 2 cameras | 5-dim (vel × 3, gripper × 2) |

---

## 3. Sample Character: VLA-Hybrid Guardian

Below is a complete character that **interleaves** authored patrol behavior
with a learned "observe" skill.

### 3.1 Character Definition (`character.ts`)

```typescript
import type { Character } from '../../agents/types'

export const character: Character = {
  id: 'vla-hybrid-guardian',
  name: 'VLA Hybrid Guardian',
  emoji: '🤖',
  category: 'guardian',
  description: 'A patrol guardian that uses a learned VLA policy for fine-grained observation when confidence is high, falling back to rule-based patrol otherwise.',
  tags: ['hybrid', 'vla', 'guardian', 'patrol', 'learned-skill'],
  personality: ['vigilant', 'methodical', 'adaptive'],
  difficulty: 'hard',
  compatibleAdapters: ['robo-master-v2', 'esp32', 'unitree-go1'],
  emotionPreset: 'alert',
}
```

### 3.2 Behavior Tree (`behavior.ts`)

```typescript
import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../../helpers'

/**
 * VLA-Hybrid Guardian — blends rule-based patrol with learned VLA observation.
 *
 * Logic:
 *   1. If policy is confident → use learned "observe" action
 *   2. Else if near edge → patrol to center
 *   3. Else → rule-based patrol with emotion modulation
 *   4. Low energy → rest
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
```

### 3.3 Registering the Character

```typescript
import { registerCharacter } from '../../agents'
import { character } from './character'
import { behavior } from './behavior'

registerCharacter(character, behavior)
```

---

## 4. Pi0 / SmolVLA / GR00T Configuration Examples

### 4.1 Pi0 (Google Pi0 VLA)

Pi0 is designed for **dual-arm manipulation** but works well for
single-arm observation tasks too.

```typescript
// Pi0 config — fine-grained observation with camera input
const pi0Config = {
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
  confidenceThreshold: 0.65,
  timeoutMs: 8000,
}
```

### 4.2 SmolVLA (500M parameter)

SmolVLA is smaller and faster — good for **real-time** on edge devices.

```typescript
// SmolVLA config — faster inference, slightly lower accuracy
const smolvlaConfig = {
  modelId: 'smolvla',
  observationSpec: {
    fields: [
      { from: 'x', to: 0, normalize: 'min-max', min: 0, max: 800 },
      { from: 'y', to: 1, normalize: 'min-max', min: 0, max: 600 },
      { from: 'rotation', to: 2, normalize: 'none' },
      { from: 'valence', to: 3, normalize: 'none' },
    ],
    rawObservations: [
      { name: 'front_camera', shape: [240, 320, 3], source: 'camera' },
    ],
  },
  actionSpec: {
    mappings: [
      { from: 0, to: 'base_velocity.x', scale: 2.0 },
      { from: 1, to: 'base_velocity.y', scale: 2.0 },
      { from: 2, to: 'base_velocity.z', scale: 1.0 },
      { from: 3, to: 'led_color', scale: 1.0 },
    ],
    requiredLength: 4,
  },
  confidenceThreshold: 0.6,
  timeoutMs: 5000,
}
```

### 4.3 GR00T (NVIDIA GR00T)

GR00T is optimized for **humanoid** robots but can be adapted for
quadrupeds with minor observation spec changes.

```typescript
// GR00T config — humanoid-optimized, adapt for quadruped
const gr00tConfig = {
  modelId: 'gr00t',
  observationSpec: {
    fields: [
      { from: 'x', to: 0, normalize: 'min-max', min: 0, max: 800 },
      { from: 'y', to: 1, normalize: 'min-max', min: 0, max: 600 },
      { from: 'rotation', to: 2, normalize: 'none' },
      { from: 'valence', to: 3, normalize: 'none' },
      { from: 'arousal', to: 4, normalize: 'none' },
      { from: 'dominance', to: 5, normalize: 'none' },
      { from: 'imu_pitch', to: 6, normalize: 'none' },
      { from: 'imu_roll', to: 7, normalize: 'none' },
    ],
    rawObservations: [
      { name: 'front_camera', shape: [480, 640, 3], source: 'camera' },
      { name: 'wrist_camera', shape: [240, 320, 3], source: 'camera' },
    ],
  },
  actionSpec: {
    mappings: [
      { from: 0, to: 'base_velocity.x', scale: 1.5 },
      { from: 1, to: 'base_velocity.y', scale: 1.5 },
      { from: 2, to: 'base_velocity.z', scale: 1.5 },
      { from: 3, to: 'gripper.open', scale: 1.0 },
      { from: 4, to: 'gripper.force', scale: 10.0 },
    ],
    requiredLength: 5,
  },
  confidenceThreshold: 0.65,
  timeoutMs: 10000,
}
```

---

## 5. LeRobot Bridge Setup

### 5.1 Server Side (Python)

```bash
# Install LeRobot
pip install lerobot

# Start the policy server
python -m lerobot.scripts.server.policy_server \
  --host 0.0.0.0 \
  --port 8080 \
  --model pi0 \
  --robot-type robo_master_s1
```

### 5.2 Browser Side (CyberAgent)

```typescript
import { createLeRobotClient, registerLeRobotModels } from '@/engine/lerobot-bridge'

// 1. Register models
registerLeRobotModels()

// 2. Create client
const client = createLeRobotClient({
  modelId: 'pi0',
  serverUrl: 'ws://localhost:8080',
  robotType: 'robo_master_s1',
  cameras: {
    front: { type: 'opencv', index_or_path: 0, width: 640, height: 480, fps: 30 },
  },
  task: 'observe_and_report',
})

// 3. Connect
await client.connect()

// 4. Use in BT via runPolicy action (auto-registers)
```

### 5.3 Camera Frame Capture (Browser)

```typescript
// Capture camera frame and send to policy server
async function captureAndSendFrame(
  client: LeRobotPolicyClient,
  videoEl: HTMLVideoElement,
): Promise<void> {
  const canvas = document.createElement('canvas')
  canvas.width = videoEl.videoWidth
  canvas.height = videoEl.videoHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(videoEl, 0, 0)

  // Convert to base64 JPEG
  const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]

  await client.sendObservation({
    frames: { front: base64 },
    timestamp: performance.now(),
  })
}
```

---

## 6. Debugging Policy-Enabled Characters

### 6.1 /debug Page — PolicyInputPanel

The `/debug` page includes a **PolicyInputPanel** that shows:

- **Observation Input**: Normalized fields the policy received
- **Action Output**: Action vector with positive/negative coloring
- **Confidence Indicator**: Green ≥ 70%, amber < 70%
- **Frame Selector**: Scroll through historical policy invocations
- **Source Node**: Which BT node triggered the policy

### 6.2 Tracer Events

Policy invocations emit tracer events:

| Event Type | When | Payload |
|-----------|------|---------|
| `policy.invoke` | Before inference | `{ modelId, confidence, latencyMs, actionVector, observation }` |
| `policy.low_confidence` | Confidence < threshold | `{ confidence, threshold }` |
| `policy.success` | Action delivered | `{ actionVector, command }` |
| `policy.failure` | Error during inference | `{ error }` |

### 6.3 Blackboard Fields

Policy results are written to the blackboard for visibility:

```typescript
bb._policyAction = [0.5, -0.3, 0.1, 0.8, 0.6]  // action vector
bb._policyConfidence = 0.85                        // confidence score
bb._policyModelId = 'pi0'                          // model ID
```

---

## 7. Interleaving Strategy: When to Use Policy vs Authored

| Scenario | Use Policy | Use Authored |
|----------|-----------|-------------|
| Fine-grained manipulation | ✅ | ❌ |
| Simple patrol | ❌ | ✅ |
| Emotion-driven behavior | ❌ | ✅ |
| Complex navigation in unknown terrain | ✅ | ❌ |
| Low energy / rest | ❌ | ✅ |
| Social interaction (greet, flee) | ❌ | ✅ |
| Emergency stop | ❌ (rule) | ❌ (rule) |

**Rule of thumb**: Use the policy for skills that are **hard to hand-code**
(fine motor control, perception-driven navigation) and authored behavior for
**personality-driven** decisions (emotion, social, rules).

---

## 8. Safety Considerations

1. **Confidence threshold**: Always set `confidenceThreshold` — never trust
   low-confidence policy outputs.
2. **Timeout**: Set `timeoutMs` to prevent hanging on slow inference.
3. **Zero-action fallback**: If the policy fails, the character falls back
   to the next BT branch (authored behavior).
4. **HIL verification**: Run the HIL checklist before deploying to real hardware.
5. **Experimental flag**: All VLA features are marked `experimental` until
   real-hardware transfer validation is complete.

---

## 9. Checklist: Shipping a Hybrid Character

Use this checklist when authoring a new hybrid character:

- [ ] Character definition in `src/agents/<name>/character.ts`
- [ ] Behavior tree in `src/agents/<name>/behavior.ts`
- [ ] `runPolicy` node with valid `modelId` in BT tree
- [ ] `observationSpec` matches policy's expected input shape
- [ ] `actionSpec` mappings match robot adapter's command format
- [ ] `confidenceThreshold` set appropriately (≥ 0.6)
- [ ] Fallback authored behavior in later BT branches
- [ ] `WhenPolicyConfident` used as selector guard
- [ ] Character registered in `src/agents/index.ts`
- [ ] Character appears in gallery (compatibleAdapters populated)
- [ ] `/debug` shows policy panel when character is active
- [ ] HIL checklist in `docs/hil/<adapter>/CHECKLIST.md`
- [ ] ⚠️ `experimental` flag documented for sim-only features

---

## 10. Troubleshooting

### Policy not firing

1. Check `registerLeRobotModels()` was called
2. Verify `modelId` matches a registered policy
3. Check `/debug` → PolicyInputPanel for `policy.invoke` events
4. Verify confidence threshold is not too high

### Low confidence

1. Lower `confidenceThreshold` temporarily
2. Check observation spec matches policy expectations
3. Verify camera frames are being captured correctly
4. Check server-side model loading status

### Action vector looks wrong

1. Verify `actionSpec` mappings match the robot adapter
2. Check `scale` and `offset` values
3. Verify `requiredLength` matches policy output dimension
4. Check `/debug` → PolicyInputPanel → Action Output bars

### WebSocket disconnects

1. Check LeRobot server is running
2. Verify `serverUrl` matches server address
3. Check auto-reconnect is working (look for reconnect logs)
4. Verify firewall allows WebSocket connections
