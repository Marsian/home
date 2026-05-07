import type { EditorObstaclesV1 } from './editorFormats'

type Cell = { x: number; y: number }

/** Build `MapDef.rows` from editor obstacle export; stamps `S` / `P` on start / portal. */
export function buildMapRowsFromObstacles(obstacles: EditorObstaclesV1, start: Cell, portal: Cell): string[] {
  const { cols, rows } = obstacles
  const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => '.'))
  for (const cell of obstacles.blocked) {
    if (cell.row < 0 || cell.row >= rows || cell.col < 0 || cell.col >= cols) continue
    grid[cell.row][cell.col] = '#'
  }
  if (start.y >= 0 && start.y < rows && start.x >= 0 && start.x < cols) grid[start.y][start.x] = 'S'
  if (portal.y >= 0 && portal.y < rows && portal.x >= 0 && portal.x < cols) grid[portal.y][portal.x] = 'P'
  return grid.map((row) => row.join(''))
}
