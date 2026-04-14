/**
 * mBot Adapter Implementation — EduRobot Platform
 * 
 * Target: Complete mBot compatibility suite
 * - mBot (Classic): I2C + Ultrasonic
 * - mBot Matrix: LED matrix + Bluetooth
 * - mBot Ranger: I2C + Multiple sensors
 */

import { RobotAdapter, BTNode, Blackboard } from '../engine/types';
import { CommandType, CommandPriority } from '../types';

interface MBotAdapterConfig {
  bluetoothId?: string;      // BLE device ID
  i2cMode?: boolean;         // I2C over BLE bridge
  maxSpeed: number;          // 0-100
  ledBrightness: number;     // 0-255
}

/**
 * I2C Protocol for mBot communication
 */
class I2CProtocol {
  private static MAGIC: number = 0xFF;
  private static DEVICE_MOTOR = 0x08;
  private static DEVICE_SENSOR = 0x0A;

  static makeCommand(device: number, commandId: number, payload: number[]): Uint8Array {
    const checksum = this.calculateChecksum(device, commandId, payload);
    const packet = new Uint8Array([
      this.MAGIC,
      device,
      commandId,
      payload.length,
      ...payload,
    ]);
    packet[packet.length - 1] = checksum;
    return packet;
  }

  private static calculateChecksum(device: number, commandId: number, payload: number[]): number {
    let sum = device + commandId + payload.length + payload.reduce((a, b) => a + b, 0);
    return 255 - (sum % 266);
  }
}

/**
 * mBot Motor Control
 */
class MBotMotorSystem {
  private motorSpeed: number = 0;
  private maxSpeed: number = 100;

  setSpeed(speed: number): void {
    this.motorSpeed = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, speed));
  }

  getSpeed(): number {
    return this.motorSpeed;
  }

  makeMoveCommand(dir: 'forward' | 'backward' | 'stop', speed: number): Uint8Array {
    const payload: number[] = [
      this.encodeMotorState(dir, speed),
    ];
    return I2CProtocol.makeCommand(I2CProtocol.DEVICE_MOTOR, 0x01, payload);
  }

  private encodeMotorState(dir: string, speed: number): number {
    const signedSpeed = dir === 'backward' ? -speed : speed;
    return signedSpeed + 128; // Encoded as unsigned
  }
}

/**
 * mBot LED Matrix
 */
class MBotLEDSystem {
  private matrix: Uint8Array = new Uint8Array(16);

  setLED(x: number, y: number, brightness: number): void {
    if (x >= 0 && x < 4 && y >= 0 && y < 4) {
      const index = y * 4 + x;
      this.matrix[index] = brightness;
    }
  }

  setAllLEDs(brightness: number): void {
    this.matrix.fill(brightness);
  }

  makeLEDCommand(brightnessPerLED: number[] = []): Uint8Array {
    if (brightnessPerLED.length === 0) {
      return I2CProtocol.makeCommand(0x0B, 0x01, this.matrix);
    }
    return I2CProtocol.makeCommand(0x0B, 0x01, brightnessPerLED);
  }
}

/**
 * mBot Sensor Reading
 */
class MBotSensorSystem {
  private ultrasonicDistance: number = 0;
  private IRDistance: number = 0;
  private lineTrack: number[] = [0, 0, 0];

  readUltrasonic(): number {
    return this.ultrasonicDistance;
  }

  readIR(): number {
    return this.IRDistance;
  }

  readLineTrack(): number[] {
    return this.lineTrack;
  }

  updateSensor(data: any): void {
    if (data.uValue != null) {
      this.ultrasonicDistance = data.uValue;
    }
    if (data.line != null) {
      this.lineTrack = data.line;
    }
  }
}

/**
 * mBot Adapter v1.0
 */
export class MBotAdapter implements RobotAdapter {
  private i2cProtocol: I2CProtocol;
  private motorSystem: MBotMotorSystem;
  private ledSystem: MBotLEDSystem;
  private sensorSystem: MBotSensorSystem;
  private blackboard: Blackboard | null = null;

  private constructor(private config: MBotAdapterConfig) {
    this.i2cProtocol = new I2CProtocol();
    this.motorSystem = new MBotMotorSystem();
    this.ledSystem = new MBotLEDSystem();
    this.sensorSystem = new MBotSensorSystem();
  }

  static create(config: MBotAdapterConfig): MBotAdapter {
    return new MBotAdapter(config);
  }

  async tick(): Promise<void> {
    await this.readSensors();
    const nextCommand = this.getNextCommand();
    if (nextCommand) {
      await this.sendCommand(nextCommand);
    }
  }

  private async readSensors(): Promise<void> {
    const sensorData = {
      ultrasonic: Math.random() * 100,
      IR: Math.random() * 200,
      lineTrack: [0, 1, 0],
    };
    this.sensorSystem.updateSensor(sensorData);
  }

  private getNextCommand(): Optional<any> {
    return null;
  }

  private async sendCommand(command: any): Promise<void> {
    const packet = this.serializeCommand(command);
    await this.sendPacket(packet);
  }

  private serializeCommand(command: any): Uint8Array {
    switch (command.type) {
      case 'move':
        return this.motorSystem.makeMoveCommand(command.direction, command.speed);
      case 'led':
        return this.ledSystem.makeLEDCommand(command.brightness);
      default:
        throw new Error(`Unknown command: ${command.type}`);
    }
  }

  private async sendPacket(packet: Uint8Array): Promise<void> {
    console.log('Sending I2C packet:', packet);
  }

  async executeAction(action: any): Promise<any> {
    const priority = action.priority || CommandPriority.REGULAR;
    return { success: true, delay: 0 };
  }

  async subscribeSensor(
    callback: (data: any) => void,
    sensorTypes: string[]
  ): () => void {
    return () => {};
  }

  async connect(): Promise<void> {
    console.log('[MBotAdapter] Connecting to BLE...');
  }

  async disconnect(): Promise<void> {
    console.log('[MBotAdapter] Disconnecting from BLE...');
  }

  getUltrasonicDistance(): number {
    return this.sensorSystem.readUltrasonic();
  }

  getIRDistance(): number {
    return this.sensorSystem.readIR();
  }

  getLineTrack(): number[] {
    return this.sensorSystem.readLineTrack();
  }

  setLED(x: number, y: number, brightness: number): void {
    this.ledSystem.setLED(x, y, brightness);
  }

  setAllLEDs(brightness: number): void {
    this.ledSystem.setAllLEDs(brightness);
  }
}
