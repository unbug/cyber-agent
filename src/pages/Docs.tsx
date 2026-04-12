import { motion } from 'framer-motion';
import { BookOpen, Zap, Settings, Terminal, Blocks, GitBranch } from 'lucide-react';
import styles from './Docs.module.css';

const sections = [
  {
    id: 'quickstart',
    icon: <Zap size={18} />,
    title: 'Quick Start',
    content: `
1. **Choose a Character** — Browse the Gallery and pick a personality that fits your robot.
2. **Connect your Robot** — Use the WebSocket API to pair your hardware with CyberAgent.
3. **Start the Behavior Tree** — The character's behavior tree will bring your robot to life.

\`\`\`bash
# Install the SDK
npm install @cyber-agent/sdk

# Initialize connection
import { CyberAgent } from '@cyber-agent/sdk';
const agent = new CyberAgent({ character: 'loyal-dog' });
await agent.connect('ws://your-robot:8080');
\`\`\`
    `.trim(),
  },
  {
    id: 'architecture',
    icon: <Blocks size={18} />,
    title: 'Architecture',
    content: `
CyberAgent uses a **Behavior Tree** architecture to give robots character-driven autonomy.

- **Character Layer** — Defines personality traits, emotional responses, and interaction patterns.
- **Behavior Tree Engine** — Executes decision logic in real-time based on sensor input and character state.
- **Robot Adapter** — Bridges the behavior tree to specific hardware (servo, LED, audio, motor).
- **Telemetry** — Streams performance metrics and emotional state back to the dashboard.

Each character is a composable JSON config — easy to fork, remix, and extend.
    `.trim(),
  },
  {
    id: 'characters',
    icon: <Settings size={18} />,
    title: 'Character System',
    content: `
Characters are defined with the following properties:

| Field | Type | Description |
|-------|------|-------------|
| \`id\` | string | Unique identifier (kebab-case) |
| \`name\` | string | Display name |
| \`category\` | enum | companion / guard / performer / explorer |
| \`personality\` | string[] | Trait descriptors |
| \`difficulty\` | enum | beginner / intermediate / advanced |
| \`behaviorTree\` | object | Root node of the behavior tree |

Characters support **inheritance** — create a base character and extend it with overrides.
    `.trim(),
  },
  {
    id: 'api',
    icon: <Terminal size={18} />,
    title: 'API Reference',
    content: `
### WebSocket API

\`\`\`
ws://host:port/api/v1/agent/:characterId
\`\`\`

**Messages (Client → Server):**
- \`{ "type": "command", "action": "start" | "stop" | "pause" }\`
- \`{ "type": "input", "sensor": "...", "value": ... }\`

**Messages (Server → Client):**
- \`{ "type": "telemetry", "data": { ... } }\`
- \`{ "type": "state", "emotion": "...", "action": "..." }\`
- \`{ "type": "error", "message": "..." }\`

### REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | \`/api/v1/characters\` | List all characters |
| GET | \`/api/v1/characters/:id\` | Get character detail |
| POST | \`/api/v1/agents\` | Create agent session |
| DELETE | \`/api/v1/agents/:id\` | Terminate session |
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
1. Add the character definition to \`src/data/characters.ts\`
2. Add a test in \`src/data/characters.test.ts\`
3. Verify it renders correctly on the Gallery and Agent pages
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
