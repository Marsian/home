import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import picoModelUrl from '../assets/models/characters/pico/pico-v0.1.2-detail.glb?url'

export type PicoBaseTransform = {
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: THREE.Vector3
}

export type PicoParts = {
  root: THREE.Group
  model: THREE.Group
  body: THREE.Object3D | null
  head: THREE.Object3D | null
  leftWing: THREE.Object3D | null
  rightWing: THREE.Object3D | null
  leftLeg: THREE.Object3D | null
  rightLeg: THREE.Object3D | null
  jetpack: THREE.Object3D | null
  leftJetNozzle: THREE.Object3D | null
  rightJetNozzle: THREE.Object3D | null
  flame: THREE.Object3D | null
  detailObjectNames: string[]
  baseTransforms: Map<THREE.Object3D, PicoBaseTransform>
}

const loader = new GLTFLoader()
const targetHeight = 1.36

const materialPalette: Record<string, number> = {
  Pico_Beak_Gold: 0xffc21f,
  Pico_Body_Tunic_Blue: 0xc7b7ff,
  Pico_Body_Tunic_Light_Blue_Hem: 0xff6f9f,
  Pico_Eye_Black: 0x050506,
  Pico_Eye_White: 0xfff7eb,
  Pico_Feather_Indigo: 0x0e5ea8,
  Pico_Foot_OrangeYellow: 0xe7a33a,
  Pico_Jetpack_BlueGray: 0x7f9aa3,
  Pico_Jetpack_Nozzle_Dark: 0x202c35,
  Pico_Mat_Limb_Indigo: 0x1679c4,
}

const picoDetailObjectNames = [
  'Pico_Jetpack_Main_shell_lowpoly',
  'Pico_Jetpack_Nozzle_L',
  'Pico_Jetpack_Nozzle_R',
  'Pico_Tail_Upturned_3feather',
  'Pico_Crest_Back_Tuft_01',
  'Pico_Crest_Back_Tuft_02',
  'Pico_Crest_Back_Tuft_03',
]

function getRequiredObject(root: THREE.Object3D, name: string) {
  const object = root.getObjectByName(name)
  if (!object) throw new Error(`Star Trip Pico GLB is missing required object: ${name}`)
  return object
}

function cloneTransform(object: THREE.Object3D): PicoBaseTransform {
  return {
    position: object.position.clone(),
    rotation: object.rotation.clone(),
    scale: object.scale.clone(),
  }
}

function captureBaseTransforms(parts: Array<THREE.Object3D | null>) {
  const transforms = new Map<THREE.Object3D, PicoBaseTransform>()
  for (const part of parts) {
    if (part) transforms.set(part, cloneTransform(part))
  }
  return transforms
}

function colorFromMaterial(material: THREE.Material) {
  const paletteColor = materialPalette[material.name]
  if (paletteColor !== undefined) return paletteColor
  if ('color' in material && material.color instanceof THREE.Color) return material.color.getHex()
  return 0x6aa8d8
}

function prepareMaterial(material: THREE.Material) {
  const toonMaterial = new THREE.MeshBasicMaterial({
    color: colorFromMaterial(material),
    name: material.name || 'Pico_Mat_Runtime_Color',
  })
  toonMaterial.side = material.side
  return toonMaterial
}

function normalizeModel(root: THREE.Group, model: THREE.Group) {
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  if (size.y <= 0) throw new Error('Star Trip Pico GLB has invalid bounds; model height is zero.')

  const scale = targetHeight / size.y
  model.scale.setScalar(scale)
  model.updateWorldMatrix(true, true)

  const scaledBox = new THREE.Box3().setFromObject(model)
  const center = scaledBox.getCenter(new THREE.Vector3())
  model.position.sub(new THREE.Vector3(center.x, scaledBox.min.y, center.z))
  root.updateMatrixWorld(true)
}

function wrapWithPivot(model: THREE.Group, object: THREE.Object3D, pivotName: string, pivot: THREE.Vector3) {
  object.updateMatrixWorld(true)
  model.updateWorldMatrix(true, false)

  const parent = object.parent
  if (!parent) return object

  const pivotGroup = new THREE.Group()
  pivotGroup.name = pivotName
  model.add(pivotGroup)
  pivotGroup.position.copy(pivot)
  pivotGroup.updateMatrixWorld(true)

  const objectWorld = object.matrixWorld.clone()
  parent.remove(object)
  pivotGroup.add(object)
  object.matrix.copy(pivotGroup.matrixWorld.clone().invert().multiply(objectWorld))
  object.matrix.decompose(object.position, object.quaternion, object.scale)
  return pivotGroup
}

function getObjectBoundsInModel(model: THREE.Group, object: THREE.Object3D) {
  model.updateWorldMatrix(true, true)
  object.updateWorldMatrix(true, false)

  const worldBox = new THREE.Box3().setFromObject(object)
  const modelInverse = model.matrixWorld.clone().invert()
  const points = [
    new THREE.Vector3(worldBox.min.x, worldBox.min.y, worldBox.min.z),
    new THREE.Vector3(worldBox.min.x, worldBox.min.y, worldBox.max.z),
    new THREE.Vector3(worldBox.min.x, worldBox.max.y, worldBox.min.z),
    new THREE.Vector3(worldBox.min.x, worldBox.max.y, worldBox.max.z),
    new THREE.Vector3(worldBox.max.x, worldBox.min.y, worldBox.min.z),
    new THREE.Vector3(worldBox.max.x, worldBox.min.y, worldBox.max.z),
    new THREE.Vector3(worldBox.max.x, worldBox.max.y, worldBox.min.z),
    new THREE.Vector3(worldBox.max.x, worldBox.max.y, worldBox.max.z),
  ].map((point) => point.applyMatrix4(modelInverse))

  return new THREE.Box3().setFromPoints(points)
}

