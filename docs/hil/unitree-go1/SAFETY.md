# Unitree Go1 / Go2 Safety Envelope

## Overview

This document defines the **safety envelope** for the Unitree Go1 and Go2
quadruped robots as controlled via the CyberAgent `UnitreeGo1Adapter`.

All limits are hard-clamped in the adapter code. Violations are logged and
the command is either clamped to the nearest safe value or rejected.

---

## 1. Motion Limits

### Maximum Speed

| Robot | Max Speed | Notes |
|-------|-----------|-------|
| Go1   | 1.5 m/s   | Default gait (trot walk) |
| Go2   | 2.0 m/s   | Enhanced motor torque |

Speed is expressed as a percentage (0–100) in commands. The adapter maps:
- 0% → 0 m/s (stop)
- 100% → max speed for the robot model

### Maximum Rotation Speed

| Robot | Max Rotation | Notes |
|-------|-------------|-------|
| Go1   | 180°/s      | In-place rotation |
| Go2   | 180°/s      | Same as Go1 |

### Body Height

| Parameter | Value | Notes |
|-----------|-------|-------|
| Default   | 0.28 m | Factory nominal |
| Max adj.  | +0.28 m | Raises body up to 0.56 m total |
| Min adj.  | -0.18 m | Lowers body to 0.10 m total |

**Safety**: Body height changes are rate-limited on the robot side. Rapid
extreme changes may trigger instability — the adapter does NOT currently
implement rate limiting.

### Foot Raise Height

Default swing height: 0.08 m (from default leg position).
Range: -0.05 m to +0.15 m relative to default.

---

## 2. Battery Safety

### Go1 Battery

| Parameter | Value | Notes |
|-----------|-------|-------|
| Nominal   | 25.2 V | 7S LiPo (3.6V/cell × 7) |
| Max       | 25.2 V | Fully charged |
| Min safe  | 22.0 V | ~20% remaining — auto e-stop below this |
| Critical  | 21.0 V | ~5% remaining — emergency shutdown |

### Go2 Battery

| Parameter | Value | Notes |
|-----------|-------|-------|
| Nominal   | 25.2 V | 7S LiPo |
| Max       | 25.2 V | Fully charged |
| Min safe  | 21.6 V | ~20% remaining — auto e-stop below this |
| Critical  | 20.5 V | ~5% remaining — emergency shutdown |

**Safety behavior**:
- Below min safe voltage: adapter auto-calls `emergencyStop()`
- Below critical voltage: relay server should cut power
- The adapter monitors battery telemetry and logs warnings at 30%, 20%, 10%

---

## 3. Terrain Requirements

| Terrain | Supported | Gait Mode | Notes |
|---------|-----------|-----------|-------|
| Flat    | ✅ Yes    | TrotWalk  | Default operating surface |
| Rough   | ✅ Yes    | TrotObstacle | Rocky, grass, gravel |
| Stairs  | ✅ Yes    | StairsClimb | Max incline: 30° |
| Slope   | ⚠️ Limited | TrotWalk | Max: 15° incline, 10° decline |
| Ice     | ❌ No     | — | Slip risk — use with extreme caution |
| Water   | ❌ No     | — | IP rating: IP65 (splash resistant only) |

---

## 4. Fall & Impact Limits

| Parameter | Value | Notes |
|-----------|-------|-------|
| Max drop height | 0.20 m | From standing position |
| Max impact force | ~50 N per foot | Approximate, depends on landing posture |
| Recovery mode | ✅ Yes (Go1) / ✅ Yes (Go2) | Automatic recovery from falls |

**Safety**: The robot has a built-in fall recovery algorithm. If the robot
detects an unbalanced state, it will attempt to recover. If recovery fails,
it will enter damping mode to prevent damage.

---

## 5. Emergency Stop

### Trigger Conditions

1. **Manual e-stop**: `adapter.emergencyStop()` — immediate motor cutoff
2. **Battery critical**: Below critical voltage threshold
3. **Heartbeat loss**: >200 ms gap between robot heartbeats
4. **IMU anomaly**: Acceleration > 5g in any axis (potential crash)
5. **Joint torque overload**: Any motor > rated torque for >100 ms

### E-Stop Behavior

1. All motors cut power immediately (coast to stop)
2. Relay server logs the event with timestamp and trigger reason
3. Robot enters damping mode after e-stop (motors release)
4. **Manual reset required**: must send `stand_up` command to resume

### Recovery Procedure

1. Verify robot is stable and on flat ground
2. Check battery level (>25% recommended)
3. Send `stand_up` command
4. Wait for robot to reach standing position
5. Verify IMU readings are normal (az ≈ 1.0, gx/gy/gz ≈ 0)
6. Resume normal operation

---

## 6. Motor Limits

### Per-Motor Specifications (Go1)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Max torque | 23.7 N·m | Peak |
| Continuous torque | 12.0 N·m | Sustained |
| Max speed | 21.0 rad/s | ≈ 200 RPM |
| Stall current | ~150 A | Peak (battery-limited) |

### Per-Motor Specifications (Go2)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Max torque | 27.5 N·m | Peak (enhanced) |
| Continuous torque | 14.0 N·m | Sustained |
| Max speed | 23.0 rad/s | ≈ 220 RPM |
| Stall current | ~150 A | Peak (battery-limited) |

**Safety**: The adapter clamps motor speed commands to the configured
`motorSpeedLimit` (default 21.0 rad/s for Go1, 23.0 rad/s for Go2).

---

## 7. Environmental Limits

| Parameter | Go1 | Go2 | Notes |
|-----------|-----|-----|-------|
| Operating temp | -20°C to 60°C | -20°C to 60°C | Battery degrades below 0°C |
| Storage temp | -40°C to 85°C | -40°C to 85°C | Battery must be discharged for long storage |
| Humidity | 0–95% RH | 0–95% RH | Non-condensing |
| IP rating | IP65 | IP65 | Dust tight, splash resistant |
| Max altitude | 3000 m | 3000 m | Battery performance degrades |

---

## 8. Communication Safety

### Relay Server Requirements

The adapter connects to a **local relay server** (default `ws://localhost:8081`)
which bridges WebSocket commands to the robot's native protocol.

**Go1**: Relay server uses `unitree_legged_sdk` C++ library (UDP HighCmd/HighState)
**Go2**: Relay server uses `unitree_sdk2` DDS high-level client API

### Connection Safety

- **Auto-reconnect**: Exponential backoff (3s → 4.5s → 6.75s → ... max 30s)
- **Max attempts**: 10 (configurable)
- **Command queue**: Commands are queued when disconnected (max 100)
- **Heartbeat**: 1000 ms interval (configurable)
- **Heartbeat loss**: If >200 ms gap detected, safety supervisor triggers e-stop

### Network Security

- Relay server should run on localhost or a trusted LAN
- No authentication on the WebSocket protocol (design limitation)
- For production: add TLS + token authentication to the relay server

---

## 9. Character Behavior Safety

When using CyberAgent characters with Unitree robots:

1. **Never** use aggressive/dance moves in confined spaces
2. **Always** verify terrain type before initiating movement
3. **Monitor** battery level continuously during operation
4. **Keep** the robot on flat ground for initial testing
5. **Test** character behaviors in simulation first (canvas adapter)

---

## 10. Compliance

This safety envelope is based on:
- Unitree Go1 SDK documentation (v3.5.1+)
- Unitree Go2 SDK documentation (unitree_sdk2)
- DJI RoboMaster safety guidelines (adapted for quadruped)
- ISO 13482 (Personal care robots — safety requirements)

**Last updated**: 2026-04-29
