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
- [ ] Coverage gate ≥ 80 % on `src/engine/` and `src/adapters/`.
- [ ] `CONTRIBUTING.md` documents debug + embodiment invariants.

**Release gate**: tracer emits in production build; CI emulator green
7 days; HEARTBEAT shows 0 unresolved adapter errors.

#### v0.4 — `/debug` page MVP _(+1 → +2 months)_

A debugger you can hand to a contributor.

- [ ] `/debug` page split-view: BT graph (current node highlighted, last
      50-node breadcrumb) ｜ actuator timeline ｜ blackboard inspector.
- [ ] Live tick-rate / latency widgets.
- [ ] Diff highlighting on every blackboard write.
- [ ] Capability discovery — read `adapter.capabilities()` and grey out
      incompatible BT nodes in the editor.
- [ ] One end-to-end demo video: bug → fix → re-run on real RoboMaster.

**Release gate**: a maintainer reproduces a contributor-reported bug
locally with no hardware, using only the live `/debug` view.

#### v0.5 — Time-travel & `.cybertrace` _(+2 → +3 months)_

- [ ] `.cybertrace` format spec (`sdk/src/trace/schema.ts`) — gzipped
      JSONL, versioned, with migration registry.
- [ ] `/debug` scrubber: rewind / step / fast-forward an in-memory
      session OR an uploaded trace.
- [ ] Breakpoints by BT node, blackboard predicate, or adapter event.
- [ ] CLI: `cyber-agent record <adapter>` / `cyber-agent replay <file>`.
- [ ] Pull a trace off a real device over WebSocket.
- [ ] `npx @cyber-agent/sdk trace lint` validates schema.

**Release gate**: a third party shares a `.cybertrace` from a real robot;
maintainer single-steps through it locally to root-cause a bug.

#### v0.6 — Adapter contract v2 _(+3 → +4 months)_

- [ ] `sdk/src/adapter/contract.ts` v2:
      `connect / disconnect / sendCommand / onTelemetry / capabilities() /
      selfTest()` returning a structured report.
- [ ] Hardware-in-Loop (HIL) checklist a contributor can run with a $50
      mBot to certify a new adapter.
- [ ] Migrate existing 5 adapters to v2; deprecate v1 with a 1-version
      grace.
- [ ] Safety supervisor node: kill switch on >200 ms heartbeat loss,
      watt-dog on motor stall.

**Release gate**: 5 in-house adapters certified; one community-contributed
adapter accepted using only the v2 contract.

#### v0.7 — Embodiment Pack expansion _(+4 → +6 months)_

Width of real toys — every adapter ships with HIL evidence under
`docs/hil/<adapter>/`.

- [ ] LEGO SPIKE / Mindstorms (Bluetooth LE).
- [ ] Generic ESP32 + reference firmware (WebSocket protocol v2).
- [ ] Unitree Go1 / Go2 high-level SDK with documented safety envelope.
- [ ] iRobot Create 3 / Roomba SDK.
- [ ] DJI Tello / Tello EDU (drone, indoor only).
- [ ] Marketplace UI surfaces adapter compatibility per character.

**Release gate**: 10 adapters total, every character page lists which
toys can run it.

#### v1.0 — First stable release _(+6 → +7 months)_

The "1.0" promise: anything `npm install @cyber-agent/sdk@1` will keep
working until v2.0.

- [ ] Stable SDK API surface (TypeScript types frozen, semver).
- [ ] Stable `.cybertrace` schema v1.
- [ ] Documentation site (`/docs`) covers every public API.
- [ ] Migration guide from 0.x.
- [ ] Performance budget: <16 ms tick on a $50 mBot.

**Release gate**: passes a 24-hour soak test (1 character × 5 adapters,
zero crash, zero memory leak).

#### v1.1 — Perception bus _(+7 → +9 months)_

Sensors close the loop.

