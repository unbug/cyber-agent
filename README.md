# CyberAgent

> Give your robot a soul.

An open-source platform for creating character-driven AI agents that bring physical robots to life. Pick a personality, connect your robot, and watch it come alive.

**Live Demo:** https://unbug.github.io/cyber-agent/

## Quick Start

```bash
git clone https://github.com/unbug/cyber-agent.git
cd cyber-agent
npm install
npm run dev
```

Open http://localhost:5173/cyber-agent/

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build to `dist/` |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run preview` | Preview production build |

## Tech Stack

- **Vite** + **React 18** + **TypeScript**
- **Behavior Tree Engine** — custom runtime with 9 node types
- **CSS Modules** with CSS Custom Properties (dark-first design system)
- **Framer Motion** for animations
- **React Router** for SPA routing
- **Vitest** + **Testing Library** for tests
- **GitHub Actions** → **GitHub Pages** for deployment

## Project Structure

```
src/
  engine/       # Behavior Tree Engine
    types.ts        # Core types: Blackboard, NodeDef, RobotAdapter
    executor.ts     # Hydrate definitions → tick tree each frame
    builtins.ts     # Standard actions & conditions library
    runner.ts       # Lifecycle manager (start/stop/pause/resume)
    canvas-adapter.ts  # Browser renderer (trail, glow, bounce)
    behaviors.ts    # 6 character behavior tree definitions
  hooks/        # React hooks (useBehaviorTree)
  components/   # Shared UI (Layout, etc.)
  data/         # Character definitions + helpers
  pages/        # Route pages (Home, Gallery, Agent, Docs)
  styles/       # Global CSS + design tokens
  test/         # Test files + setup
```

## Behavior Tree Engine

The engine at `src/engine/` runs character AI in the browser via a standard behavior tree architecture:

- **Blackboard** — shared state (position, emotion, energy, pointer) accessible to all nodes
- **9 Node Types** — Sequence, Selector, Parallel, Inverter, Repeater, Cooldown, Condition, Action, Wait
- **RobotAdapter Interface** — abstract hardware layer; implement `init()`, `update()`, `sendCommand()` to connect any robot
- **CanvasAdapter** — built-in browser renderer with emotion glow, movement trails, and energy visualization

### Extending

```typescript
import { registerAction } from './engine'

