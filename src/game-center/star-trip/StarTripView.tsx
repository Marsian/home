import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type FocusId = 'signal' | 'jetpack' | 'energy' | 'village'

const focusCopy: Record<FocusId, { label: string; title: string; body: string }> = {
  signal: {
    label: 'Signal',
    title: 'Reach the mountain tower',
    body: 'A tiny rocket has crashed. The only way home is the relay tower rising from the highest peak.',
  },
  jetpack: {
    label: 'Jetpack',
    title: 'Glide farther with every cell',
    body: 'The courier pack can barely lift off at first. Energy blocks raise its flight ceiling and open new routes.',
  },
  energy: {
    label: 'Energy',
    title: 'Find, trade, and earn power',
    body: 'Most blocks are scattered in the wild. Some sit in NPC pockets and ask for fish, crops, or favors.',
  },
  village: {
    label: 'Meet',
    title: 'Neighbors with routines',
    body: 'Locals keep their own tiny schedules, trades, worries, and favorite corners of the planet.',
  },
}

const featureOrder: FocusId[] = ['signal', 'jetpack', 'energy', 'village']

const surfaceUp = new THREE.Vector3(0, 1, 0)
const patchUp = new THREE.Vector3(0, 0, 1)

function pointOnSphere(lat: number, lon: number, radius: number) {
  const phi = THREE.MathUtils.degToRad(90 - lat)
  const theta = THREE.MathUtils.degToRad(lon + 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

function placeOnPlanet(object: THREE.Object3D, lat: number, lon: number, radius: number, up = surfaceUp) {
  const normal = pointOnSphere(lat, lon, 1).normalize()
  object.position.copy(normal.multiplyScalar(radius))
  object.quaternion.setFromUnitVectors(up, normal)
}

function makePatch(lat: number, lon: number, size: number, color: number, radius = 2.02) {
  const patch = new THREE.Mesh(
    new THREE.CircleGeometry(size, 20),
    new THREE.MeshToonMaterial({ color, side: THREE.DoubleSide }),
  )
  placeOnPlanet(patch, lat, lon, radius, patchUp)
  return patch
}

function makeTree(lat: number, lon: number, scale = 1) {
  const tree = new THREE.Group()
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035 * scale, 0.045 * scale, 0.22 * scale, 6),
    new THREE.MeshToonMaterial({ color: 0x916545 }),
  )
  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(0.16 * scale, 0.34 * scale, 7),
    new THREE.MeshToonMaterial({ color: 0x2f9a70 }),
  )
  trunk.position.y = 0.11 * scale
  crown.position.y = 0.36 * scale
  tree.add(trunk, crown)
  placeOnPlanet(tree, lat, lon, 2.02)
  return tree
}

function makeMarker(lat: number, lon: number, color: number) {
  const marker = new THREE.Group()
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.4, 6),
    new THREE.MeshToonMaterial({ color: 0xf4d7a1 }),
  )
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 8),
    new THREE.MeshToonMaterial({ color, emissive: color, emissiveIntensity: 0.18 }),
  )
  pole.position.y = 0.2
  glow.position.y = 0.45
  marker.add(pole, glow)
  placeOnPlanet(marker, lat, lon, 2.04)
  return marker
}

function makeEnergyBlock(lat: number, lon: number) {
  const block = new THREE.Group()
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.12, 0),
    new THREE.MeshToonMaterial({ color: 0xffd95f, emissive: 0xffb536, emissiveIntensity: 0.25 }),
  )
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.07, 0.1, 6),
    new THREE.MeshToonMaterial({ color: 0x6a6f72 }),
  )
  crystal.position.y = 0.2
  base.position.y = 0.05
  block.add(base, crystal)
  placeOnPlanet(block, lat, lon, 2.08)
  return block
}

