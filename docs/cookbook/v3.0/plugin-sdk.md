# Plugin SDK Cookbook

> How to extend CyberAgent with custom BT nodes, adapters, sensors, and characters.

## Overview

The Plugin SDK (`@cyber-agent/sdk/plugin`) lets you extend CyberAgent with custom functionality:

- **BT Nodes**: Custom actions and conditions for behavior trees
- **Adapters**: New robot platform support
- **Sensors**: New perception sources
- **Hooks**: Lifecycle hooks (beforeTick, afterTick, etc.)
- **Characters**: Pre-packaged character definitions

## Quick Start

### 1. Create a Plugin Manifest

Every plugin starts with a manifest that declares its identity and capabilities:

```typescript
import type { PluginManifest } from '@cyber-agent/sdk/plugin'

const manifest: PluginManifest = {
  name: 'my-custom-node',
  version: '1.0.0',
  type: 'bt-node',
  description: 'A custom BT node for dancing',
  author: 'Your Name',
  license: 'MIT',
  apiVersion: '3.0',
  entryPoint: 'registerMyNode',
}
```

### 2. Write the Plugin Code

```typescript
// my-plugin.ts
import { registerAction, registerCondition } from '@cyber-agent/sdk/engine/executor'

export function registerMyNode() {
  // Register a custom action
  registerAction('dance', (bb, adapter) => {
    adapter.sendCommand({ type: 'gesture', payload: { gesture: 'dance' } })
    return 'success'
  })

  // Register a custom condition
  registerCondition('isDancing', (bb) => {
    return bb._isDancing === true
  })
}
```

### 3. Load the Plugin

```typescript
import { loadPluginFromManifest } from '@cyber-agent/sdk/plugin'

const registration = await loadPluginFromManifest(manifest)

// The plugin's extensions are now available to all characters
```

## Plugin Types

### BT Node Plugin

Registers custom BT actions and conditions:

```typescript
const manifest: PluginManifest = {
  name: 'dance-nodes',
  version: '1.0.0',
  type: 'bt-node',
  description: 'Dance-related BT nodes',
  author: 'Your Name',
  license: 'MIT',
  apiVersion: '3.0',
  entryPoint: 'registerDanceNodes',
}

// Plugin code:
export function registerDanceNodes(ctx: PluginRegistrationContext) {
  ctx.registerAction('dance', (bb, adapter) => {
    adapter.sendCommand({ type: 'gesture', payload: { gesture: 'dance' } })
    return 'success'
  })

  ctx.registerAction('stopDance', (bb, adapter) => {
    adapter.sendCommand({ type: 'gesture', payload: { gesture: 'stop' } })
    return 'success'
  })

  ctx.registerCondition('isDancing', (bb) => {
    return bb._isDancing === true
  })
}
```

### Adapter Plugin

Registers a new robot adapter:

```typescript
const manifest: PluginManifest = {
  name: 'esp32-v3-adapter',
  version: '1.0.0',
  type: 'adapter',
  description: 'ESP32 adapter v3 with BLE support',
  author: 'Your Name',
  license: 'MIT',
  apiVersion: '3.0',
  entryPoint: 'createESP32Adapter',
  requiredCapabilities: ['movement', 'rotation', 'led', 'sound'],
}

// Plugin code:
export function createESP32Adapter(ctx: PluginRegistrationContext) {
  ctx.registerAdapter('esp32-v3', (config) => {
    return new ESP32V3Adapter(config)
  })
}
```

### Sensor Plugin

Registers a new sensor source for the PerceptionBus:

```typescript
const manifest: PluginManifest = {
  name: 'ultrasonic-sensor',
  version: '1.0.0',
  type: 'sensor',
  description: 'Ultrasonic distance sensor',
  author: 'Your Name',
  license: 'MIT',
  apiVersion: '3.0',
  entryPoint: 'createUltrasonicSensor',
}

// Plugin code:
export function createUltrasonicSensor(ctx: PluginRegistrationContext) {
  ctx.registerSensor('ultrasonic', (config) => {
    return {
      start() { /* start sensor */ },
      stop() { /* stop sensor */ },
      onEvent(callback) {
        // Emit distance events
        const interval = setInterval(() => {
          const distance = getDistance()
          callback({ type: 'distance', payload: { value: distance } })
        }, 100)
        return () => clearInterval(interval)
      },
    }
  })
}
```

