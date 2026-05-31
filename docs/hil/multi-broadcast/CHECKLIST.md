# HIL Checklist — MultiBroadcastAdapter

## Overview

Hardware-in-Loop checklist for validating the `MultiBroadcastAdapter` — the adapter that fans out commands to N physical robots with time sync and global e-stop.

## Prerequisites

- ≥ 2 RoboMaster S1 robots (or compatible robots with `RobotAdapterV2` implementation)
- All robots powered on and within range
- Computer connected to all robots (via WiFi or USB tethering)
- `npm test` passes before starting

## Test Steps

### 1. Adapter Initialization

- [ ] Create `MultiBroadcastAdapter` instance
- [ ] Add ≥ 2 robot adapters via `addAdapter(id, adapter)`
- [ ] Verify `getRobotIds()` returns all robot IDs
- [ ] Verify `getHealth()` returns health entries for all robots

### 2. Connection

- [ ] Call `connect()` — verify all robots report `connected: true`
- [ ] Verify `capabilities()` includes `multi-robot`, `command-fanout`, `global-e-stop`, `time-sync`, `health-monitoring`
- [ ] Verify `maxRobots` is 8

### 3. Command Fan-out

- [ ] Send a `move` command — verify ALL robots receive it
- [ ] Send a `rotate` command — verify ALL robots receive it
- [ ] Send an `led` command — verify ALL robots receive it
- [ ] Verify command payload is identical across all robots

### 4. Global E-Stop

- [ ] Call `globalEStop()` — verify ALL robots receive `emergency_stop`
- [ ] Verify `getEStopActive()` returns `true`
- [ ] Call `clearEStop()` — verify `getEStopActive()` returns `false`
- [ ] Verify robots respond to e-stop (stop moving immediately)

### 5. Time Sync

- [ ] Run for ≥ 30 seconds — verify drift stays ≤ 5 ms
- [ ] Verify `getDrift()` returns reasonable values
- [ ] Verify `getDriftOk()` returns `true` during normal operation
- [ ] Verify sync timer is active (periodic sync events)

### 6. Health Monitoring

- [ ] Disconnect one robot — verify health shows `connected: false`
- [ ] Verify commands are NOT sent to disconnected robot
- [ ] Reconnect robot — verify health shows `connected: true`
- [ ] Verify `getHealthFor(id)` returns correct health for specific robot

### 7. Self-Test

- [ ] Run `selfTest()` with all robots connected — verify `ok: true`
- [ ] Run `selfTest()` with e-stop active — verify `ok: false`
- [ ] Verify `selfTest()` reports all check results

### 8. Telemetry Forwarding

- [ ] Attach telemetry listener — verify events received from all robots
- [ ] Verify `forwardTelemetry(id, event)` updates health `lastSeen`
- [ ] Verify telemetry payload is forwarded correctly

### 9. Disconnect

- [ ] Call `disconnect()` — verify all robots report `connected: false`
- [ ] Verify `destroy()` clears all state

### 10. Multi-Robot Interaction

- [ ] Run 2 robots following same command — verify synchronized movement
- [ ] Run 3+ robots — verify no cross-talk (commands don't mix up)
- [ ] Run for ≥ 30 minutes — verify no memory leaks or drift degradation

## Pass Criteria

- All checkboxes above pass
- Drift ≤ 5 ms throughout test
- No command drops or misrouting
- No cross-talk between robots
- 30-minute soak test completes without issues

## Notes

- The `MultiBroadcastAdapter` is a **fan-out** adapter, not a single-robot adapter
- It does NOT implement robot-specific protocols — it delegates to child adapters
- Time sync is NTP-style: ping/pong with offset calculation
- Global e-stop is the highest priority — it overrides all other commands
- Health monitoring is passive (based on connection state and telemetry timestamps)
