export type BaseClassId = 'knight' | 'archer' | 'mage'

export type DifficultyTier = 'normal' | 'hard' | 'master' | 'legend'

export type EquipmentSlot =
  | 'weapon'
  | 'shield'
  | 'helmet'
  | 'armor'
  | 'gloves'
  | 'boots'
  | 'amulet'
  | 'ring-left'
  | 'ring-right'

export type DungeonId = 'sunmeadow' | 'vine-ruins' | 'crystal-cavern'

export type GamePhase = 'boot' | 'loading' | 'home' | 'playing' | 'paused' | 'results' | 'error'

export type ItemRarity = 'common' | 'magic' | 'rare' | 'legendary' | 'set'

export type StatKey =
  | 'attack'
  | 'armor'
  | 'vitality'
  | 'critChance'
  | 'critDamage'
  | 'skillPower'
  | 'moveSpeed'

export type ItemStats = Partial<Record<StatKey, number>>

export type SkillHotkey = 'LMB' | 'RMB' | 'Q' | 'E' | 'R' | 'SPACE'

export type EnemyKind = 'mossling' | 'needlebat' | 'vinebrute' | 'sunpriest' | 'boss'

export type DungeonPalette = {
  sky: string
  ground: string
  accent: string
  border: string
}

export type DifficultyConfig = {
  label: string
  enemyHealthMultiplier: number
  enemyDamageMultiplier: number
  eliteSpawnBonus: number
  bossCadenceMultiplier: number
  experienceMultiplier: number
  goldMultiplier: number
  magicFind: number
}

export type DungeonDef = {
  id: DungeonId
  name: string
  subtitle: string
  blurb: string
  palette: DungeonPalette
  enemyKinds: EnemyKind[]
  bossName: string
}

export type SkillDef = {
  id: string
  name: string
  hotkey: SkillHotkey
  description: string
  cooldownMs: number
}

export type LegendaryPowerDef = {
  id: string
  name: string
  description: string
}

export type SetBonusDef = {
  id: string
  name: string
  pieces: 2 | 4
  description: string
}

export type ItemInstance = {
  id: string
  name: string
  slot: EquipmentSlot
  rarity: ItemRarity
  itemLevel: number
  stats: ItemStats
  score: number
  setId?: string
  legendaryPowerId?: string
  description?: string
}

export type DungeonSelectState = {
  dungeonId: DungeonId
  selectedDifficulty: DifficultyTier
  unlockedDifficulties: DifficultyTier[]
}

export type PixelKnightProfile = {
  version: 1
  baseClassId: BaseClassId
  level: number
  experience: number
  gold: number
  materials: number
  completedRuns: number
  equipment: Partial<Record<EquipmentSlot, ItemInstance | null>>
  stash: ItemInstance[]
  unlockedDifficultiesByDungeon: Record<DungeonId, DifficultyTier[]>
  hasCompletedInitialLoad: boolean
}

export type PlayerDerivedStats = {
  attack: number
  armor: number
  maxHealth: number
  critChance: number
  critDamage: number
  skillPower: number
  moveSpeed: number
  setPieces: number
  activeLegendaryPowers: string[]
}

export type PreloadProgress = {
  loaded: number
  total: number
  ratio: number
  label: string
}

export type PixelKnightHudState = {
  phase: GamePhase
  dungeonName: string
  difficultyLabel: string
  objectiveLabel: string
  encounterLabel: string
  health: number
  maxHealth: number
  enemiesLeft: number
  elapsedMs: number
  blessingActive: boolean
  portalNearby: boolean
  minimapRows: string[]
  playerCell: { x: number; y: number }
  portalCell: { x: number; y: number }
  recentLoot: string[]
  cooldowns: Record<string, number>
}

export type RunRewardBundle = {
  experienceGained: number
  goldGained: number
  materialsGained: number
  items: ItemInstance[]
  unlockedDifficulty?: DifficultyTier
}

export type RunResult = {
  victory: boolean
  dungeonId: DungeonId
  difficulty: DifficultyTier
  durationMs: number
  rewards: RunRewardBundle
}

export type PixelKnightGameCallbacks = {
  onHud: (state: PixelKnightHudState) => void
  onRunComplete: (result: RunResult) => void
  onError: (message: string) => void
}
