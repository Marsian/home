import worldAssetCheck from '../assets/models/world/v0.1.5/world-v0.1.5.check.json'
import worldReferenceManifest from '../assets/models/world/v0.1.5/world-v0.1.5-reference-manifest.json'
import worldModelUrl from '../assets/models/world/v0.1.5/world-v0.1.5.glb?url'

export const STAR_TRIP_WORLD_ASSET_VERSION = 'world-v0.1.5'

export type StarTripAssetCategory = 'nature' | 'landmark' | 'terrain'

export type StarTripAssetDefinition = {
  id: string
  category: StarTripAssetCategory
  glbUrl: string
  defaultScale: number
  biomeTags: string[]
  canInstance: boolean
  collisionRadius: number
  reference: {
    referenceType: string
    sourceUrl: string
    referenceObject: string
    targetFidelity: string
    originalizationRule: string
  }
}

export type StarTripRegion = 'crash-grass-slope' | 'moon-bay' | 'starport-village' | 'summit-comm-tower' | 'beach-cove'

export type StarTripPlacement = {
  assetId: string
  lat: number
  lon: number
  scale: number
  yawDeg: number
  radiusOffset: number
  region: StarTripRegion
}

type AssetCheckEntry = {
  id: string
  category: StarTripAssetCategory
  bounds: { dimensions: [number, number, number] }
  reference?: StarTripAssetDefinition['reference']
}

type ManifestEntry = StarTripAssetDefinition['reference'] & { assetId: string }

const manifestReferences = new Map(
  (worldReferenceManifest.assets as ManifestEntry[]).map((entry) => [
    entry.assetId,
    {
      referenceType: entry.referenceType,
      sourceUrl: entry.sourceUrl,
      referenceObject: entry.referenceObject,
      targetFidelity: entry.targetFidelity,
      originalizationRule: entry.originalizationRule,
    },
  ]),
)

function tagsForAsset(id: string, category: StarTripAssetCategory) {
  const tags = new Set<string>([category, 'reference-backed'])
  if (id.includes('water') || id.includes('pool') || id.includes('pier')) tags.add('water')
  if (id.includes('sand') || id.includes('beach') || id.includes('campfire')) tags.add('beach')
  if (id.includes('tree') || id.includes('pine') || id.includes('grass')) tags.add('woodland')
  if (id.includes('rock') || id.includes('pebble') || id.includes('peak') || id.includes('slope')) tags.add('rocky')
  if (id.includes('rocket') || id.includes('scorch')) tags.add('crash-site')
  if (id.includes('tower') || id.includes('dish') || id.includes('lighthouse')) tags.add('signal')
  if (id.includes('shed') || id.includes('cabin')) tags.add('settlement')
  return [...tags]
}

const assetChecks = worldAssetCheck.assets as unknown as AssetCheckEntry[]

export const starTripAssetDefinitions: StarTripAssetDefinition[] = assetChecks.map((asset) => {
  const [width, height, depth] = asset.bounds.dimensions
  const reference = asset.reference ?? manifestReferences.get(asset.id)
  if (!reference) throw new Error(`Missing Star Trip v0.1.5 reference metadata for ${asset.id}`)
  return {
    id: asset.id,
    category: asset.category,
    glbUrl: worldModelUrl,
    defaultScale: 1,
    biomeTags: tagsForAsset(asset.id, asset.category),
    canInstance: asset.category === 'nature' || asset.category === 'terrain',
    collisionRadius: Number(Math.max(width, depth, height * 0.35).toFixed(3)),
    reference,
  }
})

export const starTripAssetDefinitionById = new Map(starTripAssetDefinitions.map((definition) => [definition.id, definition]))

function place(region: StarTripRegion, assetId: string, lat: number, lon: number, scale = 1, yawDeg = 0, radiusOffset = 0.035): StarTripPlacement {
  return { assetId, lat, lon, scale, yawDeg, radiusOffset, region }
}

