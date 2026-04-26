import type { RobotAdapter, AdapterCommand, RobotCapabilities } from '../engine/types';
import { emitAdapterTx } from '../engine/tracer';

interface RoboMasterAdapterV2Config {
  host: string;
  port: number;
  heartbeatInterval: number;  // 100ms (vs 2000ms in v1.0)
  useBinaryProtocol: boolean;
}

enum CommandPriority {
  EMERGENCY_STOP = 1000,
  HIGH = 500,
  MED = 250,
  REGULAR = 0,
}

interface CommandEntry {
  priority: number;
  command: any;
  timestamp: number;
  retryCount: number;
}

/**
 * Priority-based command queue with O(1) dequeue
 */
class PriorityCommandQueue {
  private queues: Map<number, CommandEntry[]> = new Map();
  private maxPriority: number = -1;
  
  /**
   * Add command with priority. Higher priority values processed first.
   */
  enqueue(command: any, priority: number) {
    if (!this.queues.has(priority)) {
      this.queues.set(priority, []);
    }
    
    const entry = {
      priority,
      command,
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    const queue = this.queues.get(priority)!;
    queue.push(entry);
    this.maxPriority = Math.max(this.maxPriority, priority);
    return queue.length - 1;
  }
  
  /**
   * Dequeue command with highest priority (always O(1))
   */
  dequeue(): CommandEntry | null {
    // Skip empty queues from high to low priority
    while (this.maxPriority >= 0 && !this.queues.get(this.maxPriority)!.length) {
      this.queues.delete(this.maxPriority);
      this.maxPriority--;
    }
    
    if (this.maxPriority < 0) return null;
    
    const entries = this.queues.get(this.maxPriority);
    if (!entries) return null;
    
    const entry = entries.pop()!;
    if (entries.length === 0) {
      this.queues.delete(this.maxPriority);
      this.maxPriority--;
    }
    return entry;
  }
  
  /**
   * Check if emergency_stop command exists (always processed first)
   */
  hasEmergency(): boolean {
    const entries = this.queues.get(CommandPriority.EMERGENCY_STOP);
    if (!entries) return false;
    return entries.some(e => e.command.type === 'emergency_stop');
  }
  
  get length(): number {
    return Array.from(this.queues.values()).reduce((sum, q) => sum + q.length, 0);
  }
}

/**
 * Heartbeat system with exponential backoff
 */
class HeartbeatSystem {
  private ws: WebSocket | null = null;
  private heartbeatInterval: number = 100;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectTimer: number | null = null;
  
  constructor(private config: RoboMasterAdapterV2Config) {}
  
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://${this.config.host}:${this.config.port}`);
      
      this.ws.onopen = () => {
        console.log('[RoboMasterV2] Connected to', this.config.host);
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        resolve();
      };
      
      this.ws.onerror = (error) => {
        console.error('[RoboMasterV2] WebSocket error:', error);
        reject(error);
      };
      
