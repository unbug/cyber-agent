# mBot HIL (Hardware-in-Loop) Checklist

This checklist certifies that a new mBot adapter implementation works correctly
with real hardware. Follow each step and record results.

## Prerequisites

- [ ] mBot robot (or compatible clone, <$50)
- [ ] USB cable (micro-USB to USB-A)
- [ ] Computer with Bluetooth 4.0+ or USB connection
- [ ] `cyber-agent` CLI installed (`npm install -g @cyber-agent/sdk`)
- [ ] Latest firmware on mBot (check [mBot firmware repo](https://github.com/elephantrobotics/mbot-firmware))

## Step 1: Physical Inspection

| Check | Expected | Result |
|-------|----------|--------|
| Battery charged | ≥ 7.4V at terminals | ___ V |
| Wheels free-spinning | No grinding or binding | Pass / Fail |
| Ultrasonic sensor clean | Lens clear | Pass / Fail |
| IR sensors clean | Lens clear | Pass / Fail |
| LED module connected | Connector seated | Pass / Fail |
| Buzzer connected | Connector seated | Pass / Fail |

## Step 2: Connectivity Test

```bash
# USB mode
cyber-agent mbot test --port /dev/ttyUSB0

# Bluetooth mode
cyber-agent mbot test --ble --address AA:BB:CC:DD:EE:FF
```

| Check | Expected | Result |
|-------|----------|--------|
| `cyber-agent mbot test` connects | "Connected" message | Pass / Fail |
| LED command works | LEDs light up | Pass / Fail |
| Buzzer command works | Buzzer beeps | Pass / Fail |
| Motor command works | Motors spin | Pass / Fail |
| Distance sensor reads | Value changes near object | Pass / Fail |

## Step 3: Adapter Integration Test

```bash
# Run the adapter unit tests
cd cyber-agent
npm test -- sdk/src/adapters/mbot.test.ts

# Run the HIL emulator (mock hardware)
npm test -- tests/hil-emulator/hil.test.ts
```

| Check | Expected | Result |
|-------|----------|--------|
| Unit tests pass | 0 failures | Pass / Fail |
| HIL emulator green | 0 error events in 60s | Pass / Fail |
| TypeScript compiles | `tsc --noEmit` clean | Pass / Fail |
| Coverage ≥ 80% | `npm test -- --coverage` | ___% |

## Step 4: Character Behavior Test

```bash
# Start a character driving the mBot
cyber-agent run --adapter mbot --character puppy --port /dev/ttyUSB0
```

| Check | Expected | Result |
|-------|----------|--------|
| Character starts | mBot moves, LEDs respond | Pass / Fail |
| Emotion changes | LEDs/buzzer react to emotion | Pass / Fail |
| Energy depletion | Behavior slows as energy drops | Pass / Fail |
| Graceful stop | Ctrl+C stops all motors | Pass / Fail |
| No motor stall | Motors don't overheat in 5 min | Pass / Fail |

## Step 5: Safety Verification

| Check | Expected | Result |
|-------|----------|--------|
| E-stop works | Ctrl+C or `cyber-agent stop` kills motors | Pass / Fail |
| Heartbeat monitor | Warns if connection drops | Pass / Fail |
| Low battery warning | Warns at < 6.5V | Pass / Fail |
| No runaway behavior | mBot doesn't drive off table in 3 min | Pass / Fail |

## Step 6: Documentation

- [ ] Adapter code committed to `sdk/src/adapters/<name>.ts`
- [ ] Unit tests in `sdk/src/adapters/<name>.test.ts`
- [ ] HIL evidence in this directory (`docs/hil/<adapter>/`)
- [ ] README updated with adapter compatibility info
- [ ] Character page lists which toys can run it

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Tester | | | Pass / Fail |
| Reviewer | | | Pass / Fail |
