# HIL Checklist — Sim ↔ Real Bridge (sim2real)

> **Version:** v2.0 experimental
> **Created:** 2026-05-11
> **Status:** Ready for real hardware testing

## Overview

This checklist validates the `simulate → record → replay-on-real` workflow.
The user records a behavior in the browser simulator, then replays the
recorded commands on a real robot.

## Prerequisites

- [ ] RoboMaster S1 (or compatible robot) connected and powered
- [ ] WebSocket connection to the robot from the browser
- [ ] CyberAgent dev server running (`npm run dev`)
- [ ] Browser simulator accessible at `/agent` page

## Test Procedure

### 1. Simulate a behavior

1. Open `/agent` page
2. Select a character (e.g., `playful-dog`)
3. Enable **Sim Mode** (toggle)
4. Observe the robot moving in the 2D canvas
5. Verify movement is smooth and collision detection works

### 2. Record the behavior

1. Click **Record** button
2. Let the behavior run for ~10 seconds
3. Click **Stop**
4. Verify the recording shows step count and duration
5. Export the recording as `.cybersim` (cybertrace-compatible)
6. Open the exported file — verify it has:
   - `$schema: "cybersim/v1"` header
   - `adapter.tx` events for each command
   - `bb.set` events for body state
   - Valid JSON per line

### 3. Replay on Real Hardware

1. Switch from Sim Mode to **Real Mode** (connect adapter)
2. Click **Replay on Real**
3. Observe the robot executing the recorded commands
4. Verify:
   - [ ] Robot moves in the recorded pattern
   - [ ] Rotation matches recorded angles
   - [ ] LED/sound commands execute if present
   - [ ] Emergency stop works if triggered

### 4. Verify Debuggability

1. Open `/debug` page
2. Verify the replay commands appear in the timeline
3. Verify `adapter.tx` events are visible
4. Verify body state (`bb.set`) events are visible
5. Verify timing alignment between sim and real

## Acceptance Criteria

| # | Criterion | Pass/Fail |
|---|-----------|-----------|
| 1 | Recorded commands replay on real robot | ☐ |
| 2 | Movement accuracy ≥ 80% (visual comparison) | ☐ |
| 3 | Timing within ±200ms of recorded | ☐ |
| 4 | `.cybersim` file validates with `lintTrace` | ☐ |
| 5 | Debug page shows replay events | ☐ |
| 6 | Emergency stop aborts replay | ☐ |

## Known Limitations

- Sim command types may not map 1:1 to all adapter command types
- Latency between sim step and real command execution varies by connection
- No feedback loop — replay is fire-and-forget (no telemetry during replay)

## Future Work

- [ ] Add telemetry feedback during replay
- [ ] Support `moveTo` → coordinate mapping for precise replay
- [ ] Domain randomization: add noise to replayed commands
- [ ] Export to `.cybertrace` format (full trace, not just sim commands)
