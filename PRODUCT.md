# CyberAgent — Product Vision & 10-Year Roadmap

> "Give your robot a soul."

## 🧭 2026-10-29 — Goal Reset (the Magic Loop is the product)

**Honest diagnosis.** Somewhere along the way the project drifted: months went
into observability meta-tools (trace scrubbers, trace-quality panels, plugin
sandboxes, marketplace bundles) and roadmap checkboxes, while the one promise
the site actually makes — *"Pick a personality, connect your robot, and watch
it come alive"* — **had never been built as a user-facing flow**. There was no
page where a normal person could connect a real robot. The excuse on file was
"release gates blocked by hardware"; that was false — the hardware (CyberBrick
Mini T, RoboMaster EP/S1) sits in this house.

**The goal, restated:** every step below must work for a non-engineer in under
5 minutes, on a real robot:

1. **Open** the site → instantly *see* characters alive (not a feature grid).
2. **Pick** a character → watch its personality run live in the browser.
3. **Connect** your robot (`/connect`) → pick platform, enter bridge address.
4. **Deploy** → your robot *is* that character: moves, turns, LEDs show emotion.
5. **Stay safe** → one big E-STOP; the bridge failsafe-stops on any dropout.

**What shipped in the reset (v4 "Magic Loop"):**

- `EmbodimentAdapter` — translates any character's blackboard motion (x/y/
  rotation/emotion) into differential-drive + LED commands. This is the
  missing link: all 70+ characters are now deployable on any robot, zero
  behavior-tree changes.
- `/connect` — the first-class Deploy page: character picker → robot picker →
  live command feed + E-STOP. Includes a **Demo Robot** mode so the loop is
  demoable with zero hardware.
- `bridge/robot_bridge.py` — one-command WebSocket bridge to real hardware
  (CyberBrick serial, RoboMaster SDK, dummy), with disconnect-failsafe stops.

**Standing priority rule (replaces checkbox-chasing):** any proposed feature
must answer *"does it make the Loop faster, safer, or more magical?"* Debug
panels, SDK, marketplace, playground stay — but they are backstage, not the
show: removed from the main nav, reachable at `/debug` etc. Daily work now
starts from the Loop, not the roadmap file.

**Next on the Loop:** publish the bridge to real CyberBrick + RoboMaster and
capture the demo video (this closes the long-stalled "release gates" for real,
not on paper); one-bridge-discovery on LAN; mobile pairing page.

---

## Mission

Make character-driven AI accessible to every robot builder in the world. CyberAgent is the personality layer between hardware and intelligence — an open platform where anyone can create, share, and deploy AI characters onto physical robots.

## Core Value Proposition

| For | We Solve |
|-----|------|
| **Hobbyist builders** | Zero-to-personality in 5 minutes |
| **Educators** | Engaging STEM curriculum through character robotics |
| **Hardware companies** | Plug-and-play personality SDK for consumer robots |
| **AI researchers** | Open behavior-tree playground for embodied AI |

---

## Phase 1 — Foundation (Year 1–2)

**Goal:** Build the best open-source character-to-robot platform.

### Y1 Milestones
- [x] Gallery v1: 20+ curated characters across 4 categories
- [x] WebSocket Robot Adapter: ESP32, Raspberry Pi, Arduino support with auto-reconnect, heartbeat, command queue
- [x] Behavior Tree Engine v1: runtime executor with 9 node types (Sequence, Selector, Parallel, Inverter, Repeater, Cooldown, Condition, Action, Wait)
- [x] RoboMasterWebSocket adapter with priority command queue and emergency stop
- [x] WebSocketAdapter: low-level WebSocket client for ESP32/RPi/Arduino
- [x] CanvasAdapter: built-in browser renderer with trail, glow, bounce effects
- [x] 20 Character Behaviors: loyal-dog, curious-cat, guard-dino, dance-bot, zen-turtle, scout-eagle, robot-helper, ws-demo, puppy, old-dog, squirrel-hunter, beach-cruiser, night-watch, courier-bot, gardener-bot, security-drone, playground-buddy
- [x] Live Preview: interactive canvas on Agent page with real BT telemetry
- [x] Character Editor: BT tree JSON viewer + metadata editor (two-panel), auto-load selected character's behavior tree, custom JSON import modal, export BT/character as JSON buttons, reference grid of all 20 characters + behaviors
- [x] Production build pipeline passing all 31 tests
- [x] RoboMasterMotionAdapter: motion primitives (motors, duration moves, rotation, LED control, sound)
- [x] RoboMasterAdapterV2: Priority command queue with emergency stop support
- [x] mBot adapter implementation
- [x] Build pipeline fixes for TypeScript compilation errors
- [x] GitHub Pages deploy returning 200 OK
- [x] Character Creator: web-based UI to design custom characters (2026-04-23)
- [x] SDK v1: `npm install @cyber-agent/sdk` (2026-04-23)
- [ ] Community: GitHub Discussions, contributor guide
- [x] Deploy: GitHub Pages SPA, zero-cost hosting

