import { difficultyConfigs, generateLootItems, getDungeonById, skills } from './content/data'
import knightManifestData from '@/game-center/pixel-knight/assets/characters/knight.json'
import shieldMatrixData from '@/game-center/pixel-knight/assets/equipment/off-hand/wood-shield.json'
import swordMatrixData from '@/game-center/pixel-knight/assets/equipment/main-hand/iron-sword.json'
import { getPixelKnightHeroSpriteAsset, getPixelKnightVillageSpritesheetAsset } from './game/preload'
import {
  drawMatrixCharacter,
  type MatrixCharacterMode,
  type MatrixEquipmentPiece,
  type MatrixEquipmentSlot,
  type MatrixFacing,
  type MatrixManifest,
} from './rendering/matrixCharacterRenderer'
import type {
  DifficultyTier,
  DungeonId,
  FacingDirection,
  MapDef,
  MapHotspot,
  PixelKnightGameCallbacks,
  PixelKnightHudState,
  PlayerDerivedStats,
  RunResult,
} from './types'

type Vector2 = { x: number; y: number }

type PlayerState = {
  x: number
  y: number
  radius: number
  health: number
  maxHealth: number
  armor: number
  invulnerableMs: number
  dashGuardMs: number
  blessingMs: number
  whirlMs: number
  attackCooldownMs: number
  shieldCooldownMs: number
  holyCooldownMs: number
  blessingCooldownMs: number
  dodgeCooldownMs: number
  whirlwindCooldownMs: number
  moving: boolean
  attackAnimMs: number
  attackAnimElapsedMs: number
  locomotionAnimElapsedMs: number
}

type EnemyKind = 'mossling' | 'needlebat' | 'vinebrute' | 'sunpriest'

type EnemyState = {
  id: string
  kind: EnemyKind
  x: number
  y: number
  radius: number
  health: number
  maxHealth: number
  speed: number
  damage: number
  range: number
  attackCooldownMs: number
  elite: boolean
  archetype: 'melee' | 'ranged'
}

type ProjectileState = {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  damage: number
  from: 'enemy' | 'player'
  lifeMs: number
}

type ActiveRun = {
  dungeonId: DungeonId
  difficulty: DifficultyTier
  stats: PlayerDerivedStats
  startedAt: number
  rewardXp: number
  rewardGold: number
  rewardMaterials: number
  map: MapDef
  portalCell: { x: number; y: number }
}

const WIDTH = 960
const HEIGHT = 540
const TILE = 60
const WORLD_COLS = 48
const WORLD_ROWS = 27
const VILLAGE_COLS = 28
const VILLAGE_ROWS = 20
const PORTAL_RADIUS = 30
const MATRIX_PLAYER_PIXEL_SIZE = 3
const MATRIX_ATTACK_DURATION_MS = 420
const matrixKnightManifest = knightManifestData as MatrixManifest
const matrixKnightEquipment: Partial<Record<MatrixEquipmentSlot, MatrixEquipmentPiece | null>> = {
  mainHand: swordMatrixData as MatrixEquipmentPiece,
  offHand: shieldMatrixData as MatrixEquipmentPiece,
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function distance(a: Vector2, b: Vector2) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function normalize(vector: Vector2) {
  const magnitude = Math.hypot(vector.x, vector.y)
  if (magnitude <= 0.0001) return { x: 0, y: 0 }
  return { x: vector.x / magnitude, y: vector.y / magnitude }
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function makeGrid() {
  return Array.from({ length: WORLD_ROWS }, () => Array.from({ length: WORLD_COLS }, () => '#'))
}

function makeVillageGrid() {
  return Array.from({ length: VILLAGE_ROWS }, () => Array.from({ length: VILLAGE_COLS }, () => 'g'))
}

function carveRect(grid: string[][], x: number, y: number, w: number, h: number, fill = '.') {
  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) {
      if (row >= 0 && row < WORLD_ROWS && col >= 0 && col < WORLD_COLS) grid[row][col] = fill
    }
  }
}

function carvePath(grid: string[][], points: Array<[number, number]>) {
  for (let index = 1; index < points.length; index += 1) {
    const [fromX, fromY] = points[index - 1]
    const [toX, toY] = points[index]
    if (fromX === toX) {
      const start = Math.min(fromY, toY)
      const end = Math.max(fromY, toY)
      for (let row = start; row <= end; row += 1) carveRect(grid, fromX - 1, row - 1, 3, 3)
    } else if (fromY === toY) {
      const start = Math.min(fromX, toX)
      const end = Math.max(fromX, toX)
      for (let col = start; col <= end; col += 1) carveRect(grid, col - 1, fromY - 1, 3, 3)
    }
  }
}

function buildMaze(dungeonId: DungeonId) {
  const grid = makeGrid()
  const start = { x: 3, y: 3 }
  const portal = { x: 44, y: 23 }

  const commonRooms: Array<[number, number, number, number]> = [
    [1, 1, 8, 6],
    [12, 1, 10, 5],
    [25, 2, 9, 6],
    [38, 1, 8, 7],
    [4, 10, 10, 7],
    [19, 11, 8, 5],
    [31, 10, 13, 6],
    [2, 20, 9, 5],
    [15, 20, 11, 5],
    [30, 19, 16, 7],
  ]
  const roomVariants: Record<DungeonId, Array<[number, number, number, number]>> = {
    sunmeadow: commonRooms,
    'vine-ruins': [...commonRooms, [21, 6, 5, 4], [9, 15, 5, 4]],
    'crystal-cavern': [...commonRooms, [35, 8, 6, 4], [27, 15, 4, 5]],
  }
  const paths: Record<DungeonId, Array<Array<[number, number]>>> = {
    sunmeadow: [
      [[4, 4], [16, 4], [16, 13], [7, 13], [7, 22], [20, 22], [20, 13], [37, 13], [37, 22], [44, 22]],
      [[20, 4], [29, 4], [29, 13]],
      [[29, 4], [41, 4]],
    ],
    'vine-ruins': [
      [[4, 4], [16, 4], [16, 13], [7, 13], [7, 22], [20, 22], [20, 13], [24, 13], [24, 7], [29, 7], [29, 13], [37, 13], [37, 22], [44, 22]],
      [[20, 4], [41, 4]],
      [[11, 13], [11, 16], [23, 16]],
    ],
    'crystal-cavern': [
      [[4, 4], [16, 4], [16, 13], [7, 13], [7, 22], [20, 22], [20, 13], [29, 13], [29, 17], [37, 17], [37, 22], [44, 22]],
      [[20, 4], [29, 4], [29, 13]],
      [[29, 4], [41, 4], [41, 9], [37, 9]],
    ],
  }

  for (const room of roomVariants[dungeonId]) carveRect(grid, ...room)
  for (const path of paths[dungeonId]) carvePath(grid, path)

  grid[start.y][start.x] = 'S'
  grid[portal.y][portal.x] = 'P'
  return {
    id: dungeonId,
    kind: 'dungeon',
    name: getDungeonById(dungeonId).name,
    rows: grid.map((row) => row.join('')),
    start,
    portal,
    hotspots: [],
  } satisfies MapDef
}

