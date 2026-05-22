import * as THREE from 'three'

import { CameraRig } from './cameraRig'
import { InputController } from './input'
import { createPicoModel } from './playerModel'
import { PlayerController } from './playerController'
import { createSpawnEnvironment } from './spawnEnvironment'

export const STAR_TRIP_DEFAULT_PIXELATION_LEVEL = 2
export const STAR_TRIP_MAX_PIXELATION_LEVEL = 3

export type StarTripRenderSettings = {
  pixelationLevel: number
}

export type StarTripGame = {
  dispose: () => void
  focus: () => void
  setRenderSettings: (settings: StarTripRenderSettings) => void
}

type StarTripE2EApi = {
  getSnapshot: () => {
    ready: boolean
    player: ReturnType<PlayerController['getSnapshot']>
    camera: ReturnType<CameraRig['getSnapshot']>
    canvas: { width: number; height: number }
    renderSettings: StarTripRenderSettings
    pixelation: {
      enabled: boolean
      blockSize: number
      targetWidth: number
      targetHeight: number
    }
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

function normalizePixelationLevel(value: number) {
  if (!Number.isFinite(value)) return STAR_TRIP_DEFAULT_PIXELATION_LEVEL
  return THREE.MathUtils.clamp(Math.round(value), 0, STAR_TRIP_MAX_PIXELATION_LEVEL)
}

function pixelBlockSizeForLevel(level: number) {
  return level <= 0 ? 1 : level
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

type CreateStarTripGameOptions = {
  renderSettings?: Partial<StarTripRenderSettings>
}

export async function createStarTripGame(host: HTMLElement, options: CreateStarTripGameOptions = {}): Promise<StarTripGame> {
  const e2eEnabled = shouldEnableE2E()
  host.replaceChildren()
  let renderSettings: StarTripRenderSettings = {
    pixelationLevel: normalizePixelationLevel(
      options.renderSettings?.pixelationLevel ?? STAR_TRIP_DEFAULT_PIXELATION_LEVEL,
    ),
  }

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

  const pixelRenderTarget = new THREE.WebGLRenderTarget(1, 1, {
    depthBuffer: true,
    stencilBuffer: false,
    magFilter: THREE.NearestFilter,
    minFilter: THREE.NearestFilter,
    type: THREE.UnsignedByteType,
  })
  pixelRenderTarget.texture.name = 'star-trip-pixel-render-target'
  pixelRenderTarget.texture.generateMipmaps = false
  pixelRenderTarget.texture.colorSpace = THREE.SRGBColorSpace

  const screenScene = new THREE.Scene()
  const screenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const screenMaterial = new THREE.MeshBasicMaterial({
    map: pixelRenderTarget.texture,
    depthTest: false,
    depthWrite: false,
  })
  const screenQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), screenMaterial)
  screenScene.add(screenQuad)

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

  const pico = await createPicoModel()
  if (!host.contains(renderer.domElement)) {
    scene.add(pico.root)
    scene.traverse(disposeObject)
    renderer.dispose()
    renderer.domElement.remove()
    pixelRenderTarget.dispose()
    screenQuad.geometry.dispose()
    screenMaterial.dispose()
    return {
      focus() {
        // The async load completed after React had already replaced this canvas.
      },
      setRenderSettings() {
        // The async load completed after React had already replaced this canvas.
      },
      dispose() {
        // The async load completed after React had already replaced this canvas.
      },
    }
  }
  scene.add(pico.root)

  const input = new InputController()
  const player = new PlayerController(pico)
  const cameraRig = new CameraRig(camera, host)
  let ready = false
  let cssWidth = 1
  let cssHeight = 1
  let pixelTargetWidth = 1
  let pixelTargetHeight = 1

  const syncPixelRenderTarget = () => {
    const blockSize = pixelBlockSizeForLevel(renderSettings.pixelationLevel)
    const targetWidth = Math.max(1, Math.floor(cssWidth / blockSize))
    const targetHeight = Math.max(1, Math.floor(cssHeight / blockSize))
    if (targetWidth === pixelTargetWidth && targetHeight === pixelTargetHeight) return
    pixelTargetWidth = targetWidth
    pixelTargetHeight = targetHeight
    pixelRenderTarget.setSize(pixelTargetWidth, pixelTargetHeight)
  }

  const resize = () => {
    const rect = host.getBoundingClientRect()
    const width = Math.max(1, Math.floor(rect.width))
    const height = Math.max(1, Math.floor(rect.height))
    cssWidth = width
    cssHeight = height
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    syncPixelRenderTarget()
  }

  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()

  const focusCanvas = () => renderer.domElement.focus({ preventScroll: true })
  renderer.domElement.addEventListener('pointerdown', focusCanvas)
  focusCanvas()

  const clock = new THREE.Clock()
  let raf = 0
  let e2eApi: StarTripE2EApi | null = null

  const tick = () => {
    const dt = Math.min(clock.getDelta(), 1 / 30)
    const inputState = input.getState()
    player.update(dt, inputState, input.consumeJumpPressed())
    cameraRig.update(player.getPosition(), player.getUp(), dt)
    stars.rotation.y += dt * 0.012
    if (renderSettings.pixelationLevel > 0) {
      syncPixelRenderTarget()
      renderer.setRenderTarget(pixelRenderTarget)
      renderer.render(scene, camera)
      renderer.setRenderTarget(null)
      renderer.render(screenScene, screenCamera)
    } else {
      renderer.setRenderTarget(null)
      renderer.render(scene, camera)
    }
    ready = true
    raf = window.requestAnimationFrame(tick)
  }

  cameraRig.update(player.getPosition(), player.getUp(), 1 / 60)
  tick()

  if (e2eEnabled) {
    e2eApi = {
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
          renderSettings: { ...renderSettings },
          pixelation: {
            enabled: renderSettings.pixelationLevel > 0,
            blockSize: pixelBlockSizeForLevel(renderSettings.pixelationLevel),
            targetWidth: renderSettings.pixelationLevel > 0 ? pixelTargetWidth : 0,
            targetHeight: renderSettings.pixelationLevel > 0 ? pixelTargetHeight : 0,
          },
          playerVisible:
            playerPosition.z >= -1 &&
            playerPosition.z <= 1 &&
            Math.abs(playerPosition.x) <= 1 &&
            Math.abs(playerPosition.y) <= 1,
        }
      },
    }
    window.__starTrip_e2e = e2eApi
  }

  return {
    focus: focusCanvas,
    setRenderSettings(settings: StarTripRenderSettings) {
      renderSettings = {
        pixelationLevel: normalizePixelationLevel(settings.pixelationLevel),
      }
      syncPixelRenderTarget()
    },
    dispose() {
      window.cancelAnimationFrame(raf)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', focusCanvas)
      cameraRig.dispose()
      input.dispose()
      if (window.__starTrip_e2e === e2eApi) delete window.__starTrip_e2e
      scene.traverse(disposeObject)
      pixelRenderTarget.dispose()
      screenQuad.geometry.dispose()
      screenMaterial.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