### Y2 Milestones
- [ ] Character Creator: web-based UI to design custom characters
- [ ] Marketplace v1: community-contributed characters (free tier)
- [ ] Hardware Profiles: pre-configured adapters for 10+ robot kits
- [ ] Multi-language: i18n for EN, ZH, JA, ES, DE
- [ ] Telemetry Dashboard: real-time emotion + sensor visualization
- [ ] Mobile companion app (React Native)

**Key Metric:** 1,000 active GitHub stars, 100 community characters

---

## Phase 2 — Growth (Year 3–4)

**Goal:** Become the default personality layer for consumer robots.

### Features
- [ ] Character Inheritance & Composition: extend base personalities
- [ ] Emotion Engine v2: multi-dimensional emotion state machine
- [ ] Voice Integration: TTS/STT with character-specific voice profiles
- [ ] Simulation Mode: test characters in 3D browser environment (Three.js)
- [ ] Robot-to-Robot: multi-agent character interactions
- [ ] Plugin System: community extensions (sensors, actuators, AI models)
- [ ] Analytics: character performance metrics, user engagement data

### Business
- [ ] CyberAgent Pro: premium characters, priority support
- [ ] Education License: school/university bulk pricing
- [ ] Hardware Partner Program: co-branded character packs

**Key Metric:** 10K MAU, 50 hardware integrations, $100K ARR

---

## Phase 3 — Platform (Year 5–7)

**Goal:** Open ecosystem where the community builds faster than we do.

### Features
- [ ] Character AI Studio: LLM-powered character behavior generation
- [ ] Behavior Tree Marketplace: buy/sell custom behavior modules
- [ ] Fleet Management: control multiple robots from one dashboard
- [ ] Edge AI: on-device character inference (no cloud required)
- [ ] AR Preview: point phone at robot to see character overlay
- [ ] API Economy: REST + GraphQL for third-party integrations
- [ ] CyberAgent Cloud: hosted character execution for enterprise

### Community
- [ ] Annual CyberAgent Conference (virtual + physical)
- [ ] Ambassador Program: top contributors get hardware grants
- [ ] Research Grants: fund academic work on embodied personality AI

**Key Metric:** 100K MAU, 500+ community plugins, $1M ARR

---

## Phase 4 — Ecosystem (Year 8–10)

**Goal:** The universal standard for robot personality.

### Features
- [ ] CyberAgent OS: lightweight Linux distro for character robots
- [ ] Character Chain: shared, versioned character evolution across robots
- [ ] Emotional Memory: characters that remember and grow over time
- [ ] Cross-Platform: from desktop robots to humanoids to drones
- [ ] Open Standard: publish the Character Description Format (CDF) spec
- [ ] CyberAgent Foundation: non-profit governance for the open standard

### Impact
- [ ] 1M+ robots running CyberAgent characters worldwide
- [ ] Adopted by 3+ major robot manufacturers
- [ ] CDF becomes IEEE/W3C recommended standard
- [ ] Self-sustaining OSS community with 1000+ contributors

**Key Metric:** 1M+ active robots, industry standard status

---

## Product Principles (Permanent)

1. **Open First** — Core is always free and open-source. Premium is additive, never extractive.
2. **5-Minute Magic** — Any new user should see a character working on their robot within 5 minutes.
3. **Hardware Agnostic** — Never lock to one robot platform. Adapters are thin, standards are open.
4. **Community Owned** — The community creates more value than the core team. Optimize for contribution, not control.
5. **Ships Weekly** — Continuous delivery. Every week the product gets measurably better.
6. **Accessible** — Works on a $10 microcontroller. No cloud dependency for core features.
7. **Beautiful** — World-class design is not optional. Every pixel, every interaction, every animation matters.

---

## Architecture Decisions (Locked)

