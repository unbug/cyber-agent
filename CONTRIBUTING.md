# Contributing to CyberAgent

Thank you for your interest in contributing to CyberAgent! This guide will help you get started.

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/unbug/cyber-agent.git
cd cyber-agent
npm install
npm run dev
```

Visit http://localhost:5173/cyber-agent to see the app.

## 📦 Project Structure

```
cyber-agent/
├── src/
│   ├── agents/           # Character definitions (one dir per character)
│   │   ├── loyal-dog/    # Each character has:
│   │   │   ├── character.ts  # Metadata (name, emoji, category)
│   │   │   ├── behavior.ts   # Behavior tree (BT logic)
│   │   │   └── index.ts      # Re-exports
│   │   └── index.ts      # Registry — add new agents here
│   ├── engine/           # Behavior Tree engine
│   │   ├── executor.ts   # BT runtime (tick, hydrate, reset)
│   │   ├── runner.ts     # BehaviorTreeRunner (tick loop)
│   │   ├── builtins.ts   # Built-in actions & conditions
│   │   └── types.ts      # Shared types
│   ├── sdk/              # @cyber-agent/sdk (standalone package)
│   ├── pages/            # React pages
│   └── components/       # Shared React components
├── PRODUCT.md            # Product vision & roadmap
└── Q2-2026-EXECUTION-PLAN.md
```

## ✨ Adding a New Character

Each character is a self-contained directory with 3 files:

### 1. `character.ts` — Metadata

```typescript
import type { Character } from '../types'

export const character: Character = {
  id: 'my-character',
  name: 'My Character',
  emoji: '🎭',
  category: 'companion', // companion | guard | performer | explorer
  description: 'A brief description of what this character does.',
  tags: ['friendly', 'active'],
  personality: ['curious', 'playful'],
  difficulty: 'easy', // easy | medium | hard
}
```

### 2. `behavior.ts` — Behavior Tree

```typescript
import type { CharacterBehavior } from '../../engine/types'
import { cond, act, seq, sel } from '../helpers'

export const behavior: CharacterBehavior = {
  characterId: 'my-character',
  tickIntervalMs: 100,
  defaults: { speed: 2.0, energy: 0.8 },
  tree: sel('Root',
    // Priority 1: Rest when tired
    seq('Rest',
      cond('energyBelow', { threshold: 0.15 }),
      act('setEmotion', { emotion: 'sleepy' }),
      act('moveToCenter', { speed: 0.3 }),
      act('restoreEnergy', { rate: 0.005 }),
    ),
    // Priority 2: Follow pointer
    seq('Follow',
      cond('pointerNearby', { radius: 100 }),
      act('setEmotion', { emotion: 'happy' }),
      act('moveToPointer', { speed: 2.5 }),
    ),
    // Priority 3: Wander
    seq('Wander',
      act('setEmotion', { emotion: 'idle' }),
      act('wander', { speed: 1.0 }),
    ),
  ),
}
```

### 3. `index.ts` — Re-export

```typescript
export { character } from './character'
export { behavior } from './behavior'
```

### Register the Character

Add to `src/agents/index.ts`:

```typescript
// Import
import * as myCharacter from './my-character'

// Register
registerAgent(myCharacter, 'my-character')

