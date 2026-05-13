export type BaseClassId = 'knight' | 'archer' | 'mage'

export type DifficultyTier = 'normal' | 'hard' | 'master' | 'legend'

export type EquipmentSlot =
  | 'mainHand'
  | 'offHand'
  | 'helmet'
  | 'armor'
  | 'gloves'
  | 'boots'
  | 'amulet'
  | 'ring'

export type RenderableEquipmentAssetId =
  | 'cloth-cap'
  | 'iron-helmet'
  | 'iron-armor'
  | 'iron-sword'
  | 'wood-shield'

export type DungeonId =
  | 'ember-forge'
  | 'frost-peak'
  | 'jade-tower'
  | 'sun-obelisk'
  | 'crystal-rift'
  | 'autumn-wood'
  | 'tide-cave'
  | 'clock-temple'
  | 'mushroom-marsh'
  | 'cloud-altar'

export type GamePhase = 'boot' | 'loading' | 'home' | 'playing' | 'paused' | 'results' | 'error'

export type FacingDirection = 'left' | 'right'

export type PixelKnightMapKind = 'village' | 'dungeon'

export type PixelKnightMapTile = '#' | '.' | 'S' | 'P' | 'g' | 'r' | 'p' | 'w'

export type VillageHotspotKind = 'portal' | 'shop' | 'stash' | 'blacksmith' | 'notice-board' | 'gemsmith'

export type VillageDecorKind =
  | 'bush-berry'
  | 'bush-flower'
  | 'bush-leafy'
  | 'grass-patch-flowers'
  | 'grass-patch-large'
  | 'grass-patch-rock'
  | 'pine-small'
  | 'signpost-single'
  | 'signpost-double'

export type VillageSceneLayer = 'back' | 'front'

export type MapHotspot = {
  id: string
  kind: VillageHotspotKind
  label: string
  prompt: string
  cell: { x: number; y: number }
  radius: number
}

export type MapMonsterClusterDef = {
  id: string
  kinds: Exclude<EnemyKind, 'boss'>[]
  clusterCount: { min: number; max: number }
  membersPerCluster: { min: number; max: number }
  eliteChance: number
  safeRadiusFromStart: number
  safeRadiusFromPortal: number
  archetype: 'melee' | 'ranged' | 'mixed'
}

export type MapDef = {
  id: string
  kind: PixelKnightMapKind
  dungeonId?: DungeonId
  name: string
  rows: string[]
  start: { x: number; y: number }
  portal?: { x: number; y: number }
  hotspots?: MapHotspot[]
  monsterClusters?: MapMonsterClusterDef[]
}

export type VillageLandmarkPlacement = {
  kind: VillageHotspotKind
  cell: { x: number; y: number }
  layer?: VillageSceneLayer
  drawScale?: number
  drawOffset?: { x: number; y: number }
  footprint?: { offsetX: number; offsetY: number; width: number; height: number }
}

export type VillageDecorPlacement = {
  id: string
  kind: VillageDecorKind
  cell: { x: number; y: number }
  layer?: VillageSceneLayer
}

export type VillageTerrainPatch = {
  id: string
  assetId: string
  x: number
  y: number
  width: number
  height: number
}

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
  assetId?: RenderableEquipmentAssetId
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

export type PixelKnightCharacterProfile = Omit<PixelKnightProfile, 'version' | 'baseClassId'>

export type PixelKnightSave = {
  version: 2
  activeClassId: BaseClassId
  profilesByClassId: Record<BaseClassId, PixelKnightCharacterProfile>
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

export type PixelKnightSpriteMeta = {
  assetFamily: string
  version: string
  frameWidth: number
  frameHeight: number
  directions: string[]
  animations: Record<string, { frames: number[]; fps: number }>
  pivot: { x: number; y: number }
  selectedDirection: string
  backupDirection?: string
}

export type PixelKnightHudState = {
  phase: GamePhase
  mapKind: PixelKnightMapKind
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
  hotspots: MapHotspot[]
  nearbyHotspot: MapHotspot | null
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
  onMinimapPlayerCell?: (cell: { x: number; y: number }) => void
  onHotspotInteract: (hotspot: MapHotspot) => void
  onRunComplete: (result: RunResult) => void
  onError: (message: string) => void
}
