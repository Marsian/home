import armorData from '@/game-center/pixel-knight/assets/equipment/armor/iron-armor.json'
import clothCapData from '@/game-center/pixel-knight/assets/equipment/helmet/cloth-cap.json'
import ironHelmetData from '@/game-center/pixel-knight/assets/equipment/helmet/iron-helmet.json'
import swordData from '@/game-center/pixel-knight/assets/equipment/main-hand/iron-sword.json'
import shieldData from '@/game-center/pixel-knight/assets/equipment/off-hand/wood-shield.json'

import type {
  DifficultyConfig,
  DifficultyTier,
  DungeonDef,
  DungeonId,
  EquipmentSlot,
  ItemInstance,
  LegendaryPowerDef,
  PixelKnightProfile,
  RenderableEquipmentAssetId,
  SetBonusDef,
  SkillDef,
} from '../types'

export const PIXEL_KNIGHT_STORAGE_KEY = 'pixel-knight-save-v2'

export const difficultyOrder: DifficultyTier[] = ['normal', 'hard', 'master', 'legend']

export const difficultyConfigs: Record<DifficultyTier, DifficultyConfig> = {
  normal: {
    label: '普通',
    enemyHealthMultiplier: 1,
    enemyDamageMultiplier: 1,
    eliteSpawnBonus: 0,
    bossCadenceMultiplier: 1,
    experienceMultiplier: 1,
    goldMultiplier: 1,
    magicFind: 1,
  },
  hard: {
    label: '困难',
    enemyHealthMultiplier: 1.25,
    enemyDamageMultiplier: 1.18,
    eliteSpawnBonus: 1,
    bossCadenceMultiplier: 1.08,
    experienceMultiplier: 1.35,
    goldMultiplier: 1.25,
    magicFind: 1.2,
  },
  master: {
    label: '大师',
    enemyHealthMultiplier: 1.55,
    enemyDamageMultiplier: 1.35,
    eliteSpawnBonus: 2,
    bossCadenceMultiplier: 1.18,
    experienceMultiplier: 1.75,
    goldMultiplier: 1.55,
    magicFind: 1.42,
  },
  legend: {
    label: '传奇',
    enemyHealthMultiplier: 1.92,
    enemyDamageMultiplier: 1.52,
    eliteSpawnBonus: 3,
    bossCadenceMultiplier: 1.26,
    experienceMultiplier: 2.2,
    goldMultiplier: 1.88,
    magicFind: 1.68,
  },
}

export const dungeons: DungeonDef[] = [
  {
    id: 'sunmeadow',
    name: '晨曦草原',
    subtitle: '第一片适合刷装的暖色地带',
    blurb: '风铃草和青铜图腾之间，会不断涌出追逐圣辉的草原魔物。',
    palette: {
      sky: '#f9d9a4',
      ground: '#88c565',
      accent: '#f5b04f',
      border: '#4a6f3e',
    },
    enemyKinds: ['mossling', 'needlebat', 'vinebrute'],
    bossName: '草原角冠兽',
  },
  {
    id: 'vine-ruins',
    name: '藤蔓遗迹',
    subtitle: '半坍塌的圣殿回廊',
    blurb: '石柱被藤蔓包裹，守卫遗迹的藤脉祭司会呼唤仆从持续围攻。',
    palette: {
      sky: '#d7e7c6',
      ground: '#5d8b58',
      accent: '#d8cb7d',
      border: '#314c2f',
    },
    enemyKinds: ['mossling', 'vinebrute', 'sunpriest'],
    bossName: '根须守门者',
  },
  {
    id: 'crystal-cavern',
    name: '晶洞回廊',
    subtitle: '会反光的蓝金矿脉迷宫',
    blurb: '水晶在黑暗里回响，灵敏的针翼蝠与晶刺守卫会围着骑士盘旋。',
    palette: {
      sky: '#b8d6f8',
      ground: '#678fb8',
      accent: '#77e5ff',
      border: '#234562',
    },
    enemyKinds: ['needlebat', 'sunpriest', 'vinebrute'],
    bossName: '晶核大执事',
  },
]