- [ ] `src/perception/` — typed event stream
      (`see.face`, `see.object.<id>`, `hear.word.<id>`, `near.<distance>`,
      `tilt`, `bump`).
- [ ] Webcam adapter (browser + WebRTC) with face / hand / object
      detection; `/debug` overlays bounding boxes on the timeline.
- [ ] Microphone adapter (VAD + keyword spotting).
- [ ] On-device option: ESP32 / RPi relay perception events to browser.
- [ ] BT primitives: `Perceive`, `Memorize`.
- [ ] 5 sample characters that only make sense with perception
      (e.g. cat hides on face).

**Release gate**: real toy reacts in <200 ms to a webcam stimulus; trace
shows the full perception → BT → motor chain.

#### v1.2 — Episodic memory _(+9 → +10 months)_

- [ ] `src/memory/` — episodic store keyed by `(event, emotion, time)`.
- [ ] SQLite-WASM in-browser; pluggable to OpenClaw memory in dev.
- [ ] BT primitive `Recall(query)` returns top-K events to blackboard.
- [ ] `/debug` adds a "memories" panel.
- [ ] Forgetting curve + manual purge tools.

**Release gate**: a character demonstrably treats a returning face
differently from a new face on real hardware.

#### v1.3 — Affect engine (VAL) _(+10 → +12 months)_

- [ ] Per-agent VAL state (Valence / Arousal / Dominance) with decay.
- [ ] BT priors: nodes declare `bias: { whenArousal: ">0.7" }`; selector
      reorders by current affect.
- [ ] Adapter expressions: LED color / sound / motion style modulated by
      VAL (default mappings + per-character override).
- [ ] `/debug` adds VAL trajectory aligned with timeline.
- [ ] Authoring DSL: `emotion: anxious | playful | stoic` composable.

**Release gate**: blind A/B test (n=30) prefers VAL-biased character over
flat baseline ≥70 %.

#### v2.0 — Sim ↔ Real bridge _(+12 → +18 months)_

The "train cheap, deploy real" milestone.

- [ ] Browser-embedded sim (MuJoCo-WASM or Genesis-web) on `/agent` page.
- [ ] One-shot `simulate → record → replay-on-real` workflow.
- [ ] Domain-randomization sliders (mass, friction, latency, sensor
      noise) wired into the debugger.
- [ ] `dataset/` — record episodes in `.cybertrace`-compatible format,
      optional one-click upload to HuggingFace Hub.
- [ ] Bench `bench/sim2real.json` — 10 canonical behaviors, ≥90 %
      transfer accuracy.
- [ ] Optional: import LeRobot policies (`@cyber-agent/sdk-lerobot`
      bridge) for users who want learned skills under the BT director.

**Release gate**: a contributor authors a behavior in sim and it lands
unchanged on a real RoboMaster; published bench numbers hold.

#### v2.1 — Multi-agent stage _(+18 → +21 months)_

- [ ] Shared blackboard / pub-sub bus over WebSocket (host elects).
- [ ] Social BT primitives: `BroadcastEmotion`, `Negotiate`, `Mirror`,
      `RoleSwap`.
- [ ] N-track timeline + agent diff in `/debug`.
- [ ] Two-robot demo (cat × dog) with believable interaction shipped.
- [ ] 3+ robots, 30-minute soak, no cross-talk drops.

**Release gate**: 3-robot soak test green; one community-recorded
multi-agent trace replayable.

#### v2.2 — VLA / policy slot-in _(+21 → +24 months)_

Make CyberAgent the orchestration layer over modern policies.

- [ ] Action node `RunPolicy(<HF model id>, observation_spec)` — calls a
      VLA / diffusion policy for one motion primitive.
- [ ] `WhenPolicyConfident` selector branch.
- [ ] Reference integration: Pi0 / SmolVLA / GR00T via LeRobot bridge.
- [ ] `/debug` shows policy input frames + action vector alongside BT.
- [ ] Cookbook: how to ship a learned skill inside a hand-authored
      character.

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