function makeCommTower(lat: number, lon: number) {
  const tower = new THREE.Group()
  const mastMaterial = new THREE.MeshToonMaterial({ color: 0xe9d7a9 })
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.045, 0.82, 6), mastMaterial)
  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.12, 12, 1, true),
    new THREE.MeshToonMaterial({ color: 0x8ec7d2, side: THREE.DoubleSide }),
  )
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 12, 8),
    new THREE.MeshToonMaterial({ color: 0xffd95f, emissive: 0xffc84f, emissiveIntensity: 0.3 }),
  )
  mast.position.y = 0.41
  dish.position.set(0.12, 0.72, 0)
  dish.rotation.z = -0.95
  beacon.position.y = 0.9
  tower.add(mast, dish, beacon)
  placeOnPlanet(tower, lat, lon, 2.04)
  return tower
}

function makeCrashedRocket(lat: number, lon: number) {
  const rocket = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.12, 0.36, 4, 10),
    new THREE.MeshToonMaterial({ color: 0xf3e7cf }),
  )
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.18, 12),
    new THREE.MeshToonMaterial({ color: 0xe55d55 }),
  )
  const finA = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.16), new THREE.MeshToonMaterial({ color: 0x4f7f98 }))
  const finB = finA.clone()
  const scorch = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 14),
    new THREE.MeshToonMaterial({ color: 0x5f4b3c, side: THREE.DoubleSide }),
  )
  body.rotation.z = Math.PI / 2
  nose.position.x = 0.28
  nose.rotation.z = -Math.PI / 2
  finA.position.set(-0.2, -0.08, 0.1)
  finB.position.set(-0.2, -0.08, -0.1)
  scorch.rotation.x = Math.PI / 2
  scorch.position.y = -0.02
  rocket.add(scorch, body, nose, finA, finB)
  rocket.rotation.z = -0.45
  placeOnPlanet(rocket, lat, lon, 2.08)
  return rocket
}

function makeTraveler() {
  const traveler = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 16, 12),
    new THREE.MeshToonMaterial({ color: 0xf0b35d }),
  )
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 16, 12),
    new THREE.MeshToonMaterial({ color: 0xffd19a }),
  )
  const earMaterial = new THREE.MeshToonMaterial({ color: 0xffc489 })
  const leftEar = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.08, 3), earMaterial)
  const rightEar = leftEar.clone()
  const jetpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.18, 0.08),
    new THREE.MeshToonMaterial({ color: 0x567a96 }),
  )
  const scarf = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.035, 0.05),
    new THREE.MeshToonMaterial({ color: 0xe55d55 }),
  )
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.045, 0.16, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd95f, transparent: true, opacity: 0.76 }),
  )
  body.position.y = 0.18
  head.position.y = 0.36
  leftEar.position.set(-0.055, 0.455, 0)
  leftEar.rotation.z = 0.28
  rightEar.position.set(0.055, 0.455, 0)
  rightEar.rotation.z = -0.28
  scarf.position.set(0.07, 0.29, 0.08)
  jetpack.position.set(0, 0.19, -0.12)
  flame.position.set(0, 0.05, -0.16)
  flame.rotation.x = Math.PI
  traveler.add(body, head, leftEar, rightEar, scarf, jetpack, flame)
  placeOnPlanet(traveler, 18, -34, 2.07)
  return traveler
}

