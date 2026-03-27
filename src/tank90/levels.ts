export type Direction = 'up' | 'down' | 'left' | 'right'

export type TerrainType = 'empty' | 'brick' | 'steel' | 'grass' | 'water'

export type EnemyArchetypeId = 'grunt' | 'raider' | 'heavy' | 'sniper'

export interface EnemyArchetype {
  id: EnemyArchetypeId
  label: string
  speed: number
  reloadMs: number
  hp: number
  bulletSpeed: number
  turnIntervalMs: number
  fireChance: number
  chaseBias: number
}

export interface LevelConfig {
  id: number
  name: string
  intent: string
  enemiesTotal: number
  spawnDelaySec: number
  enemyQueue: EnemyArchetypeId[]
  terrainRows: string[]
}

export const TILE = 16
export const GRID = 26

export const ENEMY_ARCHETYPES: Record<EnemyArchetypeId, EnemyArchetype> = {
  grunt: {
    id: 'grunt',
    label: 'Grunt',
    speed: 70,
    reloadMs: 1000,
    hp: 1,
    bulletSpeed: 210,
    turnIntervalMs: 880,
    fireChance: 0.018,
    chaseBias: 0.22,
  },
  raider: {
    id: 'raider',
    label: 'Raider',
    speed: 98,
    reloadMs: 900,
    hp: 1,
    bulletSpeed: 230,
    turnIntervalMs: 660,
    fireChance: 0.024,
    chaseBias: 0.35,
  },
  heavy: {
    id: 'heavy',
    label: 'Heavy',
    speed: 62,
    reloadMs: 840,
    hp: 2,
    bulletSpeed: 220,
    turnIntervalMs: 980,
    fireChance: 0.02,
    chaseBias: 0.28,
  },
  sniper: {
    id: 'sniper',
    label: 'Sniper',
    speed: 78,
    reloadMs: 670,
    hp: 1,
    bulletSpeed: 280,
    turnIntervalMs: 760,
    fireChance: 0.032,
    chaseBias: 0.44,
  },
}

const EMPTY_ROW = '.'.repeat(GRID)

function withBaseRows(coreRows: string[]) {
  const rows = [...coreRows]
  rows[22] = rows[22].substring(0, 11) + 'BBBB' + rows[22].substring(15)
  rows[23] = rows[23].substring(0, 11) + 'B..B' + rows[23].substring(15)
  rows[24] = rows[24].substring(0, 11) + 'B..B' + rows[24].substring(15)
  return rows
}

function buildLevelRows(placements: Array<{ y: number; pattern: string }>) {
  const rows = Array.from({ length: GRID }, () => EMPTY_ROW)
  for (const item of placements) {
    rows[item.y] = item.pattern
  }
  return withBaseRows(rows)
}

