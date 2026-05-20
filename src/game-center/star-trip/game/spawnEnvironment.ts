import * as THREE from 'three'

import { PLANET_RADIUS, placeOnPlanet } from './planetMath'

const patchUp = new THREE.Vector3(0, 0, 1)

function toon(color: number, emissive = 0x000000, emissiveIntensity = 0) {
  return new THREE.MeshToonMaterial({ color, emissive, emissiveIntensity })
}

function addPatch(root: THREE.Group, lat: number, lon: number, size: number, color: number, yScale = 1) {
  const patch = new THREE.Mesh(
    new THREE.CircleGeometry(size, 28),
    new THREE.MeshToonMaterial({ color, side: THREE.DoubleSide }),
  )
  patch.scale.y = yScale
  placeOnPlanet(patch, lat, lon, PLANET_RADIUS + 0.012, patchUp)
  root.add(patch)
  return patch
}

function addTree(root: THREE.Group, lat: number, lon: number, scale = 1) {
  const tree = new THREE.Group()
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.07 * scale, 0.36 * scale, 6), toon(0x916545))
  const lower = new THREE.Mesh(new THREE.ConeGeometry(0.28 * scale, 0.46 * scale, 7), toon(0x2f9a70))
  const upper = new THREE.Mesh(new THREE.ConeGeometry(0.22 * scale, 0.38 * scale, 7), toon(0x47ad78))
  trunk.position.y = 0.18 * scale
  lower.position.y = 0.5 * scale
  upper.position.y = 0.75 * scale
  tree.add(trunk, lower, upper)
  placeOnPlanet(tree, lat, lon, PLANET_RADIUS + 0.02)
  root.add(tree)
}

function addRock(root: THREE.Group, lat: number, lon: number, scale = 1, color = 0x7a7f87) {
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 * scale, 0), toon(color))
  rock.scale.set(1.2, 0.7, 0.9)
  placeOnPlanet(rock, lat, lon, PLANET_RADIUS + 0.05)
  root.add(rock)
}

function addLowHill(root: THREE.Group, lat: number, lon: number, scale = 1, color = 0x68b783) {
  const hill = new THREE.Mesh(new THREE.SphereGeometry(0.45 * scale, 12, 8), toon(color))
  hill.scale.set(1.6, 0.32, 1.0)
  placeOnPlanet(hill, lat, lon, PLANET_RADIUS + 0.08)
  root.add(hill)
}

function addCrashedRocket(root: THREE.Group, lat: number, lon: number) {
  const rocket = new THREE.Group()
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.62, 4, 12), toon(0xf3e7cf))
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.28, 12), toon(0xe55d55))
  const window = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.014, 12), toon(0x69a6c6, 0x69a6c6, 0.12))
  const finA = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.22), toon(0x4f7f98))
  const finB = finA.clone()
  body.rotation.z = Math.PI / 2
  nose.position.x = 0.46
  nose.rotation.z = -Math.PI / 2
  window.position.set(0.14, 0.12, 0)
  window.rotation.x = Math.PI / 2
  finA.position.set(-0.34, -0.1, 0.14)
  finB.position.set(-0.34, -0.1, -0.14)
  rocket.add(body, nose, window, finA, finB)
  rocket.rotation.set(0.08, 0.22, -0.42)
  placeOnPlanet(rocket, lat, lon, PLANET_RADIUS + 0.14)
  root.add(rocket)
}

function addCommTower(root: THREE.Group, lat: number, lon: number) {
  const tower = new THREE.Group()
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 1.32, 6), toon(0xe9d7a9))
  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.36, 0.17, 12, 1, true),
    new THREE.MeshToonMaterial({ color: 0x8ec7d2, side: THREE.DoubleSide }),
  )
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), toon(0xffd95f, 0xffc84f, 0.32))
  mast.position.y = 0.66
  dish.position.set(0.2, 1.1, 0)
  dish.rotation.z = -0.95
  beacon.position.y = 1.38
  tower.add(mast, dish, beacon)
  placeOnPlanet(tower, lat, lon, PLANET_RADIUS + 0.04)
  root.add(tower)
}

function addScatteredPart(root: THREE.Group, lat: number, lon: number, color: number) {
  const part = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.12), toon(color))
  part.rotation.y = THREE.MathUtils.degToRad((lat * 13 + lon * 7) % 180)
  placeOnPlanet(part, lat, lon, PLANET_RADIUS + 0.035)
  root.add(part)
}

export function createSpawnEnvironment() {
  const root = new THREE.Group()
  root.name = 'star-trip-spawn-environment'

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS, 56, 36),
    new THREE.MeshToonMaterial({ color: 0x74bf91 }),
  )
  planet.name = 'echo-star-surface'
  root.add(planet)

  addPatch(root, -18, 22, 1.25, 0xc59a63, 0.66)
  addPatch(root, -13, 17, 0.68, 0x5eaee0, 0.72)
  addPatch(root, -23, 31, 0.72, 0x5ba978, 0.82)
  addPatch(root, -8, 35, 0.64, 0xe9c88d, 0.42)
  addPatch(root, -2, 49, 0.48, 0xd8b36e, 0.5)
  addPatch(root, 18, -58, 0.72, 0x6f7f82, 0.7)

  for (let i = 0; i < 14; i += 1) {
    addPatch(root, -20 + i * 1.25, 24 + i * 2.2, 0.075 + (i % 3) * 0.018, 0xe9c88d, 0.75)
  }

  addCrashedRocket(root, -23, 28)
  addCommTower(root, 18, -58)

  ;[
    [-12, 11, 1.05],
    [-9, 13, 0.78],
    [-27, 19, 0.9],
    [-24, 15, 0.72],
    [-5, 37, 1.1],
    [-1, 40, 0.86],
    [-18, 40, 0.68],
  ].forEach(([lat, lon, scale]) => addTree(root, lat, lon, scale))

  ;[
    [-16, 12, 1.2],
    [-28, 31, 0.85],
    [-25, 34, 0.7],
    [-10, 29, 0.62],
    [-4, 31, 0.76],
  ].forEach(([lat, lon, scale]) => addRock(root, lat, lon, scale))

  addLowHill(root, -15, 34, 1.05)
  addLowHill(root, -6, 44, 0.86, 0x77bd8a)
  addLowHill(root, -31, 24, 0.75, 0x5fae81)

  addScatteredPart(root, -21, 25, 0x567a96)
  addScatteredPart(root, -19, 30, 0xe55d55)
  addScatteredPart(root, -25, 26, 0xfff3d3)

  return root
}