function buildStarterVillage() {
  const grid = makeVillageGrid()
  const start = { x: 14, y: 17 }

  for (let col = 0; col < VILLAGE_COLS; col += 1) {
    grid[0][col] = '#'
    grid[VILLAGE_ROWS - 1][col] = '#'
  }
  for (let row = 0; row < VILLAGE_ROWS; row += 1) {
    grid[row][0] = '#'
    grid[row][VILLAGE_COLS - 1] = '#'
  }

  const paintRect = (x: number, y: number, w: number, h: number, fill: string) => {
    for (let row = y; row < y + h; row += 1) {
      for (let col = x; col < x + w; col += 1) {
        if (row >= 0 && row < VILLAGE_ROWS && col >= 0 && col < VILLAGE_COLS) grid[row][col] = fill
      }
    }
  }
  const paintPath = (points: Array<[number, number]>, width = 3) => {
    const half = Math.floor(width / 2)
    for (let index = 1; index < points.length; index += 1) {
      const [fromX, fromY] = points[index - 1]
      const [toX, toY] = points[index]
      if (fromX === toX) {
        for (let row = Math.min(fromY, toY); row <= Math.max(fromY, toY); row += 1) {
          paintRect(fromX - half, row - half, width, width, 'r')
        }
      } else if (fromY === toY) {
        for (let col = Math.min(fromX, toX); col <= Math.max(fromX, toX); col += 1) {
          paintRect(col - half, fromY - half, width, width, 'r')
        }
      }
    }
  }

  paintRect(10, 5, 8, 6, 'p')
  paintPath([
    [14, 17],
    [14, 13],
    [14, 8],
    [14, 3],
  ])
  paintPath([
    [14, 8],
    [7, 8],
    [5, 12],
  ])
  paintPath([
    [14, 8],
    [21, 8],
    [23, 12],
  ])
  paintPath([
    [14, 10],
    [9, 16],
  ], 2)
  paintPath([
    [14, 10],
    [20, 15],
  ], 2)

  const blockers: Array<[number, number, number, number]> = [
    [3, 10, 4, 3],
    [3, 13, 5, 2],
    [20, 10, 5, 3],
    [21, 13, 4, 2],
    [19, 4, 5, 3],
    [4, 4, 4, 3],
    [8, 15, 3, 2],
    [19, 15, 3, 2],
    [11, 2, 6, 1],
    [25, 5, 1, 7],
    [2, 5, 1, 7],
  ]
  for (const blocker of blockers) paintRect(...blocker, '#')
  grid[start.y][start.x] = 'S'
  grid[3][14] = 'P'

  const hotspots: MapHotspot[] = [
    { id: 'village-portal', kind: 'portal', label: '传送门', prompt: '按 F：选择副本', cell: { x: 14, y: 3 }, radius: 88 },
    { id: 'village-shop', kind: 'shop', label: '旅店商铺', prompt: '按 F：购买补给', cell: { x: 8, y: 12 }, radius: 82 },
    { id: 'village-stash', kind: 'stash', label: '储藏箱', prompt: '按 F：打开仓库', cell: { x: 10, y: 16 }, radius: 74 },
    { id: 'village-blacksmith', kind: 'blacksmith', label: '铁匠铺', prompt: '按 F：查看强化', cell: { x: 21, y: 7 }, radius: 82 },
    { id: 'village-notice', kind: 'notice-board', label: '公告板', prompt: '按 F：查看告示', cell: { x: 8, y: 7 }, radius: 76 },
    { id: 'village-gemsmith', kind: 'gemsmith', label: '宝石匠', prompt: '按 F：预留功能', cell: { x: 23, y: 12 }, radius: 78 },
  ]

  return {
    id: 'starter-village',
    kind: 'village',
    name: '晨铃新手村',
    rows: grid.map((row) => row.join('')),
    start,
    portal: { x: 20, y: 5 },
    hotspots,
  } satisfies MapDef
}

const starterVillage = buildStarterVillage()

function isWall(mapRows: string[], col: number, row: number) {
  if (row < 0 || row >= mapRows.length || col < 0 || col >= mapRows[0].length) return true
  return mapRows[row][col] === '#'
}

function circleRectIntersects(circleX: number, circleY: number, radius: number, rectX: number, rectY: number, rectW: number, rectH: number) {
  const closestX = clamp(circleX, rectX, rectX + rectW)
  const closestY = clamp(circleY, rectY, rectY + rectH)
  const dx = circleX - closestX
  const dy = circleY - closestY
  return dx * dx + dy * dy < radius * radius
}

function collidesWithWalls(mapRows: string[], x: number, y: number, radius: number) {
  const minCol = Math.floor((x - radius) / TILE)
  const maxCol = Math.floor((x + radius) / TILE)
  const minRow = Math.floor((y - radius) / TILE)
  const maxRow = Math.floor((y + radius) / TILE)

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      if (!isWall(mapRows, col, row)) continue
      if (circleRectIntersects(x, y, radius, col * TILE, row * TILE, TILE, TILE)) return true
    }
  }
  return false
}

function worldFromCell(cell: { x: number; y: number }) {
  return { x: cell.x * TILE + TILE / 2, y: cell.y * TILE + TILE / 2 }
}

function randomWalkableCell(mapRows: string[], blocked: Array<{ x: number; y: number }>) {
  const floorCells: Array<{ x: number; y: number }> = []
  for (let row = 0; row < mapRows.length; row += 1) {
    for (let col = 0; col < mapRows[row].length; col += 1) {
      const value = mapRows[row][col]
      if (value === '#' || value === 'S' || value === 'P') continue
      const tooClose = blocked.some((cell) => Math.abs(cell.x - col) + Math.abs(cell.y - row) < 4)
      if (!tooClose) floorCells.push({ x: col, y: row })
    }
  }
  return floorCells[Math.floor(Math.random() * floorCells.length)]
}

function spawnEnemyClusters(mapRows: string[], dungeonId: DungeonId, difficulty: DifficultyTier) {
  const difficultyConfig = difficultyConfigs[difficulty]
  const start = { x: 3, y: 3 }
  const portal = { x: 44, y: 23 }
  const clusterCount = 6 + difficultyConfig.eliteSpawnBonus
  const enemies: EnemyState[] = []

  for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex += 1) {
    const center = randomWalkableCell(mapRows, [start, portal])
    const clusterSize = 2 + Math.floor(Math.random() * 3)
    const rangedCluster = Math.random() > 0.52
    const baseKindPool: EnemyKind[] = rangedCluster ? ['needlebat', 'sunpriest'] : ['mossling', 'vinebrute']
    const clusterKind = baseKindPool[Math.floor(Math.random() * baseKindPool.length)]

    for (let memberIndex = 0; memberIndex < clusterSize; memberIndex += 1) {
      const candidate = {
        x: center.x + Math.floor(randomBetween(-2, 3)),
        y: center.y + Math.floor(randomBetween(-2, 3)),
      }
      if (isWall(mapRows, candidate.x, candidate.y)) continue
      if (mapRows[candidate.y][candidate.x] === 'S' || mapRows[candidate.y][candidate.x] === 'P') continue

      const elite = memberIndex === 0 && clusterIndex >= 2 && Math.random() > 0.68
      const melee = clusterKind === 'mossling' || clusterKind === 'vinebrute'
      const baseHealth = clusterKind === 'vinebrute' ? 92 : clusterKind === 'sunpriest' ? 56 : clusterKind === 'needlebat' ? 44 : 52
      const baseDamage = clusterKind === 'vinebrute' ? 16 : clusterKind === 'sunpriest' ? 15 : clusterKind === 'needlebat' ? 11 : 12

      enemies.push({
        id: `${clusterKind}-${clusterIndex}-${memberIndex}-${performance.now()}`,
        kind: clusterKind,
        ...worldFromCell(candidate),
        radius: melee ? 16 : 13,
        health: baseHealth * difficultyConfig.enemyHealthMultiplier * (elite ? 1.4 : 1),
        maxHealth: baseHealth * difficultyConfig.enemyHealthMultiplier * (elite ? 1.4 : 1),
        speed: melee ? (clusterKind === 'vinebrute' ? 92 : 108) : 0,
        damage: baseDamage * difficultyConfig.enemyDamageMultiplier * (elite ? 1.16 : 1),
        range: melee ? 38 : clusterKind === 'sunpriest' ? 270 : 240,
        attackCooldownMs: randomBetween(520, 980),
        elite,
        archetype: melee ? 'melee' : 'ranged',
      })
    }
  }
  return enemies
}

