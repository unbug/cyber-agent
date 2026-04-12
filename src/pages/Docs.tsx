import { motion } from 'framer-motion';
import { BookOpen, Zap, Settings, Terminal, Blocks, GitBranch } from 'lucide-react';
import styles from './Docs.module.css';

const sections = [
  {
    id: 'quickstart',
    icon: <Zap size={18} />,
    title: 'Quick Start',
    content: `
1. **Clone the repo** and start the dev server:

\`\`\`bash
git clone https://github.com/unbug/cyber-agent.git
cd cyber-agent
npm install
npm run dev
\`\`\`

2. **Browse the Gallery** — pick any character.
3. **Open the Agent page** — the behavior tree starts automatically.
4. **Move your mouse** over the canvas — watch the character react in real-time.
    `.trim(),
  },
  {
    id: 'architecture',
    icon: <Blocks size={18} />,
    title: 'Architecture',
    content: `
CyberAgent uses a **Behavior Tree** engine to give characters autonomous decision-making.

- **Behavior Tree Engine** — A composable tree of nodes (Sequence, Selector, Parallel, decorators, and leaf nodes) that evaluates every tick.
- **Blackboard** — Shared key-value state: pointer position, energy, emotion, position. The tree reads and writes to the blackboard.
- **Robot Adapter** — Pluggable output layer. The built-in \`CanvasAdapter\` renders on a 2D canvas. Future adapters (WebSocket, BLE, Serial) will drive real hardware.
- **Character Behaviors** — Each character is a \`CharacterBehavior\` config: a tree definition + blackboard defaults + tick rate.

The engine runs at a fixed tick rate for logic (10 FPS default) and uses \`requestAnimationFrame\` for smooth rendering — decoupled for consistency.
    `.trim(),
  },
  {
    id: 'characters',
    icon: <Settings size={18} />,
    title: 'Behavior Tree Nodes',
    content: `
**Composite Nodes** — control flow:

| Node | Behavior |
|------|----------|
| \`sequence\` | Runs children left-to-right. Fails on first failure. |
| \`selector\` | Runs children left-to-right. Succeeds on first success. |
| \`parallel\` | Ticks ALL children. Succeeds when threshold met. |

**Decorator Nodes** — modify child behavior:

| Node | Behavior |
|------|----------|
| \`inverter\` | Flips success ↔ failure. |
| \`repeater\` | Repeats child N times (-1 = forever). |
| \`cooldown\` | Blocks re-execution for N milliseconds. |

**Leaf Nodes** — actual work:

| Node | Behavior |
|------|----------|
| \`condition\` | Checks a predicate on the blackboard. |
| \`action\` | Executes a registered action function. |
| \`wait\` | Pauses for N milliseconds. |

Built-in actions include: \`moveToPointer\`, \`wander\`, \`patrol\`, \`bounceFromEdge\`, \`setEmotion\`, \`drainEnergy\`, \`restoreEnergy\`, and more.
    `.trim(),
  },
  {
    id: 'api',
    icon: <Terminal size={18} />,
    title: 'Extending the Engine',
    content: `
### Custom Actions

Register new actions that your characters can use:

\`\`\`typescript
import { registerAction } from './engine';

registerAction('spin', (bb, adapter, args) => {
  bb.rotation += (args?.speed as number) ?? 5;
  return 'success';
});
\`\`\`

### Custom Conditions

\`\`\`typescript
import { registerCondition } from './engine';

registerCondition('isNight', (bb) => {
  return new Date().getHours() >= 20;
});
\`\`\`

### Custom Robot Adapter

Implement the \`RobotAdapter\` interface to drive real hardware:

\`\`\`typescript
class MyRobotAdapter implements RobotAdapter {
  readonly type = 'my-robot';
  readonly name = 'My Custom Robot';
  init(bb) { /* open connection */ }
  update(bb) { /* send position/emotion to motors */ }
  destroy() { /* close connection */ }
  sendCommand(cmd) { /* forward to hardware */ }
}
\`\`\`
    `.trim(),
  },
  {
    id: 'contributing',
    icon: <GitBranch size={18} />,
    title: 'Contributing',
    content: `
We welcome contributions! Here's how to get started:

\`\`\`bash
git clone https://github.com/unbug/cyber-agent.git
cd cyber-agent
npm install
npm run dev
\`\`\`

**Guidelines:**
- Create a feature branch from \`main\`
- Write tests for new features (\`npm test\`)
- Follow the existing code style (CSS Modules, TypeScript strict)
- Submit a PR with a clear description

**Creating a new Character:**
1. Define a \`CharacterBehavior\` in \`src/engine/behaviors.ts\`
2. Add the character data in \`src/data/characters.ts\`
3. The behavior tree engine will auto-register and run it
    `.trim(),
  },
];

export function DocsPage() {
  return (
    <motion.div
      className={styles.page}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className={styles.header}>
        <BookOpen size={24} />
        <h1>Documentation</h1>
        <p>Everything you need to build character-driven robots</p>
      </div>

      <div className={styles.layout}>
        <nav className={styles.sidebar}>
          <span className={styles.navTitle}>On this page</span>
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className={styles.navLink}>
              {s.icon}
              {s.title}
            </a>
          ))}
        </nav>

        <div className={styles.content}>
          {sections.map((section, i) => (
            <motion.section
              key={section.id}
              id={section.id}
              className={styles.section}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.05 }}
            >
              <h2 className={styles.sectionTitle}>
                {section.icon}
                {section.title}
              </h2>
              <div
                className={styles.sectionBody}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }}
              />
            </motion.section>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/** Minimal markdown → HTML (good enough for docs) */
function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>')
    .replace(/^\|(.+)\|$/gm, (_, row) => {
      const cells = row.split('|').map((c: string) => c.trim());
      return '<tr>' + cells.map((c: string) => `<td>${c}</td>`).join('') + '</tr>';
    })
    .replace(/(<tr>.*<\/tr>\n?)+/g, '<table>$&</table>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[huptlo])(.+)$/gm, '<p>$1</p>');
}