// Add a custom action
registerAction('myAction', (bb, args, adapter) => {
  adapter.sendCommand({ type: 'move', payload: { x: bb.x, y: bb.y } })
  return 'success'
})
```

Implement `RobotAdapter` to connect physical hardware (ESP32, Raspberry Pi, Arduino, etc.).

## Roadmap

> **North Star (immutable)**: _Give your robot a soul._ Make every physical
> toy / robot scriptable as a believable, character-driven agent.
>
> **Two non-negotiable axes** every release must satisfy:
>
> 1. **Debuggability** — every behavior, perception, decision and motor
>    command must be inspectable, replayable and visualizable.
> 2. **Real embodiment** — features land only with a real-hardware
>    demonstration. Sim-only work ships behind an `experimental/` flag.

### Where CyberAgent fits in the landscape

| Project | Personality / Character | Hardware abstraction | Hobby toys (<$100) | First-class debugger |
| --- | --- | --- | --- | --- |
| **CyberAgent** (this repo) | ✅ 55+ characters + BT | ✅ adapter contract | ✅ mBot / ESP32 / RoboMaster | ✅ time-travel + replay (planned) |
| HuggingFace LeRobot | ❌ policies, no character | ✅ Python `Robot` interface | ⚠️ research arms (SO-100, ALOHA) | ⚠️ training plots only |
| elizaOS | ✅ rich personas | ❌ chat / web only | ❌ no embodiment | ✅ web dashboard |
| NVIDIA Isaac Lab / GR00T | ❌ skill policies | ✅ Isaac Sim | ❌ humanoid-only | ⚠️ sim-side only |
| ROS 2 / Nav2 / MoveIt | ❌ | ✅ industrial | ❌ | ⚠️ rqt / RViz |
| Sony aibo / Anki Vector SDK | ✅ closed | ✅ closed | ⚠️ discontinued | ❌ |

The unique slot we own is **soul + cheap toys + radical debuggability**.

### Versioned task breakdown

Each version is a hard release with a `git tag`. The autonomous Cron picks
the **first unchecked, unblocked** item in the **earliest unreleased
version** and ships it end-to-end (code + test + debugger surface + docs +
HIL evidence when hardware is touched). It never invents scope outside this
list, and never skips a version.

#### v0.3 — Tracer foundation _(now → +1 month)_

Make the existing surface observable.

- [x] `src/engine/tracer.ts` — structured event stream
      (`tick.start`, `node.enter`, `node.exit`, `action.dispatch`,
      `adapter.tx`, `adapter.rx`, `bb.set`, `error`).
- [x] Wire tracer into `executor.ts`, `runner.ts`, `CanvasAdapter`,
      `WebSocketAdapter`, `MBotAdapter`,
      `RoboMasterAdapterV2`.
- [x] Persist last 1 000 events per session in IndexedDB.
- [x] CI: `tests/hil-emulator/` runs 1 character × 5 adapters for 60 s on
      mock hardware; fail on any `error` event.
- [x] Coverage gate ≥ 80 % on `src/engine/` and `src/adapters/`.
      (engine: 81.3%, adapters: 85.5%)
- [x] `CONTRIBUTING.md` documents debug + embodiment invariants.

**Release gate**: tracer emits in production build; CI emulator green
7 days; HEARTBEAT shows 0 unresolved adapter errors.

Released: 2026-04-26

#### v0.4 — `/debug` page MVP _(+1 → +2 months)_

A debugger you can hand to a contributor.

- [x] `/debug` page split-view: BT graph (current node highlighted, last
      50-node breadcrumb) ｜ actuator timeline ｜ blackboard inspector.
  - `src/pages/DebugPage.tsx` — split-view with BT tree panel, actuator timeline, blackboard inspector
  - `TreeNode` — recursive BT renderer with active node highlighting, type-color coding, status dots
  - `Breadcrumb` — last N node-enter events as breadcrumb trail
  - `ActuatorTimeline` — TX/RX event streams with time-stamped messages
  - `BlackboardInspector` — field listing with diff highlighting via `diffBlackboards`
- [x] Live tick-rate / latency widgets.
  - `PerformancePanel` — live tick-rate sparkline + latency histogram
  - Top stats bar: tick rate (fps), avg latency (ms), event count
  - Tick-rate warning threshold at 8 fps (below = yellow)
- [x] Diff highlighting on every blackboard write (`src/hooks/useDebug.ts` → `diffBlackboards`).
- [x] Capability discovery — read `adapter.capabilities()` and grey out
      incompatible BT nodes in the editor.
- [ ] One end-to-end demo video: bug → fix → re-run on real RoboMaster.

**Release gate**: a maintainer reproduces a contributor-reported bug
locally with no hardware, using only the live `/debug` view.

#### v0.5 — Time-travel & `.cybertrace` _(+2 → +3 months)_

- [x] `.cybertrace` format spec (`sdk/src/trace/schema.ts`) — gzipped
      JSONL, versioned, with migration registry.
- [x] `/debug` scrubber: rewind / step / fast-forward an in-memory
      session OR an uploaded trace.
- [x] Breakpoints by BT node, blackboard predicate, or adapter event.
- [x] CLI: `cyber-agent record <adapter>` / `cyber-agent replay <file>`.
- [x] Pull a trace off a real device over WebSocket.
- [x] `npx @cyber-agent/sdk trace lint` validates schema.

**Release gate**: a third party shares a `.cybertrace` from a real robot;
maintainer single-steps through it locally to root-cause a bug.

#### v0.6 — Adapter contract v2 _(+3 → +4 months)_

- [x] `sdk/src/adapter/contract.ts` v2:
      `connect / disconnect / sendCommand / onTelemetry / capabilities() /
      selfTest()` returning a structured report.:
      `connect / disconnect / sendCommand / onTelemetry / capabilities() /
      selfTest()` returning a structured report.
- [x] Hardware-in-Loop (HIL) checklist a contributor can run with a $50
      mBot to certify a new adapter (`docs/hil/mbot/CHECKLIST.md`).
- [x] Migrate existing 5 adapters to v2; deprecate v1 with a 1-version
      grace.
- [x] Safety supervisor node: kill switch on >200 ms heartbeat loss,
      watt-dog on motor stall.

**Release gate**: 5 in-house adapters certified; one community-contributed
adapter accepted using only the v2 contract.

#### v0.7 — Embodiment Pack expansion _(+4 → +6 months)_

Width of real toys — every adapter ships with HIL evidence under
`docs/hil/<adapter>/`.

- [x] LEGO SPIKE / Mindstorms (Bluetooth LE).
- [x] Generic ESP32 + reference firmware (WebSocket protocol v2).
  - `src/adapters/esp32.ts` — `ESP32Adapter` implementing `RobotAdapterV2`
  - WebSocket protocol v2 spec (typed JSON messages: move, motors, led, sound, gesture, emergency_stop)
  - Telemetry parser (battery, IMU, distance, bump, motor_state, heartbeat, ack)
  - Auto-reconnect with exponential backoff, heartbeat, command queue
  - 47 unit tests covering serialization, parsing, lifecycle, queueing
  - Reference firmware: `firmware/esp32/CyberAgentESP32.ino` (Arduino, WiFi AP/station, WS server)
  - HIL checklist: `docs/hil/esp32/CHECKLIST.md`
- [x] Unitree Go1 / Go2 high-level SDK with documented safety envelope.
  - `src/adapters/unitree-go1.ts` — `UnitreeGo1Adapter` implementing `RobotAdapterV2`
  - Relay server WebSocket protocol (browser → relay → UDP/DDS → robot)
  - High-level API: `move`, `setBodyHeight`, `setGait`, `setPose`, `damping`, `standUp`, `sit`, `standDown`, `dance`, `jump`, `flip`, `emergencyStop`
  - Telemetry parsing: battery, IMU, joint_state, terrain, foot_force, state, position, heartbeat, ack
  - Safety envelope: speed clamping, body height limits, angle limits, battery thresholds
  - Enums: `GaitType` (0-4), `MotionMode` (0-13), `SpeedLevel` (0-2), `RobotModel` ('go1' | 'go2')
  - 75 unit tests covering serialization, parsing, lifecycle, queueing
  - HIL checklist: `docs/hil/unitree-go1/CHECKLIST.md`
  - ADAPTER_INFO entry + character compatibleAdapters updated
- [x] iRobot Create 3 / Roomba SDK.
  - `src/adapters/irobot-create3.ts` — `IRobotCreate3Adapter` implementing `RobotAdapterV2`
  - WebSocket protocol v2 (move, drive, velocity, stop, led, sound, play_song, sensors)
  - Telemetry parsing: battery, cliff, wall, bump, wheel_drop, distance, angle, charge_state, heartbeat, ack
  - Auto-reconnect with exponential backoff, command queue
  - 32 unit tests
  - HIL checklist: `docs/hil/irobot-create3/CHECKLIST.md`
- [x] DJI Tello / Tello EDU (drone, indoor only).
  - `src/adapters/tello.ts` — `TelloAdapter` implementing `RobotAdapterV2`
  - WebSocket protocol v2 (takeoff, land, move, rotate, speed, flip, go, waypoint)
  - Telemetry parsing: battery, temperature, barometer, tof, attitude, flight_data, wifi, flight_status
  - Convenience methods: takeoff, land, move, rotate, setSpeed, flip, goTo, startWaypoint, endWaypoints
  - INDOOR ONLY safety warning throughout
  - 31 unit tests
  - HIL checklist: `docs/hil/tello/CHECKLIST.md`
- [x] Marketplace UI surfaces adapter compatibility per character.

**Release gate**: 10 adapters total, every character page lists which
toys can run it. ✅ **MET** — Released: 2026-04-30

#### v1.0 — First stable release _(+6 → +7 months)_

The "1.0" promise: anything `npm install @cyber-agent/sdk@1` will keep
working until v2.0.

- [x] Stable SDK API surface (TypeScript types frozen, semver).
  - `sdk/src/public-api.ts` — exact public API boundary
  - `sdk/CHANGELOG.md` — version history
- [x] Stable `.cybertrace` schema v1.
  - `sdk/src/trace/schema.ts` — versioned with `TRACE_SCHEMA_VERSION`
  - `validateTrace()` / `migrateTrace()` included
- [x] Documentation site (`/docs`) covers every public API.
  - Updated `Docs.tsx` with v1.0 API reference, adapter contract v2, migration guide
- [x] Migration guide from 0.x.
  - `sdk/MIGRATION.md` — adapter v2, trace schema, import paths
- [x] Performance budget: <16 ms tick on a $50 mBot.
  - `src/engine/performance.test.ts` — 4 benchmarks all pass <16ms

**Release gate**: passes a 24-hour soak test (1 character × 5 adapters,
zero crash, zero memory leak).

#### v1.1 — Perception bus _(+7 → +9 months)_

Sensors close the loop.

- [x] `src/perception/` — typed event stream
      (`see.face`, `see.object.<id>`, `hear.word.<id>`, `near.<distance>`,
      `tilt`, `bump`).
      - `src/perception/types.ts` — PerceptionEvent union type + category interfaces
      - `src/perception/bus.ts` — PerceptionBus pub/sub with circular buffer
      - `src/perception/nodes.ts` — BT conditions (perceive.*) + actions (memorize.*)
- [x] Webcam adapter (browser + WebRTC) with face / hand / object
      detection; `/debug` overlays bounding boxes on the timeline.
      - `src/adapters/webcam.ts` — WebcamAdapter with simulate mode
      - `/debug` Perception panel shows face/object detection events
- [x] Microphone adapter (VAD + keyword spotting).
      - `src/adapters/microphone.ts` — MicrophoneAdapter with VAD + keyword spotting
- [x] On-device option: ESP32 / RPi relay perception events to browser.
      - `src/adapters/esp32-perception-relay.ts` — ESP32PerceptionRelay
      - `firmware/esp32-perception-relay/CyberAgentPerceptionRelay.ino` — reference firmware
      - `docs/hil/esp32-perception-relay/CHECKLIST.md` — HIL checklist
- [x] BT primitives: `Perceive`, `Memorize`.
      - `perceive.face`, `perceive.object`, `perceive.word`, `perceive.sound`, `perceive.near`, `perceive.bump`
      - `memorize`, `memorize.face`, `memorize.object`, `memorize.word`
- [x] 5 sample characters that only make sense with perception
      (e.g. cat hides on face).
      - `shy-cat` — hides from faces, warms to familiar
      - `playful-dog` — chases objects, reacts to sounds
      - `guardian-bot` — patrols, alerts on detection
      - `musician-bot` — dances to sounds, sings when alone
      - `curious-bird` — flies toward objects, avoids faces

**Release gate**: real toy reacts in <200 ms to a webcam stimulus; trace
shows the full perception → BT → motor chain. _(requires real hardware test)_

#### v1.2 — Episodic memory _(+9 → +10 months)_

- [x] `src/memory/` — episodic store keyed by `(event, emotion, time)`.
  - `src/memory/types.ts` — EpisodicMemory, RecallQuery, RecallResult, EpisodicStoreBackend, MemoryStats, ForgettingCurveParams
  - `src/memory/episodic-store.ts` — InMemoryEpisodicStore with Ebbinghaus forgetting curve, semantic/emotional recall, purge
  - `src/memory/recall.ts` — BT primitives: `memorize.episodic`, `recall(query)`, `hasMemory(keyword)`
  - `src/memory/index.ts` — barrel exports
- [x] SQLite-WASM in-browser; pluggable to OpenClaw memory in dev.
  - `EpisodicStoreBackend` interface enables backend swap (InMemoryEpisodicStore default)
- [x] BT primitive `Recall(query)` returns top-K events to blackboard.
  - `recall` action writes `recentMemories` + `recallStats` to blackboard
- [x] `/debug` adds a "memories" panel.
  - `src/pages/MemoriesPanel.tsx` — stats, relevance histogram, search, sort, simulate forgetting, purge
  - `src/hooks/useDebug.ts` — encodeMemory, purgeMemories, simulateForgetting hooks
- [x] Forgetting curve + manual purge tools.
  - Ebbinghaus curve: `relevance = initialRelevance * 2^(-age/halfLife) * recallBoost * salienceFactor`
  - `simulateForgetting(elapsedMs)` in debug, `purge()` to remove pruned memories

**Release gate**: a character demonstrably treats a returning face
differently from a new face on real hardware.

#### v1.3 — Affect engine (VAL)

Released: 2026-05-10 _(+10 → +12 months)_

- [x] Per-agent VAL state (Valence / Arousal / Dominance) with decay.
- [x] BT priors: nodes declare `bias: { whenArousal: ">0.7" }`; selector
      reorders by current affect.
- [x] Adapter expressions: LED color / sound / motion style modulated by
      VAL (default mappings + per-character override).
- [x] `/debug` adds VAL trajectory aligned with timeline.
  - `src/pages/VALTimelinePanel.tsx` — unified canvas: VAL curve + perception markers + adapter tx/rx markers on shared time axis
  - Hover crosshair shows time, VAL state (V/A/D), and event details
  - `src/pages/VALTimelinePanel.test.tsx` — 8 tests
- [x] Authoring DSL: `emotion: anxious | playful | stoic` composable.

**Release gate**: blind A/B test (n=30) prefers VAL-biased character over
flat baseline ≥70 %.

#### v2.0 — Sim ↔ Real bridge _(+12 → +18 months)_

The "train cheap, deploy real" milestone.

- [x] Browser-embedded sim (2D rigid-body physics engine) on `/agent` page.
  - ⚠️ **experimental** — sim-only, requires real hardware for full validation
- [x] One-shot `simulate → record → replay-on-real` workflow.
  - `Sim2RealReplay` — maps sim commands (move/rotate/stop/gesture/led/sound/emergency_stop) to adapter payloads
  - `exportCyberSim`/`importCyberSim` — `.cybersim` format with `$schema: cybersim/v1` header
  - `useSimMode.replayOnReal(adapter, config)` + `abortReplayOnReal()` hook APIs
  - HIL checklist: `docs/hil/sim2real/CHECKLIST.md`
- [x] Domain-randomization sliders (mass, friction, latency, sensor
      noise) wired into the debugger.
  - `src/pages/DomainRandomizationPanel.tsx` — mass, friction, latency, sensor-noise sliders
  - `src/sim/engine.ts` — `applyMassRandomization()` + `applySensorNoise()` helpers
  - `useSimMode` exposes `randomization` / `setRandomization` / `resetRandomization`
  - 15 unit tests (7 engine + 8 component)
  - `experimental` — sim-only, requires real hardware for transfer validation
- [x] `dataset/` — record episodes in `.cybertrace`-compatible format,
      optional one-click upload to HuggingFace Hub.
  - `EpisodeRecorder` — start/stop/pause/resume/export/delete lifecycle
  - `exportCyberTrace/exportEpisodeAsCyberTrace/exportDatasetAsCyberTrace`
  - `uploadToHub/uploadDatasetFiles/checkHubToken` — HuggingFace Hub integration
  - `DatasetPanel` — UI for browsing episodes/datasets in simulator
  - `useSimMode` exposes dataset APIs via `sim.*`
  - 13 unit tests (all passing)
- [x] Bench `bench/sim2real.json` — 10 canonical behaviors, ≥90 %
      transfer accuracy.
  - 10 behaviors: forward, backward, rotate-90, rotate-180, led-color,
    sound-tone, gesture, emergency, complex-patrol, angle-movement
  - `src/bench/sim2real.test.ts` — 13 tests validating sim→adapter mapping
  - All behaviors achieve 1.0 sim accuracy (≥90% threshold met)
  - `experimental` — sim accuracy only; real-hardware transfer validation pending
- [ ] Optional: import LeRobot policies (`@cyber-agent/sdk-lerobot`
      bridge) for users who want learned skills under the BT director.

**Release gate**: a contributor authors a behavior in sim and it lands
unchanged on a real RoboMaster; published bench numbers hold.

#### v2.1 — Multi-agent stage _(+18 → +21 months)_

> Detailed plan + competitive research (AI Town / Smallville / Isaac Sim
> Mega) in [MULTI-AGENT-PLAYGROUND-PLAN.md](MULTI-AGENT-PLAYGROUND-PLAN.md).
> An MVP is being prototyped during Q2 W7-W8 as an experimental flag —
> see [TODO-Q2-2026.md](TODO-Q2-2026.md).

- [x] Shared blackboard / pub-sub bus over WebSocket (host elects).
- [x] Social BT primitives: `BroadcastEmotion`, `Negotiate`, `Mirror`,
      `RoleSwap`, `findNearestAgent`, `greet`, `follow`, `flee`,
      `emitSignal` / `onSignal`.
      - `src/engine/builtins-multi.ts` — 5 conditions + 10 actions
      - `src/pages/SocialEventsPanel.tsx` — debug panel for social events
      - `src/engine/tracer.ts` — `social.event` tracer event type
      - `src/hooks/useDebug.ts` — `socialEvents` state + event subscription
      - 35 unit tests (`builtins-multi.test.ts`)
- [x] `World` + `SpatialIndex` + `MultiExecutor` (deterministic, seeded
      RNG, 100% replay parity).
- [x] Scene library: playground / park / campus / schoolyard with POIs
      (slide, swing, sandbox, classroom door, …); Tiled importer.
  - `src/engine/scenes/` — types, registry, importer
  - 4 scenes: playground (13 POIs), park (16 POIs), campus (26 POIs), schoolyard (20 POIs)
  - `importTiledMap()` — Tiled JSON map → Scene with objmap/bgtiles/spawns layers
  - `validateScene()` / `requireScene()` — validation helpers
  - 23 unit tests
- [x] `/playground` page: drag agents from Gallery into a scene, freeze /
      replay / share-link a session.
- [x] N-track timeline + agent diff in `/debug`.
  - `src/pages/MultiAgentTimelinePanel.tsx` — N-track canvas timeline with hover crosshair
  - `src/pages/AgentDiffPanel.tsx` — blackboard diff across agents
  - `src/hooks/useMultiAgentDebug.ts` — per-agent debug state aggregation
  - 7 unit tests (MultiAgentTimelinePanel + AgentDiffPanel)
  - Wired into `/debug` page via `useMultiAgentDebug`
- [x] `MultiBroadcastAdapter` — fan-out commands to N physical robots
      with NTP-style time sync (≤5 ms drift) and global e-stop.
  - `src/adapters/multi-broadcast.ts` — `MultiBroadcastAdapter` implementing `RobotAdapterV2`
  - Command fan-out to all connected adapters
  - NTP-style time sync with drift tracking (≤5 ms threshold)
  - Global e-stop propagation to all robots
  - Per-robot health monitoring (connection, latency, heartbeat)
  - Self-test with structured report
  - `docs/hil/multi-broadcast/CHECKLIST.md` — HIL checklist
  - 20 unit tests (`multi-broadcast.test.ts`)
- [x] **Two-robot demo (cat × dog) with believable interaction**
  - `src/agents/cat-dog-demo/` — demo characters + behaviors
  - `demo-cat`: shy cat (flee, mirror, broadcast calm)
  - `demo-dog`: playful dog (seek, greet, back off)
  - Leverages social BT primitives: `isCloseTo`, `isFarFrom`, `flee`, `mirror`, `broadcastEmotion`, `findNearestAgent`, `greet`
  - 'Demo' button in playground toolbar for one-click load
  - Characters registered in gallery under 'companion' category
- [x] 3+ robots, 30-minute soak, no cross-talk drops.
  - `CrossTalkPanel` — real-time per-robot command stats, drop rates,
    drift, health in `/debug` page
  - `PerformancePanel` — live tick-rate sparkline + latency histogram
    with canvas rendering
  - `MultiBroadcastAdapter` cross-talk detection with per-robot sequence
    tracking, pending timeout, and `getCrossTalkReport()`
  - `multi-broadcast-soak.test.ts` — 10K-command soak test across 4
    robots with zero cross-talk verification
  - `docs/hil/multi-broadcast/SOAK-CHECKLIST.md` — 30-minute HIL soak
    procedure for 3+ physical robots
  - 25 unit tests (CrossTalkPanel + PerformancePanel + soak)

**Release gate**: 3-robot soak test green; one community-recorded
multi-agent trace replayable; ≥2 RoboMaster S1 follow a browser-authored
playground session with <10 cm / <100 ms sim→physical error.

#### v2.2 — VLA / policy slot-in _(+21 → +24 months)_

Make CyberAgent the orchestration layer over modern policies.

- [x] Action node `RunPolicy(<HF model id>, observation_spec)` — calls a
      VLA / diffusion policy for one motion primitive.
  - `src/engine/policy.ts` — `PolicyConfig` / `ObservationSpec` / `ActionSpec` / `PolicyResult` types
  - `PolicyClient` interface with `RestPolicyClient`, `SimPolicyClient`, `MockPolicyClient` implementations
  - `runPolicyAction()` — BT action node: extracts observations from blackboard, calls policy, maps action vector to commands
  - `applyPolicyAction()` — action vector → nested robot command payload
  - `registerPolicyNodes()` — registers `runPolicy` + `whenPolicyConfident` with BT engine
  - `src/engine/policy.test.ts` — 25 tests (registry, clients, mappings, action node, condition)
  - `experimental` — sim-only; real-hardware transfer validation pending
- [x] `WhenPolicyConfident` selector branch.
- [x] Reference integration: Pi0 / SmolVLA / GR00T via LeRobot bridge.
  - `src/engine/lerobot-bridge.ts` — `LeRobotPolicyClient` with WebSocket handshake,
    observation send, camera frame support, task switching, auto-reconnect
  - `LEROBOT_MODELS` registry with `pi0`, `smolvla`, `gr00t` pre-configured
  - `createLeRobotClient()` factory with camera config derivation
  - `generateLeRobotHILChecklist()` for HIL docs
  - `docs/hil/lerobot-bridge/CHECKLIST.md` — HIL verification checklist
  - 22 unit tests
  - ⚠️ `experimental` — sim-only; real-hardware transfer validation pending
- [x] `/debug` shows policy input frames + action vector alongside BT.
  - `src/pages/PolicyInputPanel.tsx` — observation grid + action bar chart + confidence indicator
  - Frame selector slider for inspecting historical policy invocations
  - Triggered-by source node attribution
  - `src/pages/PolicyInputPanel.module.css` — panel styling
  - Wired into `/debug` page via `useDebug` policy events
- [x] Cookbook: how to ship a learned skill inside a hand-authored
      character.
  - `docs/cookbook/v2.2/hybrid-character-cookbook.md` — comprehensive guide
    - Architecture overview: BT as director, policy as action node
    - Sample VLA-Hybrid Guardian character with interleaved BT + policy
    - Pi0 / SmolVLA / GR00T config examples with observation/action specs
    - LeRobot bridge setup (Python server + browser client + camera capture)
    - Debugging tips (PolicyInputPanel, tracer events, blackboard fields)
    - Safety considerations and interleaving strategy
  - `src/agents/vla-hybrid-guardian/` — sample hybrid character
    - `character.ts` — VLA-Hybrid Guardian (guard category, experimental)
    - `behavior.ts` — BT with whenPolicyConfident → runPolicy → rule patrol
    - `index.ts` — barrel export
  - Registered in `src/agents/index.ts` gallery and character map

**Release gate**: one published character that interleaves authored BT
behavior with a learned VLA primitive on real hardware.

#### v3.0 — Studio _(+24 months)_

The "everyone can author a soul" release.

- [ ] No-code character editor with VAL / memory / perception wired in.
- [ ] One-click publish to Marketplace + signed character bundles.
- [ ] Hosted `/debug` (share a session URL with a teammate).
- [ ] Plugin SDK (third-party BT nodes / adapters / sensors).
- [ ] Stable `@cyber-agent/sdk@3` with breaking-change migration guide.

**Release gate**: a non-engineer publishes a working character driving a
real toy without writing TypeScript.

### Cross-cutting standing rules

These apply to **every** version and are enforced by the cron:

1. **No feature without a debugger story** — the PR adds tracer events,
   a `/debug` panel, or a replay capability.
2. **No feature without a real-hardware test** — sim-only changes ship
   behind `experimental/`.
3. **HEARTBEAT.md cites the current version + the exact checkbox(es) in
   flight.**
4. **Trace schema is versioned** — breaking changes ship with a migration
   script.
5. **SDK backwards-compat for 1 minor version** at minimum; 1 major for
   `@cyber-agent/sdk@1`.

## Contributing

See the [Docs page](https://unbug.github.io/cyber-agent/docs) for guidelines.

## License

MIT