export class PixelKnightGame {
  private host: HTMLDivElement
  private callbacks: PixelKnightGameCallbacks
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private animationFrame: number | null = null
  private phase: PixelKnightHudState['phase'] = 'boot'
  private player: PlayerState | null = null
  private enemies: EnemyState[] = []
  private projectiles: ProjectileState[] = []
  private run: ActiveRun | null = null
  private mouse: Vector2 = { x: WIDTH / 2, y: HEIGHT / 2 }
  private keys = new Set<string>()
  private lootFeed: string[] = []
  private pauseRequested = false
  private lastFrame = performance.now()
  private trailSegments: Array<{ x: number; y: number; lifeMs: number }> = []
  private encounterLabel = '待机'
  private objectiveLabel = '准备中'
  private portalNearby = false
  private nearbyHotspot: MapHotspot | null = null

  constructor(host: HTMLDivElement, callbacks: PixelKnightGameCallbacks) {
    this.host = host
    this.callbacks = callbacks
  }

  bootstrap() {
    const canvas = document.createElement('canvas')
    canvas.width = WIDTH
    canvas.height = HEIGHT
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.imageRendering = 'pixelated'
    canvas.style.display = 'block'
    canvas.style.borderRadius = '22px'
    canvas.style.background = '#171b18'
    canvas.setAttribute('aria-label', 'Pixel Knight playfield')
    canvas.tabIndex = 0
    this.host.innerHTML = ''
    this.host.appendChild(canvas)
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')

    canvas.addEventListener('mousemove', this.onMouseMove)
    canvas.addEventListener('mousedown', this.onMouseDown)
    canvas.addEventListener('contextmenu', this.onContextMenu)
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)

