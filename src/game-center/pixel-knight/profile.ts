import {
  createCatalogItem,
  experienceToNextLevel,
  isRenderableEquipmentAssetId,
  nextDifficulty,
  PIXEL_KNIGHT_STORAGE_KEY,
  createInitialProfile,
  createInitialCharacterProfile,
} from './content/data'
import type {
  BaseClassId,
  EquipmentSlot,
  ItemInstance,
  PixelKnightCharacterProfile,
  PixelKnightProfile,
  PixelKnightSave,
  PlayerDerivedStats,
  RenderableEquipmentAssetId,
  RunResult,
} from './types'

type LegacyEquipmentSlot = EquipmentSlot | 'weapon' | 'shield' | 'ring-left' | 'ring-right'

const equipmentSlotOrder: EquipmentSlot[] = [
  'mainHand',
  'offHand',
  'helmet',
  'armor',
  'amulet',
  'ring',
]

const renderableSlots = ['mainHand', 'offHand', 'helmet', 'armor'] satisfies EquipmentSlot[]

const slotByAssetId: Record<RenderableEquipmentAssetId, EquipmentSlot> = {
  'cloth-cap': 'helmet',
  'iron-helmet': 'helmet',
  'iron-armor': 'armor',
  'iron-sword': 'mainHand',
  'wood-shield': 'offHand',
}

function normalizeRenderableItem(item: ItemInstance | null | undefined, fallbackSlot?: EquipmentSlot): ItemInstance | null {
  if (!item) return null
  let assetId: RenderableEquipmentAssetId | undefined = isRenderableEquipmentAssetId(item.assetId) ? item.assetId : undefined
  const legacyId = item.id
  const legacySlot = item.slot as LegacyEquipmentSlot
  if (!assetId && (legacyId === 'starter-sword' || legacySlot === 'mainHand' || legacySlot === 'weapon')) assetId = 'iron-sword'
  if (!assetId && (legacyId === 'starter-shield' || legacySlot === 'offHand' || legacySlot === 'shield')) assetId = 'wood-shield'
  if (!assetId) return null

  const slot = slotByAssetId[assetId]
  if (fallbackSlot && renderableSlots.includes(fallbackSlot as never) && fallbackSlot !== slot) return null
  return { ...item, assetId, slot }
}

function appendMissingDemoItems(stash: ItemInstance[], equipment: PixelKnightProfile['equipment']) {
  const existingAssetIds = new Set(
    [
      ...stash.map((item) => item.assetId),
      ...Object.values(equipment).map((item) => item?.assetId),
    ].filter(Boolean),
  )
  const seedAssets: RenderableEquipmentAssetId[] = ['cloth-cap', 'iron-armor', 'iron-helmet']
  const additions = seedAssets
    .filter((assetId) => !existingAssetIds.has(assetId))
    .map((assetId) => createCatalogItem(assetId, 1, assetId === 'iron-helmet' ? 'magic' : 'common', 'migration'))
  return [...stash, ...additions]
}

function normalizePixelKnightProfile(profile: PixelKnightProfile): PixelKnightProfile {
  const legacyEquipment = profile.equipment as Partial<Record<LegacyEquipmentSlot, ItemInstance | null>>
  const migrated: PixelKnightProfile['equipment'] = {
    mainHand: normalizeRenderableItem(legacyEquipment.mainHand ?? legacyEquipment.weapon, 'mainHand'),
    offHand: normalizeRenderableItem(legacyEquipment.offHand ?? legacyEquipment.shield, 'offHand'),
    helmet: normalizeRenderableItem(legacyEquipment.helmet, 'helmet'),
    armor: normalizeRenderableItem(legacyEquipment.armor, 'armor'),
    amulet: null,
    ring: null,
  }

  const stash = appendMissingDemoItems(
    profile.stash
      .map((item) => normalizeRenderableItem(item))
      .filter((item): item is ItemInstance => Boolean(item)),
    migrated,
  )

  return {
    ...profile,
    equipment: Object.fromEntries(equipmentSlotOrder.map((slot) => [slot, migrated[slot] ?? null])),
    stash,
  }
}

function createDefaultSave(activeClassId: BaseClassId = 'knight'): PixelKnightSave {
  const make = () => createInitialCharacterProfile()
  return {
    version: 2,
    activeClassId,
    profilesByClassId: {
      knight: make(),
      archer: make(),
      mage: make(),
    },
  }
}

function normalizeCharacterProfile(profile: PixelKnightCharacterProfile): PixelKnightCharacterProfile {
  const v1Like: PixelKnightProfile = {
    ...createInitialProfile(),
    ...profile,
    baseClassId: 'knight',
    version: 1,
  }
  const normalized = normalizePixelKnightProfile(v1Like)
  const { baseClassId: _baseClassId, version: _version, ...rest } = normalized
  return rest
}

function normalizePixelKnightSave(save: PixelKnightSave): PixelKnightSave {
  const fallback = createDefaultSave(save.activeClassId ?? 'knight')
  const profilesByClassId = save.profilesByClassId ?? ({} as PixelKnightSave['profilesByClassId'])
  return {
    version: 2,
    activeClassId: save.activeClassId ?? 'knight',
    profilesByClassId: {
      knight: profilesByClassId.knight ? normalizeCharacterProfile(profilesByClassId.knight) : fallback.profilesByClassId.knight,
      archer: profilesByClassId.archer ? normalizeCharacterProfile(profilesByClassId.archer) : fallback.profilesByClassId.archer,
      mage: profilesByClassId.mage ? normalizeCharacterProfile(profilesByClassId.mage) : fallback.profilesByClassId.mage,
    },
  }
}