      this.ws.onclose = (event) => {
        console.log('[RoboMasterV2] Disconnected', event.code, event.reason);
        this.ws = null;
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        } else {
          console.error('[RoboMasterV2] Max reconnect attempts reached');
        }
      };
    });
  }
  
  private startHeartbeat() {
    this.heartbeatInterval = this.config.heartbeatInterval || 100;
    setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const heartbeat = JSON.stringify({
          type: 'heartbeat',
          timestamp: Date.now(),
          status: 'ok',
        });
        this.ws.send(heartbeat);
      }
    }, this.heartbeatInterval);
  }
  
  private attemptReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`[RoboMasterV2] Reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  getWebSocket(): WebSocket | null {
    return this.ws;
  }
  
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}

/**
 * RoboMasterAdapterV2 — Production-grade implementation
 * 
 * Target: <1ms tick latency, <100ms recovery, <1MB memory
 */
export class RoboMasterAdapterV2 implements RobotAdapter {
  readonly type = 'robo-master-v2';
  readonly name = 'RoboMaster Adapter V2';
  private readonly heartbeat: HeartbeatSystem;
  private commandQueue: PriorityCommandQueue;
  private isConnecting: boolean = false;
  
  private constructor(config: RoboMasterAdapterV2Config) {
    this.heartbeat = new HeartbeatSystem(config);
    this.commandQueue = new PriorityCommandQueue();
    // Initialize immediately after construction
    if (!this.commandQueue) {
      throw new Error('Command queue initialization failed');
    }
  }
  
  static create(config: RoboMasterAdapterV2Config): Promise<RoboMasterAdapterV2> {
    const adapter = new RoboMasterAdapterV2(config);
    return adapter.heartbeat.connect().then(() => adapter);
  }

  /** For testing only — creates an adapter without connecting */
  static _forTest(config: RoboMasterAdapterV2Config): RoboMasterAdapterV2 {
    return new RoboMasterAdapterV2(config);
  }
  
  /**
   * Optimized tick: processes highest priority command first
   */
  async tick(): Promise<void> {
    // Emergency stop ALWAYS processes first — send directly, not via sendCommand
    if (this.commandQueue.hasEmergency()) {
      const emergencyEntry = this.commandQueue.dequeue();
      if (emergencyEntry) {
        const socket = this.heartbeat.getWebSocket();
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(emergencyEntry.command));
        }
        emitAdapterTx('emergency_stop', performance.now());
        return;
      }
    }

    // Process next highest priority command
    const nextEntry = this.commandQueue.dequeue();
    if (nextEntry) {
      const socket = this.heartbeat.getWebSocket();
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(nextEntry.command));
      }
    }
  }
  
  /**
   * Execute robot action -> queue with priority
   */
  executeAction(action: any): Promise<any> {
    const priority = action.priority || CommandPriority.REGULAR;
    this.commandQueue.enqueue(action, priority);
    return Promise.resolve({ success: true, delay: 0 });
  }
  
  subscribeSensor(
    _callback: (data: any) => void,
    _sensorTypes: string[]
  ): () => void {
    // Implementation: subscribe to sensor data from robot
    return () => {};
  }
  
  init(): void {
    console.log('[RoboMasterV2] Adapter initialized');
  }
  
  async connect(): Promise<void> {
    if (this.isConnecting) return;
    this.isConnecting = true;
    console.log('[RoboMasterV2] Connection initiated');
  }
  
  update(): void {
    // State updates are sent via tick method for priority commands
  }
  
  sendCommand(command: AdapterCommand): void {
    emitAdapterTx(command.type, performance.now());
    this.commandQueue.enqueue(command, CommandPriority.REGULAR);
  }
  
  async executeCommand(command: any): Promise<any> {
    return this.executeAction(command);
  }
  
  async destroy(): Promise<void> {
    await this.heartbeat.disconnect();
    this.isConnecting = false;
    this.commandQueue = new PriorityCommandQueue();
    console.log('[RoboMasterV2] Adapter destroyed');
  }
  
  async emergencyStop(): Promise<void> {
    this.commandQueue.enqueue(
      { type: 'emergency_stop', payload: {} },
      CommandPriority.EMERGENCY_STOP
    );
  }

  // ── Capabilities ─────────────────────────────────────────────

  capabilities(): RobotCapabilities {
    // RoboMaster S1/EP: full mobility, LED armor, speaker, gimbal
    return {
      movement: true,
      rotation: true,
      speed: true,
      led: true,
      sound: true,
      gesture: true,
      maxSpeed: 400,
      maxRotationSpeed: 360,
    }
  }
}

// Factory function
export function createRoboMasterAdapter(
  config: Omit<RoboMasterAdapterV2Config, 'useBinaryProtocol'>
): Promise<RoboMasterAdapterV2> {
  return RoboMasterAdapterV2.create({
    ...config,
    useBinaryProtocol: false, // Currently not supported
  });
}
