/**
 * mBot Adapter Implementation — EduRobot Platform
 */

import type { RobotAdapter, Blackboard, AdapterCommand, RobotCapabilities } from '../engine/types';
import { emitAdapterTx } from '../engine/tracer';

class I2CProtocol {
  static DEVICE_MOTOR = 0x08;

  static makeCommand(device: number, commandId: number, payload: number[]): Uint8Array {
    const checksum = I2CProtocol.calculateChecksum(device, commandId, payload);
    const packet = new Uint8Array([0xFF, device, commandId, payload.length, ...payload]);
    packet[packet.length - 1] = checksum;
    return packet;
  }

  private static calculateChecksum(device: number, commandId: number, payload: number[]): number {
    let sum = device + commandId + payload.length + payload.reduce((a: number, b: number) => a + b, 0);
    return 255 - (sum % 256);
  }
}

class MBotMotorSystem {
  private maxSpeed: number = 100;

  makeMoveCommand(dir: 'forward' | 'backward' | 'stop', speed: number): Uint8Array {
    const signedSpeed = dir === 'backward' ? -speed : speed;
    const encodedSpeed = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, (signedSpeed + 128) & 0xFF));
    return I2CProtocol.makeCommand(0x08, 0x01, [encodedSpeed]);
  }
}

class MBotLEDSystem {
  private matrix: Uint8Array = new Uint8Array(16);

  makeLEDCommand(brightnessPerLED: number[] = []): Uint8Array {
    const payload = brightnessPerLED.length > 0 ? brightnessPerLED : [...this.matrix];
    return I2CProtocol.makeCommand(0x0B, 0x01, payload);
  }
}

class MBotSensorSystem {
  private ultrasonicDistance: number = 0;
  private lineTrack: number[] = [0, 0, 0];

  readUltrasonic(): number { return this.ultrasonicDistance; }
  readLineTrack(): number[] { return this.lineTrack; }

  updateSensor(data: any): void {
    if (data.uValue != null) this.ultrasonicDistance = data.uValue;
    if (Array.isArray(data.line)) this.lineTrack = data.line;
  }
}

export class MBotAdapter implements RobotAdapter {
  readonly type = 'mbot' as const;
  readonly name = 'mBot Adapter';
  private motorSystem: MBotMotorSystem;
  private ledSystem: MBotLEDSystem;
  private sensorSystem: MBotSensorSystem;

  constructor() {
    this.motorSystem = new MBotMotorSystem();
    this.ledSystem = new MBotLEDSystem();
    this.sensorSystem = new MBotSensorSystem();
  }

  static create(): MBotAdapter {
    return new MBotAdapter();
  }

  init(_bb: Blackboard): void { console.log('[MBotAdapter] init'); }
  update(_bb: Blackboard): void { this.readSensors(); }
  destroy(): void { console.log('[MBotAdapter] destroy'); }
  async tick(): Promise<void> { await this.readSensors(); }

  private async readSensors(): Promise<void> {
    this.sensorSystem.updateSensor({ uValue: 50, line: [0,1,0] });
  }

  sendCommand(command: AdapterCommand): void {
    emitAdapterTx(command.type, performance.now());
    const packet = this.serializeCommand(command);
    console.log('Send:', packet);
  }

  private serializeCommand(command: AdapterCommand): Uint8Array {
    const cmd = command as any;
    switch (cmd.type) {
      case 'move':
        return this.motorSystem.makeMoveCommand(cmd.data?.direction || 'forward', cmd.data?.speed || 50);
      case 'led':
        return this.ledSystem.makeLEDCommand(cmd.data?.brightness || []);
      default:
        throw new Error(`Unknown: ${cmd.type}`);
    }
  }

  getUltrasonicDistance(): number { return this.sensorSystem.readUltrasonic(); }

  // ── Capabilities ─────────────────────────────────────────────

  capabilities(): RobotCapabilities {
    // mBot EduRobot: differential drive, 16-LED matrix, buzzer
    return {
      movement: true,
      rotation: true,
      speed: true,
      led: true,
      sound: true,
      gesture: false,
      maxSpeed: 100,
      maxRotationSpeed: 180,
    }
  }
}
