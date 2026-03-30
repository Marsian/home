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

// Battle City Stage 01-10 base 26x26 grid extracted from an open Battle City JS clone.
// Cell encoding:
// - 0 brick -> 'B'
// - 1 steel -> 'S'
// - 2 water -> 'W'
// - 3 tree/bush -> 'G'
// - 5 blank -> '.'
const STAGE_01_TERRAIN_ROWS: string[] = [
  '..........................',
  '..........................',
  '..BB..BB..BB..BB..BB..BB..',
  '..BB..BB..BB..BB..BB..BB..',
  '..BB..BB..BB..BB..BB..BB..',
  '..BB..BB..BB..BB..BB..BB..',
  '..BB..BB..BBSSBB..BB..BB..',
  '..BB..BB..BBSSBB..BB..BB..',
  '..BB..BB..BB..BB..BB..BB..',
  '..BB..BB..........BB..BB..',
  '..BB..BB..........BB..BB..',
  '..........BB..BB..........',
  '..........BB..BB..........',
  'BB..BBBB..........BBBB..BB',
  'SS..BBBB..........BBBB..SS',
  '..........BB..BB..........',
  '..........BBBBBB..........',
  '..BB..BB..BBBBBB..BB..BB..',
  '..BB..BB..BB..BB..BB..BB..',
  '..BB..BB..BB..BB..BB..BB..',
  '..BB..BB..BB..BB..BB..BB..',
  '..BB..BB...BB..BB.BB..BB..',
  '..BB..BB...BB..BB.BB..BB..',
  '..BB..BB...BBBB...BB..BB..',
  '...........B..B...........',
  '...........B..B...........',
]

const STAGE_02_TERRAIN_ROWS: string[] = [
  '......SS......SS..........',
  '......SS......SS..........',
  '..BB..SS......BB..BB..BB..',
  '..BB..SS......BB..BB..BB..',
  '..BB........BBBB..BBSSBB..',
  '..BB........BBBB..BBSSBB..',
  '......BB..........SS......',
  '......BB..........SS......',
  'GG....BB....SS....BBGGBBSS',
  'GG....BB....SS....BBGGBBSS',
  'GGGG......BB....SS..GG....',
  'GGGG......BB....SS..GG....',
  '..BBBBBBGGGGGGSS....GGBB..',
  '..BBBBBBGGGGGGSS....GGBB..',
  '......SSGGBB..BB..BB..BB..',
  '......SSGGBB..BB..BB..BB..',
  'SSBB..SS..BB..BB......BB..',
  'SSBB..SS..BB..BB......BB..',
  '..BB..BB..BBBBBB..BBSSBB..',
  '..BB..BB..BBBBBB..BBSSBB..',
  '..BB..BB..BBBBBB..........',
  '..BB..BB..BBBBBB..........',
  '..BB....BB........BB..BB..',
  '..BB.......BBBB...BB..BB..',
  '..BB..BB...B..B...BBBBBB..',
  '..BB..BB...B..B...BBBBBB..',
]

const STAGE_03_TERRAIN_ROWS: string[] = [
  '........BB......BB........',
  '......BBBB......BBBB......',
  '..GGGGGGBB................',
  '..GGGGGGBB..........SSSSSS',
  'BBGGGGGG..................',
  'BBGGGGGG..................',
  'GGGGGGGG......BB..BBBBBBB.',
  'GGGGGGGG......BB..BBBBBBB.',
  'GGGGGGGGBBBBBBBB..BB...B..',
  'GGGGGGGGBBBBBB....BB...B..',
  'GGGGGGGG....BB.........B..',
  'GGGGGGGG....BB.........B..',
  '..GG........SSSSSS....GG..',
  '..GG........SSSSSS....GG..',
  '..................GGGGGGGG',
  '..BB..BB..........GGGGGGGG',
  'BBB..BBBB..BBBBBBBGGGGGGGG',
  'BBB..BBBB..B......GGGGGGGG',
  '..........BB......GGGGGGGG',
  '....BB....BB..BBBBGGGGGGGG',
  'BB....S.......BBBBGGGGGG..',
  'BB....S...........GGGGGG..',
  'BBBB..S...........GGGGGG..',
  'BBBB..S..BB.BBBB...GGGGG..',
  'SSBBBB.....B..B...BB......',
  'SSBBBB.....B..B...BB......',
]

