/**
 * CyberAgent SDK — Usage Example
 *
 * This example demonstrates how to use the SDK to create a simple
 * character and run it in the browser.
 *
 * Usage in HTML:
 *   <script type="module" src="./example.ts"></script>
 *
 * Or import from '@cyber-agent/sdk' in your project.
 */

import {
  BehaviorTreeRunner,
  CanvasAdapter,
  registerAction,
  createBlackboard,
} from './index'

// ─── Step 1: Register Custom Actions ──────────────────────────

// A custom action that makes the agent "dance"
registerAction('dance', (bb) => {
  bb.excitement = Math.min(bb.excitement + 0.3, 1)
  bb.emotion = 'happy'
  return 'success'
})

// A custom action that makes the agent "retreat"
registerAction('retreat', (bb) => {
  const rad = (bb.rotation * Math.PI) / 180
  bb.x -= Math.cos(rad) * bb.speed * 2
  bb.y -= Math.sin(rad) * bb.speed * 2
  bb.emotion = 'alert'
  return 'success'
})

// ─── Step 2: Define Character ─────────────────────────────────

const guardDog: {
  characterId: string
  tree: any
  defaults?: Partial<any>
  tickIntervalMs?: number
} = {
  characterId: 'guard-dog',
  tree: {
    type: 'selector',
    children: [
      // Priority 1: If pointer is active, approach it
      {
        type: 'sequence',
        children: [
          { type: 'condition', check: 'isPointerActive' },
          { type: 'action', action: 'moveToPointer' },
          { type: 'action', action: 'setEmotion', args: { emotion: 'curious' } },
        ],
      },
      // Priority 2: If at boundary, turn around
      {
        type: 'sequence',
        children: [
          { type: 'condition', check: 'atBoundary' },
          { type: 'action', action: 'turnRight' },
          { type: 'action', action: 'turnRight' },
        ],
      },
      // Priority 3: Patrol — wander around
      {
        type: 'selector',
        children: [
          { type: 'action', action: 'dance' },
          { type: 'action', action: 'moveForward' },
        ],
      },
    ],
  },
  defaults: {
    emotion: 'idle',
    speed: 2,
  },
  tickIntervalMs: 100,
}

// ─── Step 3: Run ──────────────────────────────────────────────

function main() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement
  if (!canvas) {
    console.error('Canvas element not found!')
    return
  }

  // Create adapter and runner
  const adapter = new CanvasAdapter(canvas)
  const runner = new BehaviorTreeRunner(guardDog, adapter)

  // Listen for ticks
  runner.onTick = (snapshot) => {
    const { x, y, emotion, energy } = snapshot.blackboard
    console.log(`[${emotion}] @(${Math.round(x)},${Math.round(y)}) energy=${Math.round(energy * 100)}%`)
  }

  // Start the behavior tree
  runner.start()
  console.log('Guard dog started! 🐕')

  // Stop after 30 seconds (demo purposes)
  setTimeout(() => {
    runner.stop()
    console.log('Guard dog stopped. Good boy! 🐕')
  }, 30000)
}

// Run when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', main)
}

export { guardDog }
