/**
 * Campus scene — university-style campus with buildings, paths, and open areas.
 *
 * POIs: library, gym, classroom, garden, fountain, bench, flower_bed, wall, gate
 */

import type { Scene } from './types'

export const campusScene: Scene = {
  id: 'campus',
  name: 'Campus',
  description: 'A university campus with a library, gym, classrooms, and green spaces.',
  bounds: { width: 1000, height: 800 },
  pois: [
    // Buildings (impassable)
    { id: 'library', type: 'library', x: 200, y: 200, r: 80, label: 'Library', passable: false },
    { id: 'gym', type: 'gym', x: 800, y: 200, r: 70, label: 'Gymnasium', passable: false },
    { id: 'classroom1', type: 'classroom', x: 150, y: 600, r: 60, label: 'Classroom A', passable: false },
    { id: 'classroom2', type: 'classroom', x: 850, y: 600, r: 60, label: 'Classroom B', passable: false },
    // Open features
    { id: 'fountain', type: 'fountain', x: 500, y: 400, r: 30, label: 'Central Fountain', passable: false },
    { id: 'garden', type: 'garden', x: 500, y: 200, r: 60, label: 'Garden Plaza', passable: true },
    { id: 'path1', type: 'path', x: 500, y: 400, r: 350, label: 'Main Path', passable: true },
    { id: 'path2', type: 'path', x: 500, y: 400, r: 350, label: 'Cross Path', passable: true },
    // Trees
    { id: 'tree1', type: 'tree', x: 100, y: 400, r: 30, label: 'Oak', passable: true },
    { id: 'tree2', type: 'tree', x: 900, y: 400, r: 30, label: 'Maple', passable: true },
    { id: 'tree3', type: 'tree', x: 500, y: 700, r: 30, label: 'Pine', passable: true },
    // Benches
    { id: 'bench1', type: 'bench', x: 350, y: 300, r: 20, label: 'Bench near Fountain', passable: true },
    { id: 'bench2', type: 'bench', x: 650, y: 300, r: 20, label: 'Bench by Garden', passable: true },
    { id: 'bench3', type: 'bench', x: 350, y: 500, r: 20, label: 'Bench by Library', passable: true },
    { id: 'bench4', type: 'bench', x: 650, y: 500, r: 20, label: 'Bench by Gym', passable: true },
    // Gates
    { id: 'gate1', type: 'gate', x: 500, y: 50, r: 30, label: 'North Gate', passable: true },
    { id: 'gate2', type: 'gate', x: 500, y: 750, r: 30, label: 'South Gate', passable: true },
    { id: 'gate3', type: 'gate', x: 50, y: 400, r: 30, label: 'West Gate', passable: true },
    { id: 'gate4', type: 'gate', x: 950, y: 400, r: 30, label: 'East Gate', passable: true },
    // Walls
    { id: 'wall1', type: 'wall', x: 500, y: 50, r: 400, label: 'North Wall', passable: false },
    { id: 'wall2', type: 'wall', x: 500, y: 750, r: 400, label: 'South Wall', passable: false },
    { id: 'wall3', type: 'wall', x: 50, y: 400, r: 300, label: 'West Wall', passable: false },
    { id: 'wall4', type: 'wall', x: 950, y: 400, r: 300, label: 'East Wall', passable: false },
    // Flower beds
    { id: 'flower1', type: 'flower_bed', x: 300, y: 400, r: 20, label: 'Flower Bed 1', passable: true },
    { id: 'flower2', type: 'flower_bed', x: 700, y: 400, r: 20, label: 'Flower Bed 2', passable: true },
  ],
  spawns: [
    { id: 'spawn1', x: 500, y: 80, label: 'North Gate' },
    { id: 'spawn2', x: 500, y: 720, label: 'South Gate' },
    { id: 'spawn3', x: 80, y: 400, label: 'West Gate' },
    { id: 'spawn4', x: 920, y: 400, label: 'East Gate' },
    { id: 'spawn5', x: 500, y: 400, label: 'Central Fountain' },
    { id: 'spawn6', x: 300, y: 200, label: 'Library Plaza' },
    { id: 'spawn7', x: 700, y: 200, label: 'Gym Plaza' },
    { id: 'spawn8', x: 300, y: 600, label: 'Classroom A Area' },
    { id: 'spawn9', x: 700, y: 600, label: 'Classroom B Area' },
  ],
  cellSize: 50,
}
