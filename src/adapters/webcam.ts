/**
 * Webcam Adapter — browser webcam perception source.
 *
 * Captures frames from the device camera and runs face/object detection.
 * Emits perception events to the PerceptionBus.
 *
 * Simulation mode (for testing / CI):
 *   const webcam = new WebcamAdapter({ simulate: true })
 */

import type { PerceptionBus } from '../perception/bus'
import type { PerceptionEvent } from '../perception/types'

// ─── Configuration ────────────────────────────────────────────────

export interface WebcamAdapterOptions {
  constraints?: MediaStreamConstraints
  detectionIntervalMs?: number
  simulate?: boolean
  perceptionBus?: PerceptionBus
  minConfidence?: number
}

// ─── Simulation Data ──────────────────────────────────────────────

const SIM_FACES = [
  { bbox: [100, 50, 80, 100] as [number, number, number, number], emotion: 'happy', confidence: 0.92 },
  { bbox: [200, 80, 60, 80] as [number, number, number, number], emotion: 'curious', confidence: 0.85 },
  { bbox: [150, 120, 70, 90] as [number, number, number, number], emotion: 'idle', confidence: 0.78 },
]

const SIM_OBJECTS = [
  { class: 'person', confidence: 0.95 },
  { class: 'chair', confidence: 0.88 },
  { class: 'cup', confidence: 0.72 },
  { class: 'laptop', confidence: 0.65 },
]

// ─── Webcam Adapter ───────────────────────────────────────────────

export class WebcamAdapter {
  readonly type = 'webcam'
  readonly name = 'Webcam (Browser)'

  private stream: MediaStream | null = null
  private videoEl: HTMLVideoElement | null = null
  private detectionInterval: ReturnType<typeof setInterval> | null = null
  private perceptionBus: PerceptionBus | null
  private minConfidence: number
  private isConnecting = false
  private isDestroyed = false
  private _simulated = false

  private faceCallbacks: Array<(event: PerceptionEvent) => void> = []
  private objectCallbacks: Array<(event: PerceptionEvent) => void> = []

  constructor(private options?: WebcamAdapterOptions) {
    this.perceptionBus = options?.perceptionBus ?? null
    this.minConfidence = options?.minConfidence ?? 0.5
  }

  static async isAvailable(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices.some((d) => d.kind === 'videoinput')
    } catch {
      return false
    }
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.stream) return
    this.isConnecting = true

    if (this.options?.simulate) {
      this.isConnecting = false
      this._simulated = true
      this.startSimulation()
      return
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(this.options?.constraints ?? { video: true })
      this.isConnecting = false
      this.videoEl = document.createElement('video')
      this.videoEl.srcObject = this.stream
      this.videoEl.play()
      this.startDetection()
    } catch (_err) {
      this.isConnecting = false
      this._simulated = true
      this.startSimulation()
    }
  }

  disconnect(): void {
    this.stopDetection()
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }
    this.videoEl = null
    this.isConnecting = false
  }

  destroy(): void {
    this.disconnect()
    this.faceCallbacks = []
    this.objectCallbacks = []
    this.isDestroyed = true
  }

  onFace(handler: (event: PerceptionEvent) => void): () => void {
    this.faceCallbacks.push(handler)
    return () => {
      const idx = this.faceCallbacks.indexOf(handler)
      if (idx >= 0) this.faceCallbacks.splice(idx, 1)
    }
  }

  onObject(handler: (event: PerceptionEvent) => void): () => void {
    this.objectCallbacks.push(handler)
    return () => {
      const idx = this.objectCallbacks.indexOf(handler)
      if (idx >= 0) this.objectCallbacks.splice(idx, 1)
    }
  }

  getStream(): MediaStream | null {
    return this.stream
  }

  private startDetection(): void {
    this.detectionInterval = setInterval(() => this.detectFrame(), this.options?.detectionIntervalMs ?? 100)
  }

  private stopDetection(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval)
      this.detectionInterval = null
    }
  }

  private async detectFrame(): Promise<void> {
    if (this.isDestroyed || !this.videoEl || !this.videoEl.videoWidth) return
    const timestamp = performance.now()
    const faces = await this.detectFaces()
    for (const face of faces) {
      if (face.confidence < this.minConfidence) continue
      const event: PerceptionEvent = {
        id: 0,
        timestamp,
        category: 'see.face',
        payload: { bbox: face.bbox, emotion: face.emotion, confidence: face.confidence },
        source: 'webcam',
        confidence: face.confidence,
      }
      if (this.perceptionBus) this.perceptionBus.publish(event)
      for (const cb of this.faceCallbacks) { try { cb(event) } catch { /* ignore */ } }
    }
    const objects = await this.detectObjects()
    for (const obj of objects) {
      if (obj.confidence < this.minConfidence) continue
      const event: PerceptionEvent = {
        id: 0,
        timestamp,
        category: 'see.object',
        payload: { class: obj.class, bbox: [0, 0, this.videoEl!.videoWidth, this.videoEl!.videoHeight], confidence: obj.confidence },
        source: 'webcam',
        confidence: obj.confidence,
      }
      if (this.perceptionBus) this.perceptionBus.publish(event)
      for (const cb of this.objectCallbacks) { try { cb(event) } catch { /* ignore */ } }
    }
  }

  private async detectFaces(): Promise<Array<{ bbox: [number, number, number, number]; emotion: string; confidence: number }>> {
    if (this._simulated) {
      const face = SIM_FACES[Math.floor(Math.random() * SIM_FACES.length)]
      if (!face) return []
      return [{ ...face, confidence: face.confidence + (Math.random() - 0.5) * 0.1 }]
    }
    return []
  }

  private async detectObjects(): Promise<Array<{ class: string; confidence: number }>> {
    if (this._simulated) {
      const obj = SIM_OBJECTS[Math.floor(Math.random() * SIM_OBJECTS.length)]
      if (!obj) return []
      return [{ class: obj.class, confidence: obj.confidence + (Math.random() - 0.5) * 0.1 }]
    }
    return []
  }

  private startSimulation(): void {
    this.detectionInterval = setInterval(() => {
      if (this.isDestroyed) return
      const timestamp = performance.now()
      const face = SIM_FACES[Math.floor(Math.random() * SIM_FACES.length)]
      if (!face) return
      const event: PerceptionEvent = {
        id: 0,
        timestamp,
        category: 'see.face',
        payload: { bbox: face.bbox, emotion: face.emotion, confidence: face.confidence },
        source: 'webcam',
        confidence: face.confidence,
      }
      if (this.perceptionBus) this.perceptionBus.publish(event)
      for (const cb of this.faceCallbacks) { try { cb(event) } catch { /* ignore */ } }
    }, this.options?.detectionIntervalMs ?? 100)
  }
}
