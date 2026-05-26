import * as THREE from 'three'

export const PLANET_RADIUS = 40.8
export const PLAYER_SURFACE_OFFSET = 0.04

const yAxis = new THREE.Vector3(0, 1, 0)
const zAxis = new THREE.Vector3(0, 0, 1)
const xAxis = new THREE.Vector3(1, 0, 0)

type TerrainRegionSpec = {
  assetId: string
  lat: number
  lon: number
  radiusDeg: number
  priority: number
}

const terrainRegionSpecs: TerrainRegionSpec[] = [
  { assetId: 'ST016_golden_grass_meadow', lat: -22, lon: 22, radiusDeg: 46, priority: 5 },
  { assetId: 'ST016_echo_crater_lake', lat: -8, lon: 44, radiusDeg: 25, priority: 9 },
  { assetId: 'ST016_lagoon_water_edge', lat: -13, lon: 64, radiusDeg: 32, priority: 7 },
  { assetId: 'ST016_sunlit_beach_crescent', lat: -24, lon: 78, radiusDeg: 34, priority: 8 },
  { assetId: 'ST016_tidepool_stepping_stones', lat: -30, lon: 92, radiusDeg: 19, priority: 10 },
  { assetId: 'ST016_mangrove_marsh_patch', lat: 5, lon: 99, radiusDeg: 38, priority: 7 },
  { assetId: 'ST016_coral_shelf_reef', lat: -32, lon: 108, radiusDeg: 24, priority: 10 },
  { assetId: 'ST016_moon_dune_patch', lat: 12, lon: 158, radiusDeg: 45, priority: 5 },
  { assetId: 'ST016_ember_cinder_field', lat: 6, lon: -148, radiusDeg: 45, priority: 6 },
  { assetId: 'ST016_crystal_spine_ridge', lat: 26, lon: -94, radiusDeg: 42, priority: 8 },
  { assetId: 'ST016_icy_switchback_slope', lat: 40, lon: 3, radiusDeg: 32, priority: 9 },
  { assetId: 'ST016_snow_cap_peak', lat: 57, lon: -21, radiusDeg: 48, priority: 10 },
  { assetId: 'ST016_mushroom_grove_floor', lat: 9, lon: -28, radiusDeg: 38, priority: 6 },
  { assetId: 'ST016_glider_launch_knoll', lat: -12, lon: 28, radiusDeg: 18, priority: 10 },
  { assetId: 'ST016_lagoon_water_edge', lat: -44, lon: -38, radiusDeg: 40, priority: 6 },
  { assetId: 'ST016_sunlit_beach_crescent', lat: -42, lon: -66, radiusDeg: 34, priority: 7 },
  { assetId: 'ST016_golden_grass_meadow', lat: -6, lon: -2, radiusDeg: 40, priority: 3 },
  { assetId: 'ST016_mushroom_grove_floor', lat: 16, lon: 42, radiusDeg: 36, priority: 5 },
  { assetId: 'ST016_moon_dune_patch', lat: -18, lon: -178, radiusDeg: 38, priority: 4 },
  { assetId: 'ST016_crystal_spine_ridge', lat: 34, lon: 84, radiusDeg: 34, priority: 7 },
  { assetId: 'ST016_snow_cap_peak', lat: 54, lon: 126, radiusDeg: 36, priority: 8 },
  { assetId: 'ST016_ember_cinder_field', lat: -16, lon: -118, radiusDeg: 36, priority: 6 },
  { assetId: 'ST016_starlit_path_segment', lat: 18, lon: 28, radiusDeg: 13, priority: 11 },
  { assetId: 'ST016_hidden_path_segment', lat: 14, lon: -58, radiusDeg: 13, priority: 11 },
  { assetId: 'ST016_basalt_triangle_wall', lat: 18, lon: -120, radiusDeg: 13, priority: 11 },
]

export function normalFromLatLon(lat: number, lon: number) {
  const phi = THREE.MathUtils.degToRad(90 - lat)
  const theta = THREE.MathUtils.degToRad(lon + 180)
  return new THREE.Vector3(
    -Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  ).normalize()
}

function angularDistance(latA: number, lonA: number, latB: number, lonB: number) {
  const aLat = THREE.MathUtils.degToRad(latA)
  const bLat = THREE.MathUtils.degToRad(latB)
  const delta = THREE.MathUtils.degToRad(lonB - lonA)
  const value = Math.sin(aLat) * Math.sin(bLat) + Math.cos(aLat) * Math.cos(bLat) * Math.cos(delta)
  return THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(value, -1, 1)))
}

function smoothBump(lat: number, lon: number, centerLat: number, centerLon: number, radius: number, strength: number) {
  const distance = angularDistance(lat, lon, centerLat, centerLon)
  if (distance >= radius) return 0
  const t = 1 - distance / radius
  return strength * t * t * (3 - 2 * t)
}

