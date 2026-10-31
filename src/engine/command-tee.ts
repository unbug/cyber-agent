/**
 * CommandTee — visibility wrapper for any RobotAdapterV2.
 * Records a rolling log of every command (for live UIs) and forwards
 * everything to the inner adapter untouched. Shared by /connect and /room.
 */
import type {
  RobotAdapterV2,
  RobotCapabilitiesV2,
  SelfTestReport,
  TelemetryEvent,
} from '@cyber-agent/sdk/adapter/contract'
import type { AdapterCommand } from './types'
import type { Blackboard } from './types'

export class CommandTee implements RobotAdapterV2 {
  readonly type: string
  readonly name: string
  readonly contractVersion = 'v2' as const
  readonly log: AdapterCommand[] = []

  constructor(private inner: RobotAdapterV2) {
    this.type = inner.type
    this.name = inner.name
  }

  init(bb: Blackboard): void {
    this.inner.init(bb)
  }
  update(bb: Blackboard): void {
    this.inner.update(bb)
  }
  destroy(): void {
    this.inner.destroy()
  }
  sendCommand(c: AdapterCommand): void {
    this.log.push({ ...c, payload: { ...c.payload } })
    if (this.log.length > 200) this.log.splice(0, this.log.length - 200)
    this.inner.sendCommand(c)
  }
  capabilities(): RobotCapabilitiesV2 {
    return this.inner.capabilities()
  }
  connect(): Promise<void> {
    return this.inner.connect()
  }
  disconnect(): Promise<void> {
    return this.inner.disconnect()
  }
  onTelemetry(cb: (e: TelemetryEvent) => void): () => void {
    return this.inner.onTelemetry(cb)
  }
  selfTest(): SelfTestReport {
    return this.inner.selfTest()
  }
}
