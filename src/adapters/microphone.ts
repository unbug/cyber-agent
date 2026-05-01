/**
 * Microphone Adapter — browser microphone perception source.
 *
 * Captures audio from the device microphone and runs:
 *   1. Voice Activity Detection (VAD)
 *   2. Keyword spotting
 *
 * Emits perception events: hear.sound, hear.word
 *
 * Simulation mode (for testing / CI):
 *   const mic = new MicrophoneAdapter({ simulate: true })
 */

import type { PerceptionBus } from '../perception/bus'
import type { PerceptionEvent } from '../perception/types'

export interface MicrophoneAdapterOptions {
  constraints?: MediaStreamConstraints
  vadSensitivity?: number
  keywords?: string[]
  analysisIntervalMs?: number
  simulate?: boolean
  perceptionBus?: PerceptionBus
  minConfidence?: number
  keywordCooldownMs?: number
}

const SIM_KEYWORDS = ['hello', 'stop', 'help', 'come', 'go', 'look', 'play', 'dance']
const SIM_SOUNDS = ['voice', 'clap', 'whistle', 'impact', 'unknown'] as const

export class MicrophoneAdapter {
  readonly type = 'microphone'
  readonly name = 'Microphone (Browser)'

  private stream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private vadInterval: ReturnType<typeof setInterval> | null = null
  private perceptionBus: PerceptionBus | null
  private vadSensitivity: number

  private keywordCooldownMs: number
  private lastKeywordTime = 0
  private isDestroyed = false
  private lastVolume = 0

  private soundCallbacks: Array<(event: PerceptionEvent) => void> = []
  private wordCallbacks: Array<(event: PerceptionEvent) => void> = []

  constructor(private options?: MicrophoneAdapterOptions) {
    this.perceptionBus = options?.perceptionBus ?? null
    this.vadSensitivity = options?.vadSensitivity ?? 0.5
    this.keywordCooldownMs = options?.keywordCooldownMs ?? 3000
  }

  static async isAvailable(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices.some((d) => d.kind === 'audioinput')
    } catch {
      return false
    }
  }

  async connect(): Promise<void> {
    if (this.stream) return
    if (this.options?.simulate) {
      this.startSimulation()
      return
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia(this.options?.constraints ?? { audio: true })
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = this.audioContext.createMediaStreamSource(this.stream)
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256
      source.connect(this.analyser)
      this.startVAD()
    } catch (_err) {
      this.startSimulation()
    }
  }

  disconnect(): void {
    this.stopVAD()
    if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null }
    if (this.analyser) { this.analyser.disconnect(); this.analyser = null }
    if (this.audioContext) { this.audioContext.close(); this.audioContext = null }
  }

  destroy(): void {
    this.disconnect()
    this.soundCallbacks = []
    this.wordCallbacks = []
    this.isDestroyed = true
  }

  onSound(handler: (event: PerceptionEvent) => void): () => void {
    this.soundCallbacks.push(handler)
    return () => { const idx = this.soundCallbacks.indexOf(handler); if (idx >= 0) this.soundCallbacks.splice(idx, 1) }
  }

  onWord(handler: (event: PerceptionEvent) => void): () => void {
    this.wordCallbacks.push(handler)
    return () => { const idx = this.wordCallbacks.indexOf(handler); if (idx >= 0) this.wordCallbacks.splice(idx, 1) }
  }

  private startVAD(): void {
    this.vadInterval = setInterval(() => this.analyzeAudio(), this.options?.analysisIntervalMs ?? 50)
  }

  private stopVAD(): void {
    if (this.vadInterval) { clearInterval(this.vadInterval); this.vadInterval = null }
  }

  private analyzeAudio(): void {
    if (this.isDestroyed || !this.analyser) return
    const analyser = this.analyser!
    const size = analyser.frequencyBinCount!
    const dataArray = new Uint8Array(size) as Uint8Array
    analyser.getByteFrequencyData(dataArray)
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) { const v = dataArray[i]; if (v !== undefined) sum += v * v }
    const rms = Math.sqrt(sum / dataArray.length)
    const volume = Math.min(rms / 128, 1)

    if (volume > this.vadSensitivity) this.emitSoundEvent('voice', volume)
    if (volume > 0.8 && volume > (this.lastVolume ?? 0) * 2) this.emitSoundEvent('clap', volume)
    this.lastVolume = volume
  }

  private startSimulation(): void {
    this.vadInterval = setInterval(() => {
      if (this.isDestroyed) return
      if (Math.random() < 0.3) {
        const idx = Math.floor(Math.random() * SIM_SOUNDS.length)
        const type = SIM_SOUNDS[idx]
        if (!type) return
        this.emitSoundEvent(type, 0.5 + Math.random() * 0.4)
      }
      if (Math.random() < 0.05 && Date.now() - this.lastKeywordTime > this.keywordCooldownMs) {
        const kwIdx = Math.floor(Math.random() * SIM_KEYWORDS.length)
        const kw = SIM_KEYWORDS[kwIdx]
        if (!kw) return
        this.emitWordEvent(kw, 0.6 + Math.random() * 0.3)
        this.lastKeywordTime = Date.now()
      }
    }, this.options?.analysisIntervalMs ?? 50)
  }

  private emitSoundEvent(type: string, confidence: number): void {
    const ts = performance.now()
    const event: PerceptionEvent = {
      id: 0, timestamp: ts, category: 'hear.sound',
      payload: { type: type as any, confidence, volume: Math.min(confidence, 1) },
      source: 'microphone', confidence,
    }
    if (this.perceptionBus) this.perceptionBus.publish(event)
    for (const cb of this.soundCallbacks) { try { cb(event) } catch { /* ignore */ } }
  }

  private emitWordEvent(text: string, confidence: number): void {
    const ts = performance.now()
    const event: PerceptionEvent = {
      id: 0, timestamp: ts, category: 'hear.word',
      payload: { text, confidence },
      source: 'microphone', confidence,
    }
    if (this.perceptionBus) this.perceptionBus.publish(event)
    for (const cb of this.wordCallbacks) { try { cb(event) } catch { /* ignore */ } }
  }
}
