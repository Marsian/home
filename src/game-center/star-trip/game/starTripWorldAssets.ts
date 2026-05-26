import worldAssetCheck from '../assets/models/world/v0.1.6/world-v0.1.6.check.json'
import worldReferenceManifest from '../assets/models/world/v0.1.6/world-v0.1.6-reference-manifest.json'
import worldModelUrl from '../assets/models/world/v0.1.6/world-v0.1.6.glb?url'
import legacyWorldAssetCheck from '../assets/models/world/v0.1.5/world-v0.1.5.check.json'
import legacyWorldModelUrl from '../assets/models/world/v0.1.5/world-v0.1.5.glb?url'

export const STAR_TRIP_WORLD_ASSET_VERSION = 'world-v0.1.6'
export const STAR_TRIP_WORLD_ASSET_PREFIX = 'ST016_'
export const STAR_TRIP_TERRAIN_SHELL_ID = 'ST016_planet_terrain_shell'

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

export type StarTripRegion =
  | 'spawn-meadow'
  | 'crater-lake'
  | 'beach-reef'
  | 'marsh-cave'
  | 'moon-dunes'
  | 'crystal-ridge'
  | 'ember-field'
  | 'snow-summit'
  | 'main-route'
  | 'coastal-route'
  | 'ridge-route'

export type StarTripPlacement = {
  assetId: string
  lat: number
  lon: number
  scale: number
  yawDeg: number
  radiusOffset: number
  region: StarTripRegion
}

export type StarTripTerrainCoverage = {
  assetId: string
  vertex_count: number
  face_count: number
  mesh_type: string
  subdivisions: number
  surface_coverage_percent: number
  radius_min: number
  radius_max: number
  height_range: number
  biome_face_counts: Record<string, number>
  biome_count: number
  material_slots: string[]
  patch_surface_coverage_percent?: number
  terrain_patch_mesh_rule?: string
  large_patch_count?: number
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
  const tags = new Set<string>([category, 'reference-backed', 'v0.1.6-map'])
  if (id.includes('water') || id.includes('lake') || id.includes('tidepool')) tags.add('water')
  if (id.includes('beach') || id.includes('sand') || id.includes('dune') || id.includes('reef')) tags.add('shore')
  if (id.includes('snow') || id.includes('icy')) tags.add('cold')
  if (id.includes('crystal')) tags.add('crystal-ridge')
  if (id.includes('ember') || id.includes('cinder') || id.includes('volcano') || id.includes('basalt')) tags.add('hot')
  if (id.includes('marsh') || id.includes('reed')) tags.add('wetland')
  if (id.includes('meadow') || id.includes('canopy') || id.includes('mushroom') || id.includes('pine')) tags.add('woodland')
  if (id.includes('path') || id.includes('switchback') || id.includes('bridge') || id.includes('cave')) tags.add('route')
  if (id.includes('comm') || id.includes('beacon') || id.includes('observatory') || id.includes('waymarker')) tags.add('signal')
  return [...tags]
}

const assetChecks = worldAssetCheck.assets as unknown as AssetCheckEntry[]
const legacyRocketAssetIds = new Set(['ST015_rocket_main_hull', 'ST015_rocket_side_fin_debris', 'ST015_scorch_mark_base'])
const legacyRocketAssetChecks = (legacyWorldAssetCheck.assets as unknown as AssetCheckEntry[]).filter((asset) =>
  legacyRocketAssetIds.has(asset.id),
)
const terrainPatchCoverage = worldAssetCheck.terrain_patch_coverage as Partial<StarTripTerrainCoverage> | undefined
export const STAR_TRIP_TERRAIN_COVERAGE = {
  ...(worldAssetCheck.terrain_coverage as StarTripTerrainCoverage),
  ...(terrainPatchCoverage ?? {}),
} as StarTripTerrainCoverage

function assetDefinitionFromCheck(asset: AssetCheckEntry, glbUrl: string) {
  const [width, height, depth] = asset.bounds.dimensions
  const reference = asset.reference ?? manifestReferences.get(asset.id)
  if (!reference) throw new Error(`Missing Star Trip v0.1.6 reference metadata for ${asset.id}`)
  return {
    id: asset.id,
    category: asset.category,
    glbUrl,
    defaultScale: 1,
    biomeTags: tagsForAsset(asset.id, asset.category),
    canInstance: asset.id !== STAR_TRIP_TERRAIN_SHELL_ID && (asset.category === 'nature' || asset.category === 'terrain'),
    collisionRadius: Number((Math.max(width, depth, height * 0.35) * 0.5).toFixed(3)),
    reference,
  }
}