### Hook Plugin

Registers lifecycle hooks:

```typescript
const manifest: PluginManifest = {
  name: 'logging-hook',
  version: '1.0.0',
  type: 'hook',
  description: 'Logs BT execution to console',
  author: 'Your Name',
  license: 'MIT',
  apiVersion: '3.0',
  entryPoint: 'registerLoggingHook',
}

// Plugin code:
export function registerLoggingHook(ctx: PluginRegistrationContext) {
  ctx.registerHook('beforeTick', (context) => {
    console.log(`[Plugin:logging-hook] Before tick ${context.data.tick}`)
  })

  ctx.registerHook('afterTick', (context) => {
    console.log(`[Plugin:logging-hook] After tick ${context.data.tick}, active node: ${context.data.activeNode}`)
  })

  ctx.registerHook('onError', (context) => {
    console.error(`[Plugin:logging-hook] Error: ${context.data.error}`)
  })
}
```

### Character Plugin

Registers a pre-packaged character:

```typescript
const manifest: PluginManifest = {
  name: 'pirate-bot',
  version: '1.0.0',
  type: 'character',
  description: 'A pirate-themed robot character',
  author: 'Your Name',
  license: 'MIT',
  apiVersion: '3.0',
  entryPoint: 'registerPirateCharacter',
}

// Plugin code:
export function registerPirateCharacter(ctx: PluginRegistrationContext) {
  ctx.registerCharacter({
    id: 'pirate-bot',
    name: 'Pirate Bot',
    category: 'companion',
    description: 'An adventurous pirate robot',
    behavior: {
      tree: {
        type: 'selector',
        name: 'Pirate Behavior',
        children: [
          { type: 'condition', check: 'hasLowEnergy', args: { threshold: 0.2 } },
          { type: 'action', action: 'idle' },
          { type: 'action', action: 'wander' },
        ],
      },
      characterId: 'pirate-bot',
      defaults: {
        emotion: 'playful',
        speed: 3,
      },
    },
    compatibleAdapters: ['esp32', 'robo-master', 'unitree-go1'],
  })
}
```

## Dependency Management

Plugins can declare dependencies on other plugins:

```typescript
const manifest: PluginManifest = {
  name: 'advanced-dance',
  version: '1.0.0',
  type: 'bt-node',
  description: 'Advanced dance moves',
  author: 'Your Name',
  license: 'MIT',
  apiVersion: '3.0',
  entryPoint: 'registerAdvancedDance',
  dependencies: ['dance-nodes'], // Must load dance-nodes first
}
```

The loader automatically resolves and loads dependencies in order.

## Debugging Plugins

The `/debug` page has a **Plugin Manager** tab that shows:

- All loaded plugins with their manifests
- Extension counts by type (actions, conditions, adapters, etc.)
- Plugin health status (healthy/degraded/unhealthy)
- Load times
- Error messages
- Actions: reload, unload, export manifest

### Using the Plugin Manager

1. Navigate to `/debug#plugins`
2. Click on a plugin card to see details
3. Use the filter buttons to view plugins by type
4. Load a new plugin by pasting its manifest JSON
5. Export a plugin's manifest as JSON

## Security Model

Plugins run in a sandboxed context that:

- **Restricts globals**: Only `console`, `Math`, `Date`, `JSON`, `Array`, `Object`, `String`, `Number`, `Boolean`, `Promise`, `Map`, `Set`, `RegExp`, and utility functions are available
- **Blocks dangerous patterns**: `eval`, `new Function`, `require`, `import`, `window.`, `document.`, `process.`, `child_process`, `fs`, `net`, `http`, `https`, `fetch`, `XMLHttpRequest`
- **Enforces limits**: Maximum execution time (5s) and maximum registrations (100)
- **Requires explicit registration**: Plugins must use the registration context to register extensions

## Publishing Plugins