function createStarTripScene(host: HTMLDivElement) {
  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0x122f3f, 8, 13)

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
  camera.position.set(0, 0.65, 6.4)

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.className = 'h-full w-full'
  renderer.domElement.style.imageRendering = 'pixelated'
  host.appendChild(renderer.domElement)

  const hemi = new THREE.HemisphereLight(0xf8f0d8, 0x255569, 2.5)
  const sun = new THREE.DirectionalLight(0xffe2a8, 3.2)
  sun.position.set(4, 5, 7)
  scene.add(hemi, sun)

  const world = new THREE.Group()
  scene.add(world)

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(2, 36, 24),
    new THREE.MeshToonMaterial({ color: 0x74bf91 }),
  )
  world.add(planet)

  world.add(makePatch(18, -38, 0.55, 0x69a6c6))
  world.add(makePatch(-16, 42, 0.42, 0x4d8cb5))
  world.add(makePatch(36, 72, 0.38, 0xc59a63))
  world.add(makePatch(-35, -62, 0.46, 0xf0c276))
  world.add(makePatch(3, 108, 0.34, 0x8f6f55))
  world.add(makePatch(42, -128, 0.34, 0x7a7f87))

  const pathMaterial = new THREE.MeshToonMaterial({ color: 0xe9c88d, side: THREE.DoubleSide })
  for (let i = 0; i < 16; i += 1) {
    const stone = new THREE.Mesh(new THREE.CircleGeometry(0.055 + (i % 3) * 0.012, 10), pathMaterial)
    placeOnPlanet(stone, 24 - i * 2.5, -80 + i * 10, 2.045, patchUp)
    world.add(stone)
  }

  const farmMaterial = new THREE.MeshToonMaterial({ color: 0x7f5b3b, side: THREE.DoubleSide })
  for (let i = 0; i < 6; i += 1) {
    const plot = new THREE.Mesh(new THREE.CircleGeometry(0.07, 4), farmMaterial)
    plot.scale.set(1.6, 0.8, 1)
    placeOnPlanet(plot, 34 + (i % 2) * 3, 60 + Math.floor(i / 2) * 6, 2.055, patchUp)
    world.add(plot)
  }

  ;[
    [8, -10, 0.95],
    [2, -2, 0.82],
    [-5, 8, 1.1],
    [-18, 82, 0.75],
    [-24, 92, 0.9],
    [20, 122, 0.8],
    [42, -120, 1],
    [48, -132, 0.85],
    [-38, -78, 0.82],
  ].forEach(([lat, lon, scale]) => world.add(makeTree(lat, lon, scale)))

  world.add(makeMarker(24, -74, 0xffd36e))
  world.add(makeMarker(36, 70, 0x8fe08a))
  world.add(makeMarker(-15, 43, 0x80d9ff))
  world.add(makeMarker(-34, -62, 0xff8b70))
  world.add(makeCrashedRocket(-32, 116))
  world.add(makeCommTower(42, -128))
  world.add(makeEnergyBlock(10, -82))
  world.add(makeEnergyBlock(30, 42))
  world.add(makeEnergyBlock(-22, -14))
  world.add(makeTraveler())

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.42, 0.012, 6, 96),
    new THREE.MeshBasicMaterial({ color: 0xffe9ae, transparent: true, opacity: 0.38 }),
  )
  ring.rotation.x = Math.PI / 2.8
  scene.add(ring)

  const starsGeometry = new THREE.BufferGeometry()
  const starPositions: number[] = []
  for (let i = 0; i < 160; i += 1) {
    const r = 8 + Math.random() * 4
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2))
    starPositions.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi))
  }
  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3))
  const stars = new THREE.Points(
    starsGeometry,
    new THREE.PointsMaterial({ color: 0xfff6d6, size: 0.035, transparent: true, opacity: 0.65 }),
  )
  scene.add(stars)

  const drag = { active: false, x: 0, y: 0 }
  const target = { x: -0.22, y: 0.42 }
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false

  const resize = () => {
    const { width, height } = host.getBoundingClientRect()
    const aspect = Math.max(width, 1) / Math.max(height, 1)
    camera.aspect = aspect
    camera.position.z = aspect < 0.72 ? 7.8 : 6.4
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }

  const onPointerDown = (event: PointerEvent) => {
    drag.active = true
    drag.x = event.clientX
    drag.y = event.clientY
    renderer.domElement.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!drag.active) return
    target.y += (event.clientX - drag.x) * 0.006
    target.x += (event.clientY - drag.y) * 0.004
    target.x = THREE.MathUtils.clamp(target.x, -0.95, 0.85)
    drag.x = event.clientX
    drag.y = event.clientY
  }

  const onPointerUp = (event: PointerEvent) => {
    drag.active = false
    renderer.domElement.releasePointerCapture(event.pointerId)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') target.y -= 0.16
    if (event.code === 'ArrowRight' || event.code === 'KeyD') target.y += 0.16
    if (event.code === 'ArrowUp' || event.code === 'KeyW') target.x -= 0.1
    if (event.code === 'ArrowDown' || event.code === 'KeyS') target.x += 0.1
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointermove', onPointerMove)
  renderer.domElement.addEventListener('pointerup', onPointerUp)
  renderer.domElement.addEventListener('pointercancel', onPointerUp)
  window.addEventListener('keydown', onKeyDown)

  resize()
  const observer = new ResizeObserver(resize)
  observer.observe(host)

  let raf = 0
  const startTime = performance.now()
  const animate = () => {
    const elapsed = (performance.now() - startTime) / 1000
    if (!reducedMotion && !drag.active) target.y += 0.0009
    world.rotation.x += (target.x - world.rotation.x) * 0.08
    world.rotation.y += (target.y - world.rotation.y) * 0.08
    ring.rotation.z = elapsed * 0.05
    stars.rotation.y = elapsed * 0.015
    renderer.render(scene, camera)
    raf = window.requestAnimationFrame(animate)
  }
  animate()

  const disposeObject = (object: THREE.Object3D) => {
    const mesh = object as THREE.Mesh
    mesh.geometry?.dispose()
    const material = mesh.material
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose())
    } else {
      material?.dispose()
    }
  }

  return () => {
    window.cancelAnimationFrame(raf)
    observer.disconnect()
    window.removeEventListener('keydown', onKeyDown)
    renderer.domElement.removeEventListener('pointerdown', onPointerDown)
    renderer.domElement.removeEventListener('pointermove', onPointerMove)
    renderer.domElement.removeEventListener('pointerup', onPointerUp)
    renderer.domElement.removeEventListener('pointercancel', onPointerUp)
    scene.traverse(disposeObject)
    renderer.dispose()
    renderer.domElement.remove()
  }
}

