import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import picoModelUrl from '../assets/models/characters/pico/pico-v0.1.1-blockout.glb?url'

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
  flame: THREE.Object3D | null
  baseTransforms: Map<THREE.Object3D, PicoBaseTransform>
}

const loader = new GLTFLoader()
const targetHeight = 1.36

const materialPalette: Record<string, number> = {
  Pico_Beak_Gold: 0xffc21f,
  Pico_Body_Tunic_Blue: 0x1d66b3,
  Pico_Body_Tunic_Light_Blue_Hem: 0x58a6dc,
  Pico_Eye_Black: 0x050506,
  Pico_Eye_White: 0xfff7eb,
  Pico_Feather_Indigo: 0x33305f,
  Pico_Mat_Limb_Indigo: 0x2a2858,
}

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

  const leftWing = wrapWithPivot(model, leftWingMesh, 'Pico_Wing_L_Pivot', getWingTopPivot(model, leftWingMesh, 'L'))
  const rightWing = wrapWithPivot(model, rightWingMesh, 'Pico_Wing_R_Pivot', getWingTopPivot(model, rightWingMesh, 'R'))
  const leftLeg = wrapWithPivot(model, leftLegMesh, 'Pico_LegFoot_L_Pivot', new THREE.Vector3(-0.09, 0.42, 0))
  const rightLeg = wrapWithPivot(model, rightLegMesh, 'Pico_LegFoot_R_Pivot', new THREE.Vector3(0.09, 0.42, 0))

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 0.26, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd95f, transparent: true, opacity: 0.78 }),
  )
  flame.name = 'Pico_Debug_JetFlame'
  flame.position.set(0, 0.48, -0.28)
  flame.rotation.x = -Math.PI / 2
  flame.visible = false
  root.add(flame)

  return {
    root,
    model,
    body,
    head,
    leftWing,
    rightWing,
    leftLeg,
    rightLeg,
    flame,
    baseTransforms: captureBaseTransforms([model, body, head, leftWing, rightWing, leftLeg, rightLeg, flame]),
  }
}
