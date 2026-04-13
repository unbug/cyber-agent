# CyberAgent — Product Vision & 10-Year Roadmap

> "Give your robot a soul."

## Mission

Make character-driven AI accessible to every robot builder in the world. CyberAgent is the personality layer between hardware and intelligence — an open platform where anyone can create, share, and deploy AI characters onto physical robots.

## Core Value Proposition

| For | We Solve |
|-----|----------|
| **Hobbyist builders** | Zero-to-personality in 5 minutes |
| **Educators** | Engaging STEM curriculum through character robotics |
| **Hardware companies** | Plug-and-play personality SDK for consumer robots |
| **AI researchers** | Open behavior-tree playground for embodied AI |

---

## Phase 1 — Foundation (Year 1–2)

**Goal:** Build the best open-source character-to-robot platform.

### Y1 Milestones
- [ ] Gallery v1: 20+ curated characters across 4 categories
- [x] WebSocket Robot Adapter: ESP32, Raspberry Pi, Arduino
- [x] Behavior Tree Engine v1: runtime executor with 9 node types (Sequence, Selector, Parallel, Inverter, Repeater, Cooldown, Condition, Action, Wait)
- [x] RobotAdapter Interface: hardware abstraction layer (`src/engine/types.ts`)
- [x] CanvasAdapter: built-in browser renderer with trail, glow, bounce effects
- [x] RoboMaster Motion Adapter: motion primitives for physical robot control (motors, LED, sound)
- [x] 8 Character Behaviors: loyal-dog, curious-cat, guard-dino, dance-bot, zen-turtle, scout-eagle, robot-helper, ws-demo
- [x] Live Preview: interactive canvas on Agent page with real BT telemetry
- [ ] Behavior Tree visual editor (drag-and-drop nodes)
- [ ] SDK v1: `npm install @cyber-agent/sdk`
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
|----------|--------|-----------|
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
