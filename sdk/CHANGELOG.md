# @cyber-agent/sdk Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-04-30

### Added
- **Stable SDK API surface** — `sdk/src/public-api.ts` defines the exact public API boundary for v1.x
- **Adapter Contract v2** — `RobotAdapterV2` interface with `connect()`, `disconnect()`, `onTelemetry()`, `selfTest()`
- **v1 → v2 compatibility shim** — `wrapV1AsV2()` for graceful migration
- **Trace schema v1** — versioned `.cybertrace` format with `validateTrace()` and `migrateTrace()`
- **ESP32Adapter** — WebSocket protocol v2 adapter for generic ESP32 robots
- **CanvasAdapter** — browser 2D canvas renderer (demo/testing)
- **WebSocketAdapter** — generic WebSocket robot adapter with auto-reconnect
- **Safety supervisor** — heartbeat loss detection, motor stall warning
- **Trace puller** — pull traces from real devices over WebSocket
- **Breakpoint system** — pause/resume BT execution on conditions
- **10 robot adapters** — mBot, RoboMaster v2, ESP32, Unitree Go1/Go2, iRobot Create 3, DJI Tello, LEGO SPIKE, Canvas, WebSocket, ESP32
- **55+ character definitions** — animals, robots, and fantasy creatures
- **CLI commands** — `cyber-agent record`, `cyber-agent replay`, `cyber-agent trace lint`
- **`/debug` page** — BT graph, actuator timeline, blackboard inspector
- **Trace scrubber** — time-travel for `.cybertrace` files

### Changed
- `@cyber-agent/sdk` version set to `1.0.0`
- All adapters migrated to RobotAdapterV2 contract

### Deprecated
- `RobotAdapterV1` — supported for 1 minor version grace period (until v1.1)

## [0.7.0] — 2026-04-30

### Added
- iRobot Create 3 / Roomba adapter
- DJI Tello / Tello EDU adapter
- Unitree Go1 / Go2 high-level SDK with safety envelope
- Marketplace UI surfaces adapter compatibility per character

## [0.6.0] — 2026-04-26

### Added
- Adapter contract v2 design
- Safety supervisor node
- HIL checklist framework

## [0.5.0] — 2026-04-25

### Added
- `.cybertrace` format spec
- Time-travel debug scrubber
- CLI record/replay commands

## [0.4.0] — 2026-04-24

### Added
- `/debug` page MVP
- Blackboard diff highlighting
- Capability discovery

## [0.3.0] — 2026-04-23

### Added
- Tracer foundation (`src/engine/tracer.ts`)
- Structured event stream
- Coverage gate ≥ 80%

---

**Stability Guarantee**: APIs marked `@stable` in `sdk/src/public-api.ts` will not break between `@cyber-agent/sdk@1.x` releases. Breaking changes only occur in `@cyber-agent/sdk@2.0.0` with a migration guide.
