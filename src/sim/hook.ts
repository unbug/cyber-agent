/**
 * v2.0 — Simulator hook
 *
 * Integrates the browser-embedded simulator with the Agent page.
 * Manages the sim engine, recorder, replay, and canvas rendering.
 * Provides a "sim mode" toggle that runs the behavior tree in simulation
 * instead of sending commands to real hardware.
 */

import { useRef, useCallback, useEffect, useState } from 'react'
import { SimEngine } from './engine'
import { SimRecorder } from './recorder'
import { SimReplay } from './replay'
import { SimCanvasRenderer } from './renderer'
import { Sim2RealReplay, ReplayConfig } from './sim2real'
import { SimBody, SimConfig, SimRun, DomainRandomization, DEFAULT_RANDOMIZATION } from './types'
import type { RobotAdapter } from '../engine/types'
import { EpisodeRecorder } from '../dataset/recorder'
import type { EpisodeMeta, Dataset } from '../dataset/recorder'

export interface SimModeOptions {
  /** Canvas element ref */
  canvasRef: React.RefObject<HTMLCanvasElement>
  /** Simulation config */
  config?: Partial<SimConfig>
  /** Character ID for recording */
  characterId?: string
  /** Whether to enable sim mode (experimental) */
  enabled?: boolean
}

export interface SimModeResult {
  /** Whether simulator is active */
  simActive: boolean
  /** Whether currently recording */
  isRecording: boolean
  /** Whether currently replaying (sim replay) */
  isReplaying: boolean
  /** Whether currently replaying on real hardware */
  isReplayingOnReal: boolean
  /** Simulation time in ms */
  simTime: number
  /** Step count */
  stepCount: number
  /** FPS counter */
  fps: number
  /** Start simulation */
  startSim: () => void
  /** Stop simulation */
  stopSim: () => void
  /** Start recording */
  startRecording: () => void
  /** Stop recording and get the run */
  stopRecording: () => SimRun | null
  /** Export recording as .cybersim (cybertrace-compatible) */
  exportCyberSim: () => string
  /** Replay recorded run on a real adapter */
  replayOnReal: (adapter: RobotAdapter, config?: Partial<ReplayConfig>) => Promise<void>
  /** Abort replay-on-real */
  abortReplayOnReal: () => void
  /** Start replay from recorded run */
  startReplay: () => void
  /** Pause replay */
  pauseReplay: () => void
  /** Step replay forward */
  stepReplay: () => void
  /** Scrub replay to a step */
  scrubReplay: (index: number) => void
  /** Set replay speed */
  setReplaySpeed: (speed: number) => void
  /** Export recording as JSON */
  exportRecording: () => string
  /** Import a recorded run */
  importRun: (json: string) => void
  /** Current domain randomization params */
  randomization: DomainRandomization
  /** Update domain randomization */
  setRandomization: (r: Partial<DomainRandomization>) => void
  /** Reset domain randomization to defaults */
  resetRandomization: () => void
  // ── Dataset (v2.0 checkbox 4) ─────────────────────────
  /** Whether dataset panel is visible */
  datasetPanelVisible: boolean
  /** Toggle dataset panel visibility */
  setDatasetPanelVisible: (v: boolean) => void
  /** All episodes from the dataset recorder */
  episodes: EpisodeMeta[]
  /** All datasets from the dataset recorder */
  datasets: Map<string, Dataset>
  /** Export current recording as .cybertrace */
  exportCyberTrace: () => string
  /** Export a specific episode as .cybertrace */
  exportEpisodeCyberTrace: (episodeId: string) => string
  /** Export a dataset as .cybertrace */
  exportDatasetCyberTrace: (datasetName: string) => string
  /** Delete an episode */
  deleteEpisode: (episodeId: string) => void
  /** Delete a dataset */
  deleteDataset: (datasetName: string) => void
  /** Current dataset name (used when starting a new episode) */
  currentDatasetName: string
  /** Set current dataset name */
  setCurrentDatasetName: (name: string) => void
  /** Close dataset panel */
  onCloseDataset: () => void
}

