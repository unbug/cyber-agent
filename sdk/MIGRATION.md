# Migration Guide: @cyber-agent/sdk 0.x → 1.0

This guide covers breaking changes between `@cyber-agent/sdk@0.x` and `@cyber-agent/sdk@1.0.0`.

## Quick Summary

| Change | Impact | Fix |
|--------|--------|-----|
| Adapter contract v2 | All adapters need `connect()`/`disconnect()` | Use `wrapV1AsV2()` shim or migrate to v2 |
| Trace schema v1 | `.cybertrace` format versioned | Run `cyber-agent trace lint` to validate |
| Public API surface | Only exports in `public-api.ts` are stable | Import from `'@cyber-agent/sdk'` not sub-paths |

## 1. Adapter Contract v2

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
  contractVersion = 'v2'  // NEW

  async connect(): Promise<void> { /* connect */ }  // NEW
  init(bb: Blackboard) { /* initialize */ }
  update(bb: Blackboard) { /* send state */ }
  destroy() { /* cleanup */ }
  sendCommand(cmd: AdapterCommand) { /* send */ }

  onTelemetry(cb: (event: TelemetryEvent) => void): () => void {  // NEW
    // register telemetry handler
    return () => { /* unsubscribe */ }
  }

  selfTest(): SelfTestReport {  // NEW
    return { ok: true, status: 'healthy', summary: 'OK', checks: [], timestamp: Date.now(), version: '1.0' }
  }

  capabilities(): RobotCapabilitiesV2 {  // upgraded
    return { ...base, batteryReporting: false, ... }
  }

  async disconnect(): Promise<void> { /* disconnect */ }  // NEW
}
```

### Easy migration: use the shim

If you have existing v1 adapters, wrap them:

```typescript
import { wrapV1AsV2, RobotAdapterV1 } from '@cyber-agent/sdk/adapter/contract'

const v1Adapter = new MyLegacyAdapter()
const v2Adapter = wrapV1AsV2(v1Adapter as RobotAdapterV1)
// Use v2Adapter — it delegates to v1 internally
```

**Note**: The shim is deprecated and will be removed in v1.1. Migrate your adapter to v2.

## 2. Trace Schema v1

The `.cybertrace` format is now versioned. Older traces may need migration.

### Validate a trace file:
```bash
npx @cyber-agent/sdk trace lint my-trace.cybertrace
```

### Migrate a trace:
```bash
npx @cyber-agent/sdk trace migrate old-trace.cybertrace new-trace.cybertrace
```

### Programmatic migration:
```typescript
import { migrateTrace, validateTrace } from '@cyber-agent/sdk/trace'

const trace = await loadTrace('old-trace.cybertrace')
const migrated = migrateTrace(trace)  // returns v1 trace
const valid = validateTrace(migrated) // returns { ok: boolean, errors: string[] }
```

## 3. Public API Surface

### Before (unstable sub-path imports):
```typescript
// ⚠️ Not guaranteed stable
import { hydrate, tick } from '@cyber-agent/sdk/engine/executor'
import { registerBuiltins } from '@cyber-agent/sdk/engine/builtins'
```

### After (stable root import):
```typescript
// ✅ Guaranteed stable until 2.0
import {
  hydrate,
  tick,
  registerBuiltins,
  BehaviorTreeRunner,
  CanvasAdapter,
} from '@cyber-agent/sdk'
```

All stable exports are listed in [`sdk/src/public-api.ts`](./src/public-api.ts).

## 4. CLI Changes

### New commands:
```bash
cyber-agent record <adapter>      # Record a session
cyber-agent replay <file>         # Replay a trace
cyber-agent trace lint <file>     # Validate trace schema
```

### Deprecated commands:
None in 1.0.

## Full Example: Migrating a Character

### Before (0.x):
```typescript
import { BehaviorTreeRunner, CanvasAdapter } from '@cyber-agent/sdk'
import { hydrate, registerBuiltins } from '@cyber-agent/sdk/engine/executor'
import { registerBuiltins } from '@cyber-agent/sdk/engine/builtins'

registerBuiltins()

const character = { characterId: 'puppy', tree: myTree }
const adapter = new CanvasAdapter(canvas)
const runner = new BehaviorTreeRunner(character, adapter)
runner.start()
```

### After (1.0):
```typescript
import {
  BehaviorTreeRunner,
  CanvasAdapter,
  registerBuiltins,
} from '@cyber-agent/sdk'

registerBuiltins()

const character = { characterId: 'puppy', tree: myTree }
const adapter = new CanvasAdapter(canvas)
const runner = new BehaviorTreeRunner(character, adapter)
runner.start()
```

In most cases, the migration is just updating import paths. The runtime behavior is unchanged.

## Need Help?

- Check the [CHANGELOG](./CHANGELOG.md) for version history
- Open an issue on [GitHub](https://github.com/unbug/cyber-agent/issues)
- See [`sdk/src/public-api.ts`](./src/public-api.ts) for the complete stable surface