| Decision | Choice | Rationale |
|-----|-----|---|
| Frontend | Vite + React + TypeScript | Fast DX, ecosystem, type safety |
| Styling | CSS Modules + CSS Custom Properties | Zero runtime, no vendor lock-in |
| Animation | Framer Motion | Best React motion library |
| Hosting | GitHub Pages (static SPA) | Free, fast, global CDN |
| Testing | Vitest + Testing Library | Vite-native, fast, ergonomic |
| CI/CD | GitHub Actions | Free for OSS, integrated |
| Robot Protocol | WebSocket | Real-time, bidirectional, battle-tested |
| Character Format | JSON + Behavior Trees | Human-readable, composable, versionable |

---

## Quarterly Rhythm

Every quarter:
1. **Plan** — Pick 1 major theme + 3 small improvements
2. **Build** — Ship incrementally, test continuously
3. **Measure** — Track stars, MAU, characters created, robots connected
4. **Reflect** — Retro doc in `/docs/retros/YYYY-QN.md`

---

## Competitive Moat

- **Network Effects:** More characters → more builders → more robots → more characters
- **Open Standard:** When you own the standard, you own the market
- **Community:** A 1000-contributor community is unkillable
- **Data Flywheel:** Telemetry from real robots improves character quality

---

*This document is the north star. Update it quarterly. Never lose sight of the 10-year horizon while shipping weekly.*

## 🚀 2026-10-30 — M1 shipped: zero-typing pairing + phone remote

M1 made step 3 of the Magic Loop ("connect your robot") require no typing and
no networking knowledge, and turned the phone into a first-class controller:

- **Bridge hello**: every bridge now self-identifies on connect
  (`{platform, name, port, remote_url}`) — the web app knows *which* robot it
  reached before deploying. Verified end-to-end on the dummy platform.
- **One-tap discovery** (`src/engine/bridge-discovery.ts`): browsers can't do
  mDNS, but they can open WebSockets — `/connect` probes recent + default
  bridge URLs in parallel (1.2 s), lists live robots, tap to use. Dead URLs
  silently drop. 13 tests.
- **Recent robots** chips (localStorage, capped, right-click to forget):
  returning users deploy in two taps, zero typing.
- **Phone touch remote** (`bridge/remote.html`): the bridge serves a mobile
  D-pad + E-STOP page on `ws_port + 1000`; touch-to-drive with 450 ms
  re-issue matching the web client, release-to-stop, auto-reconnect. Works
  over plain HTTP on the LAN, so no mixed-content/TLS story needed.
  Startup prints the phone URL (`[bridge] 📱 phone remote: http://<lan-ip>:…`).

### Milestone roadmap (10-year plan, next 12 months)

**North star unchanged:** non-engineer, real robot, under 5 minutes, magical.

- **M1 ✅ (2026-10-30) Zero-friction pairing** — discovery, hello, recents, phone remote.
- **M2 (next) Physical proof** — Mini T demo video: Puppy deployed from
  `/connect` walking the living room; RoboMaster EP same. This closes the
  v0.4/v3.0 hardware release gates for real. (Needs the robot powered on —
  one user action.)
- **M3 ✅ (2026-10-30) Trust & safety v1** — speed limiter presets (turtle/
  walk/rabbit on /connect), bridge-side hard cap (`--max-speed`, clamps every
  motors command regardless of client), child-lock PIN on the phone remote
  (web app exempt via `?role=browser`). Capability gating stays on the list
  for M5 (needs multi-robot capability model).
- **M4 ✅ (2026-10-31) Character portability** — `drive-tuning.ts`: per
  (character, robot-platform) embodied gains (maxSpeed/maxSteer/speedRefPx/
  yawRefDeg), signed inside bundles via the new `character-bundle/v2` schema
  (tamper → verify fails; canonical JSON so key order never breaks sigs);
  import applies tunings only when the signature covers them; the /connect
  speed preset stays a hard cap over any imported tuning; hostile imports
  clamped to safe physical ranges.
- **M5 Multi-robot rooms** — two characters, two robots, one page; simple
  social events between them (already have the BT social layer).
- **M6 Zero-install bridge** — one-command installer (`curl … | sh`) + auto
  launch on laptop lid-open; mDNS registration so future browsers with
  WebLL/mDNS-DNS get true auto-discovery.
- **M7 (12-month) Beta community loop** — 10 external users pairing their own
  robots unassisted; funnel telemetry (anonymous) on where the 5 minutes goes.

**Standing product rule:** every feature must make the Loop faster, safer, or
more magical. Debug/marketplace features only ship if they serve M2–M7.
