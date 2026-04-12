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
- **CSS Modules** with CSS Custom Properties (dark-first design system)
- **Framer Motion** for animations
- **React Router** for SPA routing
- **Vitest** + **Testing Library** for tests
- **GitHub Actions** → **GitHub Pages** for deployment

## Project Structure

```
src/
  components/   # Shared UI (Layout, etc.)
  data/         # Character definitions + helpers
  pages/        # Route pages (Home, Gallery, Agent, Docs)
  styles/       # Global CSS + design tokens
  test/         # Test files + setup
```

## Contributing

See the [Docs page](https://unbug.github.io/cyber-agent/docs) for guidelines.

## License

MIT
