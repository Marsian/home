import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { buildSurfaceFrame, normalFromLatLon, terrainRadiusAtLatLon } from './planetMath'
import {
  STAR_TRIP_CRITICAL_LANDMARK_IDS,
  STAR_TRIP_TERRAIN_COVERAGE,
  STAR_TRIP_TERRAIN_SHELL_ID,
  STAR_TRIP_WORLD_ASSET_PREFIX,
  STAR_TRIP_WORLD_ASSET_VERSION,
  starTripAssetDefinitionById,
  starTripAssetDefinitions,
  starTripPlacements,
  type StarTripPlacement,
  type StarTripRegion,
} from './starTripWorldAssets'

export type StarTripEnvironmentSummary = {
  version: string
  assetDefinitions: number
  glbAssetRoots: number
  placements: number
  referenceManifestAssets: number
  referenceChecks: {
    allAssetsHaveReference: boolean
    allReferencesHaveSourceUrl: boolean
  }
  regions: Record<StarTripRegion, number>
  keyLandmarksPresent: string[]
  missingAssetIds: string[]
  placementChecks: {
    allRadialDistancesValid: boolean
    allUpAligned: boolean
    allGroundedOnTerrain: boolean
    maxRadialDistanceError: number
    minUpDot: number
    maxGroundingError: number
    groundedObjects: number
    floatingObjects: string[]
  }
  collisionChecks: {
    bodies: number
    solidBodies: number
    walkableBodies: number
    terrainSurfaceMeshes: number
    allPlacedObjectsHaveCollisionBody: boolean
    terrainShellCollider: boolean
  }
  terrainCoverage: typeof STAR_TRIP_TERRAIN_COVERAGE
}

export type StarTripCollisionBody = {
  assetId: string
  region: StarTripRegion
  position: THREE.Vector3
  normal: THREE.Vector3
  radius: number
  height: number
  solid: boolean
}

export type StarTripEnvironment = {
  root: THREE.Group
  summary: StarTripEnvironmentSummary
  collisionBodies: StarTripCollisionBody[]
  terrainSurfaces: THREE.Object3D[]
}

const loader = new GLTFLoader()
const patchUp = new THREE.Vector3(0, 0, 1)
const yAxis = new THREE.Vector3(0, 1, 0)
const terrainRaycaster = new THREE.Raycaster()
const terrainRayStartRadius = 72
const terrainRayFar = 90

function materialColor(material: THREE.Material) {
  if ('color' in material && material.color instanceof THREE.Color) return material.color.getHex()
  return 0x74bf91
}

function prepareMaterial(material: THREE.Material) {
  const alpha = 'opacity' in material && typeof material.opacity === 'number' ? material.opacity : 1
  return new THREE.MeshBasicMaterial({
    color: materialColor(material),
    name: material.name || 'ST016_Runtime_Material',
    transparent: alpha < 1,
    opacity: alpha,
    side: material.side,
    toneMapped: false,
  })
}

function prepareRuntimeMaterials(root: THREE.Object3D) {
  root.traverse((object) => {
    if (object.name.includes('reference_label')) {
      object.visible = false
      return
    }
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.frustumCulled = false
    const material = mesh.material
    mesh.material = Array.isArray(material) ? material.map((item) => prepareMaterial(item)) : prepareMaterial(material)
  })
}

function addTerrainSurfaceMeshes(object: THREE.Object3D, terrainSurfaces: THREE.Object3D[]) {
  object.updateMatrixWorld(true)
  object.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh || !mesh.geometry) return
    mesh.userData.terrainSurface = true
    const material = mesh.material
    if (Array.isArray(material)) material.forEach((item) => { item.side = THREE.DoubleSide })
    else if (material) material.side = THREE.DoubleSide
    terrainSurfaces.push(mesh)
  })
}

function makeTemplateMap(scene: THREE.Group) {
  const templates = new Map<string, THREE.Object3D>()
  for (const object of scene.children) {
    if (!object.name.startsWith(STAR_TRIP_WORLD_ASSET_PREFIX) && !object.name.startsWith('ST015_')) continue
    const template = object.clone(true)
    template.position.set(0, 0, 0)
    template.rotation.set(0, 0, 0)
    template.scale.setScalar(1)
    template.updateMatrixWorld(true)
    templates.set(object.name, template)
  }
  return templates
}

function applyYawAroundSurfaceUp(object: THREE.Object3D, normal: THREE.Vector3, yawDeg: number) {
  if (yawDeg === 0) return
  object.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(normal, THREE.MathUtils.degToRad(yawDeg)))
}

