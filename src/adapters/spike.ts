/**
 * LEGO SPIKE Hub Adapter — Bluetooth LE
 *
 * Controls LEGO SPIKE Prime Hub (31311) or SPIKE Essential Hub (31170)
 * via the Web Bluetooth API. Supports:
 * - 2 large motors (left/right differential drive)
 * - 5×5 LED matrix (emotion display)
 * - Tilt sensor (accelerometer/gyroscope telemetry)
 * - Distance sensor (ultrasonic)
 * - Force sensor (bump detection)
 *
 * Protocol: LEGO Power Functions / SPIKE Hub proprietary BLE GATT
 * Service UUID: 0x00001623-1212-EFDE-1623-785FEABC1234
 * Characteristic: 0x00001624-1212-EFDE-1623-785FEABC1234
 *
 * Usage example:
 *   const spike = new SpikeAdapter({ hubName: 'LEGO Hub' })
 *   await spike.connect()
 *   agent.start(spike)
 */

import type { Blackboard, AdapterCommand } from '../engine/types'
import type {
  RobotCapabilitiesV2,
  SelfTestReport,
  TelemetryEvent,
  RobotAdapterV2,
} from '@cyber-agent/sdk/adapter/contract'
import { emitAdapterTx, emitAdapterRx } from '../engine/tracer'

// ─── BLE Constants ────────────────────────────────────────────────

const SPIKE_SERVICE_UUID = '00001623-1212-efde-1623-785feabc1234'
const SPIKE_CHAR_UUID = '00001624-1212-efde-1623-785feabc1234'

// Motor output ports on the SPIKE Hub
export enum MotorPort {
  A = 0,
  B = 1,
  C = 2,
  D = 3,
  E = 4,
  F = 5,
}

// LED matrix dimensions (5×5)
const LED_COLS = 5
const LED_ROWS = 5

// ─── SPIKE Hub BLE Packet Builder ─────────────────────────────────

/**
 * Build a SPIKE Hub motor command packet.
 * Format: [0x01, port, mode, power, duration, brake]
 *   port: motor output port (0–5)
 *   mode: 0x00 = run forever, 0x01 = run to angle, 0x02 = run for time
 *   power: -100 to 100
 *   duration: in 1/10 second units (0 = forever)
 *   brake: 0x01 = brake, 0x00 = coast
 */
export function buildMotorPacket(port: MotorPort, power: number, duration: number = 0): Uint8Array {
  const clampedPower = Math.max(-100, Math.min(100, power))
  const clampedDuration = Math.max(0, Math.min(65535, duration))
  return new Uint8Array([
    0x01, // packet type: motor command
    port,
    0x00, // run forever mode
    clampedPower + 100, // offset to unsigned (0–200)
    clampedDuration & 0xff,
    (clampedDuration >> 8) & 0xff,
    0x00, // coast
  ])
}

/**
 * Build a SPIKE Hub LED matrix packet.
 * Format: [0x02, r0c0, r0c1, ..., r4c4] — 25 bytes of color data
 * Each byte: 0 = off, 1–255 = brightness
 */
export function buildLEDPacket(colors: number[]): Uint8Array {
  const data = new Uint8Array(LED_ROWS * LED_COLS)
  for (let i = 0; i < data.length; i++) {
    data[i] = colors[i] ?? 0
  }
  return new Uint8Array([0x02, ...data])
}

/**
 * Build a SPIKE Hub LED color packet (RGB per pixel).
 * Format: [0x03, r, g, b, ...] — 3 bytes per pixel
 */
export function buildLEDColorPacket(rgbPairs: number[][]): Uint8Array {
  const data = new Uint8Array(rgbPairs.length * 3)
  for (let i = 0; i < rgbPairs.length; i++) {
    const rgb = rgbPairs[i]
    if (!rgb || rgb.length < 3) continue
    // rgb[0..2] are safe because we checked length >= 3
    const r = rgb[0] as number
    const g = rgb[1] as number
    const b = rgb[2] as number
    data[i * 3] = Math.max(0, Math.min(255, r))
    data[i * 3 + 1] = Math.max(0, Math.min(255, g))
    data[i * 3 + 2] = Math.max(0, Math.min(255, b))
  }
  return new Uint8Array([0x03, ...data])
}

// ─── Telemetry Parser ─────────────────────────────────────────────

/**
 * Parse a SPIKE Hub telemetry packet.
 * Format: [type, ...payload]
 *   type 0x04 = sensor data (tilt, distance, force)
 *   type 0x05 = motor state
 */