export function useSimMode(opts: SimModeOptions): SimModeResult {
  const { canvasRef, config, characterId } = opts

  const engineRef = useRef<SimEngine | null>(null)
  const recorderRef = useRef<SimRecorder | null>(null)
  const episodeRecorderRef = useRef<EpisodeRecorder | null>(null)
  const replayRef = useRef<SimReplay | null>(null)
  const rendererRef = useRef<SimCanvasRenderer | null>(null)
  const sim2realRef = useRef<Sim2RealReplay | null>(null)
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const fpsCounterRef = useRef<{ frames: number; lastTime: number; fps: number }>({
    frames: 0,
    lastTime: 0,
    fps: 0,
  })

  const [simActive, setSimActive] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isReplaying, setIsReplaying] = useState(false)
  const [isReplayingOnReal, setIsReplayingOnReal] = useState(false)
  const [simTime, setSimTime] = useState(0)
  const [stepCount, setStepCount] = useState(0)
  const [fps, setFps] = useState(0)
  const [randomization, setRandomizationState] = useState<DomainRandomization>(() => ({
    ...DEFAULT_RANDOMIZATION,
  }))

  // ── Dataset state (v2.0 checkbox 4) ───────────────────
  const [datasetPanelVisible, setDatasetPanelVisible] = useState(false)
  const [currentDatasetName, setCurrentDatasetName] = useState('default')

  // Initialize simulator
  const initSim = useCallback(() => {
    if (!canvasRef.current) return

    const engine = new SimEngine(config)
    const recorder = new SimRecorder(engine)
    const replay = new SimReplay(engine)
    const renderer = new SimCanvasRenderer({
      canvas: canvasRef.current,
      bgColor: '#1a1a2e',
      gridColor: 'rgba(255,255,255,0.06)',
      gridSize: 40,
    })

    engineRef.current = engine
    recorderRef.current = recorder
    episodeRecorderRef.current = new EpisodeRecorder(engine)
    replayRef.current = replay
    rendererRef.current = renderer

    // Set canvas size
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight)

    // Default body (robot character)
    const defaultBody: SimBody = {
      id: 'robot',
      pos: { x: config?.width ? config.width / 2 : 400, y: config?.height ? config.height / 2 : 300 },
      vel: { vx: 0, vy: 0 },
      orientation: 0,
      angVel: 0,
      radius: 20,
      mass: 1,
      linearDamping: 0.95,
      angularDamping: 0.9,
      color: '#6366f1',
      trail: [],
      trailMax: 50,
    }
    engine.addBody(defaultBody)
  }, [canvasRef, config])

  // Simulation loop
  const simLoop = useCallback(() => {
    const engine = engineRef.current
    const recorder = recorderRef.current
    const renderer = rendererRef.current
    if (!engine || !renderer) return

    const now = Date.now()
    const _dt = now - (lastTimeRef.current || now)
    void _dt // used for timing
    lastTimeRef.current = now

    // FPS counter
    const fc = fpsCounterRef.current
    fc.frames++
    if (now - fc.lastTime >= 1000) {
      fc.fps = fc.frames
      fc.frames = 0
      fc.lastTime = now
      setFps(fc.fps)
    }

    // Step the engine
    const step = engine.step([])
    setSimTime(step.simTime)
    setStepCount(engine.getStepCounter())

    // Record if active
    if (recorder && recorder.isRecording) {
      recorder.recordStep(step)
    }

    // Also feed the episode recorder
    const episodeRecorder = episodeRecorderRef.current
    if (episodeRecorder && episodeRecorder.isRecording) {
      episodeRecorder.recordStep(step)
    }

    // Render
    renderer.clear()
    renderer.drawGrid()
    renderer.drawAxes(0, renderer.canvas.clientHeight, 1)
    renderer.drawBodies(step.bodies)
    renderer.drawInfo(step.simTime, engine.getStepCounter(), fc.fps)

    animFrameRef.current = requestAnimationFrame(simLoop)
  }, [])

  const startSim = useCallback(() => {
    if (!engineRef.current) initSim()
    if (!engineRef.current) return

    engineRef.current.reset()
    lastTimeRef.current = 0
    fpsCounterRef.current = { frames: 0, lastTime: 0, fps: 0 }
    setSimActive(true)
    setSimTime(0)
    setStepCount(0)
    setFps(0)
    animFrameRef.current = requestAnimationFrame(simLoop)
  }, [initSim, simLoop])

  const stopSim = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
    }
    setSimActive(false)
    setIsReplaying(false)
  }, [])

  const startRecording = useCallback(() => {
    const rec = recorderRef.current
    if (!rec) return
    rec.start(characterId ?? 'unknown')
    setIsRecording(true)

    // Also start an episode on the dataset recorder (v2.0 checkbox 4)
    const epRecorder = episodeRecorderRef.current
    if (epRecorder && !epRecorder.isRecording) {
      epRecorder.startEpisode(characterId ?? 'unknown', currentDatasetName)
    }
  }, [characterId, currentDatasetName])

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current
    if (!rec) return null
    const run = rec.stop()
    setIsRecording(false)

    // Stop the episode on the dataset recorder (v2.0 checkbox 4)
    const epRecorder = episodeRecorderRef.current
    if (epRecorder && epRecorder.isRecording) {
      epRecorder.stopEpisode()
    }

    return run
  }, [])

  const startReplay = useCallback(() => {
    const rp = replayRef.current
    if (!rp) return
    rp.play()
    setIsReplaying(true)
    setSimActive(false)
  }, [])

  const pauseReplay = useCallback(() => {
    const rp = replayRef.current
    if (!rp) return
    rp.pause()
    setIsReplaying(false)
  }, [])

  const stepReplay = useCallback(() => {
    const rp = replayRef.current
    if (!rp) return
    rp.stepForward()
    setIsReplaying(false)
  }, [])

  const scrubReplay = useCallback((index: number) => {
    const rp = replayRef.current
    if (!rp) return
    rp.scrubTo(index)
    setIsReplaying(false)
  }, [])

  const setReplaySpeed = useCallback((speed: number) => {
    const rp = replayRef.current
    if (!rp) return
    rp.setSpeed(speed)
  }, [])

  const exportRecording = useCallback(() => {
    const rec = recorderRef.current
    if (!rec) return ''
    return rec.exportJSON()
  }, [])

  const importRun = useCallback((json: string) => {
    const rp = replayRef.current
    if (!rp) return
    const run = SimRecorder.importJSON(json)
    rp.load(run)
    setIsReplaying(true)
  }, [])

  /** Export recording as .cybersim (cybertrace-compatible format) */
  const exportCyberSim = useCallback(() => {
    const rec = recorderRef.current
    if (!rec) return ''
    return rec.exportCyberSim()
  }, [])

  /** Replay recorded run on a real adapter */
  const replayOnReal = useCallback(
    async (adapter: RobotAdapter, config?: Partial<ReplayConfig>) => {
      const rec = recorderRef.current
      const run = rec?.run
      if (!run || run.steps.length === 0) return

      setIsReplayingOnReal(true)
      const replayer = new Sim2RealReplay(adapter, {
        ...config,
        onComplete: () => {
          setIsReplayingOnReal(false)
          config?.onComplete?.()
        },
        onError: (err) => {
          console.error('[Sim2Real] Replay error:', err)
          setIsReplayingOnReal(false)
          config?.onError?.(err)
        },
      })
      sim2realRef.current = replayer
      await replayer.play(run, config)
    },
    [],
  )

  /** Abort replay-on-real */
  const abortReplayOnReal = useCallback(() => {
    sim2realRef.current?.abort()
    setIsReplayingOnReal(false)
  }, [])

  const resetRandomization = useCallback(() => {
    const engine = engineRef.current
    if (engine) engine.resetRandomization()
    setRandomizationState({ ...DEFAULT_RANDOMIZATION })
  }, [])

  const setRandomization = useCallback((r: Partial<DomainRandomization>) => {
    const engine = engineRef.current
    if (engine) engine.setRandomization(r)
    setRandomizationState((prev) => ({ ...prev, ...r }))
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [])

  return {
    simActive,
    isRecording,
    isReplaying,
    isReplayingOnReal,
    simTime,
    stepCount,
    fps,
    startSim,
    stopSim,
    startRecording,
    stopRecording,
    exportCyberSim,
    replayOnReal,
    abortReplayOnReal,
    startReplay,
    pauseReplay,
    stepReplay,
    scrubReplay,
    setReplaySpeed,
    exportRecording,
    importRun,
    randomization,
    setRandomization,
    resetRandomization,
    // ── Dataset (v2.0 checkbox 4) ───────────────────────
    datasetPanelVisible,
    setDatasetPanelVisible,
    onCloseDataset: useCallback(() => setDatasetPanelVisible(false), [setDatasetPanelVisible]),
    episodes: (() => {
      const er = episodeRecorderRef.current
      return er ? er.episodes : []
    })(),
    datasets: (() => {
      const er = episodeRecorderRef.current
      return er ? er.datasets : new Map()
    })(),
    exportCyberTrace: () => {
      const er = episodeRecorderRef.current
      return er ? er.exportCyberTrace() : ''
    },
    exportEpisodeCyberTrace: (episodeId: string) => {
      const er = episodeRecorderRef.current
      return er ? er.exportEpisodeAsCyberTrace(episodeId) : ''
    },
    exportDatasetCyberTrace: (datasetName: string) => {
      const er = episodeRecorderRef.current
      return er ? er.exportDatasetAsCyberTrace(datasetName) : ''
    },
    deleteEpisode: (episodeId: string) => {
      const er = episodeRecorderRef.current
      if (er) er.deleteEpisode(episodeId)
    },
    deleteDataset: (datasetName: string) => {
      const er = episodeRecorderRef.current
      if (er) er.deleteDataset(datasetName)
    },
    currentDatasetName,
    setCurrentDatasetName,
  }
}
