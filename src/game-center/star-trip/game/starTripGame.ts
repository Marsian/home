import * as THREE from 'three'

import { CameraRig } from './cameraRig'
import { InputController } from './input'
import { createPicoModel } from './playerModel'
import { PlayerController } from './playerController'
import { createSpawnEnvironment } from './spawnEnvironment'

type StarTripE2EApi = {
  getSnapshot: () => {
    ready: boolean
    player: ReturnType<PlayerController['getSnapshot']>
    camera: ReturnType<CameraRig['getSnapshot']>
    canvas: { width: number; height: number }
    playerVisible: boolean
  }
}

declare global {
  interface Window {
    __starTrip_e2e?: StarTripE2EApi
  }
}

function shouldEnableE2E() {
  try {
    const params = new URLSearchParams(window.location.search)
    return params.get('e2e') === '1' || params.get('e2e') === 'true'
  } catch {
    return false
  }
}

function createStars() {
  const geometry = new THREE.BufferGeometry()
  const positions: number[] = []
  for (let i = 0; i < 180; i += 1) {
    const theta = i * 2.399963
    const y = 1 - (i / 179) * 2
    const radius = Math.sqrt(Math.max(0, 1 - y * y))
    const distance = 38 + (i % 9) * 0.72
    positions.push(Math.cos(theta) * radius * distance, y * distance, Math.sin(theta) * radius * distance)
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: 0xfff3d3, size: 0.055, transparent: true, opacity: 0.58 }),
  )
}

function disposeObject(object: THREE.Object3D) {
  const mesh = object as THREE.Mesh
  mesh.geometry?.dispose()
  const material = mesh.material
  if (Array.isArray(material)) material.forEach((item) => item.dispose())
  else material?.dispose()
}

export function createStarTripGame(host: HTMLElement) {
  const e2eEnabled = shouldEnableE2E()
  host.replaceChildren()

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x123b3c)
  scene.fog = new THREE.Fog(0x123b3c, 28, 62)

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120)
  camera.position.set(-7.6, 13.2, 16.4)

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    preserveDrawingBuffer: e2eEnabled,
  })
  renderer.setClearColor(0x123b3c, 1)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.className = 'absolute inset-0 h-full w-full [image-rendering:pixelated]'
  renderer.domElement.dataset.testid = 'star-trip-canvas'
  renderer.domElement.tabIndex = 0
  renderer.domElement.setAttribute('aria-label', 'A Star Trip game canvas')
  host.appendChild(renderer.domElement)

  const hemi = new THREE.HemisphereLight(0xfff3d3, 0x315a5c, 2.65)
  const sun = new THREE.DirectionalLight(0xffd99b, 3.35)
  sun.position.set(6, 9, 5)
  const rim = new THREE.DirectionalLight(0x9ed8e8, 1.1)
  rim.position.set(-7, 4, -6)
  scene.add(hemi, sun, rim)

  const environment = createSpawnEnvironment()
  scene.add(environment)

  const stars = createStars()
  scene.add(stars)

  const pico = createPicoModel()
  scene.add(pico.root)

  const input = new InputController()
  const player = new PlayerController(pico)
  const cameraRig = new CameraRig(camera, host)
  let ready = false

  const resize = () => {
    const rect = host.getBoundingClientRect()
    const width = Math.max(1, Math.floor(rect.width))
    const height = Math.max(1, Math.floor(rect.height))
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }

  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()

  const focusCanvas = () => renderer.domElement.focus({ preventScroll: true })
  renderer.domElement.addEventListener('pointerdown', focusCanvas)

  const clock = new THREE.Clock()
  let raf = 0

  const tick = () => {
    const dt = Math.min(clock.getDelta(), 1 / 30)
    const inputState = input.getState()
    player.update(dt, inputState, input.consumeJumpPressed())
    cameraRig.update(player.getPosition(), player.getUp(), dt)
    stars.rotation.y += dt * 0.012
    renderer.render(scene, camera)
    ready = true
    raf = window.requestAnimationFrame(tick)
  }

  cameraRig.update(player.getPosition(), player.getUp(), 1 / 60)
  tick()

  if (e2eEnabled) {
    window.__starTrip_e2e = {
      getSnapshot: () => {
        const playerPosition = player.getPosition().clone().project(camera)
        return {
          ready,
          player: player.getSnapshot(),
          camera: cameraRig.getSnapshot(),
          canvas: {
            width: renderer.domElement.clientWidth,
            height: renderer.domElement.clientHeight,
          },
          playerVisible:
            playerPosition.z >= -1 &&
            playerPosition.z <= 1 &&
            Math.abs(playerPosition.x) <= 1 &&
            Math.abs(playerPosition.y) <= 1,
        }
      },
    }
  }

  return {
    dispose() {
      window.cancelAnimationFrame(raf)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', focusCanvas)
      cameraRig.dispose()
      input.dispose()
      if (window.__starTrip_e2e?.getSnapshot) delete window.__starTrip_e2e
      scene.traverse(disposeObject)
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