export const skills: SkillDef[] = [
  {
    id: 'basic-slash',
    name: '三连斩',
    hotkey: 'LMB',
    description: '稳定的近战主力，围绕鼠标方向挥出剑弧。',
    cooldownMs: 360,
  },
  {
    id: 'whirlwind',
    name: '旋风斩',
    hotkey: 'RMB',
    description: '持续旋转并缓慢移动，适合清理成群敌人。',
    cooldownMs: 4600,
  },
  {
    id: 'shield-bash',
    name: '盾击',
    hotkey: 'Q',
    description: '向前顶盾并造成爆发伤害，部分传奇会触发圣光震波。',
    cooldownMs: 3200,
  },
  {
    id: 'holy-dash',
    name: '圣光突进',
    hotkey: 'E',
    description: '沿目标方向快速突进，路径上造成伤害。',
    cooldownMs: 4200,
  },
  {
    id: 'blessing',
    name: '曙光祝福',
    hotkey: 'R',
    description: '短时间提升骑士攻击与护甲，并可能连锁圣光。',
    cooldownMs: 9800,
  },
  {
    id: 'dodge',
    name: '闪避',
    hotkey: 'SPACE',
    description: '快速翻滚规避伤害。',
    cooldownMs: 1800,
  },
]

export const legendaryPowers: LegendaryPowerDef[] = [
  { id: 'whirlwind-trail', name: '旋风余波', description: '旋风斩会留下持续伤害区域。' },
  { id: 'shield-nova', name: '盾击扩散', description: '盾击命中后会触发一次小范围伤害。' },
  { id: 'holy-trail', name: '突进轨迹', description: '圣光突进会在路径上留下伤害轨迹。' },
  { id: 'blessing-chain', name: '祝福连击', description: '祝福期间每秒释放一次追踪光弹。' },
  { id: 'dash-guard', name: '翻滚护甲', description: '闪避结束后获得短暂减伤。' },
  { id: 'crit-brand', name: '易伤标记', description: '被突进命中的敌人更容易被暴击。' },
  { id: 'sunburst', name: '精英爆裂', description: '击败精英时会触发一次范围爆炸。' },
  { id: 'bulwark', name: '低血护甲', description: '生命较低时自动提高护甲。' },
  { id: 'reverberation', name: '旋斩追加', description: '旋风结束后追加一次重击。' },
  { id: 'meadow-grace', name: '击中回复', description: '每次击中都有概率回复少量生命。' },
  { id: 'gilded-edge', name: '掉落金币', description: '稀有和传奇掉落时额外获得金币。' },
  { id: 'boss-hunter', name: '首领克制', description: '对 Boss 造成的伤害提高。' },
]

export const setBonuses: SetBonusDef[] = [
  { id: 'dawn-guard-2', name: '守卫套装 2 件', pieces: 2, description: '护甲提高 18，旋风斩持续时间略微增加。' },
  { id: 'dawn-guard-4', name: '守卫套装 4 件', pieces: 4, description: '盾击附带范围爆炸，祝福期间伤害提高。' },
]

export type RenderableEquipmentCatalogEntry = {
  assetId: RenderableEquipmentAssetId
  slot: Extract<EquipmentSlot, 'helmet' | 'armor' | 'mainHand' | 'offHand'>
  name: string
}

export const renderableEquipmentCatalog: RenderableEquipmentCatalogEntry[] = [
  { assetId: 'cloth-cap', slot: 'helmet', name: clothCapData.name },
  { assetId: 'iron-helmet', slot: 'helmet', name: ironHelmetData.name },
  { assetId: 'iron-armor', slot: 'armor', name: armorData.name },
  { assetId: 'iron-sword', slot: 'mainHand', name: swordData.name },
  { assetId: 'wood-shield', slot: 'offHand', name: shieldData.name },
]

export const renderableEquipmentAssetIds = renderableEquipmentCatalog.map((entry) => entry.assetId)

const renderableEquipmentByAssetId = Object.fromEntries(
  renderableEquipmentCatalog.map((entry) => [entry.assetId, entry]),
) as Record<RenderableEquipmentAssetId, RenderableEquipmentCatalogEntry>

const renderableLootCatalog = renderableEquipmentCatalog.filter((entry) => entry.assetId !== 'iron-sword' && entry.assetId !== 'wood-shield')

export function isRenderableEquipmentAssetId(value: unknown): value is RenderableEquipmentAssetId {
  return typeof value === 'string' && renderableEquipmentAssetIds.includes(value as RenderableEquipmentAssetId)
}

const slotStatWeights: Record<EquipmentSlot, number> = {
  mainHand: 1.4,
  offHand: 1.05,
  helmet: 0.84,
  armor: 1,
  gloves: 0.72,
  boots: 0.72,
  amulet: 0.88,
  ring: 0.64,
}

