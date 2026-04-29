# HIL Checklist — Unitree Go1 / Go2 Adapter

## Pre-Flight

- [ ] Robot firmware up to date (Go1: ≥3.5.1, Go2: latest SDK2)
- [ ] Battery charged (>80% recommended)
- [ ] Relay server running (`ws://localhost:8081`)
- [ ] Robot on flat, open ground (≥2m × 2m clear area)
- [ ] Emergency stop button accessible
- [ ] Phone/tablet ready for monitoring

## Connection

- [ ] `adapter.connect()` succeeds
- [ ] Handshake with robot model confirmed
- [ ] Telemetry stream active (IMU, battery, state)
- [ ] Heartbeat visible in /debug trace

## Basic Motion Tests

- [ ] `move('forward', 50)` — robot moves forward
- [ ] `move('backward', 50)` — robot moves backward
- [ ] `move('left', 50)` — robot strafes left
- [ ] `move('right', 50)` — robot strafes right
- [ ] `move('stop', 0)` — robot stops immediately
- [ ] `setBodyHeight(0.15)` — body raises smoothly
- [ ] `setBodyHeight(-0.10)` — body lowers smoothly
- [ ] `setGait(GaitType.TrotWalk)` — trot gait engaged
- [ ] `setGait(GaitType.TrotRun)` — run gait engaged
- [ ] `setGait(GaitType.StairsClimb)` — stair gait engaged
- [ ] `setPose(0, 0, 0)` — neutral pose

## Safety Tests

- [ ] `emergencyStop()` — all motors cut, robot coasts to stop
- [ ] Battery warning at 30% (logged)
- [ ] Battery warning at 20% (logged)
- [ ] Battery auto-e-stop at <22.0V (Go1) / <21.6V (Go2)
- [ ] Heartbeat loss triggers e-stop
- [ ] IMU anomaly detection (>5g)
- [ ] Damping mode: `damping()` → motors release
- [ ] Recovery: `standUp()` → robot stands

## Advanced Tests

- [ ] `sit()` — crouch down
- [ ] `standDown()` — lie flat
- [ ] `dance('dance1')` — dance routine 1
- [ ] `dance('dance2')` — dance routine 2
- [ ] `jump(0)` — jump straight
- [ ] `jump(1.57)` — jump with yaw
- [ ] `flip()` — backflip (Go2 only)
- [ ] Command queueing during disconnect

## Telemetry Verification

- [ ] Battery voltage matches multimeter reading
- [ ] IMU readings: az ≈ 1.0, gx/gy/gz ≈ 0 (standing)
- [ ] Joint states: 12 values, reasonable ranges
- [ ] Foot force: FL+FR+RL+RR ≈ weight × gravity
- [ ] State mode matches expected MotionMode
- [ ] Position tracking (relative to start)
- [ ] Terrain detection: flat → 'flat'

## /debug Page Verification

- [ ] UnitreeGo1Adapter appears in adapter list
- [ ] Adapter capabilities displayed correctly
- [ ] Telemetry events visible in trace
- [ ] Command history shows sent commands
- [ ] Self-test report accessible
- [ ] Safety envelope parameters visible

## HIL Sign-off

| Check | Result | Notes |
|-------|--------|-------|
| Connection | ☐ Pass / ☐ Fail | |
| Basic Motion | ☐ Pass / ☐ Fail | |
| Safety | ☐ Pass / ☐ Fail | |
| Advanced | ☐ Pass / ☐ Fail | |
| Telemetry | ☐ Pass / ☐ Fail | |
| /debug | ☐ Pass / ☐ Fail | |

**Tester**: _______________  
**Date**: _______________  
**Robot**: ☐ Go1 / ☐ Go2  
**Firmware**: _______________  
**Relay Server**: _______________
