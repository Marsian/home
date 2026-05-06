import type { MapDef, MapHotspot, VillageDecorPlacement, VillageLandmarkPlacement, VillageTerrainPatch } from '../../types'
import { starterVillageV8Meta } from './starterVillageV8Rows'

export const starterVillageLandmarks: VillageLandmarkPlacement[] = []
export const starterVillageTerrainPatches: VillageTerrainPatch[] = []
export const starterVillageDecorAnchors: VillageDecorPlacement[] = []

const scaleRadius = (value: number) => Math.max(10, Math.round(value * (16 / 60)))

const portalCell = starterVillageV8Meta.portalCell
const startCell = starterVillageV8Meta.startCell
const { cols, rows } = starterVillageV8Meta.grid

function buildEmptyRows() {
  const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => '.'))
  grid[startCell.y][startCell.x] = 'S'
  grid[portalCell.y][portalCell.x] = 'P'
  return grid.map((row) => row.join(''))
}

const hotspots: MapHotspot[] = [
  {
    id: 'village-portal',
    kind: 'portal',
    label: '传送门',
    prompt: '按 F：选择副本',
    cell: portalCell,
    radius: scaleRadius(88),
  },
  {
    id: 'village-shop',
    kind: 'shop',
    label: '旅店商铺',
    prompt: '按 F：购买补给',
    cell: { x: 39, y: 10 },
    radius: scaleRadius(82),
  },
  {
    id: 'village-blacksmith',
    kind: 'blacksmith',
    label: '铁匠铺',
    prompt: '按 F：查看强化',
    cell: { x: 18, y: 26 },
    radius: scaleRadius(82),
  },
  {
    id: 'village-gemsmith',
    kind: 'gemsmith',
    label: '宝石匠',
    prompt: '按 F：预留功能',
    cell: { x: 61, y: 24 },
    radius: scaleRadius(78),
  },
  {
    id: 'village-stash',
    kind: 'stash',
    label: '储藏箱',
    prompt: '按 F：打开仓库',
    cell: { x: 49, y: 34 },
    radius: scaleRadius(74),
  },
  {
    id: 'village-notice',
    kind: 'notice-board',
    label: '公告板',
    prompt: '按 F：查看告示',
    cell: { x: 32, y: 38 },
    radius: scaleRadius(76),
  },
]

export const starterVillageMap: MapDef = {
  id: 'starter-village',
  kind: 'village',
  name: '新手村',
  rows: buildEmptyRows(),
  start: startCell,
  portal: portalCell,
  hotspots,
}
