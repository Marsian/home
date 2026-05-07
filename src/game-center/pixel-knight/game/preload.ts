import { dungeons, legendaryPowers, setBonuses, skills } from '../content/data'
import characterSelectBgUrl from '@/game-center/pixel-knight/assets/ui/character-select-bg-clean.png'
import buttonDisabledFrameUrl from '@/game-center/pixel-knight/assets/ui/character-select/button-disabled.png'
import buttonPrimaryFrameUrl from '@/game-center/pixel-knight/assets/ui/character-select/button-primary.png'
import characterCardFocusedFrameUrl from '@/game-center/pixel-knight/assets/ui/character-select/character-card-focused.png'
import characterCardNormalFrameUrl from '@/game-center/pixel-knight/assets/ui/character-select/character-card-normal.png'
import characterCardSelectedFrameUrl from '@/game-center/pixel-knight/assets/ui/character-select/character-card-selected.png'
import titleBarFrameUrl from '@/game-center/pixel-knight/assets/ui/character-select/title-bar.png'
import closeButtonFrameUrl from '@/game-center/pixel-knight/assets/ui/inventory/close-button-v2.png'
import hudBackpackButtonUrl from '@/game-center/pixel-knight/assets/ui/inventory/hud-backpack-button-v2.png'
import hudBlueFillUrl from '@/game-center/pixel-knight/assets/ui/inventory/hud-blue-fill-core-v2.png'
import hudHealthFrameUrl from '@/game-center/pixel-knight/assets/ui/inventory/hud-status-frame-v2.png'
import hudHealthFrameFrontUrl from '@/game-center/pixel-knight/assets/ui/inventory/hud-status-frame-front-v2.png'
import hudHpFillUrl from '@/game-center/pixel-knight/assets/ui/inventory/hud-hp-fill-core-v2.png'
import hudMinimapFrameUrl from '@/game-center/pixel-knight/assets/ui/inventory/hud-minimap-frame-v2.png'
import hudPauseButtonUrl from '@/game-center/pixel-knight/assets/ui/inventory/hud-pause-button-v2.png'
import hudPromptPlaqueUrl from '@/game-center/pixel-knight/assets/ui/inventory/hud-prompt-plaque-v2.png'
import inventoryBgFrameUrl from '@/game-center/pixel-knight/assets/ui/inventory/inventory-bg-v2.png'
import inventoryGridPanelUrl from '@/game-center/pixel-knight/assets/ui/inventory/inventory-grid-6x6-v2.png'
import inventorySlotFrameUrl from '@/game-center/pixel-knight/assets/ui/inventory/inventory-slot-v2.png'
import placeholderAmuletIconUrl from '@/game-center/pixel-knight/assets/ui/inventory/placeholders/amulet.png'
import placeholderArmorIconUrl from '@/game-center/pixel-knight/assets/ui/inventory/placeholders/armor.png'
import placeholderHelmetIconUrl from '@/game-center/pixel-knight/assets/ui/inventory/placeholders/helmet.png'
import placeholderMainHandIconUrl from '@/game-center/pixel-knight/assets/ui/inventory/placeholders/main-hand.png'
import placeholderOffHandIconUrl from '@/game-center/pixel-knight/assets/ui/inventory/placeholders/off-hand.png'
import placeholderRingIconUrl from '@/game-center/pixel-knight/assets/ui/inventory/placeholders/ring.png'
import statArmorIconUrl from '@/game-center/pixel-knight/assets/ui/inventory/stats/armor.png'
import statAttackIconUrl from '@/game-center/pixel-knight/assets/ui/inventory/stats/attack.png'
import statCritChanceIconUrl from '@/game-center/pixel-knight/assets/ui/inventory/stats/crit-chance.png'
import statCritDamageIconUrl from '@/game-center/pixel-knight/assets/ui/inventory/stats/crit-damage.png'
import statGoldIconUrl from '@/game-center/pixel-knight/assets/ui/inventory/stats/gold.png'
import statHealthIconUrl from '@/game-center/pixel-knight/assets/ui/inventory/stats/health.png'
import statMoveSpeedIconUrl from '@/game-center/pixel-knight/assets/ui/inventory/stats/move-speed.png'
import statSkillIconUrl from '@/game-center/pixel-knight/assets/ui/inventory/stats/skill.png'
import { type VillageAssetId, villageAssetSources } from '../rendering/villageAssets'
import type { PreloadProgress } from '../types'

