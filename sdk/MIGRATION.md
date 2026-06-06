# Migration Guide: @cyber-agent/sdk

This guide covers migration paths between major versions of `@cyber-agent/sdk`.

---

## Migration: 1.x → 3.0

### Quick Summary

| Change | Impact | Action |
|--------|--------|--------|
| SDK version bumped to 3.0.0 | Package version | Update `package.json` |
| Plugin SDK added | New feature, no breaking change | Optional: use plugin system |
| `wrapV1AsV2()` deprecated | v1 shim will be removed in 4.0 | Migrate to `RobotAdapterV2` directly |
| Public API surface expanded | More exports available | Import from `'@cyber-agent/sdk'` |
| Trace schema v1 unchanged | Backward compatible | No action needed |

### What Changed

#### 1. Plugin System (New in 3.0)

The plugin system is a **new addition**, not a breaking change. You can adopt it incrementally.

```typescript
// Register a custom BT action as a plugin
import { getPluginRegistry, PluginType } from '@cyber-agent/sdk/plugin'

const registry = getPluginRegistry()

registry.register({
  manifest: {
    name: 'my-custom-action',
    version: '1.0.0',
    type: PluginType.Action,
    description: 'Custom action node',
  },
  code: `
    export function execute(ctx, args) {
      ctx.blackboard.customFlag = true
      return 'success'
    }
  `,
})

// Load from a remote source
import { PluginLoader } from '@cyber-agent/sdk/plugin/loader'

const loader = new PluginLoader({
  sources: ['https://plugins.example.com/'],
})

const plugins = await loader.discover()
for (const plugin of plugins) {
  await registry.load(plugin)
}
```

#### 2. Adapter v1 Shim Deprecated

The `wrapV1AsV2()` shim is **deprecated** and will be removed in v4.0. Migrate to `RobotAdapterV2` directly:

**Before (deprecated):**
```typescript
import { wrapV1AsV2, RobotAdapterV1 } from '@cyber-agent/sdk/adapter/contract'

class MyLegacyAdapter implements RobotAdapterV1 {
  type = 'my-robot'
  name = 'My Robot'
  init(bb: Blackboard) { /* connect */ }
  update(bb: Blackboard) { /* send state */ }
  destroy() { /* disconnect */ }
  sendCommand(cmd: AdapterCommand) { /* send */ }
  capabilities() { return { movement: true, ... } }
}

const adapter = wrapV1AsV2(new MyLegacyAdapter())
```

**After (migrate to v2):**
```typescript
import { RobotAdapterV2, SelfTestReport, TelemetryEvent } from '@cyber-agent/sdk/adapter/contract'

class MyAdapter implements RobotAdapterV2 {
  type = 'my-robot'
  name = 'My Robot'
  contractVersion = 'v2' as const

  async connect(): Promise<void> { /* connect */ }
  init(bb: Blackboard) { /* initialize */ }
  update(bb: Blackboard) { /* send state */ }
  sendCommand(cmd: AdapterCommand) { /* send */ }

  onTelemetry(cb: (event: TelemetryEvent) => void): () => void {
    // register telemetry handler
    return () => { /* unsubscribe */ }
  }

  selfTest(): SelfTestReport {
    return {
      ok: true,
      status: 'healthy',
      summary: 'OK',
      checks: [],
      timestamp: Date.now(),
      version: '1.0',
    }
  }

  capabilities() {
    return {
      movement: true,
      rotation: true,
      speed: true,
      led: false,
      sound: false,
      gesture: false,
      maxSpeed: 100,
      maxRotationSpeed: 180,
      batteryReporting: false,
      distanceReporting: false,
      imuReporting: false,
      selfTestable: true,
      hardwareEStop: true,
    }
  }

  async disconnect(): Promise<void> { /* disconnect */ }
  destroy() { /* cleanup */ }
}

const adapter = new MyAdapter()
```

#### 3. New Stable Exports

The following are now part of the stable v3.0 API surface:

```typescript
// Plugin system
import {
  getPluginRegistry,
  resetPluginRegistry,
  validateManifest,
} from '@cyber-agent/sdk/plugin/registry'

import {
  createPluginContext,
  executePluginCode,
  isSandboxValid,
} from '@cyber-agent/sdk/plugin/sandbox'

import {
  PluginLoader,
  createPluginLoader,
  loadPluginFromManifest,
} from '@cyber-agent/sdk/plugin/loader'

// Plugin types
import type {
  PluginManifest,
  PluginRegistration,
  PluginRegistry,
  PluginSandbox,
  PluginType,
} from '@cyber-agent/sdk/plugin'
```

#### 4. Breaking: v1 Shim Removal in v4.0

Plan your migration timeline:

