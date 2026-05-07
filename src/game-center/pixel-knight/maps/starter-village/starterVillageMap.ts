import type { MapDef, MapHotspot, VillageDecorPlacement, VillageLandmarkPlacement, VillageTerrainPatch } from '../../types'
import { buildMapRowsFromObstacles } from '../buildMapRowsFromObstacles'
import type { EditorObstaclesV1, EditorPlacementsV1 } from '../editorFormats'
import obstaclesJson from './obstacles16.v1.json'
import placementsJson from './placements.v1.json'
import mapMeta from './map.meta.json'

export const starterVillageObstacles: EditorObstaclesV1 = obstaclesJson
export const starterVillagePlacements: EditorPlacementsV1 = placementsJson

export const starterVillageLandmarks: VillageLandmarkPlacement[] = []
export const starterVillageTerrainPatches: VillageTerrainPatch[] = []
export const starterVillageDecorAnchors: VillageDecorPlacement[] = []

const meta = mapMeta as {
  id: string
  kind: MapDef['kind']
  name: string
  start: { x: number; y: number }
  portal: { x: number; y: number }
  hotspots: MapHotspot[]
}

export const starterVillageMap: MapDef = {
  id: meta.id,
  kind: meta.kind,
  name: meta.name,
  rows: buildMapRowsFromObstacles(starterVillageObstacles, meta.start, meta.portal),
  start: meta.start,
  portal: meta.portal,
  hotspots: meta.hotspots,
}