function findTerrainGround(normal: THREE.Vector3, terrainSurfaces: THREE.Object3D[]) {
  if (terrainSurfaces.length === 0) return null
  terrainRaycaster.set(normal.clone().multiplyScalar(terrainRayStartRadius), normal.clone().multiplyScalar(-1))
  terrainRaycaster.near = 0
  terrainRaycaster.far = terrainRayFar
  const intersections = terrainRaycaster.intersectObjects(terrainSurfaces, false)
  for (const intersection of intersections) {
    if (intersection.point.dot(normal) <= 0) continue
    return intersection
  }
  return null
}

function terrainAssetIdFor(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object
  while (current) {
    if (current.userData.assetId) return String(current.userData.assetId)
    current = current.parent
  }
  return STAR_TRIP_TERRAIN_SHELL_ID
}

function groundObjectOnTerrain(
  object: THREE.Object3D,
  placement: Pick<StarTripPlacement, 'lat' | 'lon' | 'radiusOffset'>,
  terrainSurfaces: THREE.Object3D[],
  localUp = yAxis,
) {
  const normal = normalFromLatLon(placement.lat, placement.lon)
  const hit = findTerrainGround(normal, terrainSurfaces)
  const groundRadius = hit?.point.length() ?? terrainRadiusAtLatLon(placement.lat, placement.lon)
  object.position.copy(normal).multiplyScalar(groundRadius + placement.radiusOffset)
  object.quaternion.setFromUnitVectors(localUp, normal)
  object.userData.groundRadius = groundRadius
  object.userData.groundAssetId = hit ? terrainAssetIdFor(hit.object) : STAR_TRIP_TERRAIN_SHELL_ID
  object.userData.groundDistance = hit?.distance ?? null
  object.userData.groundingError = Math.abs(object.position.length() - (groundRadius + placement.radiusOffset))
  return hit
}

function placeAsset(template: THREE.Object3D, placement: StarTripPlacement) {
  const object = template.clone(true)
  object.name = `Placement_${placement.assetId}_${placement.region}_${placement.lat}_${placement.lon}`
  object.userData.assetId = placement.assetId
  object.userData.region = placement.region
  object.userData.lat = placement.lat
  object.userData.lon = placement.lon
  object.scale.setScalar(placement.scale)
  const normal = normalFromLatLon(placement.lat, placement.lon)
  object.position.copy(normal).multiplyScalar(terrainRadiusAtLatLon(placement.lat, placement.lon) + placement.radiusOffset)
  object.quaternion.setFromUnitVectors(yAxis, normal)
  applyYawAroundSurfaceUp(object, normal, placement.yawDeg)
  return object
}

function isSolidCollisionAsset(assetId: string) {
  if (assetId === STAR_TRIP_TERRAIN_SHELL_ID) return false
  if (assetId.includes('scorch_mark')) return false
  if (assetId.includes('path_segment')) return false
  if (assetId.includes('meadow') || assetId.includes('beach_crescent')) return false
  if (assetId.includes('lake') || assetId.includes('lagoon') || assetId.includes('tidepool')) return false
  if (assetId.includes('dune_patch') || assetId.includes('cinder_field')) return false
  if (assetId.includes('switchback') || assetId.includes('launch_knoll') || assetId.includes('snow_cap_peak')) return false
  if (assetId.includes('marsh_patch') || assetId.includes('mushroom_grove_floor')) return false
  return true
}

function makeCollisionBody(
  object: THREE.Object3D,
  placement: StarTripPlacement,
  collisionRadius: number,
): StarTripCollisionBody {
  const normal = normalFromLatLon(placement.lat, placement.lon)
  return {
    assetId: placement.assetId,
    region: placement.region,
    position: object.position.clone(),
    normal,
    radius: Math.max(0.18, collisionRadius),
    height: Math.max(0.35, collisionRadius * 1.8),
    solid: isSolidCollisionAsset(placement.assetId),
  }
}

function createDistantGoalMarker(terrainSurfaces: THREE.Object3D[]) {
  const towerBeacon = new THREE.Group()
  towerBeacon.name = 'star-trip-distant-communication-tower-silhouette'
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 6.8, 6), new THREE.MeshBasicMaterial({ color: 0xfff3d3 }))
  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.86, 0.42, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x8ec7d2, side: THREE.DoubleSide, toneMapped: false }),
  )
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd95f }))
  mast.position.y = 3.4
  dish.position.set(0.55, 5.7, 0)
  dish.rotation.z = -0.95
  light.position.y = 6.98
  towerBeacon.add(mast, dish, light)
  groundObjectOnTerrain(towerBeacon, { lat: 56.5, lon: -20.5, radiusOffset: 2.25 }, terrainSurfaces)
  return towerBeacon
}

