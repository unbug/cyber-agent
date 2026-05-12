/**
 * Grid-based spatial index for multi-agent proximity queries.
 *
 * Provides O(1) average-radius neighbor lookups by partitioning
 * the 2D plane into fixed-size cells. Supports both grid-based
 * (square cells) and radius-based (circular) queries.
 */

// ─── Types ───────────────────────────────────────────────────────

export interface SpatialPoint {
  id: string
  x: number
  y: number
}

export interface SpatialQueryResult {
  /** Points within the query region */
  points: SpatialPoint[]
  /** Number of cells inspected */
  cellsInspected: number
}

export interface SpatialIndexConfig {
  /** Cell size in pixels (grid mode) or query radius (radius mode) */
  cellSize: number
}

// ─── Grid SpatialIndex ───────────────────────────────────────────

/**
 * Fixed-grid spatial index.
 *
 * Divides the plane into square cells of `cellSize` pixels.
 * Each cell maintains a list of point IDs.
 *
 * Query radius is derived from `cellSize` when in `grid` mode:
 * a point in cell (cx, cy) can reach any point in cells
 * (cx±1, cy±1) — the 3×3 neighborhood.
 */
export class SpatialIndex {
  private cells = new Map<string, Set<string>>()
  private points = new Map<string, SpatialPoint>()
  private _cellSize: number
  private _width = 800
  private _height = 600

  constructor(config: SpatialIndexConfig) {
    this._cellSize = config.cellSize
  }

  get cellSize(): number {
    return this._cellSize
  }

  setWorldBounds(width: number, height: number): void {
    this._width = width
    this._height = height
  }

  get width(): number {
    return this._width
  }

  get height(): number {
    return this._height
  }

  // ── Lifecycle ─────────────────────────────────────────────

  clear(): void {
    this.cells.clear()
    this.points.clear()
  }

  // ── Point management ──────────────────────────────────────

  add(point: SpatialPoint): void {
    this.points.set(point.id, point)
    const key = this._cellKey(point.x, point.y)
    let cell = this.cells.get(key)
    if (!cell) {
      cell = new Set()
      this.cells.set(key, cell)
    }
    cell.add(point.id)
  }

  remove(id: string): void {
    const pt = this.points.get(id)
    if (!pt) return

    const key = this._cellKey(pt.x, pt.y)
    const cell = this.cells.get(key)
    if (cell) {
      cell.delete(id)
      if (cell.size === 0) {
        this.cells.delete(key)
      }
    }
    this.points.delete(id)
  }

  update(id: string, x: number, y: number): void {
    const old = this.points.get(id)
    if (old) {
      this.remove(id)
    }
    this.add({ id, x, y })
  }

  getPoint(id: string): SpatialPoint | undefined {
    return this.points.get(id)
  }

  getAllPoints(): SpatialPoint[] {
    return Array.from(this.points.values())
  }

  getPointCount(): number {
    return this.points.size
  }

  // ── Queries ───────────────────────────────────────────────

  /**
   * Find all points within a radius of the given position.
   */
  queryRadius(x: number, y: number, radius: number): SpatialQueryResult {
    const cells = this._affectedCells(x, y, radius)
    let cellsInspected = cells.size
    const result = new Set<string>()

    for (const cell of cells) {
      const members = this.cells.get(cell)
      if (members) {
        for (const id of members) {
          const pt = this.points.get(id)
          if (!pt) continue
          const dx = pt.x - x
          const dy = pt.y - y
          if (dx * dx + dy * dy <= radius * radius) {
            result.add(id)
          }
        }
      }
    }

    return {
      points: Array.from(result).map((id) => this.points.get(id)!).filter(Boolean),
      cellsInspected,
    }
  }

  /**
   * Find all points in the same or adjacent cells (3×3 neighborhood).
   * Useful for grid-based proximity without a specific query point.
   */
  queryNeighbors(id: string): SpatialQueryResult {
    const pt = this.points.get(id)
    if (!pt) return { points: [], cellsInspected: 0 }

    const cx = Math.floor(pt.x / this._cellSize)
    const cy = Math.floor(pt.y / this._cellSize)
    const result = new Set<string>()
    let cellsInspected = 0

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cx + dx},${cy + dy}`
        cellsInspected++
        const members = this.cells.get(key)
        if (members) {
          for (const memberId of members) {
            if (memberId !== id) {
              result.add(memberId)
            }
          }
        }
      }
    }

    return {
      points: Array.from(result).map((mid) => this.points.get(mid)!).filter(Boolean),
      cellsInspected,
    }
  }

  /**
   * Find all points in a rectangular region.
   */
  queryRect(xMin: number, yMin: number, xMax: number, yMax: number): SpatialQueryResult {
    const startX = Math.floor(xMin / this._cellSize)
    const endX = Math.floor(xMax / this._cellSize)
    const startY = Math.floor(yMin / this._cellSize)
    const endY = Math.floor(yMax / this._cellSize)
    const result = new Set<string>()
    let cellsInspected = 0

    for (let cx = startX; cx <= endX; cx++) {
      for (let cy = startY; cy <= endY; cy++) {
        const key = `${cx},${cy}`
        cellsInspected++
        const members = this.cells.get(key)
        if (members) {
          for (const id of members) {
            const pt = this.points.get(id)
            if (!pt) continue
            if (pt.x >= xMin && pt.x <= xMax && pt.y >= yMin && pt.y <= yMax) {
              result.add(id)
            }
          }
        }
      }
    }

    return {
      points: Array.from(result).map((id) => this.points.get(id)!).filter(Boolean),
      cellsInspected,
    }
  }

  // ── Stats ─────────────────────────────────────────────────

  getStats(): { totalCells: number; totalPoints: number; avgPerCell: number; maxPerCell: number } {
    const totalCells = this.cells.size
    const totalPoints = this.points.size
    let maxPerCell = 0
    let sumPerCell = 0
    for (const cell of this.cells.values()) {
      sumPerCell += cell.size
      if (cell.size > maxPerCell) maxPerCell = cell.size
    }
    return {
      totalCells,
      totalPoints,
      avgPerCell: totalCells > 0 ? sumPerCell / totalCells : 0,
      maxPerCell,
    }
  }

  // ── Internal ──────────────────────────────────────────────

  private _cellKey(x: number, y: number): string {
    const cx = Math.floor(x / this._cellSize)
    const cy = Math.floor(y / this._cellSize)
    return `${cx},${cy}`
  }

  private _affectedCells(x: number, y: number, radius: number): Set<string> {
    const result = new Set<string>()
    const minCx = Math.floor((x - radius) / this._cellSize)
    const maxCx = Math.floor((x + radius) / this._cellSize)
    const minCy = Math.floor((y - radius) / this._cellSize)
    const maxCy = Math.floor((y + radius) / this._cellSize)

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        result.add(`${cx},${cy}`)
      }
    }
    return result
  }
}
