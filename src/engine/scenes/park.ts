/**
 * Park scene — urban park with paths, trees, and water features.
 *
 * POIs: trees, fountain, pond, bridge, bench, path, gate, flower_bed
 */

import type { Scene } from './types'

export const parkScene: Scene = {
  id: 'park',
  name: 'Park',
  description: 'A peaceful urban park with winding paths, a pond, and plenty of trees.',
  bounds: { width: 900, height: 700 },
  pois: [
    { id: 'pond', type: 'pond', x: 450, y: 350, r: 80, label: 'Pond', passable: false },
    { id: 'bridge1', type: 'bridge', x: 450, y: 320, r: 20, label: 'Bridge (N)', passable: true },
    { id: 'bridge2', type: 'bridge', x: 450, y: 380, r: 20, label: 'Bridge (S)', passable: true },
    { id: 'tree1', type: 'tree', x: 100, y: 100, r: 35, label: 'Willow 1', passable: true },
    { id: 'tree2', type: 'tree', x: 800, y: 100, r: 35, label: 'Willow 2', passable: true },
    { id: 'tree3', type: 'tree', x: 100, y: 600, r: 35, label: 'Pine 1', passable: true },
    { id: 'tree4', type: 'tree', x: 800, y: 600, r: 35, label: 'Pine 2', passable: true },
    { id: 'tree5', type: 'tree', x: 200, y: 350, r: 30, label: 'Birch', passable: true },
    { id: 'tree6', type: 'tree', x: 700, y: 350, r: 30, label: 'Birch', passable: true },
    { id: 'bench1', type: 'bench', x: 200, y: 150, r: 25, label: 'Bench by Pond', passable: true },
    { id: 'bench2', type: 'bench', x: 700, y: 550, r: 25, label: 'Bench by Path', passable: true },
    { id: 'gate1', type: 'gate', x: 450, y: 50, r: 30, label: 'Main Gate', passable: true },
    { id: 'gate2', type: 'gate', x: 450, y: 650, r: 30, label: 'Back Gate', passable: true },
    { id: 'path1', type: 'path', x: 450, y: 350, r: 300, label: 'Main Path', passable: true },
    { id: 'flower1', type: 'flower_bed', x: 300, y: 500, r: 25, label: 'Rose Garden', passable: true },
    { id: 'fountain', type: 'fountain', x: 450, y: 200, r: 20, label: 'Small Fountain', passable: false },
  ],
  spawns: [
    { id: 'spawn1', x: 450, y: 80, label: 'Main Gate' },
    { id: 'spawn2', x: 450, y: 620, label: 'Back Gate' },
    { id: 'spawn3', x: 100, y: 350, label: 'West Entrance' },
    { id: 'spawn4', x: 800, y: 350, label: 'East Entrance' },
    { id: 'spawn5', x: 300, y: 500, label: 'Rose Garden' },
    { id: 'spawn6', x: 600, y: 200, label: 'Fountain Area' },
  ],
  cellSize: 50,
}
