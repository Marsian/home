import { dungeons, legendaryPowers, setBonuses, skills } from '../content/data'
import { type VillageAssetId, villageAssetSources } from '../rendering/villageAssets'
import type { PixelKnightSpriteMeta, PreloadProgress } from '../types'

let cachedPromise: Promise<void> | null = null
let warmLoaded = false
let heroKnightSpriteAsset: { image: HTMLImageElement; meta: PixelKnightSpriteMeta } | null = null
let villageAssetCache: Record<VillageAssetId, HTMLImageElement> | null = null

const heroKnightSpriteSrc = '/images/pixel-knight/characters/hero-knight-a1-no-scarf.png'
const heroKnightMetaSrc = '/images/pixel-knight/characters/hero-knight-a1-no-scarf.meta.json'

const preloadSteps = [
  { label: '正在点亮圣殿', wait: 160 },
  { label: '正在整理战利品', wait: 200 },
  { label: '正在描绘骑士帧动画', wait: 170 },
  { label: '正在铺设新手村地砖', wait: 180 },
  { label: '正在装配掉落图标', wait: 160 },
  { label: '正在校准副本配置', wait: 190 },
  { label: '正在装入技能与词条表', wait: 180 },
]

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

async function preloadHeroKnightSprite() {
  const image = await loadImage(heroKnightSpriteSrc)
  let meta: PixelKnightSpriteMeta

  try {
    const metaResponse = await fetch(heroKnightMetaSrc)
    if (!metaResponse.ok) throw new Error('missing-meta')
    meta = (await metaResponse.json()) as PixelKnightSpriteMeta
  } catch {
    // Fallback: keep runtime robust even when external meta is not available yet.
    meta = {
      assetFamily: 'hero-knight',
      version: 'fallback-1',
      frameWidth: image.naturalWidth,
      frameHeight: image.naturalHeight,
      directions: ['right', 'left'],
      animations: { idle: { frames: [0], fps: 1 } },
      pivot: { x: Math.round(image.naturalWidth * 0.5), y: Math.round(image.naturalHeight * 0.84) },
      selectedDirection: 'right',
      backupDirection: 'left',
    }
  }

  heroKnightSpriteAsset = { image, meta }
}

export function getPixelKnightHeroSpriteAsset() {
  return heroKnightSpriteAsset
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
  heroKnightSpriteAsset = null
  villageAssetCache = null
}

export function preloadPixelKnightAssets(onProgress: (progress: PreloadProgress) => void) {
  const run = async () => {
    const params = new URLSearchParams(window.location.search)
    const shouldFail = params.get('pixelKnightPreloadFail') === '1'

    for (let index = 0; index < preloadSteps.length; index += 1) {
      const step = preloadSteps[index]
      if (shouldFail && index === 2) {
        throw new Error('素材图集未能成功解压，请重试。')
      }
      if (index === 0) {
        validateStaticData()
      }
      if (index === 2) {
        await preloadHeroKnightSprite()
      }
      if (index === 3) {
        const entries = await Promise.all(
          (Object.entries(villageAssetSources) as Array<[VillageAssetId, string]>).map(async ([id, src]) => {
            const image = await loadImage(src)
            return [id, image] as const
          }),
        )
        villageAssetCache = Object.fromEntries(entries) as Record<VillageAssetId, HTMLImageElement>
      }
      if (index === 5) {
        await preloadGameData()
      }
      await sleep(warmLoaded ? Math.max(45, step.wait * 0.34) : step.wait)
      onProgress({
        loaded: index + 1,
        total: preloadSteps.length,
        ratio: (index + 1) / preloadSteps.length,
        label: step.label,
      })
    }
    warmLoaded = true
  }

  if (!cachedPromise || !warmLoaded) {
    cachedPromise = run()
  } else {
    cachedPromise = run()
  }

  return cachedPromise
}
