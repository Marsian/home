import type { DungeonId, MapDef, MapHotspot, MapMonsterClusterDef } from '../../types'
import { buildMapRowsFromObstacles } from '../buildMapRowsFromObstacles'
import type { EditorObstaclesV1, EditorPlacementsV1 } from '../editorFormats'
import obstaclesJson from './obstacles16.v1.json'
import placementsJson from './placements.v1.json'
import mapMeta from './map.meta.json'

export const autumnWoodObstacles: EditorObstaclesV1 = obstaclesJson
export const autumnWoodPlacements: EditorPlacementsV1 = placementsJson

const meta = mapMeta as {
  id: string
  kind: MapDef['kind']
  dungeonId: DungeonId
  name: string
  start: { x: number; y: number }
  portal: { x: number; y: number }
  hotspots: MapHotspot[]
  monsterClusters: MapMonsterClusterDef[]
}

export const autumnWoodMap: MapDef = {
  id: meta.id,
  kind: meta.kind,
  dungeonId: meta.dungeonId,
  name: meta.name,
  rows: buildMapRowsFromObstacles(autumnWoodObstacles, meta.start, meta.portal),
  start: meta.start,
  portal: meta.portal,
  hotspots: meta.hotspots,
  monsterClusters: meta.monsterClusters,
}

export const autumnWoodMapPack = {
  dungeonId: meta.dungeonId,
  map: autumnWoodMap,
  placements: autumnWoodPlacements,
} as const