const levels: LevelConfig[] = [
  {
    id: 1,
    name: 'Outpost Line',
    intent: 'Teach baseline lanes and basic base protection with light pressure.',
    enemiesTotal: 8,
    spawnDelaySec: 0.72,
    enemyQueue: ['grunt', 'grunt', 'raider', 'grunt', 'grunt', 'raider', 'grunt', 'heavy'],
    terrainRows: buildLevelRows([
      { y: 6, pattern: '....BBBB....BBBB....BBBB..' },
      { y: 10, pattern: '......GG....GG....GG......' },
      { y: 14, pattern: '....BBBB....BBBB....BBBB..' },
    ]),
  },
  {
    id: 2,
    name: 'Twin Corridor',
    intent: 'Force lane switching and punish tunnel vision with side grass cover.',
    enemiesTotal: 9,
    spawnDelaySec: 0.7,
    enemyQueue: ['grunt', 'raider', 'grunt', 'raider', 'heavy', 'grunt', 'raider', 'grunt', 'sniper'],
    terrainRows: buildLevelRows([
      { y: 5, pattern: '..WW....BBBB....BBBB....WW' },
      { y: 8, pattern: '..WW....B......B....GG..WW' },
      { y: 11, pattern: '..WW....B......B....GG..WW' },
      { y: 14, pattern: '..WW....BBBBBBBB....GG..WW' },
    ]),
  },
  {
    id: 3,
    name: 'Crossfire Net',
    intent: 'Introduce crossing fire lanes where rotation timing matters.',
    enemiesTotal: 10,
    spawnDelaySec: 0.68,
    enemyQueue: ['grunt', 'raider', 'sniper', 'grunt', 'heavy', 'raider', 'sniper', 'grunt', 'heavy', 'raider'],
    terrainRows: buildLevelRows([
      { y: 4, pattern: '....BBBB....SSSS....BBBB..' },
      { y: 8, pattern: '....B..B....S..S....B..B..' },
      { y: 12, pattern: '....BBBB....SSSS....BBBB..' },
      { y: 16, pattern: '....GG......WW......GG....' },
    ]),
  },
  {
    id: 4,
    name: 'Marsh Bypass',
    intent: 'Water channels shape flanks while faster enemies probe openings.',
    enemiesTotal: 10,
    spawnDelaySec: 0.66,
    enemyQueue: ['raider', 'grunt', 'raider', 'heavy', 'grunt', 'sniper', 'raider', 'heavy', 'sniper', 'grunt'],
    terrainRows: buildLevelRows([
      { y: 5, pattern: 'WWWW....BBBB....BBBB....WW' },
      { y: 9, pattern: '..WW....B......B....WW....' },
      { y: 13, pattern: '..WW....B..GG..B....WW....' },
      { y: 17, pattern: 'WWWW....BBBBBBBB....WWWW..' },
    ]),
  },
  {
    id: 5,
    name: 'Iron Bastion',
    intent: 'Steel pockets create stable cover and force longer duels.',
    enemiesTotal: 11,
    spawnDelaySec: 0.64,
    enemyQueue: ['heavy', 'grunt', 'raider', 'heavy', 'sniper', 'grunt', 'heavy', 'raider', 'sniper', 'raider', 'heavy'],
    terrainRows: buildLevelRows([
      { y: 4, pattern: '..SS..BBBB..SSSS..BBBB..SS' },
      { y: 8, pattern: '..SS..B..B..S..S..B..B..SS' },
      { y: 12, pattern: '..SS..BBBB..SSSS..BBBB..SS' },
      { y: 16, pattern: '..GG....WW....WW....GG....' },
    ]),
  },
  {
    id: 6,
    name: 'Split Approach',
    intent: 'Multiple approach vectors test fast target priority decisions.',
    enemiesTotal: 11,
    spawnDelaySec: 0.62,
    enemyQueue: ['raider', 'sniper', 'grunt', 'heavy', 'raider', 'sniper', 'heavy', 'raider', 'grunt', 'sniper', 'heavy'],
    terrainRows: buildLevelRows([
      { y: 5, pattern: '....BBBB..WW..WW..BBBB....' },
      { y: 9, pattern: '..GG..B....W....B..GG..SS.' },
      { y: 13, pattern: '..GG..B....W....B..GG..SS.' },
      { y: 17, pattern: '....BBBB..WW..WW..BBBB....' },
    ]),
  },
  {
    id: 7,
    name: 'Steel Chokepoint',
    intent: 'Narrow kill boxes reward controlled peeking and retreating.',
    enemiesTotal: 12,
    spawnDelaySec: 0.6,
    enemyQueue: ['heavy', 'raider', 'sniper', 'heavy', 'raider', 'heavy', 'sniper', 'raider', 'grunt', 'sniper', 'heavy', 'raider'],
    terrainRows: buildLevelRows([
      { y: 4, pattern: 'SSSS....BBBB....BBBB....SS' },
      { y: 8, pattern: 'S..S....BSSB....BSSB....SS' },
      { y: 12, pattern: 'S..S....BSSB....BSSB....SS' },
      { y: 16, pattern: 'SSSS....BBBB....BBBB....SS' },
    ]),
  },
  {
    id: 8,
    name: 'Needle Lanes',
    intent: 'Long straight lanes amplify sniper pressure and positioning mistakes.',
    enemiesTotal: 12,
    spawnDelaySec: 0.58,
    enemyQueue: ['sniper', 'raider', 'sniper', 'heavy', 'grunt', 'sniper', 'raider', 'heavy', 'sniper', 'raider', 'heavy', 'sniper'],
    terrainRows: buildLevelRows([
      { y: 5, pattern: '..WW..BBBB..WWWW..BBBB..WW' },
      { y: 8, pattern: '..WW..B..B..W..W..B..B..WW' },
      { y: 11, pattern: '..WW..B..B..W..W..B..B..WW' },
      { y: 14, pattern: '..WW..BBBB..WWWW..BBBB..WW' },
      { y: 17, pattern: '..GG..........SS..........' },
    ]),
  },
  {
    id: 9,
    name: 'Fortress Breach',
    intent: 'High-density cover creates chaotic exchanges near the base front.',
    enemiesTotal: 13,
    spawnDelaySec: 0.56,
    enemyQueue: ['heavy', 'sniper', 'raider', 'heavy', 'sniper', 'raider', 'heavy', 'sniper', 'grunt', 'raider', 'heavy', 'sniper', 'heavy'],
    terrainRows: buildLevelRows([
      { y: 4, pattern: 'SSSS..BBBB..SSSS..BBBB..SS' },
      { y: 8, pattern: 'S..S..B..B..S..S..B..B..SS' },
      { y: 12, pattern: 'S..S..BBBB..S..S..BBBB..SS' },
      { y: 16, pattern: 'SSSS..BWWB..SSSS..BWWB..SS' },
      { y: 19, pattern: '..GG..BBBB..GGGG..BBBB..GG' },
    ]),
  },
  {
    id: 10,
    name: 'Final Gauntlet',
    intent: 'Mixed elite archetypes and layered terrain for sustained defense.',
    enemiesTotal: 14,
    spawnDelaySec: 0.54,
    enemyQueue: ['sniper', 'heavy', 'raider', 'sniper', 'heavy', 'raider', 'sniper', 'heavy', 'raider', 'sniper', 'heavy', 'raider', 'sniper', 'heavy'],
    terrainRows: buildLevelRows([
      { y: 4, pattern: 'SSWW..BBBB..SSSS..BBBB..WW' },
      { y: 7, pattern: 'S.WW..B..B..S..S..B..B..WW' },
      { y: 10, pattern: 'SSWW..BBBB..SSSS..BBBB..WW' },
      { y: 13, pattern: '..GG..WWWW..GGGG..WWWW..GG' },
      { y: 16, pattern: 'SSSS..BBBB..SSSS..BBBB..SS' },
      { y: 19, pattern: 'S..S..B..B..S..S..B..B..SS' },
    ]),
  },
]

export const LEVELS = levels

export function getLevelConfig(level: number): LevelConfig {
  if (level <= 1) return LEVELS[0]
  if (level > LEVELS.length) return LEVELS[LEVELS.length - 1]
  return LEVELS[level - 1]
}

export function terrainFromChar(ch: string): TerrainType {
  if (ch === 'B') return 'brick'
  if (ch === 'S') return 'steel'
  if (ch === 'G') return 'grass'
  if (ch === 'W') return 'water'
  return 'empty'
}