| Version | Status |
|---------|--------|
| 3.0 | `wrapV1AsV2()` deprecated, emits console warning |
| 3.x | Shim still works, will be removed in 4.0 |
| 4.0 | `wrapV1AsV2()` removed, `RobotAdapterV1` removed |

**Recommendation**: Migrate all v1 adapters to v2 before upgrading to 4.0.

### Full Migration Checklist

- [ ] Update `@cyber-agent/sdk` to `^3.0.0` in `package.json`
- [ ] Run `npm install`
- [ ] Review all custom adapters — migrate any v1 adapters to v2
- [ ] Replace `wrapV1AsV2()` calls with direct v2 implementations
- [ ] Update import paths if using unstable sub-paths (switch to root import)
- [ ] Test with `npm test`
- [ ] Verify deployment with `npm run build`
- [ ] (Optional) Explore the plugin system for custom BT nodes

### Need Help?

- Check the [CHANGELOG](./CHANGELOG.md) for version history
- See [`sdk/src/public-api.ts`](./src/public-api.ts) for the complete v3.0 stable surface
- Open an issue on [GitHub](https://github.com/unbug/cyber-agent/issues)

---

## Migration: 0.x → 1.0

### Quick Summary

| Change | Impact | Fix |
|--------|--------|-----|
| Adapter contract v2 | All adapters need `connect()`/`disconnect()` | Use `wrapV1AsV2()` shim or migrate to v2 |
| Trace schema v1 | `.cybertrace` format versioned | Run `cyber-agent trace lint` to validate |
| Public API surface | Only exports in `public-api.ts` are stable | Import from `'@cyber-agent/sdk'` not sub-paths |

### 1. Adapter Contract v2

### Breaking: `RobotAdapterV1` → `RobotAdapterV2`

**Before (v1):**
```typescript
class MyAdapter implements RobotAdapterV1 {
  type = 'my-robot'
  name = 'My Robot'

  init(bb: Blackboard) { /* connect */ }
  update(bb: Blackboard) { /* send state */ }
  destroy() { /* disconnect */ }
  sendCommand(cmd: AdapterCommand) { /* send */ }
  capabilities(): RobotCapabilities { /* ... */ }
}
```

**After (v2):**
```typescript
class MyAdapter implements RobotAdapterV2 {
  type = 'my-robot'
  name = 'My Robot'
  contractVersion = 'v2' as const

  async connect(): Promise<void> { /* connect */ }
  init(bb: Blackboard) { /* initialize */ }
  update(bb: Blackboard) { /* send state */ }
  sendCommand(cmd: AdapterCommand) { /* send */ }

  onTelemetry(cb: (event: TelemetryEvent) => void): () => void { /* ... */ }
  selfTest(): SelfTestReport { /* ... */ }
  capabilities(): RobotCapabilitiesV2 { /* ... */ }
  async disconnect(): Promise<void> { /* disconnect */ }
  destroy() { /* cleanup */ }
}
```

### Easy migration: use the shim

```typescript
import { wrapV1AsV2, RobotAdapterV1 } from '@cyber-agent/sdk/adapter/contract'

const v1Adapter = new MyLegacyAdapter()
const v2Adapter = wrapV1AsV2(v1Adapter as RobotAdapterV1)
// Use v2Adapter — it delegates to v1 internally
```

**Note**: The shim is deprecated in v3.0 and will be removed in v4.0. Migrate your adapter to v2.

### 2. Trace Schema v1

The `.cybertrace` format is now versioned. Older traces may need migration.

```bash
# Validate a trace file
npx @cyber-agent/sdk trace lint my-trace.cybertrace

# Migrate a trace
npx @cyber-agent/sdk trace migrate old-trace.cybertrace new-trace.cybertrace
```

### 3. Public API Surface

### Before (unstable sub-path imports):
```typescript
// ⚠️ Not guaranteed stable
import { hydrate, tick } from '@cyber-agent/sdk/engine/executor'
```

### After (stable root import):
```typescript
// ✅ Guaranteed stable until 4.0
import {
  hydrate,
  tick,
  registerBuiltins,
  BehaviorTreeRunner,
  CanvasAdapter,
} from '@cyber-agent/sdk'
```

All stable exports are listed in [`sdk/src/public-api.ts`](./src/public-api.ts).

### 4. CLI Changes

### New commands:
```bash
cyber-agent record <adapter>      # Record a session
cyber-agent replay <file>         # Replay a trace
cyber-agent trace lint <file>     # Validate trace schema
```

---

**Stability Guarantee**: APIs marked `@stable` in `sdk/src/public-api.ts` will not break between `@cyber-agent/sdk@3.x` releases. Breaking changes only occur in `@cyber-agent/sdk@4.0.0` with a migration guide.