const setPiecesBySlot: Partial<Record<EquipmentSlot, string>> = {
  helmet: '守卫套装·头',
  armor: '守卫套装·甲',
  gloves: '守卫套装·手',
  boots: '守卫套装·靴',
}

function randomFrom<T>(values: T[]) {
  return values[Math.floor(Math.random() * values.length)]
}

function rollStatBucket(level: number, slot: EquipmentSlot, rarity: ItemInstance['rarity']) {
  const weight = slotStatWeights[slot]
  const baseAttack = Math.round(level * 2.3 * weight)
  const baseArmor = Math.round(level * 1.8 * weight)
  const baseVitality = Math.round(level * 1.4 * weight)
  const rarityBonus =
    rarity === 'common'
      ? 0
      : rarity === 'magic'
        ? 1
        : rarity === 'rare'
          ? 2
          : rarity === 'legendary'
            ? 3
            : 2.5

  const stats: ItemInstance['stats'] = {}
  if (slot === 'mainHand') {
    stats.attack = baseAttack + Math.round(6 * rarityBonus)
    stats.critChance = 0.02 * rarityBonus
    stats.skillPower = Math.round(level * 0.45 * rarityBonus)
  } else if (slot === 'offHand') {
    stats.armor = baseArmor + Math.round(7 * rarityBonus)
    stats.vitality = baseVitality + Math.round(4 * rarityBonus)
  } else if (slot === 'amulet' || slot === 'ring') {
    stats.critChance = 0.01 * (1 + rarityBonus)
    stats.critDamage = 0.04 * rarityBonus
    stats.attack = Math.round(level * 0.8 * rarityBonus)
  } else if (slot === 'boots') {
    stats.armor = Math.round(baseArmor * 0.8)
    stats.moveSpeed = Math.round(4 + rarityBonus * 4)
    stats.vitality = baseVitality
  } else {
    stats.armor = baseArmor + Math.round(3 * rarityBonus)
    stats.vitality = baseVitality + Math.round(4 * rarityBonus)
    if (rarity !== 'common') {
      stats.attack = Math.round(level * 0.5 * rarityBonus)
    }
  }
  return stats
}

function computeItemScore(stats: ItemInstance['stats']) {
  return Math.round(
    (stats.attack ?? 0) * 1.35 +
      (stats.armor ?? 0) * 0.95 +
      (stats.vitality ?? 0) * 1.2 +
      (stats.skillPower ?? 0) * 1 +
      (stats.moveSpeed ?? 0) * 0.8 +
      (stats.critChance ?? 0) * 220 +
      (stats.critDamage ?? 0) * 170,
  )
}

export function createStarterSword(): ItemInstance {
  const stats = { attack: 8, critChance: 0.02, skillPower: 2 }
  return {
    id: 'starter-sword',
    assetId: 'iron-sword',
    name: renderableEquipmentByAssetId['iron-sword'].name,
    slot: 'mainHand',
    rarity: 'common',
    itemLevel: 1,
    stats,
    score: computeItemScore(stats),
    description: '基础短剑，适合近战起手。',
  }
}

export function createStarterShield(): ItemInstance {
  const stats = { armor: 9, vitality: 7 }
  return {
    id: 'starter-shield',
    assetId: 'wood-shield',
    name: renderableEquipmentByAssetId['wood-shield'].name,
    slot: 'offHand',
    rarity: 'common',
    itemLevel: 1,
    stats,
    score: computeItemScore(stats),
    description: '基础木盾，提供稳定防护。',
  }
}

export function createCatalogItem(
  assetId: RenderableEquipmentAssetId,
  itemLevel: number,
  rarity: ItemInstance['rarity'],
  idPrefix: string,
): ItemInstance {
  const catalogEntry = renderableEquipmentByAssetId[assetId]
  const stats = rollStatBucket(itemLevel, catalogEntry.slot, rarity)
  return {
    id: `${idPrefix}-${assetId}`,
    assetId,
    name: catalogEntry.name,
    slot: catalogEntry.slot,
    rarity,
    itemLevel,
    stats,
    score: computeItemScore(stats),
    description: '当前 demo 已有点阵素材，可实时显示在角色身上。',
  }
}

