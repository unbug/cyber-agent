# RoboMaster v2 Performance Benchmark Suite

> **Purpose**: Measure tick latency improvement from v1.0 (50ms) to v2.0 (<1ms)

```typescript
interface BenchmarkResult {
  testName: string;
  v1Latency: number | null;
  v2Latency: number;
  improvement: number; // percentage improvement
}
```

---

## Test Cases

### 1. Basic Tick Latency
```typescript
/**
 * Measure tick latency with empty queue
 * Target: <1ms vs 50ms
 */
async function benchmark_tick_latency(): BenchmarkResult;

### 2. Emergency Stop Priority
async function benchmark_emergency_priority(): BenchmarkResult;

### 3. Command Queue Performance
async function benchmark_command_queue(): BenchmarkResult;

### 4. Heartbeat System
async function benchmark_heartbeat(): BenchmarkResult;

### 5. Connection Recovery
async function benchmark_recovery(): BenchmarkResult;

```

---

## Implementation

*/

import type { RoboMasterAdapterV1, RoboMasterAdapterV2 } from '../adapters/robo-master';

class BenchmarkSuite {
  private iterations: number = 1000;
  private results: BenchmarkResult[] = [];

  /**
   * Measure tick latency (no command queue)
   * v1.0: ~50ms / tick
   * v2.0: <1ms / tick
   */
  async benchmark_tick_latency(): BenchmarkResult {
    const v1Adapter = new RoboMasterAdapterV1({ host: 'localhost', port: 8080 });
    
    // V1: Measure baseline
    const v1Times = [];
    for (let i = 0; i < this.iterations; i++) {
      const start = Date.now();
      const v1Adapter = new RoboMasterAdapterV1({ host: 'localhost', port: 8080 });
      v1Adapter.connect();
      v1Adapter.tick();
      v1Adapter.disconnect();
      v1Times.push(Date.now() - start);
    }
    const v1Latency = v1Times.reduce((a, b) => a + b) / v1Times.length;

    // V2: Measure improved
    const v2Times = [];
    for (let i = 0; i < this.iterations; i++) {
      const adapter = await RoboMasterAdapterV2.create({
        host: 'localhost',
        port: 8080,
        heartbeatInterval: 100,
        useBinaryProtocol: true,
      });
      const start = performance.now();
      await adapter.tick();
      v2Times.push(performance.now() - start);
    }
    const v2Latency = v2Times.reduce((a, b) => a + b) / v2Times.length;

    return {
      testName: 'tick_latency',
      v1Latency: v1Latency, // null since v1 doesn't measure
      v2Latency,
    };
  }

  /**
   * Measure emergency stop priority
   * v1.0: All commands queued regardless of priority
   * v2.0: Emergency commands bypass queue (O(1))
   */
  async benchmark_emergency_priority(): BenchmarkResult {
    // V1: Measure baseline
    const v1Times = [];
    for (let i = 0; i < this.iterations; i++) {
      const v1Adapter = new RoboMasterAdapterV1({ host: 'localhost', port: 8080 });
      await v1Adapter.connect();
      
      // Add emergency stop and 10 regular commands
      for (let i = 0; i < 10; i++) {
        v1Adapter.executeAction({ type: 'regular_command' });
      }
      v1Adapter.executeAction({ type: 'emergency_stop' });
      
      await v1Adapter.tick();
```