export function loadPixelKnightSave(): PixelKnightSave {
  if (typeof window === 'undefined') return createDefaultSave()
  const stored = window.localStorage.getItem(PIXEL_KNIGHT_STORAGE_KEY)
  if (!stored) return createDefaultSave()
  try {
    const parsed = JSON.parse(stored) as PixelKnightProfile | PixelKnightSave
    if (parsed && typeof parsed === 'object' && 'version' in parsed && parsed.version === 2) {
      return normalizePixelKnightSave(parsed as PixelKnightSave)
    }
    if (parsed && typeof parsed === 'object' && 'version' in parsed && parsed.version === 1) {
      const legacy = normalizePixelKnightProfile(parsed as PixelKnightProfile)
      const migrated = createDefaultSave(legacy.baseClassId)
      const { baseClassId, version: _version, ...character } = legacy
      migrated.profilesByClassId[baseClassId] = normalizeCharacterProfile(character)
      return migrated
    }
    return createDefaultSave()
  } catch {
    return createDefaultSave()
  }
}

export function savePixelKnightSave(save: PixelKnightSave) {
  window.localStorage.setItem(PIXEL_KNIGHT_STORAGE_KEY, JSON.stringify(save))
}

export function derivePixelKnightStats(profile: Pick<PixelKnightProfile, 'level' | 'equipment'>): PlayerDerivedStats {
  const items = Object.values(profile.equipment).filter(Boolean) as ItemInstance[]
  const activeLegendaryPowers = items
    .map((item) => item.legendaryPowerId)
    .filter((value): value is string => Boolean(value))
  const setPieces = items.filter((item) => item.setId === 'dawn-guard').length
  const total = items.reduce(
    (acc, item) => {
      acc.attack += item.stats.attack ?? 0
      acc.armor += item.stats.armor ?? 0
      acc.vitality += item.stats.vitality ?? 0
      acc.critChance += item.stats.critChance ?? 0
      acc.critDamage += item.stats.critDamage ?? 0
      acc.skillPower += item.stats.skillPower ?? 0
      acc.moveSpeed += item.stats.moveSpeed ?? 0
      return acc
    },
    { attack: 0, armor: 0, vitality: 0, critChance: 0, critDamage: 0, skillPower: 0, moveSpeed: 0 },
  )

  return {
    attack: 22 + profile.level * 5 + total.attack + (setPieces >= 4 ? 12 : 0),
    armor: 8 + profile.level * 2 + total.armor + (setPieces >= 2 ? 18 : 0),
    maxHealth: 120 + profile.level * 30 + total.vitality * 10,
    critChance: 0.08 + total.critChance,
    critDamage: 0.55 + total.critDamage,
    skillPower: 12 + profile.level * 2 + total.skillPower + (setPieces >= 4 ? 16 : 0),
    moveSpeed: 178 + total.moveSpeed,
    setPieces,
    activeLegendaryPowers,
  }
}

export function applyPixelKnightRunResult(
  profile: PixelKnightCharacterProfile,
  result: RunResult,
): PixelKnightCharacterProfile {
  let nextProfile: PixelKnightCharacterProfile = {
    ...profile,
    gold: profile.gold + result.rewards.goldGained,
    materials: profile.materials + result.rewards.materialsGained,
    stash: [...result.rewards.items, ...profile.stash].slice(0, 64),
    completedRuns: profile.completedRuns + 1,
  }

  let expPool = profile.experience + result.rewards.experienceGained
  let level = profile.level
  while (expPool >= experienceToNextLevel(level)) {
    expPool -= experienceToNextLevel(level)
    level += 1
  }
  nextProfile = { ...nextProfile, level, experience: expPool }

  const unlocked = nextProfile.unlockedDifficultiesByDungeon[result.dungeonId]
  const maybeNext = nextDifficulty(result.difficulty)
  if (result.victory && maybeNext && unlocked.includes(result.difficulty) && !unlocked.includes(maybeNext)) {
    nextProfile = {
      ...nextProfile,
      unlockedDifficultiesByDungeon: {
        ...nextProfile.unlockedDifficultiesByDungeon,
        [result.dungeonId]: [...unlocked, maybeNext],
      },
    }
    result.rewards.unlockedDifficulty = maybeNext
  }

  return nextProfile
}

export function pixelKnightItemStatLine(item: ItemInstance) {
  const bits = [
    item.stats.attack ? `攻击 +${item.stats.attack}` : null,
    item.stats.armor ? `护甲 +${item.stats.armor}` : null,
    item.stats.vitality ? `生命 +${item.stats.vitality * 10}` : null,
    item.stats.skillPower ? `技能 +${item.stats.skillPower}` : null,
    item.stats.moveSpeed ? `移速 +${item.stats.moveSpeed}` : null,
    item.stats.critChance ? `暴击 ${(item.stats.critChance * 100).toFixed(0)}%` : null,
  ].filter(Boolean)
  return bits.slice(0, 3).join(' · ')
}
