import { difficultyConfigs, generateLootItems, getDungeonById, skills } from './content/data'
import knightManifestData from '@/game-center/pixel-knight/assets/characters/knight.json'
import shieldMatrixData from '@/game-center/pixel-knight/assets/equipment/off-hand/wood-shield.json'
import swordMatrixData from '@/game-center/pixel-knight/assets/equipment/main-hand/iron-sword.json'
import { getPixelKnightHeroSpriteAsset, getPixelKnightVillageAsset } from './game/preload'
import { starterVillageLandmarks, starterVillageMap, starterVillageTerrainPatches } from './game/maps/starterVillage'
import { getVillageAssetMeta, resolveLandmarkAsset } from './rendering/villageAssets'
import type { VillageAssetId } from './rendering/villageAssets'
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

const starterVillage = starterVillageMap

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
  private lastHomeHudSignature: string | null = null
  private villageTerrainCache: HTMLCanvasElement | null = null

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
    this.villageTerrainCache = null
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

  /** Terrain cache can bake before village PNGs finish preloading — drop canvas so next frame rebuilds once assets exist. */
  invalidateVillageTerrainCache() {
    this.villageTerrainCache = null
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
    this.villageTerrainCache = null
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
      // Apply a small immediate step so tap inputs (including automation) still move the player.
      if (event.code === 'KeyW' || event.code === 'KeyA' || event.code === 'KeyS' || event.code === 'KeyD') {
        event.preventDefault()
        const tapStep = 18
        const stepX = event.code === 'KeyA' ? -tapStep : event.code === 'KeyD' ? tapStep : 0
        const stepY = event.code === 'KeyW' ? -tapStep : event.code === 'KeyS' ? tapStep : 0
        this.tryMovePlayer(stepX, stepY)
        this.updateVillageHotspot()
        this.emitHud()
      }
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

    if (this.phase !== 'home') {
      this.lastHomeHudSignature = null
      this.callbacks.onHud(state)
      return
    }

    const nh = state.nearbyHotspot
    const homeSig = JSON.stringify({
      phase: state.phase,
      mapKind: state.mapKind,
      dungeonName: state.dungeonName,
      difficultyLabel: state.difficultyLabel,
      objectiveLabel: state.objectiveLabel,
      encounterLabel: state.encounterLabel,
      portalNearby: state.portalNearby,
      nearbyId: nh?.id ?? null,
      px: state.playerCell.x,
      py: state.playerCell.y,
      health: state.health,
      maxHealth: state.maxHealth,
      blessingActive: state.blessingActive,
      recentLoot: state.recentLoot,
    })

    if (homeSig === this.lastHomeHudSignature) return
    this.lastHomeHudSignature = homeSig
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
    const camera = this.getCamera()
    this.renderVillageTerrainPatches(ctx, camera)

    const playerWorldY = this.player?.y ?? Number.POSITIVE_INFINITY
    const landmarksBehind = starterVillageLandmarks.filter((landmark) => worldFromCell(landmark.cell).y <= playerWorldY + 6)
    const landmarksFront = starterVillageLandmarks.filter((landmark) => worldFromCell(landmark.cell).y > playerWorldY + 6)
    this.renderVillageLandmarkLayer(ctx, camera, landmarksBehind)

    if (this.player) {
      const x = this.player.x - camera.x
      const y = this.player.y - camera.y
      const facing = this.getFacingDirection(camera)
      this.renderMatrixPlayer(ctx, x, y, facing, this.player)
    }
    this.renderVillageLandmarkLayer(ctx, camera, landmarksFront)

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

  private drawVillageAsset(
    ctx: CanvasRenderingContext2D,
    assetId: Parameters<typeof getVillageAssetMeta>[0],
    centerX: number,
    centerY: number,
    scale = 1,
    offsetX = 0,
    offsetY = 0,
  ) {
    const image = getPixelKnightVillageAsset(assetId)
    if (!image) return
    const meta = getVillageAssetMeta(assetId)
    ctx.save()
    ctx.imageSmoothingEnabled = false
    const drawWidth = meta.width * scale
    const drawHeight = meta.height * scale
    const anchorX = meta.anchorX * scale
    const anchorY = meta.anchorY * scale
    ctx.drawImage(image, centerX - anchorX + offsetX, centerY - anchorY + offsetY, drawWidth, drawHeight)
    ctx.restore()
  }

  private bakeVillageTerrainCacheIfNeeded() {
    if (this.villageTerrainCache) return
    const probe = getPixelKnightVillageAsset('terrain-grass-field')
    if (!probe?.naturalWidth) return

    let maxW = 0
    let maxH = 0
    for (const patch of starterVillageTerrainPatches) {
      maxW = Math.max(maxW, patch.x + patch.width)
      maxH = Math.max(maxH, patch.y + patch.height)
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(maxW)
    canvas.height = Math.ceil(maxH)
    const bctx = canvas.getContext('2d')
    if (!bctx) return
    for (const patch of starterVillageTerrainPatches) {
      this.paintVillageTerrainPatchWorld(bctx, patch)
    }
    this.villageTerrainCache = canvas
  }

  /** World-coordinate fill: repeat at intrinsic pixel size (seam-aligned); stretches if pattern unavailable. */
  private paintVillageTerrainPatchWorld(
    ctx: CanvasRenderingContext2D,
    patch: { x: number; y: number; width: number; height: number; assetId: string },
  ) {
    const assetId = patch.assetId as VillageAssetId
    const image = getPixelKnightVillageAsset(assetId)
    if (!image || image.naturalWidth === 0) return
    const pattern = ctx.createPattern(image, 'repeat')
    ctx.save()
    ctx.imageSmoothingEnabled = false
    if (pattern) {
      ctx.fillStyle = pattern
      ctx.fillRect(patch.x, patch.y, patch.width, patch.height)
    } else {
      ctx.drawImage(image, patch.x, patch.y, patch.width, patch.height)
    }
    ctx.restore()
  }

  private renderVillageTerrainPatches(ctx: CanvasRenderingContext2D, camera: Vector2) {
    this.bakeVillageTerrainCacheIfNeeded()
    const cache = this.villageTerrainCache
    if (cache) {
      const sx = camera.x
      const sy = camera.y
      const sw = Math.min(WIDTH, Math.max(0, cache.width - camera.x))
      const sh = Math.min(HEIGHT, Math.max(0, cache.height - camera.y))
      if (sw > 0 && sh > 0) {
        ctx.save()
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(cache, sx, sy, sw, sh, 0, 0, sw, sh)
        ctx.restore()
      }
      return
    }

    ctx.save()
    ctx.translate(-camera.x, -camera.y)
    const wx0 = camera.x
    const wy0 = camera.y
    const wx1 = camera.x + WIDTH
    const wy1 = camera.y + HEIGHT
    for (const patch of starterVillageTerrainPatches) {
      if (patch.x + patch.width < wx0 || patch.x > wx1 || patch.y + patch.height < wy0 || patch.y > wy1) continue
      this.paintVillageTerrainPatchWorld(ctx, patch)
    }
    ctx.restore()
  }

  private renderVillageLandmarkLayer(
    ctx: CanvasRenderingContext2D,
    camera: Vector2,
    landmarks: typeof starterVillageLandmarks,
  ) {
    for (const landmark of landmarks) {
      const centerX = landmark.cell.x * TILE + TILE / 2 - camera.x
      const centerY = landmark.cell.y * TILE + TILE / 2 - camera.y
      if (centerX + 120 < 0 || centerX - 120 > WIDTH || centerY + 120 < 0 || centerY - 120 > HEIGHT) continue
      const assetId = resolveLandmarkAsset(landmark.kind)
      this.drawVillageAsset(
        ctx,
        assetId,
        centerX,
        centerY,
        landmark.drawScale ?? 1,
        landmark.drawOffset?.x ?? 0,
        landmark.drawOffset?.y ?? 0,
      )
    }
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
