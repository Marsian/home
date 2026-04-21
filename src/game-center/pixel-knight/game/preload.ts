import { dungeons, legendaryPowers, setBonuses, skills } from '../content/data'
import type { PreloadProgress } from '../types'

let cachedPromise: Promise<void> | null = null
let warmLoaded = false

const preloadSteps = [
  { label: '正在点亮圣殿', wait: 160 },
  { label: '正在整理战利品', wait: 200 },
  { label: '正在描绘骑士帧动画', wait: 170 },
  { label: '正在唤醒敌人素材', wait: 180 },
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

function simulateSpriteBake() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Unable to initialize pixel renderer.')
  ctx.fillStyle = '#f2d08a'
  ctx.fillRect(20, 8, 24, 18)
  ctx.fillStyle = '#326153'
  ctx.fillRect(18, 28, 28, 26)
  ctx.fillStyle = '#f6f3e6'
  ctx.fillRect(12, 24, 10, 22)
  ctx.fillRect(42, 24, 10, 22)
  ctx.fillStyle = '#ffc16d'
  ctx.fillRect(50, 20, 6, 22)
}

export async function preloadGameData() {
  validateStaticData()
  return { dungeons, skills, legendaryPowers, setBonuses }
}

export function clearPixelKnightPreloadCache() {
  cachedPromise = null
  warmLoaded = false
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
        simulateSpriteBake()
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