const STAGE_04_TERRAIN_ROWS: string[] = [
  '..GGGG................GG..',
  '..GGGG................GG..',
  'GGGG......BBBB..........GG',
  'GGGG....BBBBBBBBBB......GG',
  'GG.....BBBBBBBBBBBBB....SS',
  'GG.....BBBBBBBBBBBBBBB....',
  'SS....BBBBBBBBBBBBBBBBB...',
  '......BBBBBBBBBBBBBBBBB...',
  '.....BBB......BBBBBB..B...',
  '.....B..........BBBB..B...',
  'WW...B..S...S...BBB.......',
  'WW...B..S...S...BBB.......',
  '....BB..........BBB...WWWW',
  '....BB..BBBB....BBB...WWWW',
  '....BBBBBBBBBBBBBBBB......',
  '....BBBBBBBBBBBBBBBB......',
  '...BBBBBBBBBBBBBBBBBB.....',
  '...BBBBBBBBBBBBBBBBBB.....',
  '..BBBBBBBBBBBBBBBBBBBB....',
  '......BBBBBBBBBBBB........',
  '..BBBB..BBBBBBBB..BBBB..GG',
  '..BBBBBB..BBBB..BBBBBB..GG',
  'GG..BBBB........BBBB..GGGG',
  'GG.........BBBB.......GGGG',
  'SSGG.......B..B.....GGGGSS',
  'SSGG.......B..B.....GGGGSS',
]

const STAGE_05_TERRAIN_ROWS: string[] = [
  '........BBBB..............',
  '........BBBB..............',
  '........BB......SSSSSS....',
  'SS..BB..BB..........SS....',
  'SS..BB......BB............',
  'SS..BB......BB............',
  'BB..BBBBBB..BBBB..WWWW..WW',
  'BB..BBBBBB..BBBB..WWWW..WW',
  'BB......BB........WW......',
  '..................WW......',
  '........WWWW..WWWWWW..BBBB',
  '....BB..WWWW..WWWWWW..BBBB',
  'BBBB....WWBB..BBB.........',
  'BBBB....WWBB..BBB.........',
  '........WW...........SS...',
  '........WW...........SS...',
  'WWWWWW..WW..SS..BB...S....',
  'WWWWWW..WW..SS..BB...S....',
  '.....................SBBBB',
  '......BBBB...........SBBBB',
  '........BBBBBBBBBB........',
  '........BB......BBBB......',
  'BBBBBB............BBBB....',
  'BBBB.......BBBB.....BB....',
  'BB.........B..B...........',
  '...........B..B...........',
]

const STAGE_06_TERRAIN_ROWS: string[] = [
  '...........B..B.GGGG......',
  '...........B..B.GGGG......',
  '..B..S..B........BGGB..BGG',
  '..B..S..B........BGGB..BGG',
  '..B..S..B...BB...BGGB..BGG',
  '..B..S..B...BB...BGGB..BGG',
  '..BB....BB..SS..BBGG..BBGG',
  '..BB....BB..SS..BBGG..BBGG',
  '.......BSS..BB..BBS...GGGG',
  '.......B....BB....S...GGGG',
  'BBBBB.....GGBBGG.....BBBBB',
  'BBBBB.....GGBBGG.....BBBBB',
  '.........BGGGGGGB.........',
  '.........BGGGGGGB.........',
  'SSBBBB..BBGGGGGGBB.BBBBBSS',
  'SSBBBB....GGGGGG...BBBBBSS',
  'SSSSSS......GG......SSSSSS',
  '........BB..GG..BB........',
  '..BB....BB......BB........',
  '..BB....BB......BB........',
  '..BBB.....BB..BB.....BBBGG',
  '..BBB................BBBGG',
  '....BB..............GGGGGG',
  '...........BBBB.....GGGGGG',
  '...........B..B.......GGGG',
  '....BB.....B..B.....BBGGGG',
]

const STAGE_07_TERRAIN_ROWS: string[] = [
  '..............SSSS........',
  '..........................',
  '....SSSSSSSS........SS....',
  '....SS..............SS....',
  '....SS......GG..SSSSSS....',
  '....SS......GG....SSSS....',
  '..SS......GGSS......SS....',
  '..SS......GGSS......SS....',
  '........GGSSSS......SSSS..',
  '........GGSSSS........SS..',
  '..SS..GGSSSSSS..SS........',
  '..SS..GGSSSSSS..SS........',
  '...S..SSSS......SSSS......',
  '...S..SSSS......SSSS......',
  'S.......SS..SSSSSS.....S..',
  'S.......SS..SSSSSS.....S..',
  '...SSS......SSSSGG....SS..',
  '...SSS......SSSSGG....SS..',
  '..SS........SSGG....SSSS..',
  '..SS........SSGG....SSSS..',
  '..SSSSSS....GG....SS......',
  '......SS....GG....SS......',
  '..................SS....SS',
  '...........BBBB.......SSSS',
  '...........B..B...........',
  'SSSS.......B..B...........',
]

