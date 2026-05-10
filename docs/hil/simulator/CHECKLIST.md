# HIL Checklist — Simulator (v2.0)

> **Status**: Sim-only feature (behind `experimental/sim` flag)
> **Last updated**: 2026-05-11

## Overview

The browser-embedded simulator runs on the `/agent` page and simulates robot
character movement on a 2D canvas. It can record runs and replay them.

## Prerequisites

- [ ] RoboMaster EP (or any supported robot) connected and powered
- [ ] WebSocket connection to robot established
- [ ] Browser dev tools open for network inspection

## Test Steps

### 1. Launch Simulator Mode

- [ ] Open `/agent/<character-id>` in browser
- [ ] Click "Sim" toggle to switch to simulator mode
- [ ] Verify canvas renders with grid and robot body
- [ ] Click "Start Sim" — robot should move autonomously

### 2. Record a Run

- [ ] Click "Record" (red dot) to start recording
- [ ] Let the sim run for ~10 seconds
- [ ] Click "Record" again to stop
- [ ] Verify the run data is captured (check browser console)

### 3. Replay a Run

- [ ] Click "Replay" (play button) to replay the recorded run
- [ ] Verify the robot follows the exact same trajectory
- [ ] Test speed control (0.5x, 2x, 5x)
- [ ] Test scrubbing (step forward, jump to step)

### 4. Export/Import

- [ ] Export the recording as JSON
- [ ] Verify the JSON is valid and contains step data
- [ ] Import the JSON back
- [ ] Verify replay works identically

### 5. Sim → Real Transfer

- [ ] Record a run in sim mode
- [ ] Switch back to "Live" mode
- [ ] Replay the recorded trajectory on the real robot
- [ ] Verify the robot follows the same path (±10cm tolerance)

## Acceptance Criteria

- [ ] Simulator renders at ≥30fps on a $50 mBot's browser
- [ ] Recorded runs replay with ≥95% trajectory accuracy
- [ ] Export/import round-trip preserves all data
- [ ] No errors in browser console during sim operation

## Notes

- The simulator uses a lightweight 2D rigid-body physics engine
- Full 3D physics (MuJoCo/Genesis) is planned for a future iteration
- The `experimental/sim` feature flag controls visibility
