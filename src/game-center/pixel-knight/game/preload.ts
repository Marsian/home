import { dungeons, legendaryPowers, setBonuses, skills } from '../content/data'
import { starterVillageLandmarks, starterVillageTerrainPatches } from './maps/starterVillage'
import { resolveLandmarkAsset, type VillageAssetId, villageAssetSources } from '../rendering/villageAssets'
import type { PreloadProgress } from '../types'

let cachedPromise: Promise<void> | null = null
let warmLoaded = false
let villageAssetCache: Record<VillageAssetId, HTMLImageElement> | null = null

const preloadSteps = [
  { label: '正在校准副本与词条表', wait: 220 },
  { label: '正在铺设新手村地砖', wait: 220 },
] as const

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function validateStaticData() {
  if (!dungeons.length || !skills.length || !legendaryPowers.length || !setBonuses.length) {
    throw new Error('Pixel Knight static data is incomplete.')
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`贴图加载失败：${src}`))
    image.src = src
  })
}

function getStarterVillageRequiredAssets(): VillageAssetId[] {
  const ids = new Set<VillageAssetId>()

  for (const patch of starterVillageTerrainPatches) {
    ids.add(patch.assetId as VillageAssetId)
  }

  for (const landmark of starterVillageLandmarks) {
    ids.add(resolveLandmarkAsset(landmark.kind))
  }

  return [...ids]
}

async function preloadVillageAssets(required: VillageAssetId[]) {
  const missing = required.filter((id) => !villageAssetCache?.[id])
  if (!missing.length) return

  const entries = await Promise.all(
    missing.map(async (id) => {
      const src = villageAssetSources[id]
      const image = await loadImage(src)
      return [id, image] as const
    }),
  )

  villageAssetCache = {
    ...(villageAssetCache ?? ({} as Record<VillageAssetId, HTMLImageElement>)),
    ...(Object.fromEntries(entries) as Record<VillageAssetId, HTMLImageElement>),
  }
}

export function getPixelKnightVillageAsset(id: VillageAssetId) {
  return villageAssetCache?.[id] ?? null
}

export async function preloadGameData() {
  validateStaticData()
  return { dungeons, skills, legendaryPowers, setBonuses }
}

export function clearPixelKnightPreloadCache() {
  cachedPromise = null
  warmLoaded = false
  villageAssetCache = null
}

export function preloadPixelKnightAssets(onProgress: (progress: PreloadProgress) => void) {
  const run = async () => {
    const params = new URLSearchParams(window.location.search)
    const shouldFail = params.get('pixelKnightPreloadFail') === '1'
    const requiredVillageAssets = getStarterVillageRequiredAssets()

    for (let index = 0; index < preloadSteps.length; index += 1) {
      const step = preloadSteps[index]
      if (shouldFail && index === 1) {
        throw new Error('素材图集未能成功解压，请重试。')
      }
      if (index === 0) await preloadGameData()
      if (index === 1) await preloadVillageAssets(requiredVillageAssets)

      await sleep(warmLoaded ? Math.max(35, step.wait * 0.22) : step.wait)
      onProgress({
        loaded: index + 1,
        total: preloadSteps.length,
        ratio: (index + 1) / preloadSteps.length,
        label: step.label,
      })
    }
    warmLoaded = true
  }

  if (warmLoaded && cachedPromise) return cachedPromise
  cachedPromise = run()

  return cachedPromise
}
