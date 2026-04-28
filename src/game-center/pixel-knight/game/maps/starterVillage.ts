import type {
  MapDef,
  MapHotspot,
  VillageDecorPlacement,
  VillageLandmarkPlacement,
  VillageTerrainPatch,
} from '../../types'

/** 裁掉外围纯草地列后宽度：24×60px = 1440px（与 3×格草地瓦片对齐） */
const VILLAGE_COLS = 24
const VILLAGE_ROWS = 20

function makeVillageGrid() {
  return Array.from({ length: VILLAGE_ROWS }, () => Array.from({ length: VILLAGE_COLS }, () => 'g'))
}

function paintRect(grid: string[][], x: number, y: number, w: number, h: number, fill: string) {
  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) {
      if (row >= 0 && row < VILLAGE_ROWS && col >= 0 && col < VILLAGE_COLS) grid[row][col] = fill
    }
  }
}

function paintPath(grid: string[][], points: Array<[number, number]>, width = 3) {
  const half = Math.floor(width / 2)
  for (let index = 1; index < points.length; index += 1) {
    const [fromX, fromY] = points[index - 1]
    const [toX, toY] = points[index]
    if (fromX === toX) {
      for (let row = Math.min(fromY, toY); row <= Math.max(fromY, toY); row += 1) {
        paintRect(grid, fromX - half, row - half, width, width, 'r')
      }
    } else if (fromY === toY) {
      for (let col = Math.min(fromX, toX); col <= Math.max(fromX, toX); col += 1) {
        paintRect(grid, col - half, fromY - half, width, width, 'r')
      }
    }
  }
}

function paintFootprint(grid: string[][], landmark: VillageLandmarkPlacement) {
  if (!landmark.footprint) return
  const { offsetX, offsetY, width, height } = landmark.footprint
  paintRect(grid, landmark.cell.x + offsetX, landmark.cell.y + offsetY, width, height, '#')
}

export const starterVillageLandmarks: VillageLandmarkPlacement[] = [
  {
    kind: 'shop',
    cell: { x: 4, y: 12 },
    layer: 'back',
    drawScale: 1.95,
    footprint: { offsetX: -2, offsetY: 0, width: 5, height: 2 },
  },
  {
    kind: 'notice-board',
    cell: { x: 5, y: 6 },
    layer: 'back',
    drawScale: 1.7,
    footprint: { offsetX: -1, offsetY: 0, width: 4, height: 2 },
  },
  {
    kind: 'portal',
    cell: { x: 12, y: 3 },
    layer: 'back',
    drawScale: 1.85,
    footprint: { offsetX: -2, offsetY: 0, width: 4, height: 2 },
  },
  {
    kind: 'blacksmith',
    cell: { x: 19, y: 7 },
    layer: 'back',
    drawScale: 2.05,
    footprint: { offsetX: -2, offsetY: 0, width: 6, height: 2 },
  },
  {
    kind: 'gemsmith',
    cell: { x: 20, y: 12 },
    layer: 'back',
    drawScale: 1.85,
    footprint: { offsetX: -1, offsetY: 0, width: 4, height: 2 },
  },
  {
    kind: 'stash',
    cell: { x: 8, y: 16 },
    layer: 'back',
    drawScale: 1.2,
    footprint: { offsetX: -1, offsetY: 0, width: 3, height: 2 },
  },
]

export const starterVillageTerrainPatches: VillageTerrainPatch[] = [
  { id: 'grass-0-0', assetId: 'terrain-grass-field', x: 0, y: 0, width: 480, height: 480 },
  { id: 'grass-1-0', assetId: 'terrain-grass-field', x: 480, y: 0, width: 480, height: 480 },
  { id: 'grass-2-0', assetId: 'terrain-grass-field', x: 960, y: 0, width: 480, height: 480 },
  { id: 'grass-0-1', assetId: 'terrain-grass-field', x: 0, y: 480, width: 480, height: 480 },
  { id: 'grass-1-1', assetId: 'terrain-grass-field', x: 480, y: 480, width: 480, height: 480 },
  { id: 'grass-2-1', assetId: 'terrain-grass-field', x: 960, y: 480, width: 480, height: 480 },
  { id: 'grass-0-2', assetId: 'terrain-grass-field', x: 0, y: 960, width: 480, height: 480 },
  { id: 'grass-1-2', assetId: 'terrain-grass-field', x: 480, y: 960, width: 480, height: 480 },
  { id: 'grass-2-2', assetId: 'terrain-grass-field', x: 960, y: 960, width: 480, height: 480 },
  { id: 'road-main', assetId: 'terrain-brick-road-vertical', x: 600, y: 0, width: 240, height: 1440 },
  { id: 'road-branch-left', assetId: 'terrain-brick-road-horizontal', x: 180, y: 360, width: 720, height: 240 },
  { id: 'road-branch-right', assetId: 'terrain-brick-road-horizontal', x: 600, y: 360, width: 720, height: 240 },
  { id: 'road-lower-left', assetId: 'terrain-brick-road-horizontal', x: 180, y: 780, width: 720, height: 240 },
  { id: 'road-lower-right', assetId: 'terrain-brick-road-horizontal', x: 600, y: 780, width: 720, height: 240 },
]

function buildStarterVillageRows() {
  const grid = makeVillageGrid()
  paintPath(grid, [
    [12, 17],
    [12, 13],
    [12, 8],
    [12, 3],
  ])
  paintPath(grid, [
    [12, 8],
    [6, 8],
    [5, 12],
  ])
  paintPath(grid, [
    [12, 8],
    [18, 8],
    [20, 12],
  ])
  paintPath(
    grid,
    [
      [12, 10],
      [7, 16],
    ],
    2,
  )
  paintPath(
    grid,
    [
      [12, 10],
      [18, 15],
    ],
    2,
  )

  for (const landmark of starterVillageLandmarks) {
    paintFootprint(grid, landmark)
  }
  grid[17][12] = 'S'
  grid[3][12] = 'P'
  return grid.map((row) => row.join(''))
}

export const starterVillageDecorAnchors: VillageDecorPlacement[] = []

const hotspots: MapHotspot[] = [
  { id: 'village-portal', kind: 'portal', label: '传送门', prompt: '按 F：选择副本', cell: { x: 12, y: 3 }, radius: 88 },
  { id: 'village-shop', kind: 'shop', label: '旅店商铺', prompt: '按 F：购买补给', cell: { x: 4, y: 12 }, radius: 82 },
  { id: 'village-stash', kind: 'stash', label: '储藏箱', prompt: '按 F：打开仓库', cell: { x: 8, y: 16 }, radius: 74 },
  { id: 'village-blacksmith', kind: 'blacksmith', label: '铁匠铺', prompt: '按 F：查看强化', cell: { x: 19, y: 7 }, radius: 82 },
  { id: 'village-notice', kind: 'notice-board', label: '公告板', prompt: '按 F：查看告示', cell: { x: 5, y: 6 }, radius: 76 },
  { id: 'village-gemsmith', kind: 'gemsmith', label: '宝石匠', prompt: '按 F：预留功能', cell: { x: 20, y: 12 }, radius: 78 },
]

export const starterVillageMap: MapDef = {
  id: 'starter-village',
  kind: 'village',
  name: '晨铃新手村',
  rows: buildStarterVillageRows(),
  start: { x: 12, y: 17 },
  portal: { x: 12, y: 3 },
  hotspots,
}