const STAGE_08_TERRAIN_ROWS: string[] = [
  '....BB....BB......BB......',
  '....BB....BB..BB..BB......',
  'GGBBBBBB..BB......BBB.....',
  'GGBBBBBB..BB..SS..BBB.....',
  'GGGGGG....BB..BB..BB...BB.',
  'GGGGGG........BB.......BB.',
  'GGWWWWWWWWWWWWWWWWWWWW..WW',
  'GGWWWWWWWWWWWWWWWWWWWW..WW',
  '..BB......................',
  '..BB........BBBB..........',
  '....BB.....BBBBBBBBBBBSSSS',
  '....BB.....BBBBB..BB......',
  'BBBB..BB...BBBBBGGBB....BB',
  'BBBB..BB...BBBBBGGBBSSSSBB',
  '......SS......GGGGGGGG....',
  '......SS..SS..GGGGGGGG....',
  'WWWW..WWWWWWWWWW..WWWWWWWW',
  'WWWW..WWWWWWWWWW..WWWWWWWW',
  'GGGG...B..................',
  'GGGG...B....BBBB..........',
  'GGGGBB..B......B......BB..',
  'GGGGBB..B......B..SSBBBB..',
  'GG..BB..B.........BB..BB..',
  'GGSSBB..B..BBBB.......BB..',
  '...........B..B.......BB..',
  '...........B..B...BB......',
]

const STAGE_09_TERRAIN_ROWS: string[] = [
  '......BB............GG....',
  '......BB..........SSGG....',
  'BB............GG.SSSS...BB',
  'BB..........SSGG.SSSS...BB',
  '........GG.SSSS...SSGG....',
  '......SSGG.SSSS.....GG....',
  '.....SSSS...SSGG..........',
  '.....SSSS.....GG..........',
  '......SSGG................',
  '........GG................',
  '......GG..GG..GG..GG......',
  '......GGSSGG..GGSSGG......',
  'SSBB...SSSS....SSSS...BBSS',
  'SSBB...SSSS....SSSS...BBSS',
  '......GGSSGG..GGSSGG......',
  '......GG..GG..GG..GG......',
  '..........................',
  '........SS......SS........',
  'BB.....SSSS....SSSS.....BB',
  'BB.....SSSS....SSSS.....BB',
  'BB....GGSSGG..GGSSGG....BB',
  'BB....GG..GG..GG..GG....BB',
  '..........................',
  '....BB.....BBBB.....BB....',
  '....BBBB...B..B...BBBB....',
  '....BBBB...B..B...BBBB....',
]

const STAGE_10_TERRAIN_ROWS: string[] = [
  '..........................',
  '..........................',
  '...BBBBB............BBBBB.',
  '...B..BB............BB..B.',
  '.BBB....BB..GGGG..BB.....B',
  '.B......BB..GGGG..BB.....B',
  'BB......BBGGGGGGGGBB.....B',
  'BB......BBGGGGGGGGBB.....B',
  'BB.....BBBGGSSSSGGBBB...BB',
  'BB.....BBBGGSSSSGGBBB...BB',
  '.B....BBWWWWWWWWWWWWBBBBBB',
  '.BBBBBBBWWWWWWWWWWWWBBBBBB',
  '..BBBBBBSSSSBBSSSSBBBBBB..',
  '..BBBBBBSSSSBBSSSSBBBBBB..',
  '....BBBBSS..BB..SSBBBBB...',
  '....BBBBSS..BB..SSBBBBB...',
  '....BBBBBBBBBBBBBBBBBBB...',
  '....BBBBBBBBBBBBBBBBBBB...',
  'BBGGBBBBBBSSSSBBBBBBBBGGBB',
  'BBGG......SSSS........GGBB',
  'BBGGGGGGGGGGGGGGGGGGGGGGBB',
  'BBGGGGGGGGGGGGGGGGGGGGGGBB',
  '....GGGGGG......GGGGGGGG..',
  '....GGGGGG.BBBB.GGGGGGG...',
  '......B....B..B.....B.....',
  '......B....B..B.....B.....',
]