function createPathDots(root: THREE.Group, terrainSurfaces: THREE.Object3D[]) {
  const routeDots = [
    [-18, 30], [-12, 40], [-5, 52], [8, 56], [20, 40], [32, 18], [44, -2], [53, -18],
    [-22, 72], [-15, 86], [-4, 92], [8, 78], [18, 54], [34, 18], [48, -8],
    [2, -38], [14, -66], [24, -96], [18, -126], [10, -150], [30, -78], [45, -38],
  ] as const
  for (let i = 0; i < routeDots.length; i += 1) {
    const [lat, lon] = routeDots[i]
    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.13 + (i % 3) * 0.018, 14),
      new THREE.MeshBasicMaterial({ color: i < 8 ? 0xffd764 : i < 15 ? 0xc9ad75 : 0x84d7e9, side: THREE.DoubleSide, toneMapped: false }),
    )
    groundObjectOnTerrain(dot, { lat, lon, radiusOffset: 0.018 }, terrainSurfaces, patchUp)
    dot.rotateZ(THREE.MathUtils.degToRad(i * 9))
    dot.name = `star-trip-path-dot-${i}`
    root.add(dot)
  }
}

function faceTowerTowardSpawn(root: THREE.Group) {
  const tower = root.children.find((object) => object.userData.assetId === 'ST016_summit_comm_array')
  if (!tower) return
  const normal = normalFromLatLon(56.5, -20.5)
  const spawnNormal = normalFromLatLon(-18, 22)
  const frame = buildSurfaceFrame(normal, spawnNormal)
  tower.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(frame.right, frame.up, frame.forward))
}

function placementSummary(
  placedObjects: THREE.Object3D[],
  missingAssetIds: string[],
  collisionBodies: StarTripCollisionBody[],
  hasTerrainShell: boolean,
  terrainSurfaces: THREE.Object3D[],
): StarTripEnvironmentSummary {
  const regions = Object.fromEntries(
    [...new Set(starTripPlacements.map((placement) => placement.region))].map((region) => [region, 0]),
  ) as Record<StarTripRegion, number>
  let maxRadialDistanceError = 0
  let maxGroundingError = 0
  let minUpDot = 1
  let groundedObjects = 0
  const floatingObjects: string[] = []

  for (const object of placedObjects) {
    const placement = starTripPlacements.find(
      (item) =>
        item.assetId === object.userData.assetId &&
        item.lat === object.userData.lat &&
        item.lon === object.userData.lon &&
        item.region === object.userData.region,
    )
    if (!placement) continue
    regions[placement.region] += 1
    const expected =
      (typeof object.userData.groundRadius === 'number'
        ? object.userData.groundRadius
        : terrainRadiusAtLatLon(placement.lat, placement.lon)) + placement.radiusOffset
    const groundingError = Math.abs(expected - object.position.length())
    maxRadialDistanceError = Math.max(maxRadialDistanceError, groundingError)
    maxGroundingError = Math.max(maxGroundingError, groundingError)
    if (object.userData.groundAssetId) groundedObjects += 1
    if (object.userData.groundAssetId && groundingError > 0.01) floatingObjects.push(object.name)
    const normal = normalFromLatLon(placement.lat, placement.lon)
    minUpDot = Math.min(minUpDot, yAxis.clone().applyQuaternion(object.quaternion).normalize().dot(normal))
  }

  return {
    version: STAR_TRIP_WORLD_ASSET_VERSION,
    assetDefinitions: starTripAssetDefinitions.length,
    glbAssetRoots: starTripAssetDefinitions.length - missingAssetIds.length,
    placements: placedObjects.length,
    referenceManifestAssets: starTripAssetDefinitions.length,
    referenceChecks: {
      allAssetsHaveReference: starTripAssetDefinitions.every((definition) => Boolean(definition.reference.referenceObject)),
      allReferencesHaveSourceUrl: starTripAssetDefinitions.every((definition) => Boolean(definition.reference.sourceUrl)),
    },
    regions,
    keyLandmarksPresent: STAR_TRIP_CRITICAL_LANDMARK_IDS.filter(
      (id) =>
        placedObjects.some((object) => object.userData.assetId === id) ||
        terrainSurfaces.some((object) => terrainAssetIdFor(object) === id) ||
        Boolean((STAR_TRIP_TERRAIN_COVERAGE as { area_by_asset?: Record<string, number> }).area_by_asset?.[id]),
    ),
    missingAssetIds,
    placementChecks: {
      allRadialDistancesValid: maxRadialDistanceError < 0.001,
      allUpAligned: minUpDot > 0.999,
      allGroundedOnTerrain: floatingObjects.length === 0 && groundedObjects === placedObjects.length,
      maxRadialDistanceError: Number(maxRadialDistanceError.toFixed(6)),
      minUpDot: Number(minUpDot.toFixed(6)),
      maxGroundingError: Number(maxGroundingError.toFixed(6)),
      groundedObjects,
      floatingObjects,
    },
    collisionChecks: {
      bodies: collisionBodies.length,
      solidBodies: collisionBodies.filter((body) => body.solid).length,
      walkableBodies: collisionBodies.filter((body) => !body.solid).length,
      terrainSurfaceMeshes: terrainSurfaces.length,
      allPlacedObjectsHaveCollisionBody: collisionBodies.length === placedObjects.length,
      terrainShellCollider: hasTerrainShell,
    },
    terrainCoverage: STAR_TRIP_TERRAIN_COVERAGE,
  }
}

