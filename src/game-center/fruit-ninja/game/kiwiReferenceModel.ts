import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import kiwiReferenceUrl from '../assets/glb/kiwi.glb?url'
import { getKiwiBodyMaterial } from './kiwiSkin'

const loader = new GLTFLoader()
const scratchBounds = new THREE.Box3()
const scratchCenter = new THREE.Vector3()
const scratchSize = new THREE.Vector3()

const KIWI_REFERENCE_TARGET_HEIGHT_RATIO = 2.1

type PreparedKiwiReference = {
  geometry: THREE.BufferGeometry
  sourceHeight: number
  sourceCutY: number
  sourceEquatorRadius: number
  sourceCapProfile: number[]
  topHalfGeometry: THREE.BufferGeometry
  bottomHalfGeometry: THREE.BufferGeometry
}

type CutVertex = {
  x: number
  y: number
  z: number
  u: number
  v: number
}

type BuiltHalfGeometry = {
  geometry: THREE.BufferGeometry
  cutProfile: number[]
  equatorRadius: number
}

let preparedReference: PreparedKiwiReference | null = null
let loadStarted = false

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`
}

function hashPosition(x: number, y: number, z: number): string {
  return `${Math.round(x * 1e5)}:${Math.round(y * 1e5)}:${Math.round(z * 1e5)}`
}

function sealOpenBoundaries(baseGeometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const source = baseGeometry.toNonIndexed()
  const sourcePos = source.getAttribute('position') as THREE.BufferAttribute

  const positions: number[] = []
  const uniquePositions: Array<[number, number, number]> = []
  const uniqueIdByHash = new Map<string, number>()
  const edgeCounts = new Map<string, number>()
  const adjacency = new Map<number, Set<number>>()

  function getUniqueVertexId(x: number, y: number, z: number): number {
    const key = hashPosition(x, y, z)
    const existing = uniqueIdByHash.get(key)
    if (existing !== undefined) return existing
    const id = uniquePositions.length
    uniqueIdByHash.set(key, id)
    uniquePositions.push([x, y, z])
    return id
  }

  function addAdjacency(a: number, b: number) {
    if (a === b) return
    if (!adjacency.has(a)) adjacency.set(a, new Set())
    if (!adjacency.has(b)) adjacency.set(b, new Set())
    adjacency.get(a)!.add(b)
    adjacency.get(b)!.add(a)
  }

  function countEdge(a: number, b: number) {
    if (a === b) return
    const key = edgeKey(a, b)
    edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1)
  }

  for (let i = 0; i < sourcePos.count; i += 3) {
    const ids: number[] = []
    for (let corner = 0; corner < 3; corner++) {
      const index = i + corner
      const x = sourcePos.getX(index)
      const y = sourcePos.getY(index)
      const z = sourcePos.getZ(index)
      positions.push(x, y, z)
      ids.push(getUniqueVertexId(x, y, z))
    }
    countEdge(ids[0]!, ids[1]!)
    countEdge(ids[1]!, ids[2]!)
    countEdge(ids[2]!, ids[0]!)
  }

  const boundaryEdges: Array<[number, number]> = []
  for (const [key, count] of edgeCounts) {
    if (count !== 1) continue
    const [aRaw, bRaw] = key.split(':')
    const a = Number(aRaw)
    const b = Number(bRaw)
    boundaryEdges.push([a, b])
    addAdjacency(a, b)
  }

  const seenEdges = new Set<string>()
  const loops: number[][] = []

  for (const [startA, startB] of boundaryEdges) {
    const startKey = edgeKey(startA, startB)
    if (seenEdges.has(startKey)) continue

    const loop = [startA]
    let previous = startA
    let current = startB
    seenEdges.add(startKey)

    while (true) {
      loop.push(current)
      const neighbors = [...(adjacency.get(current) ?? [])]
      const next = neighbors.find((candidate) => candidate !== previous && !seenEdges.has(edgeKey(current, candidate)))
        ?? neighbors.find((candidate) => candidate !== previous)

      if (next === undefined || next === startA) {
        if (next !== undefined) seenEdges.add(edgeKey(current, next))
        break
      }

      seenEdges.add(edgeKey(current, next))
      previous = current
      current = next
    }

    if (loop.length >= 3) loops.push(loop)
  }

  for (const loop of loops) {
    const center = new THREE.Vector3()
    const ring: THREE.Vector3[] = loop.map((id) => {
      const [x, y, z] = uniquePositions[id]!
      const vertex = new THREE.Vector3(x, y, z)
      center.add(vertex)
      return vertex
    })
    center.multiplyScalar(1 / ring.length)

    const ordered = [...ring]
    const normal = new THREE.Vector3()
      .subVectors(ordered[0]!, center)
      .cross(new THREE.Vector3().subVectors(ordered[1]!, center))
    if (normal.dot(center) < 0) ordered.reverse()

    for (let i = 0; i < ordered.length; i++) {
      const a = ordered[i]!
      const b = ordered[(i + 1) % ordered.length]!
      positions.push(
        center.x, center.y, center.z,
        a.x, a.y, a.z,
        b.x, b.y, b.z,
      )
    }
  }

  source.dispose()

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const merged = mergeVertices(geometry, 1e-5)
  geometry.dispose()
  merged.computeVertexNormals()
  return merged
}

function applyEvenKiwiUvs(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox()
  const bounds = geometry.boundingBox
  if (!bounds) return

  const center = bounds.getCenter(new THREE.Vector3())
  const size = bounds.getSize(new THREE.Vector3())
  const halfX = Math.max(size.x * 0.5, 1e-5)
  const halfY = Math.max(size.y * 0.5, 1e-5)
  const halfZ = Math.max(size.z * 0.5, 1e-5)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const uv = new Float32Array(position.count * 2)
  const scratch = new THREE.Vector3()

  for (let i = 0; i < position.count; i++) {
    scratch.set(
      (position.getX(i) - center.x) / halfX,
      (position.getY(i) - center.y) / halfY,
      (position.getZ(i) - center.z) / halfZ,
    ).normalize()

    let u = 0.5 + Math.atan2(scratch.z, scratch.x) / (Math.PI * 2)
    if (u < 0) u += 1
    if (u > 1) u -= 1
    const v = Math.acos(THREE.MathUtils.clamp(scratch.y, -1, 1)) / Math.PI

    uv[i * 2] = u
    uv[i * 2 + 1] = v
  }

  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
}

function unwrapTriangleUvSeams(baseGeometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const geometry = baseGeometry.index ? baseGeometry.toNonIndexed() : baseGeometry.clone()
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute | undefined
  if (!uv) return geometry

  for (let i = 0; i < uv.count; i += 3) {
    const ua = uv.getX(i)
    const ub = uv.getX(i + 1)
    const uc = uv.getX(i + 2)
    const minU = Math.min(ua, ub, uc)
    const maxU = Math.max(ua, ub, uc)
    if (maxU - minU <= 0.5) continue

    if (ua < 0.5) uv.setX(i, ua + 1)
    if (ub < 0.5) uv.setX(i + 1, ub + 1)
    if (uc < 0.5) uv.setX(i + 2, uc + 1)
  }

  uv.needsUpdate = true
  return geometry
}

function mergeCutProfiles(top: number[], bottom: number[], fallbackRadius: number): number[] {
  const segments = Math.max(top.length, bottom.length)
  const merged = Array.from({ length: segments }, (_, i) => Math.max(top[i] ?? 0, bottom[i] ?? 0))
  return fillAndSmoothProfile(merged, fallbackRadius)
}

function computeCutProfileFromPoints(
  points: Array<{ x: number; z: number }>,
  fallbackRadius: number,
  segments = 48,
): number[] {
  const profile = Array.from({ length: segments }, () => 0)
  if (points.length === 0) return Array.from({ length: segments }, () => fallbackRadius)

  for (const point of points) {
    const angle = Math.atan2(point.z, point.x)
    const normalized = angle >= 0 ? angle : angle + Math.PI * 2
    const slot = Math.min(segments - 1, Math.floor((normalized / (Math.PI * 2)) * segments))
    profile[slot] = Math.max(profile[slot]!, Math.hypot(point.x, point.z))
  }

  return fillAndSmoothProfile(profile, fallbackRadius)
}

function fillAndSmoothProfile(profile: number[], fallbackRadius: number): number[] {
  const segments = profile.length
  for (let i = 0; i < segments; i++) {
    if (profile[i]! > 1e-4) continue
    let sum = 0
    let count = 0
    for (let offset = 1; offset <= 3; offset++) {
      const left = profile[(i - offset + segments) % segments]!
      const right = profile[(i + offset) % segments]!
      if (left > 1e-4) {
        sum += left
        count++
      }
      if (right > 1e-4) {
        sum += right
        count++
      }
    }
    profile[i] = count > 0 ? sum / count : fallbackRadius
  }

  const smoothed = profile.map((_, i) => {
    const prev = profile[(i - 1 + segments) % segments]!
    const curr = profile[i]!
    const next = profile[(i + 1) % segments]!
    return (prev + curr * 2 + next) / 4
  })

  return smoothed.map((r) => Math.max(r, fallbackRadius * 0.82))
}

function readCutVertex(
  pos: THREE.BufferAttribute,
  uv: THREE.BufferAttribute | undefined,
  index: number,
): CutVertex {
  return {
    x: pos.getX(index),
    y: pos.getY(index),
    z: pos.getZ(index),
    u: uv ? uv.getX(index) : 0,
    v: uv ? uv.getY(index) : 0,
  }
}

function interpolateCutVertex(a: CutVertex, b: CutVertex, cutY: number): CutVertex {
  const dy = b.y - a.y
  const t = Math.abs(dy) < 1e-8 ? 0 : (cutY - a.y) / dy
  return {
    x: THREE.MathUtils.lerp(a.x, b.x, t),
    y: cutY,
    z: THREE.MathUtils.lerp(a.z, b.z, t),
    u: THREE.MathUtils.lerp(a.u, b.u, t),
    v: THREE.MathUtils.lerp(a.v, b.v, t),
  }
}

function clipTriangleToPlane(
  triangle: [CutVertex, CutVertex, CutVertex],
  keepTop: boolean,
  cutY: number,
): CutVertex[] {
  const kept: CutVertex[] = []

  for (let i = 0; i < triangle.length; i++) {
    const current = triangle[i]!
    const previous = triangle[(i + triangle.length - 1) % triangle.length]!
    const currentInside = keepTop ? current.y >= cutY : current.y <= cutY
    const previousInside = keepTop ? previous.y >= cutY : previous.y <= cutY

    if (currentInside !== previousInside) {
      kept.push(interpolateCutVertex(previous, current, cutY))
    }
    if (currentInside) {
      kept.push(current)
    }
  }

  return kept
}

function buildSlicedHalfGeometry(
  baseGeometry: THREE.BufferGeometry,
  half: 'top' | 'bottom',
  cutY: number,
  sourceHeight: number,
): BuiltHalfGeometry {
  const source = baseGeometry.toNonIndexed()
  const sourcePos = source.getAttribute('position') as THREE.BufferAttribute
  const sourceUv = source.getAttribute('uv') as THREE.BufferAttribute | undefined
  const keepTop = half === 'top'

  const positions: number[] = []
  const uvs: number[] = []
  const cutPoints: Array<{ x: number; z: number }> = []

  for (let i = 0; i < sourcePos.count; i += 3) {
    const triangle: [CutVertex, CutVertex, CutVertex] = [
      readCutVertex(sourcePos, sourceUv, i),
      readCutVertex(sourcePos, sourceUv, i + 1),
      readCutVertex(sourcePos, sourceUv, i + 2),
    ]
    const clipped = clipTriangleToPlane(triangle, keepTop, cutY)
    if (clipped.length < 3) continue

    for (const vertex of clipped) {
      if (Math.abs(vertex.y - cutY) < 1e-5) {
        cutPoints.push({ x: vertex.x, z: vertex.z })
      }
    }

    for (let fan = 1; fan < clipped.length - 1; fan++) {
      const verts = keepTop
        ? [clipped[0]!, clipped[fan]!, clipped[fan + 1]!]
        : [clipped[0]!, clipped[fan + 1]!, clipped[fan]!]
      for (const vertex of verts) {
        positions.push(
          vertex.x,
          keepTop ? vertex.y - cutY : cutY - vertex.y,
          vertex.z,
        )
        uvs.push(vertex.u, vertex.v)
      }
    }
  }

  source.dispose()

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  if (uvs.length > 0 && sourceUv) {
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  }
  const merged = mergeVertices(geometry, 1e-5)
  geometry.dispose()
  merged.computeVertexNormals()
  merged.computeBoundingBox()

  const equatorRadius = cutPoints.reduce((max, point) => Math.max(max, Math.hypot(point.x, point.z)), 0)
  return {
    geometry: merged,
    cutProfile: computeCutProfileFromPoints(cutPoints, equatorRadius || sourceHeight * 0.26),
    equatorRadius,
  }
}

function prepareReferenceMesh(sourceMesh: THREE.Mesh): PreparedKiwiReference | null {
  let geometry = sourceMesh.geometry?.clone()
  if (!geometry) return null

  geometry.computeBoundingBox()
  if (!geometry.boundingBox) return null

  scratchBounds.copy(geometry.boundingBox)
  scratchBounds.getCenter(scratchCenter)
  scratchBounds.getSize(scratchSize)
  geometry.translate(-scratchCenter.x, -scratchCenter.y, -scratchCenter.z)
  geometry = sealOpenBoundaries(geometry)
  applyEvenKiwiUvs(geometry)
  geometry = unwrapTriangleUvSeams(geometry)
  geometry.computeVertexNormals()

  const sourceCutY = 0
  const topHalf = buildSlicedHalfGeometry(geometry, 'top', sourceCutY, scratchSize.y)
  const bottomHalf = buildSlicedHalfGeometry(geometry, 'bottom', sourceCutY, scratchSize.y)
  const sourceEquatorRadius = Math.max(topHalf.equatorRadius, bottomHalf.equatorRadius, 0.24)
  const sourceCapProfile = mergeCutProfiles(topHalf.cutProfile, bottomHalf.cutProfile, sourceEquatorRadius)

  return {
    geometry,
    sourceHeight: Math.max(1e-4, scratchSize.y),
    sourceCutY,
    sourceEquatorRadius,
    sourceCapProfile,
    topHalfGeometry: topHalf.geometry,
    bottomHalfGeometry: bottomHalf.geometry,
  }
}

function getReferenceScale(radius: number, sourceHeight: number): number {
  return (radius * KIWI_REFERENCE_TARGET_HEIGHT_RATIO) / sourceHeight
}

export function primeKiwiReferenceModel() {
  if (preparedReference || loadStarted) return
  loadStarted = true

  loader.load(
    kiwiReferenceUrl,
    (gltf) => {
      let sourceMesh: THREE.Mesh | null = null
      gltf.scene.traverse((child) => {
        if (!sourceMesh && child instanceof THREE.Mesh) sourceMesh = child
      })

      if (!sourceMesh) {
        console.warn('[fruit-ninja] kiwi reference GLB had no mesh')
        return
      }

      preparedReference = prepareReferenceMesh(sourceMesh)
      if (!preparedReference) {
        console.warn('[fruit-ninja] failed to prepare kiwi reference mesh')
      }
    },
    undefined,
    (error) => {
      console.warn('[fruit-ninja] failed to load kiwi reference GLB', error)
    },
  )
}

export function createKiwiReferenceMesh(radius: number): THREE.Group | null {
  if (!preparedReference) return null

  const root = new THREE.Group()
  const mesh = new THREE.Mesh(preparedReference.geometry, getKiwiBodyMaterial())
  const scale = getReferenceScale(radius, preparedReference.sourceHeight)

  mesh.scale.setScalar(scale)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData.sharedPool = true
  mesh.userData.sharedMaterial = true
  root.add(mesh)
  return root
}

export function createKiwiReferenceHalfMesh(
  radius: number,
  half: 'top' | 'bottom',
): { mesh: THREE.Mesh; capRadius: number; cutOffsetY: number } | null {
  if (!preparedReference) return null

  const geometry = half === 'top' ? preparedReference.topHalfGeometry : preparedReference.bottomHalfGeometry
  const mesh = new THREE.Mesh(geometry, getKiwiBodyMaterial())
  const scale = getReferenceScale(radius, preparedReference.sourceHeight)

  mesh.scale.setScalar(scale)
  mesh.castShadow = false
  mesh.receiveShadow = false
  mesh.userData.sharedPool = true
  mesh.userData.sharedMaterial = true
  mesh.renderOrder = 2

  return {
    mesh,
    capRadius: preparedReference.sourceEquatorRadius * scale * 0.985,
    cutOffsetY: preparedReference.sourceCutY * scale,
  }
}

export function createKiwiReferenceCapGeometry(radius: number): THREE.ShapeGeometry | null {
  if (!preparedReference) return null

  const scale = getReferenceScale(radius, preparedReference.sourceHeight)
  const profile = preparedReference.sourceCapProfile
  const shape = new THREE.Shape()
  let maxRadius = 0

  profile.forEach((baseRadius, index) => {
    const angle = (index / profile.length) * Math.PI * 2
    const r = baseRadius * scale * 1.01
    maxRadius = Math.max(maxRadius, r)
    const x = Math.cos(angle) * r
    const y = Math.sin(angle) * r
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  })
  shape.closePath()

  const geometry = new THREE.ShapeGeometry(shape)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const uv = new Float32Array(position.count * 2)
  const invRadius = maxRadius > 1e-5 ? 1 / (maxRadius * 2) : 1

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    uv[i * 2] = x * invRadius + 0.5
    uv[i * 2 + 1] = y * invRadius + 0.5
  }

  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.computeBoundingBox()
  return geometry
}

if (typeof window !== 'undefined') {
  primeKiwiReferenceModel()
}