export const starTripPlacements: StarTripPlacement[] = [
  place('crash-grass-slope', 'ST015_scorch_mark_base', -22.7, 27.5, 2.15, 18, 0.018),
  place('crash-grass-slope', 'ST015_rocket_main_hull', -22.6, 27.8, 1.65, -28, -0.08),
  place('crash-grass-slope', 'ST015_rocket_side_fin_debris', -21.3, 25.3, 1.3, 54, 0.02),
  place('crash-grass-slope', 'ST015_warm_dirt_path', -18.2, 22.2, 2.6, 24, 0.014),
  place('crash-grass-slope', 'ST015_short_grass_a', -20.1, 24.3, 1.25, -8),
  place('crash-grass-slope', 'ST015_pebble_cluster', -18.2, 28.2, 1.1, 22),
  place('crash-grass-slope', 'ST015_star_pine', -12.2, 13.4, 1.3, -18),
  place('crash-grass-slope', 'ST015_round_canopy_tree', -10, 17, 1.18, 32),
  place('crash-grass-slope', 'ST015_low_rock', -14.7, 30.5, 1.2, -17),

  place('moon-bay', 'ST015_pale_water_edge', -9.2, 45.8, 3.8, -8, 0.018),
  place('moon-bay', 'ST015_moon_bay_pool', -9.2, 45.8, 3.25, -8, 0.026),
  place('moon-bay', 'ST015_tiny_pier', -8.2, 49.7, 1.45, 74, 0.026),
  place('moon-bay', 'ST015_fishing_kid_shore_shed', -6.6, 48.4, 1.45, 12, 0.03),
  place('moon-bay', 'ST015_short_grass_a', -12, 43.5, 1.1, 16),
  place('moon-bay', 'ST015_pebble_cluster', -12.4, 47.5, 1.05, -14),
  place('moon-bay', 'ST015_round_canopy_tree', -13.8, 50, 1.2, 21),

  place('starport-village', 'ST015_tower_keeper_cabin', -1.6, 62, 1.6, -18, 0.03),
  place('starport-village', 'ST015_utility_storage_shed', -6.1, 64.1, 1.35, 42, 0.03),
  place('starport-village', 'ST015_wooden_way_sign', -7.2, 57.1, 1.25, 40, 0.03),
  place('starport-village', 'ST015_rope_bridge', -2.0, 55.5, 1.75, 76, 0.03),
  place('starport-village', 'ST015_warm_dirt_path', -4.1, 60.8, 2.2, 18, 0.014),
  place('starport-village', 'ST015_short_grass_a', -6.4, 66.8, 1.15, -8),
  place('starport-village', 'ST015_round_canopy_tree', -0.4, 65.2, 1.1, 33),

  place('summit-comm-tower', 'ST015_summit_round_peak', -3, 58, 4.6, 0, 0.018),
  place('summit-comm-tower', 'ST015_summit_comm_tower', -3, 58, 3.4, 28, 1.16),
  place('summit-comm-tower', 'ST015_signal_dish', -0.7, 56.6, 1.7, 12, 0.04),
  place('summit-comm-tower', 'ST015_climbable_slope', -2.3, 53.3, 2.3, 24, 0.018),
  place('summit-comm-tower', 'ST015_low_rock', -5.4, 60.8, 1.35, -21, 0.02),
  place('summit-comm-tower', 'ST015_wooden_way_sign', -4.7, 54.5, 1.15, 12, 0.03),

  place('beach-cove', 'ST015_beach_arc', -26, 58.2, 3.4, 16, 0.014),
  place('beach-cove', 'ST015_campfire_ring', -27.2, 56.4, 1.25, 0, 0.025),
  place('beach-cove', 'ST015_beacon_lighthouse', -24.4, 62.8, 1.35, -12, 0.035),
  place('beach-cove', 'ST015_tiny_pier', -28.2, 58.9, 1.25, 64, 0.026),
  place('beach-cove', 'ST015_pebble_cluster', -30.5, 56.1, 1.25, 28, 0.024),
  place('beach-cove', 'ST015_short_grass_a', -24.5, 55.8, 1.0, 16),
]

export const STAR_TRIP_CRITICAL_LANDMARK_IDS = [
  'ST015_rocket_main_hull',
  'ST015_tower_keeper_cabin',
  'ST015_rope_bridge',
  'ST015_moon_bay_pool',
  'ST015_beacon_lighthouse',
  'ST015_summit_comm_tower',
]
