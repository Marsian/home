import * as THREE from 'three'

export type PicoParts = {
  root: THREE.Group
  body: THREE.Group
  head: THREE.Group
  leftWing: THREE.Group
  rightWing: THREE.Group
  leftLeg: THREE.Group
  rightLeg: THREE.Group
  crest: THREE.Group
  scarfTail: THREE.Mesh
  jetpack: THREE.Group
  flame: THREE.Mesh
}

function toon(color: number, emissive = 0x000000, emissiveIntensity = 0) {
  return new THREE.MeshToonMaterial({ color, emissive, emissiveIntensity })
}

function limb(width: number, height: number, depth: number, color: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth, 1, 1, 1), toon(color))
  mesh.castShadow = true
  return mesh
}

export function createPicoModel(): PicoParts {
  const root = new THREE.Group()
  root.name = 'Pico'

  const feather = toon(0x6aa8d8)
  const featherLight = toon(0xffd19a)
  const wingDark = toon(0x487fa8)
  const beakMat = toon(0xffc95f)
  const scarfMat = toon(0xe55d55)
  const packMat = toon(0x567a96)
  const packDark = toon(0x33546b)
  const badgeMat = toon(0xfff3d3, 0xffc75a, 0.1)
  const eyeMat = toon(0x182b2f)
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffd95f, transparent: true, opacity: 0.8 })

  const body = new THREE.Group()
  body.name = 'body'
  body.position.y = 0.58
  root.add(body)

  const bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), feather)
  bodyMesh.scale.set(0.86, 1.12, 0.74)
  body.add(bodyMesh)

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), featherLight)
  belly.position.set(0, -0.02, 0.18)
  belly.scale.set(1.05, 1.22, 0.36)
  body.add(belly)

  const head = new THREE.Group()
  head.name = 'head'
  head.position.y = 0.98
  root.add(head)

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), feather)
  headMesh.scale.set(1.02, 0.98, 1.0)
  head.add(headMesh)

  const crest = new THREE.Group()
  crest.name = 'crest'
  ;[
    [-0.08, 0.27, -0.1],
    [0, 0.31, 0],
    [0.08, 0.27, 0.1],
  ].forEach(([x, y, rz]) => {
    const featherMesh = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 5), wingDark)
    featherMesh.position.set(x, y, 0)
    featherMesh.rotation.z = rz
    crest.add(featherMesh)
  })
  head.add(crest)

  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.027, 8, 6), eyeMat)
  leftEye.position.set(-0.105, 0.04, 0.305)
  leftEye.scale.set(0.75, 1.2, 0.34)
  head.add(leftEye)

  const rightEye = leftEye.clone()
  rightEye.position.x = 0.105
  head.add(rightEye)

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.22, 4), beakMat)
  beak.name = 'beak'
  beak.position.set(0, -0.025, 0.36)
  beak.rotation.x = Math.PI / 2
  beak.scale.set(0.8, 1, 0.62)
  head.add(beak)

  const leftWing = new THREE.Group()
  leftWing.name = 'leftWing'
  leftWing.position.set(-0.24, 0.66, 0.02)
  const leftWingMesh = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.48, 5), wingDark)
  leftWingMesh.position.y = -0.23
  leftWingMesh.rotation.z = -0.22
  leftWingMesh.scale.set(0.7, 1, 0.22)
  leftWing.add(leftWingMesh)
  root.add(leftWing)

  const rightWing = leftWing.clone()
  rightWing.name = 'rightWing'
  rightWing.position.x = 0.24
  rightWing.scale.x = -1
  root.add(rightWing)

  const leftLeg = new THREE.Group()
  leftLeg.name = 'leftLeg'
  leftLeg.position.set(-0.1, 0.35, 0.02)
  const leftLegMesh = limb(0.075, 0.34, 0.075, 0xd89051)
  leftLegMesh.position.y = -0.19
  leftLeg.add(leftLegMesh)
  const leftFoot = limb(0.13, 0.045, 0.2, 0xd89051)
  leftFoot.position.set(0, -0.37, 0.04)
  leftLeg.add(leftFoot)
  root.add(leftLeg)

  const rightLeg = leftLeg.clone()
  rightLeg.name = 'rightLeg'
  rightLeg.position.x = 0.1
  root.add(rightLeg)

  const scarfBand = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.026, 6, 18), scarfMat)
  scarfBand.position.y = 0.81
  scarfBand.rotation.x = Math.PI / 2
  root.add(scarfBand)

  const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.08), scarfMat)
  scarfTail.name = 'scarfTail'
  scarfTail.position.set(0.25, 0.78, -0.08)
  scarfTail.rotation.set(0.08, -0.45, -0.1)
  root.add(scarfTail)

  const jetpack = new THREE.Group()
  jetpack.name = 'jetpack'
  jetpack.position.set(0, 0.55, -0.26)
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 0.16), packMat)
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.19), packDark)
  cap.position.y = 0.2
  const leftNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.12, 8), packDark)
  leftNozzle.position.set(-0.07, -0.25, -0.02)
  leftNozzle.rotation.x = Math.PI / 2
  const rightNozzle = leftNozzle.clone()
  rightNozzle.position.x = 0.07
  jetpack.add(pack, cap, leftNozzle, rightNozzle)
  root.add(jetpack)

  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.34, 8), flameMat)
  flame.name = 'jetpackFlame'
  flame.position.set(0, 0.2, -0.4)
  flame.rotation.x = -Math.PI / 2
  flame.visible = false
  root.add(flame)

  const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 6), badgeMat)
  badge.position.set(-0.12, 0.66, 0.215)
  badge.rotation.x = Math.PI / 2
  root.add(badge)

  const keyRing = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.006, 5, 10), badgeMat)
  keyRing.position.set(0.16, 0.36, -0.25)
  keyRing.rotation.y = Math.PI / 2
  root.add(keyRing)

  root.traverse((object) => {
    object.frustumCulled = false
  })
  root.scale.setScalar(1.05)

  return { root, body, head, leftWing, rightWing, leftLeg, rightLeg, crest, scarfTail, jetpack, flame }
}