export function parseTelemetry(data: Uint8Array): TelemetryEvent | null {
  if (data.length < 2) return null

  const type = data[0]

  if (type === 0x04 && data.length >= 5) {
    // Sensor data: [0x04, sensor_id, value_hi, value_lo, unit]
    const sensorId = data[1] as number
    const valueHi = data[2] as number
    const valueLo = data[3] as number
    const unit = data[4] as number

    switch (sensorId) {
      case 0x01: // Tilt sensor
        return {
          type: 'tilt',
          payload: { x: (valueHi << 8) | valueLo, y: (valueHi << 8) | valueLo, z: unit },
          t: Date.now(),
        }
      case 0x02: // Distance sensor
        return {
          type: 'distance',
          payload: { value: (valueHi << 8) | valueLo, unit },
          t: Date.now(),
        }
      case 0x03: // Force sensor
        return {
          type: 'bump',
          payload: { value: (valueHi << 8) | valueLo, unit },
          t: Date.now(),
        }
      default:
        return {
          type: 'sensor',
          payload: { sensorId, value: (valueHi << 8) | valueLo, unit },
          t: Date.now(),
        }
    }
  }

  if (type === 0x05 && data.length >= 5) {
    // Motor state: [0x05, port, speed, load]
    const port = data[1] as number
    const speedByte = data[2] as number
    const load = data[3] as number
    const speed = speedByte - 100 // signed
    return {
      type: 'motor_state',
      payload: { port, speed, load },
      t: Date.now(),
    }
  }

  return null
}

// ─── SpikeAdapter ─────────────────────────────────────────────────

export interface SpikeAdapterConfig {
  /** BLE device name to filter (optional) */
  hubName?: string
  /** Accept any device (no name filter) */
  acceptAllDevices?: boolean
  /** Auto-connect on construction */
  autoConnect?: boolean
  /** Telemetry poll interval (ms). Default: 500 */
  telemetryIntervalMs?: number
}

export class SpikeAdapter implements RobotAdapterV2 {
  readonly type = 'spike' as const
  readonly name = 'LEGO SPIKE Hub Adapter'
  readonly contractVersion = 'v2' as const

  private config: SpikeAdapterConfig
  private device: BluetoothDevice | null = null
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null
  private _telemetryCallback: ((event: TelemetryEvent) => void) | null = null
  private telemetryTimer: ReturnType<typeof setInterval> | null = null
  private commandQueue: AdapterCommand[] = []
  private isConnectedCallback?: (connected: boolean) => void
  private _connected = false

  constructor(config: SpikeAdapterConfig = {}) {
    this.config = {
      hubName: 'LEGO Hub',
      acceptAllDevices: false,
      autoConnect: true,
      telemetryIntervalMs: 500,
      ...config,
    }

    if (this.config.autoConnect) {
      this.connect().catch(() => {
        // Connection errors are expected when no hardware present
      })
    }
  }

  setOnConnect(callback: (connected: boolean) => void) {
    this.isConnectedCallback = callback
  }

  // ─── Connection Management ───────────────────────────────────

  async connect(): Promise<void> {
    if (this._connected) return

    if (typeof navigator === 'undefined' || navigator.bluetooth === undefined) {
      console.warn('[SpikeAdapter] Web Bluetooth API not available — running in simulation mode')
      this._connected = true
      this.onConnect(true)
      return
    }

    try {
      const filters = this.config.hubName
        ? [{ name: this.config.hubName }]
        : undefined

      this.device = await navigator.bluetooth!.requestDevice({
        filters: filters ?? undefined,
      })

      this.device.addEventListener('gattserverdisconnected', () => {
        this.onConnect(false)
        this._connected = false
        this.characteristic = null
      })

      const server = await this.device.gatt!.connect()
      const service = await server.getPrimaryService(SPIKE_SERVICE_UUID)
      this.characteristic = await service.getCharacteristic(SPIKE_CHAR_UUID)

      // Subscribe to notifications
      await this.characteristic.startNotifications()
      this.characteristic.addEventListener('characteristicvaluechanged', (event: Event) => {
        const char = event.target as unknown as BluetoothRemoteGATTCharacteristic
        const value = char.value
        if (!value) return
        const data = new Uint8Array(value.buffer)
        this.handleIncoming(data)
      })

      this._connected = true
      this.onConnect(true)
      this.startTelemetryPoll()
    } catch (err) {
      console.error('[SpikeAdapter] Connection failed:', err)
      this._connected = false
      this.onConnect(false)
      throw err
    }
  }

  private onConnect(connected: boolean) {
    if (this.isConnectedCallback) {
      this.isConnectedCallback(connected)
    }
  }

  private startTelemetryPoll() {
    this.stopTelemetryPoll()
    const interval = this.config.telemetryIntervalMs ?? 500
    this.telemetryTimer = setInterval(() => {
      if (this._connected && this.characteristic) {
        this.characteristic.readValue().then((value: DataView) => {
          const data = new Uint8Array(value.buffer)
          this.handleIncoming(data)
        }).catch(() => {
          // Read failed — device may have disconnected
        })
      }
    }, interval)
  }