// Stage 1-10 terrain grids
const levels: LevelConfig[] = [
  {
    id: 1,
    name: 'Stage 1',
    intent: 'Classic intro layout with broad lanes and light center pressure.',
    enemiesTotal: 8,
    spawnDelaySec: 0.72,
    enemyQueue: ['grunt', 'grunt', 'raider', 'grunt', 'grunt', 'raider', 'grunt', 'heavy'],
    terrainRows: STAGE_01_TERRAIN_ROWS,
  },
  {
    id: 2,
    name: 'Stage 2',
    intent: 'Twin water channels with brick chokepoints and flank pivots.',
    enemiesTotal: 9,
    spawnDelaySec: 0.7,
    enemyQueue: ['grunt', 'raider', 'grunt', 'raider', 'heavy', 'grunt', 'raider', 'grunt', 'sniper'],
    terrainRows: STAGE_02_TERRAIN_ROWS,
  },
  {
    id: 3,
    name: 'Stage 3',
    intent: 'Cross-style fortress pattern with mixed steel anchors.',
    enemiesTotal: 10,
    spawnDelaySec: 0.68,
    enemyQueue: ['grunt', 'raider', 'sniper', 'grunt', 'heavy', 'raider', 'sniper', 'grunt', 'heavy', 'raider'],
    terrainRows: STAGE_03_TERRAIN_ROWS,
  },
  {
    id: 4,
    name: 'Stage 4',
    intent: 'River split map with narrow bridge fights and grass cover.',
    enemiesTotal: 10,
    spawnDelaySec: 0.66,
    enemyQueue: ['raider', 'grunt', 'raider', 'heavy', 'grunt', 'sniper', 'raider', 'heavy', 'sniper', 'grunt'],
    terrainRows: STAGE_04_TERRAIN_ROWS,
  },
  {
    id: 5,
    name: 'Stage 5',
    intent: 'Steel-heavy blocks create classic bunker lanes.',
    enemiesTotal: 11,
    spawnDelaySec: 0.64,
    enemyQueue: ['heavy', 'grunt', 'raider', 'heavy', 'sniper', 'grunt', 'heavy', 'raider', 'sniper', 'raider', 'heavy'],
    terrainRows: STAGE_05_TERRAIN_ROWS,
  },
  {
    id: 6,
    name: 'Stage 6',
    intent: 'Open split approach with alternating steel and river blocks.',
    enemiesTotal: 11,
    spawnDelaySec: 0.62,
    enemyQueue: ['raider', 'sniper', 'grunt', 'heavy', 'raider', 'sniper', 'heavy', 'raider', 'grunt', 'sniper', 'heavy'],
    terrainRows: STAGE_06_TERRAIN_ROWS,
  },
  {
    id: 7,
    name: 'Stage 7',
    intent: 'Dense steel corridors force disciplined peeking.',
    enemiesTotal: 12,
    spawnDelaySec: 0.6,
    enemyQueue: ['heavy', 'raider', 'sniper', 'heavy', 'raider', 'heavy', 'sniper', 'raider', 'grunt', 'sniper', 'heavy', 'raider'],
    terrainRows: STAGE_07_TERRAIN_ROWS,
  },
  {
    id: 8,
    name: 'Stage 8',
    intent: 'Needle lanes and river seams amplify long-range pressure.',
    enemiesTotal: 12,
    spawnDelaySec: 0.58,
    enemyQueue: ['sniper', 'raider', 'sniper', 'heavy', 'grunt', 'sniper', 'raider', 'heavy', 'sniper', 'raider', 'heavy', 'sniper'],
    terrainRows: STAGE_08_TERRAIN_ROWS,
  },
  {
    id: 9,
    name: 'Stage 9',
    intent: 'Fortress-style density with tight breaches and steel cores.',
    enemiesTotal: 13,
    spawnDelaySec: 0.56,
    enemyQueue: ['heavy', 'sniper', 'raider', 'heavy', 'sniper', 'raider', 'heavy', 'sniper', 'grunt', 'raider', 'heavy', 'sniper', 'heavy'],
    terrainRows: STAGE_09_TERRAIN_ROWS,
  },
  {
    id: 10,
    name: 'Stage 10',
    intent: 'Gauntlet mix of steel, brick and river close to original finale feel.',
    enemiesTotal: 14,
    spawnDelaySec: 0.54,
    enemyQueue: ['sniper', 'heavy', 'raider', 'sniper', 'heavy', 'raider', 'sniper', 'heavy', 'raider', 'sniper', 'heavy', 'raider', 'sniper', 'heavy'],
    terrainRows: STAGE_10_TERRAIN_ROWS,
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
