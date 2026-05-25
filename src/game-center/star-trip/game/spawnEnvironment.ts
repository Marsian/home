import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { PLANET_RADIUS, buildSurfaceFrame, normalFromLatLon, placeOnPlanet } from './planetMath'
import {
  STAR_TRIP_CRITICAL_LANDMARK_IDS,
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
    maxRadialDistanceError: number
    minUpDot: number
  }
}

export type StarTripEnvironment = {
  root: THREE.Group
  summary: StarTripEnvironmentSummary
}

const loader = new GLTFLoader()
const patchUp = new THREE.Vector3(0, 0, 1)
const yAxis = new THREE.Vector3(0, 1, 0)

function materialColor(material: THREE.Material) {
  if ('color' in material && material.color instanceof THREE.Color) return material.color.getHex()
  return 0x74bf91
}

function prepareMaterial(material: THREE.Material) {
  const alpha = 'opacity' in material && typeof material.opacity === 'number' ? material.opacity : 1
  return new THREE.MeshBasicMaterial({
    color: materialColor(material),
    name: material.name || 'ST015_Runtime_Material',
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

function makeTemplateMap(scene: THREE.Group) {
  const templates = new Map<string, THREE.Object3D>()
  for (const object of scene.children) {
    if (!object.name.startsWith('ST015_')) continue
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

function placeAsset(template: THREE.Object3D, placement: StarTripPlacement) {
  const object = template.clone(true)
  object.name = `Placement_${placement.assetId}_${placement.region}_${placement.lat}_${placement.lon}`
  object.userData.assetId = placement.assetId
  object.userData.region = placement.region
  object.userData.lat = placement.lat
  object.userData.lon = placement.lon
  object.scale.setScalar(placement.scale)
  const normal = normalFromLatLon(placement.lat, placement.lon)
  object.position.copy(normal).multiplyScalar(PLANET_RADIUS + placement.radiusOffset)
  object.quaternion.setFromUnitVectors(yAxis, normal)
  applyYawAroundSurfaceUp(object, normal, placement.yawDeg)
  return object
}

function createPlanetSurface() {
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS, 96, 64),
    new THREE.MeshToonMaterial({ color: 0x74bf91 }),
  )
  planet.name = 'echo-star-surface'
  return planet
}

function createDistantGoalMarker() {
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
  placeOnPlanet(towerBeacon, -3, 58, PLANET_RADIUS + 2.25)
  return towerBeacon
}

function createPathDots(root: THREE.Group) {
  for (let i = 0; i < 28; i += 1) {
    const t = i / 27
    const lat = -18 + t * 15
    const lon = 23 + t * 35
    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.13 + (i % 3) * 0.018, 14),
      new THREE.MeshBasicMaterial({ color: 0xe9c88d, side: THREE.DoubleSide, toneMapped: false }),
    )
    placeOnPlanet(dot, lat, lon, PLANET_RADIUS + 0.018, patchUp)
    dot.rotateZ(THREE.MathUtils.degToRad(i * 9))
    dot.name = `star-trip-path-dot-${i}`
    root.add(dot)
  }
}

function faceTowerTowardSpawn(root: THREE.Group) {
  const tower = root.children.find((object) => object.userData.assetId === 'ST015_summit_comm_tower')
  if (!tower) return
  const normal = normalFromLatLon(-3, 58)
  const spawnNormal = normalFromLatLon(-18, 22)
  const frame = buildSurfaceFrame(normal, spawnNormal)
  tower.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(frame.right, frame.up, frame.forward))
}

function placementSummary(placedObjects: THREE.Object3D[], missingAssetIds: string[]): StarTripEnvironmentSummary {
  const regions = Object.fromEntries(
    [...new Set(starTripPlacements.map((placement) => placement.region))].map((region) => [region, 0]),
  ) as Record<StarTripRegion, number>
  let maxRadialDistanceError = 0
  let minUpDot = 1

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
    const expected = PLANET_RADIUS + placement.radiusOffset
    maxRadialDistanceError = Math.max(maxRadialDistanceError, Math.abs(expected - object.position.length()))
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
    keyLandmarksPresent: STAR_TRIP_CRITICAL_LANDMARK_IDS.filter((id) =>
      placedObjects.some((object) => object.userData.assetId === id),
    ),
    missingAssetIds,
    placementChecks: {
      allRadialDistancesValid: maxRadialDistanceError < 0.001,
      allUpAligned: minUpDot > 0.999,
      maxRadialDistanceError: Number(maxRadialDistanceError.toFixed(6)),
      minUpDot: Number(minUpDot.toFixed(6)),
    },
  }
}

export async function createSpawnEnvironment(): Promise<StarTripEnvironment> {
  const root = new THREE.Group()
  root.name = 'star-trip-spawn-environment'
  root.add(createPlanetSurface())

  const gltf = await loader.loadAsync(starTripAssetDefinitions[0].glbUrl).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to load Star Trip world v0.1.5 GLB: ${message}`)
  })
  prepareRuntimeMaterials(gltf.scene)
  const templates = makeTemplateMap(gltf.scene)
  const missingAssetIds = starTripAssetDefinitions.map((definition) => definition.id).filter((assetId) => !templates.has(assetId))
  const placedObjects: THREE.Object3D[] = []

  for (const placement of starTripPlacements) {
    const template = templates.get(placement.assetId)
    const definition = starTripAssetDefinitionById.get(placement.assetId)
    if (!template || !definition) continue
    const placed = placeAsset(template, placement)
    placed.userData.collisionRadius = definition.collisionRadius * placement.scale
    placedObjects.push(placed)
    root.add(placed)
  }

  faceTowerTowardSpawn(root)
  createPathDots(root)
  root.add(createDistantGoalMarker())

  return { root, summary: placementSummary(placedObjects, missingAssetIds) }
}