export default function StarTripView() {
  const navigate = useNavigate()
  const hostRef = useRef<HTMLDivElement>(null)
  const [focus, setFocus] = useState<FocusId>('signal')

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    return createStarTripScene(host)
  }, [])

  const active = focusCopy[focus]

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#102d3a] text-[#fff5dd]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,#183f4e_0%,#102d3a_46%,#241d35_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-70 [background:radial-gradient(circle_at_24%_16%,rgba(255,226,152,0.3),transparent_24%),radial-gradient(circle_at_78%_26%,rgba(125,207,218,0.22),transparent_22%),linear-gradient(180deg,transparent,rgba(12,11,26,0.52))]"
      />

      <div ref={hostRef} className="absolute inset-0" aria-label="a star trip tiny planet prototype" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_28%,rgba(4,12,18,0.3)_72%,rgba(4,10,16,0.64)_100%)]" />

      <section className="relative z-10 flex min-h-[100dvh] flex-col px-5 py-5 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-8 sm:py-7 sm:pl-[104px]">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.36em] text-[#ffe4a7]/75 uppercase">star-trip</p>
            <h1 className="mt-2 max-w-[10ch] text-[clamp(2.8rem,9vw,6.6rem)] leading-[0.88] font-black tracking-[0.02em] text-[#fff3d3] lowercase drop-shadow-[0_8px_28px_rgba(0,0,0,0.35)]">
              a star trip
            </h1>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/games')}
            className="border-[#fff0c6]/35 bg-[#fff4ce]/12 text-[#fff3d3] shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-md hover:bg-[#fff4ce]/18"
          >
            Back
          </Button>
        </header>

        <div className="mt-auto grid max-w-5xl gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="max-w-xl border-l border-[#ffe2a1]/50 pl-4">
            <p className="text-sm font-semibold tracking-[0.22em] text-[#91dfc3] uppercase">{active.label}</p>
            <h2 className="mt-2 text-2xl leading-tight font-bold text-[#fff3d3] sm:text-3xl">{active.title}</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#f6e6c8]/78 sm:text-base">{active.body}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:w-[280px]">
            {featureOrder.map((item) => (
              <Button
                key={item}
                type="button"
                variant="outline"
                onClick={() => setFocus(item)}
                className={cn(
                  'h-11 justify-center border-[#fff0c6]/28 bg-[#173a43]/46 px-3 text-xs font-bold tracking-[0.16em] text-[#fff3d3] uppercase backdrop-blur-md hover:bg-[#fff4ce]/14',
                  focus === item && 'border-[#ffdc7e]/70 bg-[#ffdc7e]/20 text-[#fff8e6]',
                )}
              >
                {focusCopy[item].label}
              </Button>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