function getWingTopPivot(model: THREE.Group, wing: THREE.Object3D, side: 'L' | 'R') {
  const bounds = getObjectBoundsInModel(model, wing)
  const center = bounds.getCenter(new THREE.Vector3())
  return new THREE.Vector3(side === 'L' ? bounds.max.x : bounds.min.x, bounds.max.y, center.z)
}

function createJetFlame(nozzleBounds: THREE.Box3, side: 'L' | 'R') {
  const center = nozzleBounds.getCenter(new THREE.Vector3())
  const flame = new THREE.Group()
  flame.name = `Pico_JetFlame_${side}`

  const outwardZ = center.z >= 0 ? 1 : -1
  const rearZ = outwardZ > 0 ? nozzleBounds.max.z : nozzleBounds.min.z
  const flameMaterial = new THREE.MeshBasicMaterial({
    color: side === 'L' ? 0xffd95f : 0xff9d35,
    transparent: true,
    opacity: 0.86,
  })
  const core = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.42, 6), flameMaterial)
  core.name = `Pico_JetFlame_${side}_Core`
  core.position.set(center.x, center.y, rearZ + outwardZ * 0.19)
  core.rotation.x = outwardZ > 0 ? Math.PI / 2 : -Math.PI / 2

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 8, 6),
    new THREE.MeshBasicMaterial({
      color: 0xfff07a,
      transparent: true,
      opacity: 0.82,
    }),
  )
  glow.name = `Pico_JetFlame_${side}_Glow`
  glow.position.set(center.x, center.y, rearZ + outwardZ * 0.03)

  flame.add(core, glow)
  return flame
}

function createJetpackFlames(model: THREE.Group, leftNozzle: THREE.Object3D, rightNozzle: THREE.Object3D) {
  const flameGroup = new THREE.Group()
  flameGroup.name = 'Pico_Jetpack_Flames'
  flameGroup.visible = false
  flameGroup.add(createJetFlame(getObjectBoundsInModel(model, leftNozzle), 'L'))
  flameGroup.add(createJetFlame(getObjectBoundsInModel(model, rightNozzle), 'R'))
  model.add(flameGroup)
  return flameGroup
}

export async function createPicoModel(): Promise<PicoParts> {
  const gltf = await loader.loadAsync(picoModelUrl).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to load Star Trip Pico GLB: ${message}`)
  })

  const root = new THREE.Group()
  root.name = 'Pico'

  const model = gltf.scene
  model.name = 'Pico_GLB_Model'
  root.add(model)

  model.traverse((object) => {
    object.frustumCulled = false
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
    const material = mesh.material
    if (Array.isArray(material)) mesh.material = material.map(prepareMaterial)
    else if (material) mesh.material = prepareMaterial(material)
  })

  normalizeModel(root, model)

  const body = getRequiredObject(model, 'Pico_Torso_tall_head_connected_blue_lowpoly')
  const head = getRequiredObject(model, 'Pico_Head_faceted_large_reference_ratio')
  const leftWingMesh = getRequiredObject(model, 'Pico_Wing_L_whole_faceted_5bands')
  const rightWingMesh = getRequiredObject(model, 'Pico_Wing_R_whole_faceted_5bands')
  const leftLegMesh = getRequiredObject(model, 'Pico_LegFoot_L_whole_faceted_5bands')
  const rightLegMesh = getRequiredObject(model, 'Pico_LegFoot_R_whole_faceted_5bands')
  const jetpack = getRequiredObject(model, 'Pico_Jetpack_Main_shell_lowpoly')
  const leftJetNozzle = getRequiredObject(model, 'Pico_Jetpack_Nozzle_L')
  const rightJetNozzle = getRequiredObject(model, 'Pico_Jetpack_Nozzle_R')
  for (const objectName of picoDetailObjectNames) getRequiredObject(model, objectName)

  const leftWing = wrapWithPivot(model, leftWingMesh, 'Pico_Wing_L_Pivot', getWingTopPivot(model, leftWingMesh, 'L'))
  const rightWing = wrapWithPivot(model, rightWingMesh, 'Pico_Wing_R_Pivot', getWingTopPivot(model, rightWingMesh, 'R'))
  const leftLeg = wrapWithPivot(model, leftLegMesh, 'Pico_LegFoot_L_Pivot', new THREE.Vector3(-0.09, 0.42, 0))
  const rightLeg = wrapWithPivot(model, rightLegMesh, 'Pico_LegFoot_R_Pivot', new THREE.Vector3(0.09, 0.42, 0))

  const flame = createJetpackFlames(model, leftJetNozzle, rightJetNozzle)

  return {
    root,
    model,
    body,
    head,
    leftWing,
    rightWing,
    leftLeg,
    rightLeg,
    jetpack,
    leftJetNozzle,
    rightJetNozzle,
    flame,
    detailObjectNames: picoDetailObjectNames,
    baseTransforms: captureBaseTransforms([model, body, head, leftWing, rightWing, leftLeg, rightLeg, flame]),
  }
}
