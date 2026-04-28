# Safety Supervisor — Hardware-in-Loop Checklist

> Validate the Safety Supervisor on real hardware before deploying to production.

## Prerequisites

- [ ] Robot/adapter connected and powered on
- [ ] `cyber-agent` CLI available (`npx @cyber-agent/sdk` or local install)
- [ ] Debugger page accessible (`http://localhost:5173/cyber-agent/debug`)

## Test 1: Heartbeat Loss Detection

**Goal**: Verify the supervisor triggers e-stop after configured heartbeat loss.

1. Start a behavior tree on the robot (e.g., `wander` character)
2. In `/debug` page, observe the **🛡️ Safety** panel
3. Simulate heartbeat loss by stopping the BT runner (pause or disconnect)
4. Wait for `missThreshold` consecutive misses (default: 3 ticks)
5. Verify:
   - [ ] State badge changes to `🛑 e_stopped`
   - [ ] E-stop banner appears with "Clear E-stop" button
   - [ ] Event log shows `heartbeat_miss` entries with increasing gap
   - [ ] Event log shows `e_stop_triggered` with reason `heartbeat_loss`
   - [ ] Robot motors stop (verify physical stop)

## Test 2: E-stop Clear

**Goal**: Verify manual e-stop reset works.

1. After Test 1 triggers e-stop
2. Click "Clear E-stop" in the Safety panel
3. Verify:
   - [ ] State badge returns to `✅ ok`
   - [ ] E-stop banner disappears
   - [ ] Event log shows new `heartbeat_ok` entry
   - [ ] BT runner can be restarted

## Test 3: Motor Stall Detection (Watt-Dog)

**Goal**: Verify motor current monitoring triggers on stall.

1. Start behavior tree on robot
2. Manually block a motor (gently) while robot is moving
3. Observe current via telemetry (adapter rx events)
4. When current exceeds `motorStallThresholdA` (default: 2.0A):
   - [ ] State badge changes to `⚠️ degraded` or `🛑 e_stopped` (depending on policy)
   - [ ] Event log shows `motor_stall` entry with motor name and current
   - [ ] Robot stops or reduces power
5. Clear e-stop and resume

## Test 4: Battery Voltage Monitoring

**Goal**: Verify low-battery detection works.

1. Start behavior tree on robot
2. Run until battery drops below `batteryLowVoltage` (default: 3.0V)
3. Verify:
   - [ ] Event log shows `battery_low` entry with voltage reading
4. Continue until below `minBatteryVoltage` (default: 2.8V)
5. Verify:
   - [ ] State badge changes to `⚠️ degraded`
   - [ ] E-stop triggers if configured

## Test 5: Self-Test

**Goal**: Verify adapter self-test on startup.

1. In `/debug` page, click "🔍 Self-test" button
2. Verify:
   - [ ] Self-test result panel appears
   - [ ] Shows check results (adapter type, command send)
   - [ ] Status is "healthy" or "unhealthy" with details

## Test 6: Policy Change

**Goal**: Verify runtime policy switching.

1. Start with default `e-stop` policy
2. Change policy to `warn` (via API or debug page if available)
3. Simulate heartbeat loss
4. Verify:
   - [ ] State changes to `⚠️ degraded` (not e-stopped)
   - [ ] Event log shows `policy_changed` entry

## Results

| Test | Pass | Notes |
|------|------|-------|
| Heartbeat Loss | [ ] | |
| E-stop Clear | [ ] | |
| Motor Stall | [ ] | |
| Battery Monitor | [ ] | |
| Self-Test | [ ] | |
| Policy Change | [ ] | |

**Overall**: PASS / FAIL

---

_Editors: Run this checklist for each adapter that uses the SafetySupervisor._
