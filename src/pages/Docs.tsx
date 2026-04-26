import { motion } from 'framer-motion';
import { BookOpen, Zap, Settings, Terminal, Blocks, GitBranch, Package } from 'lucide-react';
import { HoverBeam } from '@/components/HoverBeam';
import { useI18n } from '@/i18n';
import styles from './Docs.module.css';

const sections = [
  {
    id: 'quickstart',
    icon: <Zap size={18} />,
    titleKey: 'docs.getting_started',
  },
  {
    id: 'architecture',
    icon: <Blocks size={18} />,
    titleKey: 'docs.architecture',
  },
  {
    id: 'characters',
    icon: <Settings size={18} />,
    titleKey: 'docs.api_reference',
  },
  {
    id: 'api',
    icon: <Terminal size={18} />,
    titleKey: 'docs.sdk',
  },
  {
    id: 'sdk',
    icon: <Package size={18} />,
    titleKey: 'docs.robots',
  },
  {
    id: 'contributing',
    icon: <GitBranch size={18} />,
    titleKey: 'docs.agents_guide',
  },
];

export function DocsPage() {
  const { t } = useI18n();

  return (
    <motion.div
      className={styles.page}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className={styles.header}>
        <BookOpen size={24} />
        <h1>{t('docs.title')}</h1>
        <p>{t('docs.getting_started_desc')}</p>
      </div>

      <div className={styles.layout}>
        <HoverBeam size="md" colorVariant="ocean" strength={0.52}>
          <nav className={styles.sidebar}>
            <span className={styles.navTitle}>{t('docs.on_this_page')}</span>
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className={styles.navLink}>
                {s.icon}
                {t(s.titleKey)}
              </a>
            ))}
          </nav>
        </HoverBeam>

        <div className={styles.content}>
          {sections.map((section, i) => (
            <motion.section
              key={section.id}
              id={section.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.05 }}
            >
              <HoverBeam
                size="md"
                colorVariant={i % 2 === 0 ? 'colorful' : 'sunset'}
                strength={0.6}
              >
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>
                    {section.icon}
                    {t(section.titleKey)}
                  </h2>
                  <div
                    className={styles.sectionBody}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(getSectionContent(section.id)) }}
                  />
                </div>
              </HoverBeam>
            </motion.section>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function getSectionContent(id: string): string {
  const contents: Record<string, string> = {
    quickstart: `
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
    architecture: `
CyberAgent uses a **Behavior Tree** engine to give characters autonomous decision-making.

- **Behavior Tree Engine** — A composable tree of nodes (Sequence, Selector, Parallel, decorators, and leaf nodes) that evaluates every tick.
- **Blackboard** — Shared key-value state: pointer position, energy, emotion, position. The tree reads and writes to the blackboard.
- **Robot Adapter** — Pluggable output layer. The built-in \`CanvasAdapter\` renders on a 2D canvas. Future adapters (WebSocket, BLE, Serial) will drive real hardware.
- **Character Behaviors** — Each character is a \`CharacterBehavior\` config: a tree definition + blackboard defaults + tick rate.

The engine runs at a fixed tick rate for logic (10 FPS default) and uses \`requestAnimationFrame\` for smooth rendering — decoupled for consistency.
    `.trim(),
    characters: `
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
    api: `
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
    sdk: `
**@cyber-agent/sdk** is the standalone package for building custom characters and robot adapters.

### Installation

\`\`\`bash
npm install @cyber-agent/sdk
\`\`\`

### Quick Start

\`\`\`typescript
import {
  BehaviorTreeRunner,
  CanvasAdapter,
  registerAction,
} from '@cyber-agent/sdk';

// Register custom actions
registerAction('dance', (bb) => {
  bb.excitement = Math.min(bb.excitement + 0.3, 1);
  return 'success';
});

// Define character behavior
const myCharacter = {
  characterId: 'my-puppy',
  tree: { type: 'selector', children: [
    { type: 'condition', check: 'isPointerActive' },
    { type: 'action', action: 'moveToPointer' },
    { type: 'action', action: 'dance' },
  ] },
  defaults: { emotion: 'happy', speed: 3 },
};

// Run!
const adapter = new CanvasAdapter(canvasElement);
const runner = new BehaviorTreeRunner(myCharacter, adapter);
runner.start();
\`\`\`

### API

| Export | Description |
|--------|-------------|
| \`BehaviorTreeRunner\` | Manages the BT tick loop |
| \`CanvasAdapter\` | 2D canvas renderer |
| \`WebSocketAdapter\` | WebSocket robot adapter |
| \`registerAction()\` | Register custom actions |
| \`registerCondition()\` | Register custom conditions |
| \`createBlackboard()\` | Create blackboard state |
| \`hydrate()\` | Convert BT def → runtime |
| \`tick()\` | Execute one BT frame |

### Behavior Tree Nodes

| Type | Category | Description |
|------|----------|-------------|
| \`sequence\` | Composite | Left→right, fails on first failure |
| \`selector\` | Composite | Left→right, succeeds on first success |
| \`parallel\` | Composite | All children, threshold-based |
| \`inverter\` | Decorator | Flips result |
| \`repeater\` | Decorator | Repeats N times |
| \`cooldown\` | Decorator | Rate limits child |
| \`condition\` | Leaf | Predicate check |
| \`action\` | Leaf | Executes action |
| \`wait\` | Leaf | Waits duration |

Built-in actions: \`moveForward\`, \`moveBackward\`, \`turnLeft\`, \`turnRight\`, \`moveToPointer\`, \`idle\`, \`setEmotion\`.

Built-in conditions: \`atBoundary\`, \`isPointerActive\`, \`hasLowEnergy\`, \`isNear\`.
    `.trim(),
    contributing: `
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
  };
  return contents[id] || '';
}

/** Markdown → HTML renderer */
function renderMarkdown(md: string): string {
  // ── 1. Extract fenced code blocks first (protect inner content) ──
  const blocks: string[] = [];
  let out = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang: string, code: string) => {
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const badge = lang ? `<span data-lang="${lang}">${lang}</span>` : '';
    blocks.push(`<pre data-code>${badge}<code>${escaped}</code></pre>`);
    return `\x00BLOCK${blocks.length - 1}\x00`;
  });

  // ── 2. Headings ──
  out = out
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>');

  // ── 3. Bold + inline code ──
  out = out
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // ── 4. Tables (skip separator rows like |---|---| ) ──
  out = out.replace(/^\|(.+)\|$/gm, (_line, row: string) => {
    if (/^[\s\-:|]+$/.test(row)) return '';           // separator → blank line
    const cells = row.split('|').map((c: string) => c.trim()).filter(Boolean);
    return '<tr>' + cells.map((c: string) => `<td>${c}</td>`).join('') + '</tr>';
  });
  // Wrap consecutive rows; first row → <th>
  out = out.replace(/((?:<tr>[\s\S]*?<\/tr>\n?)+)/g, (match) => {
    const rows = match.match(/<tr>[\s\S]*?<\/tr>/g) ?? [];
    if (!rows.length) return match;
    const thead = rows[0]!.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>');
    const tbody = rows.slice(1).join('');
    return `<table><thead>${thead}</thead>${tbody ? `<tbody>${tbody}</tbody>` : ''}</table>`;
  });

  // ── 5. Lists ──
  out = out
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  out = out.replace(/((?:<li>[\s\S]*?<\/li>\n?)+)/g, '<ul>$&</ul>');

  // ── 6. Paragraphs (skip block-level / placeholder lines) ──
  out = out
    .split(/\n{2,}/)
    .map((block) => {
      const t = block.trim();
      if (!t) return '';
      if (/^(<[huptlo]|<table|\x00BLOCK)/.test(t)) return t;
      return `<p>${t.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');

  // ── 7. Restore code blocks (handle both raw and <p>-wrapped) ──
  blocks.forEach((html, i) => {
    out = out.replace(new RegExp(`<p>\\x00BLOCK${i}\\x00</p>`, 'g'), html);
    out = out.replace(new RegExp(`\\x00BLOCK${i}\\x00`, 'g'), html);
  });

  return out;
}
