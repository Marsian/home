import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const TILE = 16
const VIEWPORT = { width: 960, height: 540 }

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function fail(message) {
  throw new Error(message)
}

function key(cell) {
  return `${cell.x},${cell.y}`
}

function validateMap(slug) {
  const dir = path.join(ROOT, 'src/game-center/pixel-knight/maps', slug)
  const meta = readJson(path.join(dir, 'map.meta.json'))
  const obstacles = readJson(path.join(dir, 'obstacles16.v1.json'))

  if (meta.kind !== 'dungeon') fail(`${slug}: kind must be dungeon`)
  if (obstacles.tile !== TILE) fail(`${slug}: tile must be ${TILE}`)
  if (!fs.existsSync(path.join(dir, 'backdrop.png'))) fail(`${slug}: missing backdrop.png`)
  if (!Array.isArray(meta.monsterClusters) || meta.monsterClusters.length === 0) fail(`${slug}: missing monsterClusters`)

  const cells = new Set(obstacles.blocked.map((cell) => key({ x: cell.col, y: cell.row })))
  const rows = Array.from({ length: obstacles.rows }, (_, y) =>
    Array.from({ length: obstacles.cols }, (_, x) => (cells.has(key({ x, y })) ? '#' : '.')),
  )
  rows[meta.start.y][meta.start.x] = 'S'
  rows[meta.portal.y][meta.portal.x] = 'P'

  for (let x = 0; x < obstacles.cols; x += 1) {
    if (rows[0][x] !== '#' || rows[obstacles.rows - 1][x] !== '#') fail(`${slug}: top/bottom border must be closed`)
  }
  for (let y = 0; y < obstacles.rows; y += 1) {
    if (rows[y][0] !== '#' || rows[y][obstacles.cols - 1] !== '#') fail(`${slug}: left/right border must be closed`)
  }

  const screenArea = (obstacles.image.width * obstacles.image.height) / (VIEWPORT.width * VIEWPORT.height)
  if (screenArea < 4 || screenArea > 6) fail(`${slug}: expected 4-6 screens, got ${screenArea.toFixed(2)}`)

  const queue = [meta.start]
  const seen = new Set([key(meta.start)])
  while (queue.length) {
    const current = queue.shift()
    for (const next of [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ]) {
      if (next.x < 0 || next.y < 0 || next.x >= obstacles.cols || next.y >= obstacles.rows) continue
      if (rows[next.y][next.x] === '#') continue
      const nextKey = key(next)
      if (seen.has(nextKey)) continue
      seen.add(nextKey)
      queue.push(next)
    }
  }

  if (!seen.has(key(meta.portal))) fail(`${slug}: portal is not reachable from start`)
  if (seen.size < 1800) fail(`${slug}: playable area too small for combat, got ${seen.size} cells`)

  console.log(`${slug}: ok (${screenArea.toFixed(2)} screens, ${seen.size} reachable cells)`)
}

const slugs = process.argv.slice(2)
if (!slugs.length) slugs.push('autumn-wood')
for (const slug of slugs) validateMap(slug)
