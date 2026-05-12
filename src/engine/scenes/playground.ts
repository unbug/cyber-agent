/**
 * Playground scene — classic children's playground.
 *
 * POIs: slide, swing, sandbox, bench, tree, flower_bed, fountain, fence
 */

import type { Scene } from './types'

export const playgroundScene: Scene = {
  id: 'playground',
  name: 'Playground',
  description: 'A classic children\'s playground with a slide, swings, sandbox, and fountain.',
  bounds: { width: 800, height: 600 },
  pois: [
    { id: 'slide', type: 'slide', x: 150, y: 300, r: 40, label: 'Slide', passable: false },
    { id: 'swing', type: 'swing', x: 350, y: 200, r: 50, label: 'Swing Set', passable: false },
    { id: 'sandbox', type: 'sandbox', x: 600, y: 150, r: 45, label: 'Sandbox', passable: false },
    { id: 'bench1', type: 'bench', x: 100, y: 500, r: 30, label: 'Bench 1', passable: true },
    { id: 'bench2', type: 'bench', x: 400, y: 500, r: 30, label: 'Bench 2', passable: true },
    { id: 'tree1', type: 'tree', x: 700, y: 450, r: 35, label: 'Oak Tree', passable: true },
    { id: 'tree2', type: 'tree', x: 50, y: 100, r: 30, label: 'Maple Tree', passable: true },
    { id: 'fountain', type: 'fountain', x: 400, y: 350, r: 35, label: 'Fountain', passable: false },
    { id: 'flower1', type: 'flower_bed', x: 250, y: 100, r: 25, label: 'Flower Bed', passable: true },
    { id: 'fence1', type: 'fence', x: 400, y: 50, r: 200, label: 'North Fence', passable: false },
    { id: 'fence2', type: 'fence', x: 400, y: 550, r: 200, label: 'South Fence', passable: false },
    { id: 'fence3', type: 'fence', x: 50, y: 300, r: 200, label: 'West Fence', passable: false },
    { id: 'fence4', type: 'fence', x: 750, y: 300, r: 200, label: 'East Fence', passable: false },
  ],
  spawns: [
    { id: 'spawn1', x: 100, y: 100, label: 'North-West Corner' },
    { id: 'spawn2', x: 700, y: 100, label: 'North-East Corner' },
    { id: 'spawn3', x: 100, y: 500, label: 'South-West Corner' },
    { id: 'spawn4', x: 700, y: 500, label: 'South-East Corner' },
    { id: 'spawn5', x: 400, y: 300, label: 'Center' },
  ],
  cellSize: 50,
}