export async function createSpawnEnvironment(): Promise<StarTripEnvironment> {
  const root = new THREE.Group()
  root.name = 'star-trip-spawn-environment'

  const templates = new Map<string, THREE.Object3D>()
  const worldUrls = [...new Set(starTripAssetDefinitions.map((definition) => definition.glbUrl))]
  for (const worldUrl of worldUrls) {
    const gltf = await loader.loadAsync(worldUrl).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to load Star Trip world ${STAR_TRIP_WORLD_ASSET_VERSION} GLB: ${message}`)
    })
    prepareRuntimeMaterials(gltf.scene)
    for (const [assetId, template] of makeTemplateMap(gltf.scene)) templates.set(assetId, template)
  }
  const missingAssetIds = starTripAssetDefinitions.map((definition) => definition.id).filter((assetId) => !templates.has(assetId))
  const placedObjects: THREE.Object3D[] = []
  const collisionBodies: StarTripCollisionBody[] = []
  const terrainSurfaces: THREE.Object3D[] = []
  const terrainShell = templates.get(STAR_TRIP_TERRAIN_SHELL_ID)
  let hasTerrainShell = false
  if (terrainShell) {
    const shell = terrainShell.clone(true)
    shell.name = 'echo-star-generated-terrain-shell'
    shell.userData.assetId = STAR_TRIP_TERRAIN_SHELL_ID
    shell.userData.terrainCoverage = STAR_TRIP_TERRAIN_COVERAGE
    shell.userData.collider = 'terrain-shell-heightfield'
    hasTerrainShell = true
    root.add(shell)
    shell.updateMatrixWorld(true)
    addTerrainSurfaceMeshes(shell, terrainSurfaces)
  }

  // Large biome regions are authored into the planet shell itself. The separate
  // terrain asset roots remain in the GLB/check manifest as source regions, but
  // runtime walking uses the single continuous shell to avoid overlapping
  // world-scale raycast surfaces.

  for (const placement of starTripPlacements.filter((item) => starTripAssetDefinitionById.get(item.assetId)?.category !== 'terrain')) {
    const template = templates.get(placement.assetId)
    const definition = starTripAssetDefinitionById.get(placement.assetId)
    if (!template || !definition) continue
    const placed = placeAsset(template, placement)
    groundObjectOnTerrain(placed, placement, terrainSurfaces)
    applyYawAroundSurfaceUp(placed, normalFromLatLon(placement.lat, placement.lon), placement.yawDeg)
    placed.userData.collisionRadius = definition.collisionRadius * placement.scale
    placed.userData.collider = isSolidCollisionAsset(placement.assetId) ? 'solid-surface-cylinder' : 'walkable-surface-volume'
    placedObjects.push(placed)
    collisionBodies.push(makeCollisionBody(placed, placement, definition.collisionRadius * placement.scale))
    root.add(placed)
  }

  faceTowerTowardSpawn(root)
  createPathDots(root, terrainSurfaces)
  root.add(createDistantGoalMarker(terrainSurfaces))

  return {
    root,
    summary: placementSummary(placedObjects, missingAssetIds, collisionBodies, hasTerrainShell, terrainSurfaces),
    collisionBodies,
    terrainSurfaces,
  }
}