    this.phase = 'home'
    this.enterVillage()
    this.emitHud()
    this.animationFrame = requestAnimationFrame(this.loop)
  }

  startRun(config: { dungeonId: DungeonId; difficulty: DifficultyTier; stats: PlayerDerivedStats }) {
    const built = buildMaze(config.dungeonId)
    const startPos = worldFromCell(built.start)
    this.run = {
      dungeonId: config.dungeonId,
      difficulty: config.difficulty,
      stats: config.stats,
      startedAt: performance.now(),
      rewardXp: 0,
      rewardGold: 0,
      rewardMaterials: 0,
      map: built,
      portalCell: built.portal ?? { x: 0, y: 0 },
    }
    this.player = {
      x: startPos.x,
      y: startPos.y,
      radius: 18,
      health: config.stats.maxHealth,
      maxHealth: config.stats.maxHealth,
      armor: config.stats.armor,
      invulnerableMs: 0,
      dashGuardMs: 0,
      blessingMs: 0,
      whirlMs: 0,
      attackCooldownMs: 0,
      shieldCooldownMs: 0,
      holyCooldownMs: 0,
      blessingCooldownMs: 0,
      dodgeCooldownMs: 0,
      whirlwindCooldownMs: 0,
      moving: false,
      attackAnimMs: 0,
      attackAnimElapsedMs: 0,
      locomotionAnimElapsedMs: 0,
    }
    this.enemies = spawnEnemyClusters(built.rows, config.dungeonId, config.difficulty)
    this.projectiles = []
    this.trailSegments = []
    this.lootFeed = ['探索迷宫，靠近尽头的传送点后按 F 返回村庄。']
    this.pauseRequested = false
    this.portalNearby = false
    this.nearbyHotspot = null
    this.encounterLabel = '迷宫探索'
    this.objectiveLabel = '穿越迷宫并带着战利品撤离'
    this.phase = 'playing'
    this.emitHud()
  }

  setPaused(paused: boolean) {
    if (this.phase !== 'playing' && this.phase !== 'paused') return
    this.pauseRequested = paused
    this.phase = paused ? 'paused' : 'playing'
    this.emitHud()
  }

  stopToHome() {
    this.run = null
    this.enemies = []
    this.projectiles = []
    this.trailSegments = []
    this.portalNearby = false
    this.enterVillage()
    this.emitHud()
  }

  enterVillage(stats?: PlayerDerivedStats) {
    const startPos = this.player && this.phase === 'home' ? { x: this.player.x, y: this.player.y } : worldFromCell(starterVillage.start)
    this.run = null
    this.enemies = []
    this.projectiles = []
    this.trailSegments = []
    this.player = {
      x: startPos.x,
      y: startPos.y,
      radius: 18,
      health: stats?.maxHealth ?? this.player?.maxHealth ?? 160,
      maxHealth: stats?.maxHealth ?? this.player?.maxHealth ?? 160,
      armor: stats?.armor ?? this.player?.armor ?? 18,
      invulnerableMs: 0,
      dashGuardMs: 0,
      blessingMs: 0,
      whirlMs: 0,
      attackCooldownMs: 0,
      shieldCooldownMs: 0,
      holyCooldownMs: 0,
      blessingCooldownMs: 0,
      dodgeCooldownMs: 0,
      whirlwindCooldownMs: 0,
      moving: false,
      attackAnimMs: 0,
      attackAnimElapsedMs: 0,
      locomotionAnimElapsedMs: this.player?.locomotionAnimElapsedMs ?? 0,
    }
    this.phase = 'home'
    this.pauseRequested = false
    this.portalNearby = false
    this.encounterLabel = '新手村'
    this.objectiveLabel = '在村庄中移动，靠近地标后按 F 互动'
    this.lootFeed = ['欢迎来到晨铃新手村。北侧传送门可以进入副本。']
    this.updateVillageHotspot()
    this.emitHud()
  }

  dispose() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame)
    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this.onMouseMove)
      this.canvas.removeEventListener('mousedown', this.onMouseDown)
      this.canvas.removeEventListener('contextmenu', this.onContextMenu)
    }
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
  }

  private onMouseMove = (event: MouseEvent) => {
    if (!this.canvas) return
    const rect = this.canvas.getBoundingClientRect()
    this.mouse = {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    }
  }

  private onContextMenu = (event: MouseEvent) => {
    event.preventDefault()
  }

  private onMouseDown = (event: MouseEvent) => {
    if (this.phase !== 'playing') return
    if (event.button === 0) this.useBasicAttack()
    if (event.button === 2) this.useWhirlwind()
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.code === 'Escape') {
      if (this.phase === 'playing' || this.phase === 'paused') {
        event.preventDefault()
        this.setPaused(!this.pauseRequested)
      }
      return
    }
    this.keys.add(event.code)
    if (this.phase === 'home') {
      if (event.code === 'KeyF' && this.nearbyHotspot) {
        event.preventDefault()
        this.callbacks.onHotspotInteract(this.nearbyHotspot)
      }
      return
    }
    if (this.phase !== 'playing') return
    if (event.code === 'KeyF') {
      event.preventDefault()
      if (this.portalNearby) {
        this.finishRun(true)
        return
      }
    }
    if (event.code === 'KeyQ') {
      event.preventDefault()
      this.useShieldBash()
    }
    if (event.code === 'KeyE') {
      event.preventDefault()
      this.useHolyDash()
    }
    if (event.code === 'KeyR') {
      event.preventDefault()
      this.useBlessing()
    }
    if (event.code === 'Space') {
      event.preventDefault()
      this.useDodge()
    }
  }

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code)
  }

  private loop = (timestamp: number) => {
    const dt = Math.min(34, timestamp - this.lastFrame)
    this.lastFrame = timestamp
    this.update(dt)
    this.render()
    this.animationFrame = requestAnimationFrame(this.loop)
  }

  private update(dt: number) {
    this.trailSegments = this.trailSegments
      .map((segment) => ({ ...segment, lifeMs: segment.lifeMs - dt }))
      .filter((segment) => segment.lifeMs > 0)

    if (this.phase === 'paused' || this.pauseRequested) return
    if (this.phase === 'home') {
      this.updateVillage(dt)
      return
    }
    if (this.phase === 'boot') return
    if (!this.player || !this.run) return

    this.player.attackCooldownMs = Math.max(0, this.player.attackCooldownMs - dt)
    this.player.shieldCooldownMs = Math.max(0, this.player.shieldCooldownMs - dt)
    this.player.holyCooldownMs = Math.max(0, this.player.holyCooldownMs - dt)
    this.player.blessingCooldownMs = Math.max(0, this.player.blessingCooldownMs - dt)
    this.player.dodgeCooldownMs = Math.max(0, this.player.dodgeCooldownMs - dt)
    this.player.whirlwindCooldownMs = Math.max(0, this.player.whirlwindCooldownMs - dt)
    this.player.attackAnimMs = Math.max(0, this.player.attackAnimMs - dt)
    this.player.attackAnimElapsedMs =
      this.player.attackAnimMs > 0 ? Math.min(MATRIX_ATTACK_DURATION_MS, this.player.attackAnimElapsedMs + dt) : 0
    this.player.locomotionAnimElapsedMs += dt
    this.player.invulnerableMs = Math.max(0, this.player.invulnerableMs - dt)
    this.player.dashGuardMs = Math.max(0, this.player.dashGuardMs - dt)
    this.player.blessingMs = Math.max(0, this.player.blessingMs - dt)
    this.player.whirlMs = Math.max(0, this.player.whirlMs - dt)

    const input: Vector2 = {
      x: (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0),
      y: (this.keys.has('KeyS') ? 1 : 0) - (this.keys.has('KeyW') ? 1 : 0),
    }
    const move = normalize(input)
    this.player.moving = Math.abs(move.x) > 0 || Math.abs(move.y) > 0
    const speed = (this.run.stats.moveSpeed + (this.player.whirlMs > 0 ? -30 : 0)) * (dt / 1000)
    this.tryMovePlayer(move.x * speed, move.y * speed)

    if (this.player.whirlMs > 0) {
      this.applyAreaDamage(this.player.x, this.player.y, 78, this.run.stats.attack * 0.33 * (dt / 180), true)
      if (this.run.stats.activeLegendaryPowers.includes('whirlwind-trail')) {
        this.trailSegments.push({ x: this.player.x, y: this.player.y, lifeMs: 380 })
      }
    }
    if (this.player.blessingMs > 0 && this.run.stats.activeLegendaryPowers.includes('blessing-chain')) {
      if (Math.floor(this.player.blessingMs / 1000) !== Math.floor((this.player.blessingMs + dt) / 1000)) {
        const nearest = [...this.enemies].sort(
          (a, b) => distance(a, this.player as Vector2) - distance(b, this.player as Vector2),
        )[0]
        if (nearest) this.spawnPlayerBolt(nearest)
      }
    }

    for (const enemy of this.enemies) {
      enemy.attackCooldownMs = Math.max(0, enemy.attackCooldownMs - dt)
      const delta = { x: this.player.x - enemy.x, y: this.player.y - enemy.y }
      const dir = normalize(delta)
      const dist = Math.hypot(delta.x, delta.y)

      if (enemy.archetype === 'melee') {
        if (dist > enemy.range) {
          this.tryMoveEnemy(enemy, dir.x * enemy.speed * (dt / 1000), dir.y * enemy.speed * (dt / 1000))
        }
      }

      if (dist <= enemy.range && enemy.attackCooldownMs <= 0) {
        enemy.attackCooldownMs = enemy.archetype === 'ranged' ? 1400 : 920
        if (enemy.archetype === 'ranged') {
          const speedFactor = 160 + (enemy.elite ? 15 : 0)
          this.projectiles.push({
            id: `enemy-${enemy.id}-${performance.now()}`,
            x: enemy.x,
            y: enemy.y,
            vx: dir.x * speedFactor,
            vy: dir.y * speedFactor,
            radius: enemy.kind === 'sunpriest' ? 9 : 7,
            damage: enemy.damage,
            from: 'enemy',
            lifeMs: 2500,
          })
        } else {
          this.damagePlayer(enemy.damage)
        }
      }
    }

    this.projectiles = this.projectiles
      .map((projectile) => ({
        ...projectile,
        x: projectile.x + projectile.vx * (dt / 1000),
        y: projectile.y + projectile.vy * (dt / 1000),
        lifeMs: projectile.lifeMs - dt,
      }))
      .filter((projectile) => {
        if (projectile.lifeMs <= 0 || !this.run) return false
        if (collidesWithWalls(this.run.map.rows, projectile.x, projectile.y, projectile.radius)) return false
        if (projectile.from === 'enemy') {
          if (this.player && distance(projectile, this.player) <= projectile.radius + this.player.radius) {
            this.damagePlayer(projectile.damage)
            return false
          }
          return true
        }
        let hit = false
        for (const enemy of this.enemies) {
          if (distance(projectile, enemy) <= projectile.radius + enemy.radius) {
            this.damageEnemy(enemy, projectile.damage)
            hit = true
          }
        }
        return !hit
      })

    const portalPos = worldFromCell(this.run.portalCell)
    this.portalNearby = distance(this.player, portalPos) < PORTAL_RADIUS + 26
    this.encounterLabel = this.portalNearby ? '传送点已就绪' : '迷宫探索'
    this.objectiveLabel = this.portalNearby
      ? '按 F 交互并返回村庄'
      : '探索迷宫深处，靠近尽头传送点后撤离'

    this.emitHud()
  }

  private tryMovePlayer(dx: number, dy: number) {
    const map = this.getActiveMap()
    if (!this.player || !map) return
    const maxX = map.rows[0].length * TILE - this.player.radius
    const maxY = map.rows.length * TILE - this.player.radius
    const nextX = clamp(this.player.x + dx, this.player.radius, maxX)
    if (!collidesWithWalls(map.rows, nextX, this.player.y, this.player.radius)) this.player.x = nextX
    const nextY = clamp(this.player.y + dy, this.player.radius, maxY)
    if (!collidesWithWalls(map.rows, this.player.x, nextY, this.player.radius)) this.player.y = nextY
  }

  private tryMoveEnemy(enemy: EnemyState, dx: number, dy: number) {
    if (!this.run) return
    const nextX = enemy.x + dx
    const nextY = enemy.y + dy
    if (!collidesWithWalls(this.run.map.rows, nextX, enemy.y, enemy.radius)) enemy.x = nextX
    if (!collidesWithWalls(this.run.map.rows, enemy.x, nextY, enemy.radius)) enemy.y = nextY
  }

  private useBasicAttack() {
    if (!this.player || !this.run || this.player.attackCooldownMs > 0) return
    this.player.attackCooldownMs = skills.find((skill) => skill.id === 'basic-slash')?.cooldownMs ?? 360
    this.player.attackAnimMs = MATRIX_ATTACK_DURATION_MS
    this.player.attackAnimElapsedMs = 0
    const camera = this.getCamera()
    const worldMouse = { x: this.mouse.x + camera.x, y: this.mouse.y + camera.y }
    const direction = normalize({ x: worldMouse.x - this.player.x, y: worldMouse.y - this.player.y })
    for (const enemy of this.enemies) {
      const delta = { x: enemy.x - this.player.x, y: enemy.y - this.player.y }
      const dist = Math.hypot(delta.x, delta.y)
      if (dist > 90) continue
      const enemyDir = normalize(delta)
      const dot = direction.x * enemyDir.x + direction.y * enemyDir.y
      if (dot < 0.05) continue
      const crit = Math.random() < this.run.stats.critChance
      this.damageEnemy(enemy, this.run.stats.attack * (crit ? 1 + this.run.stats.critDamage : 1))
      if (this.run.stats.activeLegendaryPowers.includes('meadow-grace')) {
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 2)
      }
    }
  }

  private useWhirlwind() {
    if (!this.player || !this.run || this.player.whirlwindCooldownMs > 0) return
    this.player.whirlwindCooldownMs = skills.find((skill) => skill.id === 'whirlwind')?.cooldownMs ?? 4600
    this.player.whirlMs = this.run.stats.setPieces >= 2 ? 1600 : 1280
  }

  private useShieldBash() {
    if (!this.player || !this.run || this.player.shieldCooldownMs > 0) return
    this.player.shieldCooldownMs = skills.find((skill) => skill.id === 'shield-bash')?.cooldownMs ?? 3200
    const camera = this.getCamera()
    const worldMouse = { x: this.mouse.x + camera.x, y: this.mouse.y + camera.y }
    const direction = normalize({ x: worldMouse.x - this.player.x, y: worldMouse.y - this.player.y })
    this.tryMovePlayer(direction.x * 52, direction.y * 52)
    this.applyAreaDamage(this.player.x + direction.x * 26, this.player.y + direction.y * 26, 64, this.run.stats.attack * 2.4)
    if (this.run.stats.activeLegendaryPowers.includes('shield-nova') || this.run.stats.setPieces >= 4) {
      this.applyAreaDamage(this.player.x, this.player.y, 104, this.run.stats.attack * 1.25)
    }
  }

  private useHolyDash() {
    if (!this.player || !this.run || this.player.holyCooldownMs > 0) return
    this.player.holyCooldownMs = skills.find((skill) => skill.id === 'holy-dash')?.cooldownMs ?? 4200
    const camera = this.getCamera()
    const worldMouse = { x: this.mouse.x + camera.x, y: this.mouse.y + camera.y }
    const direction = normalize({ x: worldMouse.x - this.player.x, y: worldMouse.y - this.player.y })
    for (let step = 0; step < 4; step += 1) {
      this.trailSegments.push({
        x: this.player.x + direction.x * (step * 28),
        y: this.player.y + direction.y * (step * 28),
        lifeMs: 500,
      })
    }
    this.tryMovePlayer(direction.x * 112, direction.y * 112)
    this.player.invulnerableMs = 220
    this.applyAreaDamage(this.player.x, this.player.y, 54, this.run.stats.attack * 1.85 + this.run.stats.skillPower * 0.9)
  }

  private useBlessing() {
    if (!this.player || !this.run || this.player.blessingCooldownMs > 0) return
    this.player.blessingCooldownMs = skills.find((skill) => skill.id === 'blessing')?.cooldownMs ?? 9800
    this.player.blessingMs = 6200
  }

  private useDodge() {
    if (!this.player || !this.run || this.player.dodgeCooldownMs > 0) return
    this.player.dodgeCooldownMs = skills.find((skill) => skill.id === 'dodge')?.cooldownMs ?? 1800
    const camera = this.getCamera()
    const worldMouse = { x: this.mouse.x + camera.x, y: this.mouse.y + camera.y }
    const direction = normalize({
      x:
        ((this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0)) || worldMouse.x - this.player.x,
      y:
        ((this.keys.has('KeyS') ? 1 : 0) - (this.keys.has('KeyW') ? 1 : 0)) || worldMouse.y - this.player.y,
    })
    this.tryMovePlayer(direction.x * 82, direction.y * 82)
    this.player.invulnerableMs = 320
    if (this.run.stats.activeLegendaryPowers.includes('dash-guard')) this.player.dashGuardMs = 1800
  }

  private applyAreaDamage(x: number, y: number, radius: number, damage: number, soft = false) {
    for (const enemy of [...this.enemies]) {
      if (distance({ x, y }, enemy) <= radius + enemy.radius) {
        this.damageEnemy(enemy, soft ? damage : damage * (1 + this.run!.stats.skillPower / 180))
      }
    }
  }

  private spawnPlayerBolt(target: EnemyState) {
    if (!this.player) return
    const direction = normalize({ x: target.x - this.player.x, y: target.y - this.player.y })
    this.projectiles.push({
      id: `player-bolt-${performance.now()}`,
      x: this.player.x,
      y: this.player.y,
      vx: direction.x * 320,
      vy: direction.y * 320,
      radius: 7,
      damage: 18 + (this.run?.stats.skillPower ?? 0) * 0.6,
      from: 'player',
      lifeMs: 1800,
    })
  }

  private damageEnemy(enemy: EnemyState, rawDamage: number) {
    if (!this.run) return
    enemy.health -= rawDamage
    if (enemy.health > 0) return

    const difficulty = difficultyConfigs[this.run.difficulty]
    const xpValue = enemy.elite ? 40 : 16
    const goldValue = enemy.elite ? 20 : 8
    this.run.rewardXp += Math.round(xpValue * difficulty.experienceMultiplier)
    this.run.rewardGold += Math.round(goldValue * difficulty.goldMultiplier)
    this.run.rewardMaterials += enemy.elite ? 2 : 1
    if (enemy.elite) this.pushLootFeed('精英被击破，奖励提升。')
    this.enemies = this.enemies.filter((candidate) => candidate.id !== enemy.id)
    if (this.run.stats.activeLegendaryPowers.includes('sunburst') && enemy.elite) {
      this.applyAreaDamage(enemy.x, enemy.y, 94, this.run.stats.attack * 1.1)
    }
  }

  private damagePlayer(rawDamage: number) {
    if (!this.player) return
    if (this.player.invulnerableMs > 0) return
    const armorTotal =
      this.player.armor + (this.player.blessingMs > 0 ? 18 : 0) + (this.player.dashGuardMs > 0 ? 20 : 0)
    const damageTaken = Math.max(5, rawDamage - armorTotal * 0.16)
    this.player.health -= damageTaken
    this.player.invulnerableMs = 220
    if (this.player.health <= 0) this.finishRun(false)
  }

  private finishRun(victory: boolean) {
    if (!this.run) return
    const clearedRatio = Math.max(0.35, 1 - this.enemies.length / Math.max(1, this.enemies.length + 12))
    const itemCount = victory ? 2 + difficultyConfigs[this.run.difficulty].eliteSpawnBonus : 1
    const items = generateLootItems(this.run.dungeonId, this.run.difficulty, 3 + Math.round(clearedRatio * 4), itemCount)
    const durationMs = performance.now() - this.run.startedAt
    const result: RunResult = {
      victory,
      dungeonId: this.run.dungeonId,
      difficulty: this.run.difficulty,
      durationMs,
      rewards: {
        experienceGained: victory ? this.run.rewardXp + 90 : Math.round(this.run.rewardXp * 0.55),
        goldGained: victory ? this.run.rewardGold + 42 : Math.round(this.run.rewardGold * 0.55),
        materialsGained: victory ? this.run.rewardMaterials + 3 : Math.round(this.run.rewardMaterials * 0.5),
        items,
      },
    }
    this.phase = 'results'
    this.run = null
    this.player = null
    this.enemies = []
    this.projectiles = []
    this.trailSegments = []
    this.portalNearby = false
    this.emitHud()
    this.callbacks.onRunComplete(result)
  }

  private pushLootFeed(text: string) {
    this.lootFeed = [text, ...this.lootFeed].slice(0, 5)
  }

  private getActiveMap() {
    return this.run?.map ?? (this.phase === 'home' ? starterVillage : null)
  }

  private updateVillage(dt: number) {
    if (!this.player) return
    this.player.locomotionAnimElapsedMs += dt
    const input: Vector2 = {
      x: (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0),
      y: (this.keys.has('KeyS') ? 1 : 0) - (this.keys.has('KeyW') ? 1 : 0),
    }
    const move = normalize(input)
    this.player.moving = Math.abs(move.x) > 0 || Math.abs(move.y) > 0
    this.tryMovePlayer(move.x * 150 * (dt / 1000), move.y * 150 * (dt / 1000))
    this.updateVillageHotspot()
    this.emitHud()
  }

  private updateVillageHotspot() {
    if (!this.player) {
      this.nearbyHotspot = null
      return
    }
    const hotspots = starterVillage.hotspots ?? []
    const nearby = hotspots
      .map((hotspot) => ({ hotspot, dist: distance(this.player as Vector2, worldFromCell(hotspot.cell)) }))
      .filter(({ hotspot, dist }) => dist <= hotspot.radius)
      .sort((a, b) => a.dist - b.dist)[0]?.hotspot
    this.nearbyHotspot = nearby ?? null
    this.portalNearby = this.nearbyHotspot?.kind === 'portal'
    this.encounterLabel = this.nearbyHotspot ? this.nearbyHotspot.label : '新手村'
    this.objectiveLabel = this.nearbyHotspot?.prompt ?? '在村庄中移动，靠近地标后按 F 互动'
  }

  private getCamera() {
    const map = this.getActiveMap()
    if (!this.player || !map) return { x: 0, y: 0 }
    const worldWidth = map.rows[0].length * TILE
    const worldHeight = map.rows.length * TILE
    return {
      x: clamp(this.player.x - WIDTH / 2, 0, Math.max(0, worldWidth - WIDTH)),
      y: clamp(this.player.y - HEIGHT / 2, 0, Math.max(0, worldHeight - HEIGHT)),
    }
  }

  private getFacingDirection(camera: Vector2): FacingDirection {
    if (!this.player) return 'right'
    const worldMouseX = this.mouse.x + camera.x
    return worldMouseX < this.player.x - 4 ? 'left' : 'right'
  }

  private renderHeroSprite(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    facing: FacingDirection,
    scale = 1,
  ) {
    const asset = getPixelKnightHeroSpriteAsset()
    if (!asset) return false

    const { image, meta } = asset
    const drawWidth = meta.frameWidth * scale
    const drawHeight = meta.frameHeight * scale
    const pivotX = meta.pivot.x * scale
    const pivotY = meta.pivot.y * scale

    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.translate(Math.round(x), Math.round(y))
    if (facing === 'left') ctx.scale(-1, 1)
    ctx.drawImage(image, 0, 0, meta.frameWidth, meta.frameHeight, -pivotX, -pivotY, drawWidth, drawHeight)
    ctx.restore()
    return true
  }

  private resolvePlayerMatrixMode(player: PlayerState): MatrixCharacterMode {
    if (player.attackAnimMs > 0) return 'attack'
    return player.moving ? 'walk' : 'idle'
  }

  private renderMatrixPlayer(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    facing: FacingDirection,
    player: PlayerState,
  ) {
    const matrixFacing: MatrixFacing = facing === 'left' ? 'left' : 'right'
    drawMatrixCharacter(ctx, matrixKnightManifest, {
      actorX: x,
      actorFeetY: y + 8,
      pixelSize: MATRIX_PLAYER_PIXEL_SIZE,
      facing: matrixFacing,
      mode: this.resolvePlayerMatrixMode(player),
      timeMs: player.locomotionAnimElapsedMs,
      attackDurationMs: MATRIX_ATTACK_DURATION_MS,
      attackLocomotionMode: player.moving ? 'walk' : 'idle',
      locomotionTimeMs: player.locomotionAnimElapsedMs,
      attackTimeMs: player.attackAnimElapsedMs,
      equipment: matrixKnightEquipment,
    })
  }

  private emitHud() {
    const map = this.getActiveMap()
    const playerCell = this.player
      ? { x: Math.floor(this.player.x / TILE), y: Math.floor(this.player.y / TILE) }
      : { x: 0, y: 0 }
    const state: PixelKnightHudState = {
      phase: this.phase,
      mapKind: map?.kind ?? 'village',
      dungeonName: this.run ? getDungeonById(this.run.dungeonId).name : starterVillage.name,
      difficultyLabel: this.run ? difficultyConfigs[this.run.difficulty].label : '准备中',
      objectiveLabel: this.objectiveLabel,
      encounterLabel: this.encounterLabel,
      health: this.player?.health ?? 0,
      maxHealth: this.player?.maxHealth ?? 0,
      enemiesLeft: this.enemies.length,
      elapsedMs: this.run ? performance.now() - this.run.startedAt : 0,
      blessingActive: (this.player?.blessingMs ?? 0) > 0,
      portalNearby: this.portalNearby,
      minimapRows: map?.rows ?? [],
      playerCell,
      portalCell: this.run?.portalCell ?? starterVillage.portal ?? { x: 0, y: 0 },
      hotspots: map?.hotspots ?? [],
      nearbyHotspot: this.nearbyHotspot,
      recentLoot: this.lootFeed,
      cooldowns: {
        basic: this.player?.attackCooldownMs ?? 0,
        whirlwind: this.player?.whirlwindCooldownMs ?? 0,
        shield: this.player?.shieldCooldownMs ?? 0,
        holy: this.player?.holyCooldownMs ?? 0,
        blessing: this.player?.blessingCooldownMs ?? 0,
        dodge: this.player?.dodgeCooldownMs ?? 0,
      },
    }
    this.callbacks.onHud(state)
  }

  private render() {
    if (!this.ctx) return
    const ctx = this.ctx
    ctx.clearRect(0, 0, WIDTH, HEIGHT)

    if (this.phase === 'home') {
      this.renderVillageScene(ctx)
      return
    }

    if (this.phase === 'boot' || this.phase === 'results') {
      this.renderIdleScene(ctx)
      return
    }

    if (!this.run) return
    const palette = getDungeonById(this.run.dungeonId).palette
    const camera = this.getCamera()

    ctx.fillStyle = palette.sky
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    for (let row = 0; row < this.run.map.rows.length; row += 1) {
      for (let col = 0; col < this.run.map.rows[row].length; col += 1) {
        const tile = this.run.map.rows[row][col]
        const screenX = col * TILE - camera.x
        const screenY = row * TILE - camera.y
        if (screenX + TILE < 0 || screenX > WIDTH || screenY + TILE < 0 || screenY > HEIGHT) continue

        if (tile === '#') {
          ctx.fillStyle = palette.border
          ctx.fillRect(screenX, screenY, TILE, TILE)
          ctx.fillStyle = 'rgba(0,0,0,0.12)'
          ctx.fillRect(screenX + 6, screenY + 6, TILE - 12, TILE - 12)
        } else {
          ctx.fillStyle = palette.ground
          ctx.fillRect(screenX, screenY, TILE, TILE)
          ctx.fillStyle = 'rgba(255,255,255,0.04)'
          ctx.fillRect(screenX + 2, screenY + 2, TILE - 4, TILE - 4)
          if (tile === 'P') {
            ctx.fillStyle = '#8ce5ff'
            ctx.beginPath()
            ctx.arc(screenX + TILE / 2, screenY + TILE / 2, 18, 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'
            ctx.lineWidth = 3
            ctx.stroke()
          }
        }
      }
    }

    for (const segment of this.trailSegments) {
      ctx.fillStyle = `rgba(251,242,176,${segment.lifeMs / 600})`
      ctx.beginPath()
      ctx.arc(segment.x - camera.x, segment.y - camera.y, 18 - (1 - segment.lifeMs / 500) * 6, 0, Math.PI * 2)
      ctx.fill()
    }

    for (const enemy of this.enemies) {
      const x = enemy.x - camera.x
      const y = enemy.y - camera.y
      ctx.fillStyle =
        enemy.kind === 'vinebrute'
          ? '#567a3d'
          : enemy.kind === 'sunpriest'
            ? '#c39d52'
            : enemy.kind === 'needlebat'
              ? '#6d5cb0'
              : '#5e8b48'
      ctx.beginPath()
      ctx.arc(x, y, enemy.radius, 0, Math.PI * 2)
      ctx.fill()
      if (enemy.elite) {
        ctx.strokeStyle = '#ffdc75'
        ctx.lineWidth = 3
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(17,21,18,0.85)'
      ctx.fillRect(x - 18, y - enemy.radius - 18, 36, 5)
      ctx.fillStyle = '#f4cd73'
      ctx.fillRect(x - 18, y - enemy.radius - 18, 36 * (enemy.health / enemy.maxHealth), 5)
    }

    for (const projectile of this.projectiles) {
      ctx.fillStyle = projectile.from === 'enemy' ? '#ffd6b3' : '#f7ffab'
      ctx.beginPath()
      ctx.arc(projectile.x - camera.x, projectile.y - camera.y, projectile.radius, 0, Math.PI * 2)
      ctx.fill()
    }

    if (this.player) {
      const x = this.player.x - camera.x
      const y = this.player.y - camera.y
      const facing = this.getFacingDirection(camera)
      this.renderMatrixPlayer(ctx, x, y, facing, this.player)
      if (this.player.whirlMs > 0) {
        ctx.strokeStyle = 'rgba(255,243,173,0.8)'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.arc(x, y, 38, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    if (this.portalNearby && this.player) {
      const portal = worldFromCell(this.run.portalCell)
      ctx.fillStyle = 'rgba(8,12,10,0.58)'
      ctx.fillRect(portal.x - camera.x - 52, portal.y - camera.y - 56, 104, 28)
      ctx.fillStyle = '#f7efcf'
      ctx.font = '700 15px sans-serif'
      ctx.fillText('Press F', portal.x - camera.x - 24, portal.y - camera.y - 37)
    }
  }

  private renderVillageScene(ctx: CanvasRenderingContext2D) {
    const map = starterVillage
    const camera = this.getCamera()
    const sheet = getPixelKnightVillageSpritesheetAsset()
    ctx.fillStyle = '#b8d88a'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    for (let row = 0; row < map.rows.length; row += 1) {
      for (let col = 0; col < map.rows[row].length; col += 1) {
        const tile = map.rows[row][col]
        const screenX = col * TILE - camera.x
        const screenY = row * TILE - camera.y
        if (screenX + TILE < 0 || screenX > WIDTH || screenY + TILE < 0 || screenY > HEIGHT) continue
        this.renderVillageTile(ctx, tile, screenX, screenY, col, row, sheet)
      }
    }

    this.renderVillageLandmark(ctx, 'shop', 8, 12, camera, sheet)
    this.renderVillageLandmark(ctx, 'notice-board', 8, 7, camera, sheet)
    this.renderVillageLandmark(ctx, 'portal', 14, 3, camera, sheet)
    this.renderVillageLandmark(ctx, 'blacksmith', 21, 7, camera, sheet)
    this.renderVillageLandmark(ctx, 'gemsmith', 23, 12, camera, sheet)
    this.renderVillageLandmark(ctx, 'stash', 10, 16, camera, sheet)

    if (this.player) {
      const x = this.player.x - camera.x
      const y = this.player.y - camera.y
      const facing = this.getFacingDirection(camera)
      this.renderMatrixPlayer(ctx, x, y, facing, this.player)
    }

    if (this.nearbyHotspot && this.player) {
      const hotspotPos = worldFromCell(this.nearbyHotspot.cell)
      ctx.fillStyle = 'rgba(30,20,11,0.72)'
      ctx.fillRect(hotspotPos.x - camera.x - 90, hotspotPos.y - camera.y - 78, 180, 32)
      ctx.strokeStyle = '#f0d078'
      ctx.lineWidth = 2
      ctx.strokeRect(hotspotPos.x - camera.x - 90, hotspotPos.y - camera.y - 78, 180, 32)
      ctx.fillStyle = '#fff0bc'
      ctx.font = '800 16px sans-serif'
      ctx.fillText(this.nearbyHotspot.prompt, hotspotPos.x - camera.x - 72, hotspotPos.y - camera.y - 56)
    }
  }

  private renderVillageTile(
    ctx: CanvasRenderingContext2D,
    tile: string,
    x: number,
    y: number,
    col: number,
    row: number,
    sheet: HTMLImageElement | null,
  ) {
    if (tile === '#') {
      ctx.fillStyle = '#90c667'
      ctx.fillRect(x, y, TILE, TILE)
      if (col === 0 || row === 0 || row === VILLAGE_ROWS - 1 || col === VILLAGE_COLS - 1) {
        ctx.fillStyle = '#70492d'
        ctx.fillRect(x, y + TILE - 14, TILE, 14)
        ctx.fillStyle = '#9d6a3f'
        ctx.fillRect(x + 6, y + 8, 10, TILE - 18)
        ctx.fillRect(x + TILE - 16, y + 8, 10, TILE - 18)
      } else if ((col + row) % 3 === 0) {
        this.drawVillageDecoration(ctx, sheet, x, y, col, row)
      }
      return
    }
    ctx.fillStyle = tile === 'p' ? '#d7c38a' : tile === 'r' ? '#b9824e' : '#96c768'
    ctx.fillRect(x, y, TILE, TILE)
    if (tile === 'p') {
      ctx.strokeStyle = 'rgba(80,58,38,0.22)'
      ctx.lineWidth = 2
      ctx.strokeRect(x + 6, y + 6, TILE - 12, TILE - 12)
    } else if (tile === 'r') {
      ctx.fillStyle = 'rgba(78,48,28,0.16)'
      ctx.fillRect(x + 8, y + 16, TILE - 16, 6)
      ctx.fillRect(x + 18, y + 38, TILE - 24, 5)
    } else {
      ctx.fillStyle = (col + row) % 3 === 0 ? 'rgba(255,244,176,0.12)' : 'rgba(56,98,49,0.12)'
      ctx.fillRect(x + 8, y + 10, 8, 8)
      ctx.fillRect(x + 38, y + 35, 6, 6)
      if ((col * 5 + row * 7) % 11 === 0) this.drawVillageDecoration(ctx, sheet, x, y, col, row)
    }
  }

  private drawVillageDecoration(
    ctx: CanvasRenderingContext2D,
    sheet: HTMLImageElement | null,
    x: number,
    y: number,
    variantX = 0,
    variantY = 0,
  ) {
    if (!sheet) return
    const variants = [
      { x: 617, y: 825, w: 92, h: 102 },
      { x: 759, y: 850, w: 74, h: 80 },
      { x: 868, y: 844, w: 71, h: 86 },
      { x: 992, y: 819, w: 80, h: 112 },
    ]
    const source = variants[Math.abs((variantX * 7 + variantY * 3) % variants.length)]
    const size = 24 + Math.abs((variantX * 5 + variantY * 9) % 14)
    ctx.save()
    ctx.globalAlpha = 0.9
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(sheet, source.x, source.y, source.w, source.h, x + TILE - size - 4, y + TILE - size - 4, size, size)
    ctx.restore()
  }

  private drawVillageLandmarkSprite(
    ctx: CanvasRenderingContext2D,
    sheet: HTMLImageElement | null,
    kind: MapHotspot['kind'],
    x: number,
    y: number,
  ) {
    if (!sheet) return false
    const atlas: Record<MapHotspot['kind'], { x: number; y: number; w: number; h: number; dw: number; dh: number }> = {
      portal: { x: 782, y: 18, w: 293, h: 306, dw: 172, dh: 178 },
      shop: { x: 1170, y: 31, w: 320, h: 270, dw: 178, dh: 150 },
      stash: { x: 549, y: 351, w: 307, h: 244, dw: 160, dh: 128 },
      blacksmith: { x: 902, y: 352, w: 274, h: 252, dw: 156, dh: 138 },
      'notice-board': { x: 1222, y: 353, w: 254, h: 247, dw: 148, dh: 132 },
      gemsmith: { x: 1111, y: 807, w: 94, h: 122, dw: 72, dh: 96 },
    }
    const source = atlas[kind]
    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(sheet, source.x, source.y, source.w, source.h, x - source.dw / 2, y - source.dh / 2, source.dw, source.dh)
    ctx.restore()
    return true
  }

  private renderVillageLandmark(
    ctx: CanvasRenderingContext2D,
    kind: MapHotspot['kind'],
    cellX: number,
    cellY: number,
    camera: Vector2,
    sheet: HTMLImageElement | null,
  ) {
    const x = cellX * TILE - camera.x
    const y = cellY * TILE - camera.y
    if (x + 160 < 0 || x - 80 > WIDTH || y + 140 < 0 || y - 80 > HEIGHT) return
    const drewSprite = this.drawVillageLandmarkSprite(ctx, sheet, kind, x + TILE / 2, y + TILE / 2)
    if (drewSprite) return

    if (kind === 'portal') {
      ctx.fillStyle = '#544231'
      ctx.fillRect(x - 44, y + 30, 88, 20)
      ctx.strokeStyle = '#66e8ff'
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.arc(x + 30, y + 26, 34, Math.PI * 0.62, Math.PI * 2.38)
      ctx.stroke()
      ctx.fillStyle = 'rgba(102,232,255,0.32)'
      ctx.beginPath()
      ctx.arc(x + 30, y + 26, 23, 0, Math.PI * 2)
      ctx.fill()
      return
    }

    if (kind === 'shop' || kind === 'blacksmith' || kind === 'gemsmith') {
      const roof = kind === 'shop' ? '#d88d3d' : kind === 'blacksmith' ? '#7f5750' : '#5b88a8'
      ctx.fillStyle = '#6c4428'
      ctx.fillRect(x - 62, y - 24, 124, 78)
      ctx.fillStyle = roof
      ctx.fillRect(x - 74, y - 52, 148, 36)
      ctx.fillStyle = '#f3d27f'
      ctx.fillRect(x - 20, y + 5, 40, 49)
      ctx.fillStyle = '#2d2218'
      ctx.fillRect(x - 52, y - 3, 28, 24)
      ctx.fillRect(x + 25, y - 3, 28, 24)
      if (kind === 'blacksmith') {
        ctx.fillStyle = '#ff9b43'
        ctx.fillRect(x + 48, y + 34, 24, 20)
      }
      return
    }

    if (kind === 'stash') {
      ctx.fillStyle = '#5c3723'
      ctx.fillRect(x - 36, y + 4, 72, 44)
      ctx.fillStyle = '#9a6235'
      ctx.fillRect(x - 30, y - 4, 60, 24)
      ctx.fillStyle = '#e0b05e'
      ctx.fillRect(x - 4, y + 4, 8, 42)
      return
    }

    ctx.fillStyle = '#5c3923'
    ctx.fillRect(x - 36, y - 30, 72, 54)
    ctx.fillStyle = '#e9d7a2'
    ctx.fillRect(x - 28, y - 22, 56, 38)
    ctx.fillStyle = '#5c3923'
    ctx.fillRect(x - 6, y + 22, 12, 42)
  }

  private renderIdleScene(ctx: CanvasRenderingContext2D) {
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT)
    gradient.addColorStop(0, '#e8d4a5')
    gradient.addColorStop(0.55, '#86c66b')
    gradient.addColorStop(1, '#37614b')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    for (let index = 0; index < 12; index += 1) {
      ctx.fillStyle = `rgba(255,255,255,${0.06 + ((index % 3) + 1) * 0.05})`
      ctx.fillRect(70 + index * 68, 112 + (index % 2) * 54, 8, 8)
    }
    ctx.fillStyle = '#f2ddaa'
    if (!this.renderHeroSprite(ctx, 215, 356, 'right', 5)) {
      ctx.fillRect(170, 220, 70, 54)
      ctx.fillStyle = '#2f5e4f'
      ctx.fillRect(160, 270, 96, 88)
      ctx.fillStyle = '#f0f1e2'
      ctx.fillRect(242, 238, 28, 82)
    }

    ctx.fillStyle = 'rgba(18,24,20,0.24)'
    ctx.fillRect(0, HEIGHT - 118, WIDTH, 118)
    ctx.fillStyle = '#f6efdb'
    ctx.font = '900 50px sans-serif'
    ctx.fillText('PIXEL KNIGHT', 56, HEIGHT - 54)
    ctx.font = '600 18px sans-serif'
    ctx.fillText('Move freely, meet village landmarks, enter dungeons through the portal.', 60, HEIGHT - 24)
  }
}