// Add to agentList
myCharacter,
```

### Available BT Nodes

| Node | Usage | Description |
|------|-------|-------------|
| `cond(name, args)` | Condition check | Returns success/failure |
| `act(name, args)` | Action | Returns success/running/failure |
| `seq(name, ...children)` | Sequence | Runs all children in order |
| `sel(name, ...children)` | Selector | Runs first success, or all failures |
| `wait(ms)` | Wait | Returns running until duration passes |
| `cooldown(ms, child)` | Cooldown | Skips child if run too recently |
| `repeat(count, child)` | Repeat | Runs child N times |

### Built-in Conditions

| Condition | Args | Description |
|-----------|------|-------------|
| `pointerNearby` | `{ radius: number }` | Pointer within radius |
| `pointerActive` | — | Pointer is active |
| `pointerFarAway` | `{ radius: number }` | Pointer outside radius |
| `energyAbove` | `{ threshold: number }` | Energy above threshold |
| `energyBelow` | `{ threshold: number }` | Energy below threshold |
| `energyAt` | `{ value, tolerance }` | Energy near exact value |
| `excitementAbove` | `{ threshold: number }` | Excitement above threshold |
| `excitementAt` | `{ value, tolerance }` | Excitement near exact value |
| `nearEdge` | `{ margin: number }` | Near canvas edge |
| `atCenter` | `{ tolerance: number }` | Near canvas center |
| `emotionIs` | `{ emotion: string }` | Current emotion matches |
| `emotionNot` | `{ emotion: string }` | Current emotion differs |
| `random` | `{ chance: number }` | Random chance (0-1) |
| `tickModulo` | `{ mod: number }` | Every N ticks |

### Built-in Actions

| Action | Args | Description |
|--------|------|-------------|
| `moveToPointer` | `{ speed: number }` | Move toward pointer |
| `wander` | `{ speed: number }` | Wander to random target |
| `patrol` | `{ speed: number }` | Patrol canvas perimeter |
| `moveToCenter` | `{ speed: number }` | Move to canvas center |
| `chargeAt` | `{ speed: number }` | Rapid movement toward pointer |
| `retreat` | `{ speed: number }` | Move backward |
| `circle` | `{ centerX, centerY, radius, speed }` | Orbit a point |
| `zigzag` | `{ speed, amplitude, period }` | Erratic zigzag movement |
| `bounceFromEdge` | — | Bounce off canvas edges |
| `setEmotion` | `{ emotion: string }` | Set emotion state |
| `drainEnergy` | `{ rate: number }` | Drain energy |
| `restoreEnergy` | `{ rate: number }` | Restore energy |
| `increaseExcitement` | `{ amount: number }` | Increase excitement |
| `decayExcitement` | — | Decay excitement |
| `idle` | — | Do nothing |
| `pulse` | `{ intensity, duration, totalTicks }` | Pulse effect |
| `speakPhrase` | `{ text: string }` | Speak (adapter) |
| `playSound` | `{ frequency, duration }` | Play tone (adapter) |
| `flashLED` | `{ color: string }` | Flash LED (adapter) |
| `sendCommand` | `{ type, payload }` | Send raw command (adapter) |

## 🧪 Testing

```bash
npm test          # Run all tests
npm test -- --watch  # Watch mode
```

## 🏗 Building

```bash
npm run build     # Build to dist/
```

## 📚 SDK

The SDK is a standalone package at `sdk/`:

```bash
cd sdk
npm install
npm test
npm run build
```

Usage:

```typescript
import {
  BehaviorTreeRunner,
  CanvasAdapter,
  registerBuiltins,
  createCanvasRunner,
} from '@cyber-agent/sdk'

// Quick start
const runner = createCanvasRunner(behavior, canvasElement)
runner.start()
```

## 📝 Code Style

- TypeScript strict mode
- 2-space indent
- Single quotes
- Semicolons
- PascalCase for components/classes
- camelCase for functions/variables
- Descriptive names — no abbreviations

## 🔄 PR Process

1. Create a feature branch
2. Make your changes
3. Run `npm test` and `npm run build`
4. Submit a PR with a clear description
5. Update HEARTBEAT.md if relevant

## 🎯 Good First Issues

- Add a new character with a unique behavior
- Improve the Character Editor UI
- Add new built-in actions or conditions
- Improve documentation
- Add unit tests for edge cases

## 🤝 Community

- **GitHub Discussions**: Share character ideas, report bugs, ask questions
- **GitHub Issues**: File bugs and feature requests
- **Pull Requests**: Contribute code, characters, or documentation

## 📖 Resources

- [PRODUCT.md](./PRODUCT.md) — Product vision & roadmap
- [SDK README](./sdk/README.md) — SDK documentation
- [Behavior Tree Wiki](https://en.wikipedia.org/wiki/Behavior_tree_(artificial_intelligence,_robotics_and_control)) — BT theory

---

Thank you for helping make CyberAgent better! 🚀
