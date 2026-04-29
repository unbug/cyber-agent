# LEGO SPIKE Hub HIL (Hardware-in-Loop) Checklist

This checklist certifies that a new Spike Adapter implementation works correctly
with a real LEGO SPIKE Prime or SPIKE Essential Hub.

## Prerequisites

- [ ] LEGO SPIKE Prime Hub (31311) or SPIKE Essential Hub (31170)
- [ ] LEGO Large Motor (2 motors for differential drive)
- [ ] LEGO Distance Sensor (optional, for calibration)
- [ ] Computer with Bluetooth 4.0+ (Web Bluetooth support required)
- [ ] `cyber-agent` CLI installed (`npm install -g @cyber-agent/sdk`)
- [ ] SPIKE Hub firmware updated to latest (via LEGO SPIKE App)

## Step 1: Physical Inspection

| Check | Expected | Result |
|-------|----------|--------|
| Hub battery charged | ≥ 6.0V at terminals | ___ V |
| Motors connected to ports A and B | Firm click into place | Pass / Fail |
| Wheels free-spinning | No grinding or binding | Pass / Fail |
| Hub firmware current | Latest version in LEGO App | Pass / Fail |
| Bluetooth enabled on computer | Bluetooth on, discoverable | Pass / Fail |

## Step 2: BLE Connectivity Test

```bash
# Open the debug page at https://unbug.github.io/cyber-agent/debug
# Click "Connect SPIKE Hub" and verify the BLE dialog appears
# Select the LEGO Hub from the device list
```

| Check | Expected | Result |
|-------|----------|--------|
| Web Bluetooth dialog appears | Device picker shows | Pass / Fail |
| "LEGO Hub" appears in list | Device name matches | Pass / Fail |
| Connection succeeds | "Connected" status in /debug | Pass / Fail |
| GATT service discovered | SPIKE service UUID visible | Pass / Fail |

## Step 3: Motor Test

```bash
# Via /debug page → send motor commands
# Or via CLI:
cyber-agent run --adapter spike --character puppy
```

| Check | Expected | Result |
|-------|----------|--------|
| Motor A spins forward | Left wheel moves forward | Pass / Fail |
| Motor A spins backward | Left wheel moves backward | Pass / Fail |
| Motor A stops | Left wheel stops on command | Pass / Fail |
| Motor B spins forward | Right wheel moves forward | Pass / Fail |
| Differential drive | Both wheels respond independently | Pass / Fail |
| Speed range | 0–100% speed works smoothly | Pass / Fail |

## Step 4: LED Matrix Test

| Check | Expected | Result |
|-------|----------|--------|
| Single color (red) | All 25 LEDs light red | Pass / Fail |
| Single color (green) | All 25 LEDs light green | Pass / Fail |
| Single color (blue) | All 25 LEDs light blue | Pass / Fail |
| Grayscale pattern | 5×5 brightness gradient visible | Pass / Fail |
| Rainbow pattern | Rainbow wave animation works | Pass / Fail |
| Emotion glow | LEDs change color with emotion | Pass / Fail |

## Step 5: Sensor Telemetry Test

```bash
# Via /debug → Telemetry panel
```

| Check | Expected | Result |
|-------|----------|--------|
| Tilt sensor reads | Values change when hub tilted | Pass / Fail |
| Distance sensor reads | Values change near object | Pass / Fail |
| Battery level reported | Value in /debug telemetry | Pass / Fail |
| Motor state reported | Speed/load visible in /debug | Pass / Fail |

## Step 6: Character Behavior Test

```bash
cyber-agent run --adapter spike --character puppy
```

| Check | Expected | Result |
|-------|----------|--------|
| Character starts | Hub LEDs light up, motors respond | Pass / Fail |
| Emotion changes | LEDs/buzzer react to emotion | Pass / Fail |
| Energy depletion | Behavior slows as energy drops | Pass / Fail |
| Graceful stop | Ctrl+C stops all motors | Pass / Fail |
| No motor stall | Motors don't overheat in 5 min | Pass / Fail |

## Step 7: Safety Verification

| Check | Expected | Result |
|-------|----------|--------|
| E-stop works | Ctrl+C or `cyber-agent stop` kills motors | Pass / Fail |
| Heartbeat monitor | Warns if BLE connection drops | Pass / Fail |
| Low battery warning | Warns at < 5.5V | Pass / Fail |
| No runaway behavior | Hub doesn't drive off table in 3 min | Pass / Fail |
| Reconnection | Auto-reconnects after brief disconnect | Pass / Fail |

## Step 8: Code Quality

| Check | Expected | Result |
|-------|----------|--------|
| Unit tests pass | `npm test -- src/adapters/spike.test.ts` | Pass / Fail |
| HIL emulator green | `npm test -- tests/hil-emulator/hil.test.ts` | Pass / Fail |
| TypeScript compiles | `tsc --noEmit` clean | Pass / Fail |
| Coverage ≥ 80% | `npm test -- --coverage src/adapters/spike` | ___% |
| No console errors | Browser dev tools clean | Pass / Fail |

## Step 9: Documentation

- [ ] Adapter code committed to `src/adapters/spike.ts`
- [ ] Unit tests in `src/adapters/spike.test.ts`
- [ ] HIL evidence in this directory (`docs/hil/spike/`)
- [ ] README updated with adapter compatibility info
- [ ] Character page lists which toys can run it

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Tester | | | Pass / Fail |
| Reviewer | | | Pass / Fail |