let cachedPromise: Promise<void> | null = null
let warmLoaded = false
let villageAssetCache: Record<VillageAssetId, HTMLImageElement> | null = null
let uiAssetsLoaded = false

const preloadSteps = [
  { label: '正在校准副本与词条表', wait: 220 },
  { label: '正在同步界面图集', wait: 220 },
  { label: '正在铺设新手村地砖', wait: 220 },
] as const

const pixelKnightUiAssetSources = [
  characterSelectBgUrl,
  buttonDisabledFrameUrl,
  buttonPrimaryFrameUrl,
  characterCardFocusedFrameUrl,
  characterCardNormalFrameUrl,
  characterCardSelectedFrameUrl,
  titleBarFrameUrl,
  closeButtonFrameUrl,
  hudBackpackButtonUrl,
  hudBlueFillUrl,
  hudHealthFrameUrl,
  hudHealthFrameFrontUrl,
  hudHpFillUrl,
  hudMinimapFrameUrl,
  hudPauseButtonUrl,
  hudPromptPlaqueUrl,
  inventoryBgFrameUrl,
  inventoryGridPanelUrl,
  inventorySlotFrameUrl,
  placeholderAmuletIconUrl,
  placeholderArmorIconUrl,
  placeholderHelmetIconUrl,
  placeholderMainHandIconUrl,
  placeholderOffHandIconUrl,
  placeholderRingIconUrl,
  statArmorIconUrl,
  statAttackIconUrl,
  statCritChanceIconUrl,
  statCritDamageIconUrl,
  statGoldIconUrl,
  statHealthIconUrl,
  statMoveSpeedIconUrl,
  statSkillIconUrl,
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
    image.onload = async () => {
      try {
        await image.decode()
      } catch {
        // Some browsers report decode failures for already-loaded images; drawing can still succeed.
      }
      resolve(image)
    }
    image.onerror = () => reject(new Error(`贴图加载失败：${src}`))
    image.src = src
  })
}

function primeImageDraws(images: HTMLImageElement[]) {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.imageSmoothingEnabled = false
  for (const image of images) {
    ctx.clearRect(0, 0, 1, 1)
    ctx.drawImage(image, 0, 0, 1, 1)
  }
}

function getAllVillageAssets(): VillageAssetId[] {
  return Object.keys(villageAssetSources) as VillageAssetId[]
}

async function preloadUiAssets() {
  if (uiAssetsLoaded) return
  await Promise.all(pixelKnightUiAssetSources.map((src) => loadImage(src)))
  uiAssetsLoaded = true
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
  primeImageDraws(entries.map(([, image]) => image))

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
  uiAssetsLoaded = false
}

export function preloadPixelKnightAssets(onProgress: (progress: PreloadProgress) => void) {
  const run = async () => {
    const params = new URLSearchParams(window.location.search)
    const shouldFail = params.get('pixelKnightPreloadFail') === '1'
    const villageAssets = getAllVillageAssets()

    for (let index = 0; index < preloadSteps.length; index += 1) {
      const step = preloadSteps[index]
      if (shouldFail && index === 2) {
        throw new Error('素材图集未能成功解压，请重试。')
      }
      if (index === 0) await preloadGameData()
      if (index === 1) await preloadUiAssets()
      if (index === 2) await preloadVillageAssets(villageAssets)

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
