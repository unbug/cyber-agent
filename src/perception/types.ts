/**
 * Perception Bus — typed event stream for sensor data.
 *
 * Sensors (webcam, microphone, ESP32 relay, etc.) emit perception events
 * that flow through the bus into the blackboard and behavior tree.
 *
 * Event categories:
 *   see.face      — face detected (bounding box, identity hint)
 *   see.object    — object detected (class, confidence, bbox)
 *   hear.word     — keyword / word detected (text, confidence)
 *   hear.sound    — generic sound event (type, confidence)
 *   near          — proximity event (distance, unit)
 *   tilt          — IMU tilt event (pitch, roll, yaw)
 *   bump          — collision / bump event (direction, force)
 *   custom        — arbitrary perception event
 */

// ─── Event Types ───────────────────────────────────────────────────

export interface PerceptionEvent {
  /** Unique event ID (monotonically increasing) */
  id: number
  /** Timestamp in ms (performance.now() or Date.now()) */
  timestamp: number
  /** Event category */
  category: PerceptionCategory
  /** Raw event payload */
  payload: Record<string, unknown>
  /** Source adapter name (e.g. 'webcam', 'microphone', 'esp32-relay') */
  source: string
  /** Confidence score 0-1 (nullable) */
  confidence?: number | null
}

export type PerceptionCategory =
  | 'see.face'
  | 'see.object'
  | 'hear.word'
  | 'hear.sound'
  | 'near'
  | 'tilt'
  | 'bump'
  | 'custom'

// ─── Face Detection ────────────────────────────────────────────────

export interface FaceEvent extends PerceptionEvent {
  category: 'see.face'
  payload: {
    bbox: [number, number, number, number] // [x, y, w, h]
    landmarks?: [number, number][] // [leftEye, rightEye, nose, leftMouth, rightMouth]
    identity?: string // optional identity hint
    emotion?: string // detected emotion from face
    ageEstimate?: number
  }
}

// ─── Object Detection ──────────────────────────────────────────────

export interface ObjectEvent extends PerceptionEvent {
  category: 'see.object'
  payload: {
    class: string
    confidence: number
    bbox: [number, number, number, number]
  }
}

// ─── Audio Events ──────────────────────────────────────────────────

export interface WordEvent extends PerceptionEvent {
  category: 'hear.word'
  payload: {
    text: string
    confidence: number
    speaker?: string // optional speaker identity
  }
}

export interface SoundEvent extends PerceptionEvent {
  category: 'hear.sound'
  payload: {
    type: 'clap' | 'whistle' | 'voice' | 'impact' | 'unknown'
    confidence: number
    volume?: number // 0-1
    direction?: number // degrees, -180 to 180
  }
}

// ─── Proximity / IMU / Collision ───────────────────────────────────

export interface ProximityEvent extends PerceptionEvent {
  category: 'near'
  payload: {
    distance: number // cm
    unit: 'cm' | 'm' | 'inches'
    direction?: number // degrees
  }
}

export interface TiltEvent extends PerceptionEvent {
  category: 'tilt'
  payload: {
    pitch: number // degrees
    roll: number // degrees
    yaw: number // degrees
  }
}

export interface BumpEvent extends PerceptionEvent {
  category: 'bump'
  payload: {
    direction: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'
    force: number // 0-1
  }
}

// ─── Union Type ────────────────────────────────────────────────────

export type PerceptionEventData =
  | FaceEvent
  | ObjectEvent
  | WordEvent
  | SoundEvent
  | ProximityEvent
  | TiltEvent
  | BumpEvent

// ─── Blackboard Perception Fields ──────────────────────────────────

export interface PerceptionBlackboard {
  /** Most recent face event (null if none) */
  lastFace: PerceptionEvent | null
  /** Most recent object events (up to 10) */
  lastObjects: PerceptionEvent[]
  /** Most recent word event */
  lastWord: PerceptionEvent | null
  /** Most recent sound event */
  lastSound: PerceptionEvent | null
  /** Most recent proximity reading */
  lastProximity: PerceptionEvent | null
  /** Most recent tilt reading */
  lastTilt: PerceptionEvent | null
  /** Most recent bump event */
  lastBump: PerceptionEvent | null
  /** Running perception event count */
  perceptionCount: number
}
