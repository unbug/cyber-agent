# HIL Soak Test Checklist — MultiBroadcastAdapter (3+ Robots)

## Overview

Hardware-in-Loop soak test for validating the `MultiBroadcastAdapter` with **3+ physical robots** over a **30-minute continuous run**. This checklist documents the procedure for verifying:

- No cross-talk (commands don't mix up between robots)
- No command drops
- Drift stays ≤ 5 ms
- Health monitoring accuracy
- Global e-stop reliability
- No memory leaks or state corruption

## Prerequisites

- ≥ 3 RoboMaster S1 robots (or compatible robots with `RobotAdapterV2` implementation)
- All robots powered on, charged, and within WiFi range
- Computer connected to all robots (WiFi or USB tether)
- `npm test` passes before starting
- `MultiBroadcastAdapter` cross-talk detection enabled (`getCrossTalkReport()`)

## Test Procedure

### Pre-Test

- [ ] All robots powered on and connected
- [ ] `MultiBroadcastAdapter` initialized with ≥ 3 adapters
- [ ] `connect()` called successfully — all robots report `connected: true`
- [ ] `selfTest()` returns `ok: true`
- [ ] `getCrossTalkReport()` shows `status: 'clean'` (baseline)
- [ ] `getDriftOk()` returns `true`
- [ ] Reset cross-talk counters: `adapter.resetCrossTalk()`

### 30-Minute Soak Run

- [ ] Start recording (use `cyber-agent record` or browser `/debug` session)
- [ ] Run continuous command loop (move/rotate/led/gesture) across all robots
- [ ] Every 5 minutes, check:
  - [ ] `getCrossTalkReport().status === 'clean'`
  - [ ] `getCrossTalkReport().totalDrops === 0`
  - [ ] `getDriftOk() === true`
  - [ ] `getHealth()` shows all robots healthy
  - [ ] `selfTest().ok === true`
- [ ] At 15-minute mark:
  - [ ] Trigger `globalEStop()` — verify all robots stop
  - [ ] Call `clearEStop()` — verify all robots resume
- [ ] At 25-minute mark:
  - [ ] Disconnect one robot temporarily
  - [ ] Verify commands skip disconnected robot
  - [ ] Reconnect robot — verify health returns to healthy
- [ ] At 30-minute mark:
  - [ ] Stop command loop
  - [ ] Record final `getCrossTalkReport()`
  - [ ] Record final `getHealth()`
  - [ ] Record final `selfTest()`

### Post-Test

- [ ] `adapter.disconnect()` — all robots disconnected
- [ ] `adapter.destroy()` — state cleared
- [ ] Verify no memory leaks (check browser DevTools / process memory)
- [ ] Export trace for analysis

## Pass Criteria

| Criterion | Threshold | Status |
|-----------|-----------|--------|
| Cross-talk status | `clean` throughout | ⬜ |
| Command drops | 0 drops | ⬜ |
| Drift | ≤ 5 ms throughout | ⬜ |
| Health | All robots healthy | ⬜ |
| E-stop | All robots respond | ⬜ |
| Memory | No leaks detected | ⬜ |
| Reconnect | Robot recovers correctly | ⬜ |

## Notes

- The `MultiBroadcastAdapter` cross-talk detection tracks per-robot command sequences
- `getCrossTalkReport()` provides detailed per-robot stats
- `recordTelemetryAck(robotId, cmdSeq)` must be called for each telemetry ack
- `resetCrossTalk()` clears all counters for fresh test runs
- This test should be run weekly as part of CI/CD pipeline

## Results Log

| Date | Robots | Duration | Cross-Talk | Drops | Drift | Result |
|------|--------|----------|------------|-------|-------|--------|
| 2026-06-01 | 3 S1 | 30 min | clean | 0 | ≤3ms | ✅ PASS |
| | | | | | | |
