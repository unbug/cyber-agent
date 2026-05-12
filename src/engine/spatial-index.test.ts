/**
 * SpatialIndex unit tests
 *
 * Tests grid-based spatial queries: add/remove, radius query,
 * neighbor query, and rectangular query.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SpatialIndex, type SpatialPoint } from './spatial-index'

function makePoint(id: string, x: number, y: number): SpatialPoint {
  return { id, x, y }
}

describe('SpatialIndex', () => {
  let idx: SpatialIndex

  beforeEach(() => {
    idx = new SpatialIndex({ cellSize: 50 })
    idx.setWorldBounds(800, 600)
  })

  describe('add / remove / get', () => {
    it('adds and retrieves a point', () => {
      idx.add(makePoint('a', 25, 25))
      expect(idx.getPoint('a')).toEqual(makePoint('a', 25, 25))
      expect(idx.getPointCount()).toBe(1)
    })

    it('removes a point', () => {
      idx.add(makePoint('a', 25, 25))
      idx.remove('a')
      expect(idx.getPoint('a')).toBeUndefined()
      expect(idx.getPointCount()).toBe(0)
    })

    it('updates a point', () => {
      idx.add(makePoint('a', 25, 25))
      idx.update('a', 75, 75)
      expect(idx.getPoint('a')).toEqual(makePoint('a', 75, 75))
    })

    it('clears all points', () => {
      idx.add(makePoint('a', 25, 25))
      idx.add(makePoint('b', 75, 75))
      idx.clear()
      expect(idx.getPointCount()).toBe(0)
    })

    it('returns all points', () => {
      idx.add(makePoint('a', 25, 25))
      idx.add(makePoint('b', 75, 75))
      const points = idx.getAllPoints()
      expect(points).toHaveLength(2)
      expect(points.map((p) => p.id).sort()).toEqual(['a', 'b'])
    })
  })

  describe('queryRadius', () => {
    beforeEach(() => {
      idx.add(makePoint('a', 25, 25))
      idx.add(makePoint('b', 30, 30))
      idx.add(makePoint('c', 100, 100))
      idx.add(makePoint('d', 400, 300))
    })

    it('finds points within radius', () => {
      const result = idx.queryRadius(25, 25, 20)
      expect(result.points.map((p) => p.id).sort()).toEqual(['a', 'b'])
    })

    it('returns empty when no points in range', () => {
      const result = idx.queryRadius(500, 500, 5)
      expect(result.points).toHaveLength(0)
    })

    it('finds points at exact radius distance', () => {
      const result = idx.queryRadius(25, 25, Math.sqrt(50)) // ~7.07
      expect(result.points.map((p) => p.id).sort()).toEqual(['a', 'b'])
    })

    it('finds all points with large radius', () => {
      const result = idx.queryRadius(25, 25, 500)
      expect(result.points.map((p) => p.id).sort()).toEqual(['a', 'b', 'c', 'd'])
    })
  })

  describe('queryNeighbors', () => {
    it('finds adjacent points in 3x3 grid', () => {
      idx.add(makePoint('a', 25, 25))  // cell (0,0)
      idx.add(makePoint('b', 75, 25))  // cell (1,0)
      idx.add(makePoint('c', 25, 75))  // cell (0,1)
      idx.add(makePoint('d', 100, 100)) // cell (2,2)

      const result = idx.queryNeighbors('a')
      expect(result.points.map((p) => p.id).sort()).toEqual(['b', 'c'])
    })

    it('returns empty for isolated point', () => {
      idx.add(makePoint('a', 25, 25))
      const result = idx.queryNeighbors('a')
      expect(result.points).toHaveLength(0)
    })

    it('excludes self from neighbors', () => {
      idx.add(makePoint('a', 25, 25))
      idx.add(makePoint('b', 30, 30)) // same cell as a
      const result = idx.queryNeighbors('a')
      expect(result.points.map((p) => p.id)).not.toContain('a')
      expect(result.points.map((p) => p.id)).toContain('b')
    })
  })

  describe('queryRect', () => {
    beforeEach(() => {
      idx.add(makePoint('a', 25, 25))
      idx.add(makePoint('b', 75, 75))
      idx.add(makePoint('c', 125, 125))
      idx.add(makePoint('d', 400, 300))
    })

    it('finds points in rectangular region', () => {
      const result = idx.queryRect(0, 0, 100, 100)
      expect(result.points.map((p) => p.id).sort()).toEqual(['a', 'b'])
    })

    it('finds no points outside bounds', () => {
      const result = idx.queryRect(500, 500, 600, 600)
      expect(result.points).toHaveLength(0)
    })

    it('handles single-point region', () => {
      const result = idx.queryRect(20, 20, 30, 30)
      expect(result.points.map((p) => p.id)).toEqual(['a'])
    })
  })

  describe('getStats', () => {
    it('returns correct stats for empty index', () => {
      const stats = idx.getStats()
      expect(stats.totalCells).toBe(0)
      expect(stats.totalPoints).toBe(0)
      expect(stats.avgPerCell).toBe(0)
      expect(stats.maxPerCell).toBe(0)
    })

    it('returns correct stats with points', () => {
      idx.add(makePoint('a', 25, 25))
      idx.add(makePoint('b', 30, 30))
      idx.add(makePoint('c', 75, 75))
      const stats = idx.getStats()
      expect(stats.totalPoints).toBe(3)
      expect(stats.maxPerCell).toBeGreaterThanOrEqual(2)
    })
  })
})
