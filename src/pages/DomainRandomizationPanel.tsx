/**
 * v2.0 — Domain Randomization Panel
 *
 * Debug UI for sim-to-real transfer: mass, friction, latency,
 * and sensor-noise sliders wired into the debugger.
 *
 * Each slider updates the SimEngine's randomization config in real-time.
 * The current values are also visible on the timeline via tracer events.
 */

import { useEffect, useState } from 'react'
import { Droplet, Wind, Zap, Weight } from 'lucide-react'
import { DomainRandomization, DEFAULT_RANDOMIZATION } from '@/sim/types'
import styles from './Agent.module.css'

interface DomainRandomizationPanelProps {
  /** Current randomization params */
  randomization: DomainRandomization
  /** Update handler */
  onChange: (r: Partial<DomainRandomization>) => void
  /** Reset to defaults */
  onReset: () => void
}

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  icon: React.ReactNode
  disabled: boolean
  onChange: (v: number) => void
  randomRange: { min: number; max: number }
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  icon,
  disabled,
  onChange,
  randomRange,
}: SliderRowProps) {
  return (
    <div className={styles.drRow}>
      <div className={styles.drIcon}>{icon}</div>
      <div className={styles.drLabel}>{label}</div>
      <input
        type="range"
        className={styles.drSlider}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <div className={styles.drValue}>
        {value.toFixed(step < 1 ? 2 : 0)}
        <span className={styles.drUnit}>{unit}</span>
      </div>
      <div className={styles.drRange}>
        [{randomRange.min}, {randomRange.max}]
      </div>
    </div>
  )
}

export function DomainRandomizationPanel(props: DomainRandomizationPanelProps) {
  const { randomization, onChange, onReset } = props

  const [mass, setMass] = useState(randomization.mass.current)
  const [friction, setFriction] = useState(randomization.friction.current)
  const [latency, setLatency] = useState(randomization.latency.current)
  const [noise, setNoise] = useState(randomization.sensorNoise.current)

  // Sync local state when external randomization changes
  useEffect(() => {
    setMass(randomization.mass.current)
    setFriction(randomization.friction.current)
    setLatency(randomization.latency.current)
    setNoise(randomization.sensorNoise.current)
  }, [randomization])

  const handleMass = (v: number) => {
    setMass(v)
    onChange({ mass: { ...randomization.mass, current: v } })
  }
  const handleFriction = (v: number) => {
    setFriction(v)
    onChange({ friction: { ...randomization.friction, current: v } })
  }
  const handleLatency = (v: number) => {
    setLatency(v)
    onChange({ latency: { ...randomization.latency, current: v } })
  }
  const handleNoise = (v: number) => {
    setNoise(v)
    onChange({ sensorNoise: { ...randomization.sensorNoise, current: v } })
  }

  const handleReset = () => {
    setMass(DEFAULT_RANDOMIZATION.mass.current)
    setFriction(DEFAULT_RANDOMIZATION.friction.current)
    setLatency(DEFAULT_RANDOMIZATION.latency.current)
    setNoise(DEFAULT_RANDOMIZATION.sensorNoise.current)
    onChange({
      mass: { ...randomization.mass, current: DEFAULT_RANDOMIZATION.mass.current },
      friction: { ...randomization.friction, current: DEFAULT_RANDOMIZATION.friction.current },
      latency: { ...randomization.latency, current: DEFAULT_RANDOMIZATION.latency.current },
      sensorNoise: { ...randomization.sensorNoise, current: DEFAULT_RANDOMIZATION.sensorNoise.current },
    })
    onReset()
  }

  const hasRandomization =
    mass !== DEFAULT_RANDOMIZATION.mass.current ||
    friction !== DEFAULT_RANDOMIZATION.friction.current ||
    latency !== DEFAULT_RANDOMIZATION.latency.current ||
    noise !== DEFAULT_RANDOMIZATION.sensorNoise.current

  return (
    <div className={styles.drPanel}>
      <div className={styles.drHeader}>
        <span className={styles.drTitle}>
          <Weight size={14} />
          Domain Randomization
        </span>
        <button
          className={styles.drResetBtn}
          onClick={handleReset}
          disabled={!hasRandomization}
          title="Reset to defaults"
        >
          Reset
        </button>
      </div>

      <SliderRow
        label="Mass"
        value={mass}
        min={randomization.mass.min}
        max={randomization.mass.max}
        step={0.05}
        unit="kg"
        icon={<Weight size={14} />}
        disabled={false}
        onChange={handleMass}
        randomRange={randomization.mass}
      />

      <SliderRow
        label="Friction"
        value={friction}
        min={randomization.friction.min}
        max={randomization.friction.max}
        step={0.005}
        unit=""
        icon={<Wind size={14} />}
        disabled={false}
        onChange={handleFriction}
        randomRange={randomization.friction}
      />

      <SliderRow
        label="Latency"
        value={latency}
        min={randomization.latency.min}
        max={randomization.latency.max}
        step={1}
        unit="ms"
        icon={<Zap size={14} />}
        disabled={false}
        onChange={handleLatency}
        randomRange={randomization.latency}
      />

      <SliderRow
        label="Sensor Noise"
        value={noise}
        min={randomization.sensorNoise.min}
        max={randomization.sensorNoise.max}
        step={0.5}
        unit="px"
        icon={<Droplet size={14} />}
        disabled={false}
        onChange={handleNoise}
        randomRange={randomization.sensorNoise}
      />

      {hasRandomization && (
        <div className={styles.drWarning}>
          ⚠ Randomization active — sim→real gap will be measurable
        </div>
      )}
    </div>
  )
}
