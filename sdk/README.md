# @cyber-agent/sdk

**CyberAgent SDK** — Behavior Tree engine and Robot Adapter for AI characters.

Give your robot a soul. ✨

## Installation

```bash
npm install @cyber-agent/sdk
```

## Quick Start

```typescript
import {
  BehaviorTreeRunner,
  CanvasAdapter,
  registerAction,
  createBlackboard,
} from '@cyber-agent/sdk'

// 1. Register custom actions
registerAction('wave', (bb) => {
  bb.excitement = 1
  return 'success'
})

// 2. Define your character's behavior tree
const myCharacter = {
  characterId: 'my-puppy',
  tree: {
    type: 'selector',
    children: [
      { type: 'condition', check: 'isPointerActive', args: { x: 100, y: 100 } },
      { type: 'action', action: 'moveToPointer' },
      { type: 'action', action: 'wave' },
      { type: 'action', action: 'idle' },
    ],
  },
  defaults: {
    emotion: 'happy',
    speed: 3,
  },
  tickIntervalMs: 100,
}

// 3. Create runner (browser demo)
const canvas = document.getElementById('canvas') as HTMLCanvasElement
const adapter = new CanvasAdapter(canvas)
const runner = new BehaviorTreeRunner(myCharacter, adapter)

// 4. Start!
runner.start()

// 5. Listen for ticks (for UI updates)
runner.onTick = (snapshot) => {
  console.log('Emotion:', snapshot.blackboard.emotion)
  console.log('Position:', snapshot.blackboard.x, snapshot.blackboard.y)
}
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 Your Character                   │
│  ┌───────────────────────────────────────────┐  │
│  │         Behavior Tree (JSON)              │  │
│  │  ┌──────┐    ┌──────┐    ┌──────┐       │  │
│  │  │Select│───▶│Condtn│───▶│Action│       │  │
│  │  └──────┘    └──────┘    └──────┘       │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│           Behavior Tree Engine                  │
│  hydrate() │ tick() │ resetTree() │ register*() │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│           Robot Adapter                         │
│  ┌──────────┐ ┌──────────────┐ ┌────────────┐  │
│  │ Canvas   │ │ WebSocket    │ │ Custom     │  │
│  │ Adapter  │ │ Adapter      │ │ Adapter    │  │
│  └──────────┘ └──────────────┘ └────────────┘  │
└─────────────────────────────────────────────────┘
                    │
                    ▼
            [ Robot / Display ]
```

## API Reference

### Core

| Export | Type | Description |
|--------|------|-------------|
| `BehaviorTreeRunner` | class | Manages the BT tick loop |
| `createBlackboard()` | function | Creates a new blackboard with defaults |
| `hydrate(def)` | function | Converts BehaviorNodeDef → RuntimeNode |
| `tick(node, bb, adapter)` | function | Executes one frame of the BT |
| `resetTree(node)` | function | Resets all nodes to idle |
| `registerAction(name, fn)` | function | Registers a custom action |
| `registerCondition(name, fn)` | function | Registers a custom condition |

### Types

| Type | Description |
|------|-------------|
| `BehaviorNodeDef` | Serializable BT node (Sequence, Selector, Parallel, etc.) |
| `RuntimeNode` | Hydrated node with runtime state |
| `Blackboard` | Shared state (position, emotion, sensors, etc.) |
| `RobotAdapter` | Interface for hardware abstraction |
| `CharacterBehavior` | Character definition with BT tree |
| `RunnerSnapshot` | State snapshot for UI updates |

### Adapters

#### CanvasAdapter

```typescript
const adapter = new CanvasAdapter(canvasElement)
```

Renders the agent on a 2D canvas. Useful for browser demos and testing.

#### WebSocketAdapter

```typescript
const adapter = new WebSocketAdapter({
  url: 'ws://robot.local:8080',
  reconnectIntervalMs: 3000,
  heartbeatIntervalMs: 5000,
})
```

Sends commands over WebSocket to a robot. Includes auto-reconnect, heartbeat, and command queue.

### Behavior Tree Node Types

| Type | Category | Description |
|------|----------|-------------|
| `sequence` | Composite | Runs children left→right. Fails on first failure. |
| `selector` | Composite | Runs children left→right. Succeeds on first success. |
| `parallel` | Composite | Ticks all children. Succeeds when threshold met. |
| `inverter` | Decorator | Inverts child result (success↔failure). |
| `repeater` | Decorator | Repeats child N times (-1 = forever). |
| `cooldown` | Decorator | Limits child execution frequency. |
| `condition` | Leaf | Checks a registered predicate. |
| `action` | Leaf | Executes a registered action. |
| `wait` | Leaf | Waits for specified duration. |

## Built-in Actions

| Action | Description |
|--------|-------------|
| `moveForward` | Move agent forward by speed |
| `moveBackward` | Move agent backward by speed |
| `turnLeft` | Rotate 30° left |
| `turnRight` | Rotate 30° right |
| `moveToPointer` | Move toward cursor position |
| `idle` | Stay still |
| `setEmotion` | Set emotion state |

## Built-in Conditions

| Condition | Description |
|-----------|-------------|
| `atBoundary` | Agent is at canvas edge |
| `isPointerActive` | Cursor is active |
| `hasLowEnergy` | Energy below 0.2 |
| `isNear` | Agent is near a point |

## Creating a Custom Character

```typescript
const myCharacter: CharacterBehavior = {
  characterId: 'my-guard-dog',
  tree: {
    type: 'selector',
    children: [
      {
        type: 'condition',
        check: 'isPointerActive',
      },
      {
        type: 'sequence',
        children: [
          { type: 'action', action: 'moveToPointer' },
          { type: 'action', action: 'setEmotion', args: { emotion: 'alert' } },
        ],
      },
      {
        type: 'sequence',
        children: [
          { type: 'action', action: 'turnLeft' },
          { type: 'action', action: 'moveForward' },
          { type: 'cooldown', durationMs: 2000, child: { type: 'action', action: 'idle' } },
        ],
      },
    ],
  },
  defaults: {
    emotion: 'idle',
    speed: 2,
  },
}
```

## Contributing

This SDK is part of the [CyberAgent](https://github.com/unbug/cyber-agent) project.

```bash
cd sdk
npm install
npm run build    # Build the SDK
npm run dev      # Watch mode for development
```

## License

MIT
