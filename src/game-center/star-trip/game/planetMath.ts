import * as THREE from 'three'

export const PLANET_RADIUS = 40.8
export const PLAYER_SURFACE_OFFSET = 0.04

const yAxis = new THREE.Vector3(0, 1, 0)
const zAxis = new THREE.Vector3(0, 0, 1)
const xAxis = new THREE.Vector3(1, 0, 0)

export function normalFromLatLon(lat: number, lon: number) {
  const phi = THREE.MathUtils.degToRad(90 - lat)
  const theta = THREE.MathUtils.degToRad(lon + 180)
  return new THREE.Vector3(
    -Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  ).normalize()
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
  const radius = surfacePoint.length()
  if (distance <= 0 || tangentDirection.lengthSq() < 0.000001) return surfacePoint.clone()
  return surfacePoint
    .clone()
    .add(tangentDirection.clone().normalize().multiplyScalar(distance))
    .normalize()
    .multiplyScalar(radius)
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