To share your plugin with the community:

1. **Create a GitHub repository** with your plugin code
2. **Add a manifest file** (`plugin.json`) with your plugin's manifest
3. **Document usage** in your README
4. **Submit to the plugin registry** (coming soon)

### Example Repository Structure

```
my-cyberagent-plugin/
├── plugin.json          # Plugin manifest
├── src/
│   └── index.ts        # Plugin entry point
├── README.md            # Usage documentation
└── package.json         # NPM package (optional)
```

## Migration from v2

If you have plugins from a previous version:

1. Update your manifest to include `apiVersion: "3.0"`
2. Update your entry point to accept `PluginRegistrationContext` instead of the old API
3. Use `ctx.registerAction()` / `ctx.registerCondition()` etc. instead of direct registry calls

## Troubleshooting

### Plugin fails to load

Check the `/debug` Plugin Manager for error messages. Common causes:

- **Invalid manifest**: Ensure all required fields are present
- **Missing dependency**: Load dependencies first
- **Code execution error**: Check the plugin code for syntax errors
- **Security violation**: Remove dangerous patterns from plugin code

### Plugin not appearing in /debug

1. Ensure the plugin was loaded successfully (check manifest)
2. Call `refreshPlugins()` to update the debug view
3. Check that the plugin's `entryPoint` function exists and is callable

### Extension count is zero

The extension count is incremented when the plugin calls `ctx.register*()` methods. If your plugin registers extensions directly with the engine (bypassing the context), the count won't be updated.

## API Reference

### PluginManifest

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | ✅ | Unique plugin identifier |
| `version` | `string` | ✅ | Semver version |
| `type` | `PluginType` | ✅ | Plugin type: `bt-node`, `adapter`, `sensor`, `hook`, `character` |
| `description` | `string` | ✅ | Human-readable description |
| `author` | `string` | ✅ | Plugin author |
| `license` | `string` | ✅ | SPDX license identifier |
| `apiVersion` | `string` | ✅ | API version this plugin targets |
| `entryPoint` | `string` | ✅ | Name of the registration function |
| `dependencies` | `string[]` | ❌ | Plugin names that must be loaded first |
| `requiredCapabilities` | `string[]` | ❌ | Capabilities required by this plugin |

### PluginType

- `bt-node`: Custom BT action or condition node
- `adapter`: New robot adapter implementation
- `sensor`: New sensor/PerceptionBus source
- `hook`: Lifecycle hook (beforeTick, afterTick, etc.)
- `character`: Pre-packaged character definition

### PluginRegistrationContext

| Method | Description |
|--------|-------------|
| `registerAction(name, fn)` | Register a custom BT action |
| `registerCondition(name, fn)` | Register a custom BT condition |
| `registerAdapter(name, factory)` | Register a new adapter factory |
| `registerSensor(name, factory)` | Register a new sensor source |
| `registerHook(name, fn)` | Register a lifecycle hook |
| `registerCharacter(char)` | Register a character definition |
| `getManifest()` | Get the plugin manifest |
| `warn(message)` | Log a non-fatal warning |
| `error(message)` | Log a fatal error (stops loading) |

### PluginLoader

| Method | Description |
|--------|-------------|
| `loadManifest(manifest, code?)` | Load a single plugin |
| `loadMany(plugins)` | Load multiple plugins in parallel |
| `discover(source, options?)` | Discover plugins from a source |
| `getPluginDebugInfo()` | Get debug info for all plugins |
| `getLoadTime(name)` | Get load time for a plugin |
| `getDiscoveredPlugins()` | Get all discovered plugins |

### PluginDebugInfo

| Field | Type | Description |
|-------|------|-------------|
| `manifest` | `PluginManifest` | Plugin manifest |
| `loaded` | `boolean` | Whether the plugin is loaded |
| `extensionCount` | `{ actions, conditions, adapters, sensors, hooks, characters }` | Count of registered extensions |
| `loadTimeMs` | `number` | Plugin load time in ms |
| `lastError` | `string \| null` | Last error message |
| `health` | `'healthy' \| 'degraded' \| 'unhealthy'` | Plugin health status |
