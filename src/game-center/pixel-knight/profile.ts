import {
  experienceToNextLevel,
  nextDifficulty,
  PIXEL_KNIGHT_STORAGE_KEY,
  createInitialProfile,
} from './content/data'
import type { ItemInstance, PixelKnightProfile, PlayerDerivedStats, RunResult } from './types'

export function loadPixelKnightProfile() {
  if (typeof window === 'undefined') return createInitialProfile()
  const stored = window.localStorage.getItem(PIXEL_KNIGHT_STORAGE_KEY)
  if (!stored) return createInitialProfile()
  try {
    const parsed = JSON.parse(stored) as PixelKnightProfile
    if (parsed?.version !== 1) return createInitialProfile()
    return parsed
  } catch {
    return createInitialProfile()
  }
}

export function savePixelKnightProfile(profile: PixelKnightProfile) {
  window.localStorage.setItem(PIXEL_KNIGHT_STORAGE_KEY, JSON.stringify(profile))
}

export function derivePixelKnightStats(profile: PixelKnightProfile): PlayerDerivedStats {
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

export function applyPixelKnightRunResult(profile: PixelKnightProfile, result: RunResult): PixelKnightProfile {
  let nextProfile: PixelKnightProfile = {
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