export function createInitialProfile(): PixelKnightProfile {
  return {
    version: 1,
    baseClassId: 'knight',
    level: 1,
    experience: 0,
    gold: 80,
    materials: 0,
    completedRuns: 0,
    equipment: {
      mainHand: createStarterSword(),
      offHand: createStarterShield(),
      helmet: null,
      armor: null,
      amulet: null,
      ring: null,
    },
    stash: [
      createCatalogItem('cloth-cap', 1, 'common', 'initial'),
      createCatalogItem('iron-armor', 1, 'common', 'initial'),
      createCatalogItem('iron-helmet', 1, 'magic', 'initial'),
    ],
    unlockedDifficultiesByDungeon: {
      sunmeadow: ['normal'],
      'vine-ruins': ['normal'],
      'crystal-cavern': ['normal'],
    },
    hasCompletedInitialLoad: false,
  }
}

export function createInitialCharacterProfile(): Omit<PixelKnightProfile, 'version' | 'baseClassId'> {
  const profile = createInitialProfile()
  // keep v1 initializer as source of truth
  const { baseClassId: _baseClassId, version: _version, ...rest } = profile
  return rest
}

export function experienceToNextLevel(level: number) {
  return 110 + (level - 1) * 75
}

export function generateLootItems(
  dungeonId: DungeonId,
  difficulty: DifficultyTier,
  playerLevel: number,
  count: number,
): ItemInstance[] {
  const magicFind = difficultyConfigs[difficulty].magicFind
  return Array.from({ length: count }, (_, index) => {
    const rarityRoll = Math.random() * magicFind
    const rarity: ItemInstance['rarity'] =
      rarityRoll > 1.52
        ? 'set'
        : rarityRoll > 1.28
          ? 'legendary'
          : rarityRoll > 0.92
            ? 'rare'
            : rarityRoll > 0.56
              ? 'magic'
              : 'common'
    const catalogEntry = randomFrom(renderableLootCatalog)
    const slot = catalogEntry.slot
    const itemLevel = Math.max(1, playerLevel + (difficultyOrder.indexOf(difficulty) + 1) * 2)
    const stats = rollStatBucket(itemLevel, slot, rarity)
    const baseName = catalogEntry.name
    let setId: string | undefined
    let legendaryPowerId: string | undefined
    let description: string | undefined
    let name = baseName

    if (rarity === 'set' && setPiecesBySlot[slot]) {
      setId = 'dawn-guard'
      name = setPiecesBySlot[slot]!
      description = '曙光守誓套装的一部分，适合围绕盾击与祝福构筑。'
    } else if (rarity === 'legendary') {
      const power = randomFrom(legendaryPowers)
      legendaryPowerId = power.id
      description = power.description
      name = `${baseName}·${power.name}`
    } else if (rarity === 'rare') {
      name = `${baseName}·精选`
    } else if (rarity === 'magic') {
      name = `${baseName}·微光`
    }

    const score =
      computeItemScore(stats) +
      (rarity === 'legendary' ? 26 : 0) +
      (rarity === 'set' ? 22 : 0) +
      index

    return {
      id: `${dungeonId}-${difficulty}-${slot}-${Date.now()}-${index}-${Math.round(Math.random() * 9999)}`,
      assetId: catalogEntry.assetId,
      name,
      slot,
      rarity,
      itemLevel,
      stats,
      score,
      setId,
      legendaryPowerId,
      description,
    }
  })
}

export function getDungeonById(id: DungeonId) {
  return dungeons.find((dungeon) => dungeon.id === id) ?? dungeons[0]
}

export function nextDifficulty(current: DifficultyTier) {
  const index = difficultyOrder.indexOf(current)
  return difficultyOrder[index + 1]
}

export function rarityLabel(rarity: ItemInstance['rarity']) {
  switch (rarity) {
    case 'common':
      return '普通'
    case 'magic':
      return '魔法'
    case 'rare':
      return '稀有'
    case 'legendary':
      return '传奇'
    case 'set':
      return '套装'
  }
}

export function rarityTone(rarity: ItemInstance['rarity']) {
  switch (rarity) {
    case 'common':
      return 'text-[#efe7cf]'
    case 'magic':
      return 'text-[#8fd3ff]'
    case 'rare':
      return 'text-[#ffd76e]'
    case 'legendary':
      return 'text-[#ff9462]'
    case 'set':
      return 'text-[#8ef4a2]'
  }
}

export function slotLabel(slot: EquipmentSlot) {
  switch (slot) {
    case 'mainHand':
      return '主手'
    case 'offHand':
      return '副手'
    case 'helmet':
      return '头盔'
    case 'armor':
      return '胸甲'
    case 'gloves':
      return '手套'
    case 'boots':
      return '靴子'
    case 'amulet':
      return '项链'
    case 'ring':
      return '戒指'
  }
}
