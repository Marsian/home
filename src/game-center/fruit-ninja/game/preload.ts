import * as THREE from 'three'

import { BOMB_RADIUS, FRUIT_RADIUS } from './entityParams'
import { createFruitHalfMesh, disposeFruitHalfRoot } from './fruitHalfMesh'
import { createBombMesh, createFruitMesh, disposeObject3D } from './meshes'
import { primeAppleReferenceModel } from './appleReferenceModel'
import { primeKiwiReferenceModel } from './kiwiReferenceModel'
import { primeLemonReferenceModel } from './lemonReferenceModel'
import { primePearReferenceModel } from './pearReferenceModel'
import { primePineappleReferenceModel } from './pineappleReferenceModel'
import { primeStrawberryReferenceModel } from './strawberryReferenceModel'
import type { FruitArchetype } from './spawn'

type PreloadFruit = {
  kind: FruitArchetype
  skin: number
  flesh: number
}

export type FruitNinjaPreloadProgress = {
  loaded: number
  total: number
  ratio: number
  label: string
}

const PRELOAD_FRUITS: PreloadFruit[] = [
  { kind: 'watermelon', skin: 0x287a38, flesh: 0xff2a4a },
  { kind: 'apple', skin: 0xcc2228, flesh: 0xfff5f0 },
  { kind: 'banana', skin: 0xf0c830, flesh: 0xfff8dc },
  { kind: 'lemon', skin: 0xf5e050, flesh: 0xfffff0 },
  { kind: 'lime', skin: 0x4a8f2e, flesh: 0xc8f0a0 },
  { kind: 'mango', skin: 0xff8820, flesh: 0xffcc70 },
  { kind: 'pineapple', skin: 0xd4a020, flesh: 0xfff5d0 },
  { kind: 'coconut', skin: 0x5a4030, flesh: 0xf8f4ea },
  { kind: 'strawberry', skin: 0xe8202a, flesh: 0xffa8b8 },
  { kind: 'kiwi', skin: 0x7a5a1a, flesh: 0xb8e060 },
  { kind: 'orange', skin: 0xff8c00, flesh: 0xffaa44 },
  { kind: 'plum', skin: 0x6a2078, flesh: 0xe0c0e0 },
  { kind: 'pear', skin: 0xb8c840, flesh: 0xfffff0 },
  { kind: 'peach', skin: 0xff9a6a, flesh: 0xffe0c8 },
  { kind: 'passionfruit', skin: 0x6b3828, flesh: 0xf0d890 },
  { kind: 'cherry', skin: 0xb81028, flesh: 0xff2848 },
]

const PRELOAD_STEPS_TOTAL = 6 + PRELOAD_FRUITS.length * 3 + 1

let preloadPromise: Promise<void> | null = null
let latestProgress: FruitNinjaPreloadProgress = {
  loaded: 0,
  total: PRELOAD_STEPS_TOTAL,
  ratio: 0,
  label: 'Preparing dojo',
}
const progressListeners = new Set<(progress: FruitNinjaPreloadProgress) => void>()

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

export function preloadFruitNinjaAssets(
  onProgress?: (progress: FruitNinjaPreloadProgress) => void,
) {
  if (onProgress) {
    progressListeners.add(onProgress)
    onProgress(latestProgress)
  }

  if (!preloadPromise) {
    preloadPromise = runPreload()
  }

  return preloadPromise.finally(() => {
    if (onProgress) progressListeners.delete(onProgress)
  })
}

function emitProgress(progress: FruitNinjaPreloadProgress) {
  latestProgress = progress
  for (const listener of progressListeners) listener(progress)
}

async function runPreload() {
  let loaded = 0

  const advance = async (label: string, work?: () => void | Promise<void>) => {
    if (work) await work()
    loaded += 1
    emitProgress({
      loaded,
      total: PRELOAD_STEPS_TOTAL,
      ratio: loaded / PRELOAD_STEPS_TOTAL,
      label,
    })
    await nextFrame()
  }

  await advance('Loading apple model', () => primeAppleReferenceModel())
  await advance('Loading lemon model', () => primeLemonReferenceModel())
  await advance('Loading kiwi model', () => primeKiwiReferenceModel())
  await advance('Loading pear model', () => primePearReferenceModel())
  await advance('Loading pineapple model', () => primePineappleReferenceModel())
  await advance('Loading strawberry model', () => primeStrawberryReferenceModel())

  for (const fruit of PRELOAD_FRUITS) {
    const radius = FRUIT_RADIUS[fruit.kind]
    const skinColor = new THREE.Color(fruit.skin)
    const fleshColor = new THREE.Color(fruit.flesh)

    await advance(`Warming ${fruit.kind}`, () => {
      const root = createFruitMesh(radius, fruit.kind, fruit.skin)
      disposeObject3D(root)
    })

    await advance(`Preparing ${fruit.kind} slice`, () => {
      const topHalf = createFruitHalfMesh(
        radius,
        new THREE.Vector3(0, 1, 0),
        skinColor,
        fleshColor,
        fruit.kind,
        -1,
      )
      disposeFruitHalfRoot(topHalf)
    })

    await advance(`Preparing ${fruit.kind} slice`, () => {
      const bottomHalf = createFruitHalfMesh(
        radius,
        new THREE.Vector3(0, -1, 0),
        skinColor,
        fleshColor,
        fruit.kind,
        1,
      )
      disposeFruitHalfRoot(bottomHalf)
    })
  }

  await advance('Preparing bomb', () => {
    const bomb = createBombMesh(BOMB_RADIUS)
    disposeObject3D(bomb)
  })

  emitProgress({
    loaded: PRELOAD_STEPS_TOTAL,
    total: PRELOAD_STEPS_TOTAL,
    ratio: 1,
    label: 'Ready',
  })
}