export function terrainRegionAssetIdAtNormal(normal: THREE.Vector3) {
  const { lat, lon } = latLonFromNormal(normal)
  let best: TerrainRegionSpec | null = null
  let bestScore = Number.POSITIVE_INFINITY
  for (const spec of terrainRegionSpecs) {
    const distance = angularDistance(lat, lon, spec.lat, spec.lon)
    if (distance > spec.radiusDeg) continue
    const score = distance / spec.radiusDeg - spec.priority * 0.035
    if (score < bestScore) {
      best = spec
      bestScore = score
    }
  }
  return best?.assetId ?? 'ST016_planet_terrain_shell'
}

export function latLonFromNormal(normal: THREE.Vector3) {
  const unit = normal.clone().normalize()
  const lat = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(unit.y, -1, 1)))
  let lon = THREE.MathUtils.radToDeg(Math.atan2(unit.z, -unit.x)) - 180
  if (lon < -180) lon += 360
  return { lat, lon }
}

export function terrainElevationAtLatLon(lat: number, lon: number) {
  let elevation = 0
  elevation += smoothBump(lat, lon, 56, -22, 34, 8.9)
  elevation += smoothBump(lat, lon, 35, -8, 28, 2.3)
  elevation += smoothBump(lat, lon, 24, -96, 28, 2.0)
  elevation += smoothBump(lat, lon, 18, -132, 22, 1.2)
  elevation += smoothBump(lat, lon, -12, 28, 30, 0.7)
  elevation -= smoothBump(lat, lon, -8, 44, 22, 2.1)
  elevation -= smoothBump(lat, lon, -28, 92, 26, 1.0)
  elevation -= smoothBump(lat, lon, 5, 96, 24, 0.8)
  elevation += 0.35 * Math.sin(THREE.MathUtils.degToRad(lon * 2.0 + lat * 1.2))
  elevation += 0.22 * Math.sin(THREE.MathUtils.degToRad(lon * 3.5 - lat * 2.4))
  return elevation
}

export function terrainRadiusAtLatLon(lat: number, lon: number) {
  return PLANET_RADIUS + terrainElevationAtLatLon(lat, lon)
}

export function terrainRadiusAtNormal(normal: THREE.Vector3) {
  const { lat, lon } = latLonFromNormal(normal)
  return terrainRadiusAtLatLon(lat, lon)
}

export function pointOnPlanet(lat: number, lon: number, radius = PLANET_RADIUS) {
  return normalFromLatLon(lat, lon).multiplyScalar(radius)
}

export function surfaceNormal(position: THREE.Vector3) {
  return position.clone().normalize()
}

export function projectToTangent(vector: THREE.Vector3, normal: THREE.Vector3, target = new THREE.Vector3()) {
  return target.copy(vector).addScaledVector(normal, -vector.dot(normal))
}

export function tangentBasis(normal: THREE.Vector3) {
  return buildSurfaceFrame(normal)
}

export function buildSurfaceFrame(normal: THREE.Vector3, forwardHint?: THREE.Vector3, fallbackForward?: THREE.Vector3) {
  const up = normal.clone().normalize()
  const seed = forwardHint ?? (Math.abs(up.dot(zAxis)) < 0.92 ? zAxis : xAxis)
  const forward = projectToTangent(seed, up)
  if (forward.lengthSq() < 0.000001 && fallbackForward) projectToTangent(fallbackForward, up, forward)
  if (forward.lengthSq() < 0.000001) projectToTangent(Math.abs(up.dot(zAxis)) < 0.92 ? zAxis : xAxis, up, forward)
  forward.normalize()
  const right = new THREE.Vector3().crossVectors(up, forward).normalize()
  // Recompute forward from the finished right/up pair so floating point drift never skews the basis.
  forward.crossVectors(right, up).normalize()
  return { forward, right, up }
}

export function moveAlongSphere(surfacePoint: THREE.Vector3, tangentDirection: THREE.Vector3, distance: number) {
  if (distance <= 0 || tangentDirection.lengthSq() < 0.000001) return surfacePoint.clone()
  const normal = surfacePoint
    .clone()
    .add(tangentDirection.clone().normalize().multiplyScalar(distance))
    .normalize()
  return normal.multiplyScalar(terrainRadiusAtNormal(normal))
}

export function placeOnPlanet(
  object: THREE.Object3D,
  lat: number,
  lon: number,
  radius = PLANET_RADIUS,
  localUp = yAxis,
) {
  const normal = normalFromLatLon(lat, lon)
  object.position.copy(normal).multiplyScalar(radius)
  object.quaternion.setFromUnitVectors(localUp, normal)
}

export function orientObjectToSurface(
  object: THREE.Object3D,
  normal: THREE.Vector3,
  forwardHint: THREE.Vector3,
  fallbackForward?: THREE.Vector3,
) {
  const { right, up, forward } = buildSurfaceFrame(normal, forwardHint, fallbackForward)
  const matrix = new THREE.Matrix4().makeBasis(right, up, forward)
  object.quaternion.setFromRotationMatrix(matrix)
}

export function rotateAroundAxis(vector: THREE.Vector3, axis: THREE.Vector3, radians: number) {
  return vector.clone().applyAxisAngle(axis, radians)
}
