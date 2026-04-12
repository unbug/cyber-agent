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

## Contributing

See the [Docs page](https://unbug.github.io/cyber-agent/docs) for guidelines.

## License

MIT