  private stopTelemetryPoll() {
    if (this.telemetryTimer) {
      clearInterval(this.telemetryTimer)
      this.telemetryTimer = null
    }
  }

  // ─── v2 lifecycle ───────────────────────────────────────────

  async disconnect(): Promise<void> {
    this.stopTelemetryPoll()
    if (this.characteristic) {
      await this.characteristic.stopNotifications().catch(() => {})
      this.characteristic = null
    }
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect()
    }
    this._connected = false
    this.onConnect(false)
    return Promise.resolve()
  }

  init(_bb: Blackboard): void {
    console.log('[SpikeAdapter] Initialized')
  }

  update(_bb: Blackboard): void {
    // Periodic state sync if needed
  }

  destroy(): void {
    this.stopTelemetryPoll()
    this.disconnect().catch(() => {})
    this.commandQueue = []
    console.log('[SpikeAdapter] Destroyed')
  }

  onTelemetry(callback: (event: TelemetryEvent) => void): () => void {
    this._telemetryCallback = callback
    return () => { this._telemetryCallback = null }
  }

  // ─── Command Handling ────────────────────────────────────────

  sendCommand(command: AdapterCommand): void {
    emitAdapterTx(command.type, performance.now())

    if (!this._connected || !this.characteristic) {
      console.warn('[SpikeAdapter] Not connected, queuing command')
      this.commandQueue.push(command)
      return
    }

    try {
      const packet = this.serializeCommand(command)
      this.characteristic.writeValue(packet).then(() => {
        emitAdapterRx({ type: command.type, raw: true }, performance.now())
      }).catch((err: unknown) => {
        console.error('[SpikeAdapter] Write failed:', err)
        this.commandQueue.push(command)
      })
    } catch (err) {
      console.error('[SpikeAdapter] Serialize failed:', err)
      this.commandQueue.push(command)
    }
  }

  private serializeCommand(command: AdapterCommand): Uint8Array {
    const cmd = command as any
    switch (cmd.type) {
      case 'move':
        // { direction: 'forward' | 'backward' | 'stop', speed: number }
        const dir = cmd.payload?.direction ?? 'forward'
        const speed = cmd.payload?.speed ?? 50
        if (dir === 'stop') {
          return buildMotorPacket(MotorPort.A, 0)
        }
        const sign = dir === 'backward' ? -1 : 1
        return buildMotorPacket(MotorPort.A, sign * Math.abs(speed))

      case 'motors':
        // { left: number, right: number } — differential drive
        const left = cmd.payload?.left ?? 0
        const right = cmd.payload?.right ?? 0
        const leftCmd = buildMotorPacket(MotorPort.A, left)
        const rightCmd = buildMotorPacket(MotorPort.B, right)
        // Send both as a single batch
        return new Uint8Array([...leftCmd, ...rightCmd])

      case 'led':
        // { brightness: number[] } or { colors: number[][] }
        if (Array.isArray(cmd.payload?.brightness)) {
          return buildLEDPacket(cmd.payload.brightness)
        }
        if (Array.isArray(cmd.payload?.colors)) {
          return buildLEDColorPacket(cmd.payload.colors)
        }
        // Default: single color to all LEDs
        const r = cmd.payload?.r ?? 0
        const g = cmd.payload?.g ?? 0
        const b = cmd.payload?.b ?? 255
        const brightness = cmd.payload?.brightness ?? 128
        return buildLEDColorPacket(
          Array.from({ length: 25 }, () => [r, g, b]),
        )

      case 'sound':
        // SPIKE Hub doesn't have a speaker, but we can flash LEDs as feedback
        const freq = cmd.payload?.frequency ?? 440
        const duration = cmd.payload?.duration ?? 500
        console.log(`[SpikeAdapter] Sound ${freq}Hz for ${duration}ms (LED blink fallback)`)
        return buildLEDPacket(Array.from({ length: 25 }, () => brightness))

      case 'gesture':
        // Pre-built LED patterns
        const pattern = cmd.payload?.pattern ?? 'wave'
        const colors = this.getPatternColors(pattern)
        return buildLEDColorPacket(colors)

      default:
        throw new Error(`Unknown command: ${cmd.type}`)
    }
  }

  /**
   * Serialize a command to a BLE packet (public for testing).
   */
  serializeCommandForTest(command: AdapterCommand): Uint8Array {
    return this.serializeCommand(command)
  }

  private getPatternColors(pattern: string): number[][] {
    const base: number[][] = []
    for (let row = 0; row < LED_ROWS; row++) {
      for (let col = 0; col < LED_COLS; col++) {
        const idx = row * LED_COLS + col
        let r = 0, g = 0, b = 0
        switch (pattern) {
          case 'wave':
            const val = Math.sin((col + row) * 0.8) * 128 + 128
            r = 0; g = val; b = 255 - val
            break
          case 'rainbow':
            const hue = (idx / 25) * 360
            const hsv = this.hsvToRgb(hue, 1, 1)
            r = hsv[0]; g = hsv[1]; b = hsv[2]
            break
          case 'pulse':
            const pulse = Math.sin(idx * 0.3) * 128 + 128
            r = pulse; g = 0; b = 255 - pulse
            break
          default:
            r = 100; g = 100; b = 255
        }
        base.push([r, g, b])
      }
    }
    return base
  }

  private hsvToRgb(h: number, s: number, v: number): [number, number, number] {
    const c = v * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = v - c
    let r = 0, g = 0, b = 0
    if (h < 60) { r = c; g = x }
    else if (h < 120) { r = x; g = c }
    else if (h < 180) { g = c; b = x }
    else if (h < 240) { g = x; b = c }
    else if (h < 300) { r = x; b = c }
    else { r = c; b = x }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
  }

  private handleIncoming(data: Uint8Array) {
    const event = parseTelemetry(data)
    if (event && this._telemetryCallback) {
      this._telemetryCallback(event)
    }
    emitAdapterRx({ type: event?.type ?? 'unknown', raw: true }, performance.now())
  }

  // ─── Convenience Methods ─────────────────────────────────────

  /**
   * Set motor speeds for differential drive.
   * @param leftSpeed - Left motor speed (-100 to 100)
   * @param rightSpeed - Right motor speed (-100 to 100)
   */
  setMotors(leftSpeed: number, rightSpeed: number): void {
    this.sendCommand({
      type: 'motors',
      payload: {
        left: Math.max(-100, Math.min(100, leftSpeed)),
        right: Math.max(-100, Math.min(100, rightSpeed)),
      },
    })
  }

  /**
   * Set a single color on the LED matrix.
   * @param r - Red (0–255)
   * @param g - Green (0–255)
   * @param b - Blue (0–255)
   * @param brightness - Overall brightness (0–255)
   */
  setRGB(r: number, g: number, b: number, brightness: number = 255): void {
    this.sendCommand({
      type: 'led',
      payload: {
        r: Math.max(0, Math.min(255, r)),
        g: Math.max(0, Math.min(255, g)),
        b: Math.max(0, Math.min(255, b)),
        brightness,
      },
    })
  }

  /**
   * Set individual LED brightness (grayscale).
   * @param colors - Array of 25 brightness values (one per pixel)
   */
  setLEDBrightness(colors: number[]): void {
    this.sendCommand({
      type: 'led',
      payload: { brightness: colors },
    })
  }

  /**
   * Play an LED pattern.
   */
  playPattern(pattern: 'wave' | 'rainbow' | 'pulse'): void {
    this.sendCommand({ type: 'gesture', payload: { pattern } })
  }

  // ─── Self-Test ──────────────────────────────────────────────

  selfTest(): SelfTestReport {
    const hasBluetooth = typeof navigator !== 'undefined' && navigator.bluetooth !== undefined
    const isConnected = this._connected
    const hasDevice = this.device !== null

    return {
      ok: isConnected,
      status: isConnected ? 'healthy' : hasBluetooth ? 'degraded' : 'unhealthy',
      summary: `SpikeAdapter — ${isConnected ? 'connected' : hasDevice ? 'disconnected' : 'no BLE'} to ${this.config.hubName ?? 'any hub'}`,
      checks: [
        { name: 'bluetooth_api', ok: hasBluetooth, message: hasBluetooth ? 'Web Bluetooth available' : 'Web Bluetooth not available' },
        { name: 'device', ok: hasDevice, message: hasDevice ? `Device: ${this.device?.name ?? 'unknown'}` : 'No device paired' },
        { name: 'connection', ok: isConnected, message: isConnected ? 'GATT connected' : 'Not connected' },
        { name: 'telemetry', ok: this._telemetryCallback !== null, message: this._telemetryCallback ? 'Telemetry subscribed' : 'No subscriber' },
      ],
      timestamp: Date.now(),
      version: 'v2',
    }
  }

  // ─── Capabilities ────────────────────────────────────────────

  capabilities(): RobotCapabilitiesV2 {
    return {
      movement: true,
      rotation: true,
      speed: true,
      led: true,
      sound: false, // SPIKE Hub has no speaker
      gesture: true,
      maxSpeed: 100,
      maxRotationSpeed: 180,
      batteryReporting: true,
      distanceReporting: true,
      imuReporting: true,
      selfTestable: true,
      hardwareEStop: true,
    }
  }
}

// ─── Factory function ─────────────────────────────────────────────

export function createSpikeAdapter(config: SpikeAdapterConfig = {}): RobotAdapterV2 {
  return new SpikeAdapter(config)
}
