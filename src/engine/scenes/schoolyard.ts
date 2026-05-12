/**
 * Schoolyard scene — elementary schoolyard with playground equipment and classrooms.
 *
 * POIs: slide, swing, sandbox, classroom, bell_tower, flower_bed, fence, gate
 */

import type { Scene } from './types'

export const schoolyardScene: Scene = {
  id: 'schoolyard',
  name: 'Schoolyard',
  description: 'An elementary schoolyard with classrooms, playground equipment, and a bell tower.',
  bounds: { width: 850, height: 650 },
  pois: [
    // Buildings (impassable)
    { id: 'classroom1', type: 'classroom', x: 100, y: 100, r: 70, label: 'Classroom 1', passable: false },
    { id: 'classroom2', type: 'classroom', x: 400, y: 100, r: 70, label: 'Classroom 2', passable: false },
    { id: 'classroom3', type: 'classroom', x: 700, y: 100, r: 70, label: 'Classroom 3', passable: false },
    // Bell tower (impassable)
    { id: 'bell_tower', type: 'bell_tower', x: 425, y: 50, r: 30, label: 'Bell Tower', passable: false },
    // Playground equipment (impassable)
    { id: 'slide', type: 'slide', x: 200, y: 450, r: 40, label: 'Slide', passable: false },
    { id: 'swing', type: 'swing', x: 425, y: 450, r: 50, label: 'Swing Set', passable: false },
    { id: 'sandbox', type: 'sandbox', x: 650, y: 450, r: 40, label: 'Sandbox', passable: false },
    // Open features
    { id: 'flower1', type: 'flower_bed', x: 150, y: 300, r: 25, label: 'Flower Bed 1', passable: true },
    { id: 'flower2', type: 'flower_bed', x: 425, y: 300, r: 25, label: 'Flower Bed 2', passable: true },
    { id: 'flower3', type: 'flower_bed', x: 700, y: 300, r: 25, label: 'Flower Bed 3', passable: true },
    { id: 'tree1', type: 'tree', x: 100, y: 550, r: 30, label: 'Cherry Tree', passable: true },
    { id: 'tree2', type: 'tree', x: 750, y: 550, r: 30, label: 'Ginkgo', passable: true },
    { id: 'bench1', type: 'bench', x: 300, y: 550, r: 20, label: 'Teacher Bench', passable: true },
    { id: 'bench2', type: 'bench', x: 550, y: 550, r: 20, label: 'Bench 2', passable: true },
    // Gates
    { id: 'gate1', type: 'gate', x: 425, y: 580, r: 30, label: 'Main Gate', passable: true },
    { id: 'gate2', type: 'gate', x: 425, y: 150, r: 30, label: 'Back Gate', passable: true },
    // Walls
    { id: 'wall1', type: 'wall', x: 425, y: 50, r: 350, label: 'North Wall', passable: false },
    { id: 'wall2', type: 'wall', x: 425, y: 600, r: 350, label: 'South Wall', passable: false },
    { id: 'wall3', type: 'wall', x: 50, y: 325, r: 250, label: 'West Wall', passable: false },
    { id: 'wall4', type: 'wall', x: 800, y: 325, r: 250, label: 'East Wall', passable: false },
    // Pavement
    { id: 'path1', type: 'path', x: 425, y: 325, r: 250, label: 'Playground Pavement', passable: true },
  ],
  spawns: [
    { id: 'spawn1', x: 425, y: 160, label: 'Back Gate' },
    { id: 'spawn2', x: 425, y: 560, label: 'Main Gate' },
    { id: 'spawn3', x: 200, y: 325, label: 'Playground Left' },
    { id: 'spawn4', x: 650, y: 325, label: 'Playground Right' },
    { id: 'spawn5', x: 425, y: 325, label: 'Center' },
  ],
  cellSize: 50,
}