export const starTripAssetDefinitions: StarTripAssetDefinition[] = [
  ...assetChecks.map((asset) => assetDefinitionFromCheck(asset, worldModelUrl)),
  ...legacyRocketAssetChecks.map((asset) => assetDefinitionFromCheck(asset, legacyWorldModelUrl)),
]

export const starTripAssetDefinitionById = new Map(starTripAssetDefinitions.map((definition) => [definition.id, definition]))

function place(region: StarTripRegion, assetId: string, lat: number, lon: number, scale = 1, yawDeg = 0, radiusOffset = 0.035): StarTripPlacement {
  return { assetId, lat, lon, scale, yawDeg, radiusOffset, region }
}

export const starTripPlacements: StarTripPlacement[] = [
  place('spawn-meadow', 'ST016_golden_grass_meadow', -22, 22, 4.8, 18, 0.014),
  place('spawn-meadow', 'ST015_scorch_mark_base', -23.6, 24.2, 2.35, -20, 0.014),
  place('spawn-meadow', 'ST015_rocket_main_hull', -23.4, 24.8, 2.25, -22, 0.05),
  place('spawn-meadow', 'ST015_rocket_side_fin_debris', -20.4, 30.4, 1.45, 18, 0.035),
  place('spawn-meadow', 'ST016_round_canopy_cluster', -18.8, 18.4, 2.15, 26),
  place('spawn-meadow', 'ST016_warm_camp_lantern', -18.2, 30.8, 1.6, -18, 0.028),
  place('spawn-meadow', 'ST016_starlit_path_segment', -18.2, 30.2, 2.45, 28, 0.014),
  place('spawn-meadow', 'ST016_glider_launch_knoll', -11.8, 28.2, 2.3, 8, 0.018),
  place('spawn-meadow', 'ST016_golden_grass_meadow', -8, -8, 4.2, -12, 0.014),

  place('crater-lake', 'ST016_echo_crater_lake', -8.2, 44.5, 4.6, -8, 0.024),
  place('crater-lake', 'ST016_lagoon_water_edge', -8.4, 44.3, 4.95, -8, 0.014),
  place('crater-lake', 'ST016_rope_bridge_span', -2.8, 53.4, 2.15, 82, 0.04),
  place('crater-lake', 'ST016_round_canopy_cluster', -12.8, 41.2, 1.75, -28),
  place('crater-lake', 'ST016_marsh_reed_cluster', -4.5, 48.8, 1.55, 12),
  place('crater-lake', 'ST016_starlit_path_segment', -5.2, 52.4, 2.1, 55, 0.014),
  place('crater-lake', 'ST016_mushroom_grove_floor', 12, 32, 3.6, 22, 0.016),

  place('beach-reef', 'ST016_sunlit_beach_crescent', -23.6, 72.5, 4.25, 14, 0.014),
  place('beach-reef', 'ST016_tidepool_stepping_stones', -27.8, 83.5, 2.6, -18, 0.02),
  place('beach-reef', 'ST016_coral_shelf_reef', -30.5, 97.4, 3.1, -20, 0.018),
  place('beach-reef', 'ST016_beach_signal_buoy', -24.2, 78.2, 1.55, 24, 0.04),
  place('beach-reef', 'ST016_beach_grass_tufts', -20.2, 67.2, 1.55, 12),
  place('beach-reef', 'ST016_hidden_path_segment', -18.5, 86.2, 1.95, 74, 0.014),

  place('marsh-cave', 'ST016_mangrove_marsh_patch', 4.5, 96.5, 3.9, 20, 0.015),
  place('marsh-cave', 'ST016_marsh_reed_cluster', 2.2, 90.4, 1.8, -8),
  place('marsh-cave', 'ST016_cave_mouth_arch', 6.2, 78.8, 1.65, 42, 0.045),
  place('marsh-cave', 'ST016_alien_mushroom_cluster', 9.5, 72.2, 1.65, -12),
  place('marsh-cave', 'ST016_hidden_path_segment', 9.8, 66.8, 2.05, 38, 0.014),

  place('moon-dunes', 'ST016_moon_dune_patch', 14.2, 151.5, 4.4, -10, 0.014),
  place('moon-dunes', 'ST016_moon_dune_patch', -20, -176, 3.8, 34, 0.014),
  place('moon-dunes', 'ST016_snow_rock_cluster', 16.5, 142.6, 1.4, 18),
  place('moon-dunes', 'ST016_hidden_path_segment', 12.2, 132.4, 1.85, -34, 0.014),

  place('crystal-ridge', 'ST016_crystal_spine_ridge', 24.5, -96.2, 3.55, -28, 0.018),
  place('crystal-ridge', 'ST016_crystal_spine_ridge', 34, 82, 3.35, 36, 0.018),
  place('crystal-ridge', 'ST016_blue_crystal_cluster', 20.4, -88.2, 2.25, 18),
  place('crystal-ridge', 'ST016_crystal_observatory', 28.2, -76.5, 1.75, 18, 0.04),
  place('crystal-ridge', 'ST016_basalt_triangle_wall', 18.2, -118.2, 2.8, -18, 0.022),
  place('crystal-ridge', 'ST016_hidden_path_segment', 26.5, -60.6, 1.95, -42, 0.014),

  place('ember-field', 'ST016_ember_cinder_field', 10.2, -151.4, 4.15, 12, 0.014),
  place('ember-field', 'ST016_ember_cinder_field', -14, -118, 3.45, -18, 0.014),
  place('ember-field', 'ST016_volcano_heat_vent', 12.4, -149.2, 1.7, 8, 0.04),
  place('ember-field', 'ST016_cinder_rock_cluster', 7.2, -138.3, 1.9, -24),
  place('ember-field', 'ST016_basalt_triangle_wall', 16.8, -128.8, 2.15, 21, 0.02),
  place('ember-field', 'ST016_hidden_path_segment', 18.5, -114.2, 1.8, 42, 0.014),

  place('snow-summit', 'ST016_snow_cap_peak', 55.2, -21.8, 5.4, 0, 0.02),
  place('snow-summit', 'ST016_snow_cap_peak', 52, 126, 4.0, -28, 0.018),
  place('snow-summit', 'ST016_icy_switchback_slope', 41.2, 3.8, 3.6, 30, 0.016),
  place('snow-summit', 'ST016_summit_comm_array', 56.5, -20.5, 3.5, 25, 1.06),
  place('snow-summit', 'ST016_snow_waymarker', 38.4, 9.5, 1.45, -18, 0.04),
  place('snow-summit', 'ST016_star_pine_cluster', 43.6, -4.8, 1.9, 12),
  place('snow-summit', 'ST016_snow_rock_cluster', 48.6, -34.2, 1.75, -28),
  place('snow-summit', 'ST016_starlit_path_segment', 44.4, -0.4, 2.0, -25, 0.014),

  place('main-route', 'ST016_starlit_path_segment', -14.6, 35.2, 1.85, 24, 0.014),
  place('main-route', 'ST016_starlit_path_segment', 4.8, 58.4, 1.9, 38, 0.014),
  place('main-route', 'ST016_starlit_path_segment', 18.8, 42.2, 1.8, -28, 0.014),
  place('main-route', 'ST016_starlit_path_segment', 31.8, 18.4, 1.75, -24, 0.014),

  place('coastal-route', 'ST016_hidden_path_segment', -14.2, 89.5, 1.6, 52, 0.014),
  place('coastal-route', 'ST016_hidden_path_segment', -2.6, 76.2, 1.7, -18, 0.014),
  place('coastal-route', 'ST016_hidden_path_segment', 18.2, 50.4, 1.7, -32, 0.014),
  place('coastal-route', 'ST016_alien_mushroom_cluster', 16.5, 57.2, 1.3, 15),

  place('ridge-route', 'ST016_hidden_path_segment', 4.4, -42.2, 1.65, -18, 0.014),
  place('ridge-route', 'ST016_hidden_path_segment', 14.6, -68.6, 1.7, -22, 0.014),
  place('ridge-route', 'ST016_hidden_path_segment', 31.4, -48.2, 1.65, 38, 0.014),
  place('ridge-route', 'ST016_blue_crystal_cluster', 33.6, -44.6, 1.45, 25),
]

export const STAR_TRIP_CRITICAL_LANDMARK_IDS = [
  'ST015_rocket_main_hull',
  'ST016_echo_crater_lake',
  'ST016_sunlit_beach_crescent',
  'ST016_mangrove_marsh_patch',
  'ST016_crystal_spine_ridge',
  'ST016_ember_cinder_field',
  'ST016_snow_cap_peak',
  'ST016_summit_comm_array',
]
