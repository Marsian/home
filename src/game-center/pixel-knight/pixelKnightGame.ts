import { difficultyConfigs, generateLootItems, getDungeonById, skills } from './content/data'
import knightManifestData from '@/game-center/pixel-knight/assets/characters/knight.json'
import shieldMatrixData from '@/game-center/pixel-knight/assets/equipment/off-hand/wood-shield.json'
import swordMatrixData from '@/game-center/pixel-knight/assets/equipment/main-hand/iron-sword.json'
import { getPixelKnightMonsterFrames, getPixelKnightOtherworldMapAsset, getPixelKnightVillageAsset } from './game/preload'
import { isCombatEnemyKind, monsterAiConfigs, type CombatEnemyKind, type MonsterAiState } from './game/monsterAi'
import { getOtherworldMapPack, type OtherworldMapPack } from './maps/otherworldRegistry'
import { starterVillageMap, starterVillagePlacements } from './maps/starter-village/starterVillageMap'
import {
  drawMatrixCharacter,
  type MatrixCharacterMode,
  type MatrixEquipmentPiece,
  type MatrixEquipmentSlot,
  type MatrixFacing,
  type MatrixManifest,
} from './rendering/matrixCharacterRenderer'
import { drawMonster, type MonsterFacing, type MonsterState } from './rendering/monsterRenderer'
import { getOtherworldMapAtomAssetId, getOtherworldMapBackdropAssetId } from './rendering/otherworldMapAssets'
import { getStarterVillageAtomAssetId } from './rendering/villageAssets'
import type {
  DifficultyTier,
  DungeonId,
  EnemyKind,
  FacingDirection,
  MapDef,
  MapHotspot,
  PixelKnightGameCallbacks,
  PixelKnightHudState,
  PlayerDerivedStats,
  RunResult,
} from './types'

type Vector2 = { x: number; y: number }

type MapPlacementRenderItem = {
  image: HTMLImageElement
  worldX: number
  worldY: number
  width: number
  height: number
  sortY: number
}

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

type EnemyState = {
  id: string
  kind: CombatEnemyKind
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
  state: MonsterState
  stateTimeMs: number
  animationTimeMs: number
  facing: MonsterFacing
  aiState: MonsterAiState
  aiTimerMs: number
  aggroMs: number
  attackHitDone: boolean
  hurtAnimMs: number
  wanderDir: Vector2
  chargeDir: Vector2
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
  mapPack: OtherworldMapPack
  portalCell: { x: number; y: number }
}

const WIDTH = 960
const HEIGHT = 540
const TILE = 16
const PORTAL_RADIUS = 30
const MATRIX_PLAYER_PIXEL_SIZE = 2
const MATRIX_ATTACK_DURATION_MS = 420
const matrixKnightManifest = knightManifestData as MatrixManifest
type MatrixEquipmentLoadout = Partial<Record<MatrixEquipmentSlot, MatrixEquipmentPiece | null>>

const defaultMatrixKnightEquipment: MatrixEquipmentLoadout = {
  mainHand: swordMatrixData as MatrixEquipmentPiece,
  offHand: shieldMatrixData as MatrixEquipmentPiece,
}

type EnterVillageConfig = {
  stats?: PlayerDerivedStats
  equipment?: MatrixEquipmentLoadout
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

function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1))
}

function randomDirection() {
  const angle = randomBetween(0, Math.PI * 2)
  return { x: Math.cos(angle), y: Math.sin(angle) }
}

function isSpawnTile(mapRows: string[], col: number, row: number) {
  if (row < 0 || row >= mapRows.length || col < 0 || col >= mapRows[0].length) return false
  const value = mapRows[row][col]
  return value !== '#' && value !== 'S' && value !== 'P'
}

function isSpawnCircleClear(mapRows: string[], cell: { x: number; y: number }, radius: number) {
  if (!isSpawnTile(mapRows, cell.x, cell.y)) return false
  const world = worldFromCell(cell)
  return !collidesWithWalls(mapRows, world.x, world.y, radius)
}

function openSpaceScore(mapRows: string[], cell: { x: number; y: number }) {
  let openCells = 0
  const scanRadius = 5
  for (let row = cell.y - scanRadius; row <= cell.y + scanRadius; row += 1) {
    for (let col = cell.x - scanRadius; col <= cell.x + scanRadius; col += 1) {
      const dx = col - cell.x
      const dy = row - cell.y
      if (dx * dx + dy * dy > scanRadius * scanRadius) continue
      if (isSpawnTile(mapRows, col, row)) openCells += 1
    }
  }

  let squareClearance = 0
  for (let radius = 1; radius <= 4; radius += 1) {
    let clear = true
    for (let row = cell.y - radius; row <= cell.y + radius && clear; row += 1) {
      for (let col = cell.x - radius; col <= cell.x + radius; col += 1) {
        if (!isSpawnTile(mapRows, col, row)) {
          clear = false
          break
        }
      }
    }
    if (!clear) break
    squareClearance = radius
  }

  const runLength = (dx: number, dy: number) => {
    let length = 0
    for (let step = 1; step <= 7; step += 1) {
      if (!isSpawnTile(mapRows, cell.x + dx * step, cell.y + dy * step)) break
      length += 1
    }
    return length
  }
  const horizontalRun = runLength(-1, 0) + runLength(1, 0) + 1
  const verticalRun = runLength(0, -1) + runLength(0, 1) + 1
  const corridorWidth = Math.min(horizontalRun, verticalRun)

  return openCells + squareClearance * 34 + corridorWidth * 8
}

function getMapImagePad(map: MapDef, image: HTMLImageElement) {
  const worldWidth = map.rows[0].length * TILE
  const worldHeight = map.rows.length * TILE
  return {
    x: Math.max(0, Math.floor((worldWidth - image.naturalWidth) / 2)),
    y: Math.max(0, Math.floor((worldHeight - image.naturalHeight) / 2)),
  }
}

function randomWalkableCell(
  mapRows: string[],
  blocked: Array<{ cell: { x: number; y: number }; radius: number }>,
  preferredArchetype: 'melee' | 'ranged' | 'mixed',
  spawnRadius: number,
) {
  const floorCells: Array<{ x: number; y: number; score: number }> = []
  for (let row = 0; row < mapRows.length; row += 1) {
    for (let col = 0; col < mapRows[row].length; col += 1) {
      if (!isSpawnCircleClear(mapRows, { x: col, y: row }, spawnRadius)) continue
      const tooClose = blocked.some(({ cell, radius }) => Math.hypot(cell.x - col, cell.y - row) < radius)
      if (!tooClose) floorCells.push({ x: col, y: row, score: openSpaceScore(mapRows, { x: col, y: row }) })
    }
  }
  if (preferredArchetype === 'ranged') {
    floorCells.sort((a, b) => b.score - a.score || a.y - b.y)
  } else {
    floorCells.sort((a, b) => b.score - a.score)
  }
  const pickCount = Math.max(1, Math.min(floorCells.length, Math.ceil(floorCells.length * 0.28), 40))
  return floorCells[Math.floor(Math.random() * pickCount)]
}

function findClusterMemberSpawnCell(
  mapRows: string[],
  center: { x: number; y: number },
  radius: number,
  occupiedCells: Set<string>,
) {
  const candidates: Array<{ x: number; y: number; score: number }> = []
  for (let row = center.y - 4; row <= center.y + 4; row += 1) {
    for (let col = center.x - 4; col <= center.x + 4; col += 1) {
      const dist = Math.hypot(col - center.x, row - center.y)
      if (dist > 4) continue
      const cell = { x: col, y: row }
      if (occupiedCells.has(`${cell.x}:${cell.y}`)) continue
      if (!isSpawnCircleClear(mapRows, cell, radius)) continue
      candidates.push({ ...cell, score: openSpaceScore(mapRows, cell) - dist * 6 })
    }
  }
  candidates.sort((a, b) => b.score - a.score)
  const pickCount = Math.max(1, Math.min(candidates.length, 8))
  return candidates[Math.floor(Math.random() * pickCount)] ?? null
}

function spawnEnemyClusters(map: MapDef, difficulty: DifficultyTier) {
  const difficultyConfig = difficultyConfigs[difficulty]
  const portal = map.portal ?? map.start
  const portalHotspots = (map.hotspots ?? []).filter((hotspot) => hotspot.kind === 'portal')
  const clusterDefs = map.monsterClusters ?? []
  const enemies: EnemyState[] = []
  const occupiedCells = new Set<string>()
  if (clusterDefs.length === 0) return enemies

  const authoredClusterCount = clusterDefs.reduce(
    (sum, clusterDef) => sum + randomInt(clusterDef.clusterCount.min, clusterDef.clusterCount.max),
    0,
  )
  const targetClusterCount = clamp(authoredClusterCount + difficultyConfig.eliteSpawnBonus, 3, 5)
  let successfulClusterCount = 0
  let attempts = 0
  const maxAttempts = targetClusterCount * 14

  while (successfulClusterCount < targetClusterCount && attempts < maxAttempts) {
    const clusterDef = clusterDefs[attempts % clusterDefs.length]
    attempts += 1
    const clusterIndex = successfulClusterCount
    const requestedKind = clusterDef.kinds[Math.floor(Math.random() * clusterDef.kinds.length)] as EnemyKind
    const clusterKind = isCombatEnemyKind(requestedKind) ? requestedKind : 'slime'
    const ai = monsterAiConfigs[clusterKind]
    const center = randomWalkableCell(
      map.rows,
      [
        { cell: map.start, radius: clusterDef.safeRadiusFromStart },
        { cell: portal, radius: clusterDef.safeRadiusFromPortal },
        ...portalHotspots.map((hotspot) => ({
          cell: hotspot.cell,
          radius: Math.max(clusterDef.safeRadiusFromPortal, Math.ceil(hotspot.radius / TILE) + 2),
        })),
      ],
      clusterDef.archetype,
      ai.radius * 1.08,
    )
    if (!center) continue
    const clusterSize = randomInt(clusterDef.membersPerCluster.min, clusterDef.membersPerCluster.max)
    let spawnedMembers = 0

    for (let memberIndex = 0; memberIndex < clusterSize; memberIndex += 1) {
      const elite = memberIndex === 0 && Math.random() < clusterDef.eliteChance
      const radius = ai.radius * (elite ? 1.08 : 1)
      const candidate = findClusterMemberSpawnCell(map.rows, center, radius, occupiedCells)
      if (!candidate) continue
      const maxHealth = ai.baseHealth * difficultyConfig.enemyHealthMultiplier * (elite ? 1.42 : 1)

      enemies.push({
        id: `${clusterDef.id}-${clusterKind}-${clusterIndex}-${memberIndex}-${performance.now()}`,
        kind: clusterKind,
        ...worldFromCell(candidate),
        radius,
        health: maxHealth,
        maxHealth,
        speed: ai.baseSpeed * (elite ? 1.08 : 1),
        damage: ai.baseDamage * difficultyConfig.enemyDamageMultiplier * (elite ? 1.16 : 1),
        range: ai.attackRange,
        attackCooldownMs: randomBetween(ai.attackCooldownMs[0], ai.attackCooldownMs[1]),
        elite,
        state: 'idle',
        stateTimeMs: 0,
        animationTimeMs: randomBetween(0, 1200),
        facing: Math.random() > 0.5 ? 'right' : 'left',
        aiState: 'idle',
        aiTimerMs: randomBetween(ai.wanderIntervalMs[0], ai.wanderIntervalMs[1]),
        aggroMs: 0,
        attackHitDone: false,
        hurtAnimMs: 0,
        wanderDir: randomDirection(),
        chargeDir: { x: 0, y: 0 },
      })
      occupiedCells.add(`${candidate.x}:${candidate.y}`)
      spawnedMembers += 1
    }

    if (spawnedMembers > 0) successfulClusterCount += 1
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
  private lastMinimapPlayerCellSignature: string | null = null
  private mapBackdropCache: HTMLCanvasElement | null = null
  private mapBackdropCacheFor: string | null = null
  private mapPlacementRenderItems: MapPlacementRenderItem[] | null = null
  private mapPlacementRenderItemsFor: string | null = null
  private matrixEquipment: MatrixEquipmentLoadout = { ...defaultMatrixKnightEquipment }

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
    this.mapBackdropCache = null
    this.mapPlacementRenderItems = null
    this.enterVillage()
    this.emitHud()
    this.animationFrame = requestAnimationFrame(this.loop)
  }

  setEquipment(equipment?: MatrixEquipmentLoadout) {
    this.matrixEquipment = {
      ...defaultMatrixKnightEquipment,
      ...equipment,
    }
  }

  startRun(config: {
    dungeonId: DungeonId
    difficulty: DifficultyTier
    stats: PlayerDerivedStats
    equipment?: MatrixEquipmentLoadout
  }) {
    const mapPack = getOtherworldMapPack(config.dungeonId)
    if (!mapPack) return false
    this.setEquipment(config.equipment)
    const built = mapPack.map
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
      mapPack,
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
    this.enemies = spawnEnemyClusters(built, config.difficulty)
    this.projectiles = []
    this.trailSegments = []
    this.lootFeed = ['探索副本，靠近尽头的传送点后按 F 返回村庄。']
    this.pauseRequested = false
    this.portalNearby = false
    this.nearbyHotspot = null
    this.encounterLabel = '副本探索'
    this.objectiveLabel = '穿越枫林入口并带着战利品撤离'
    this.phase = 'playing'
    this.mapBackdropCache = null
    this.mapBackdropCacheFor = null
    this.mapPlacementRenderItems = null
    this.mapPlacementRenderItemsFor = null
    this.lastMinimapPlayerCellSignature = null
    this.emitHud()
    return true
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

  enterVillage(config?: EnterVillageConfig) {
    if (config?.equipment) this.setEquipment(config.equipment)
    const stats = config?.stats
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
    this.mapBackdropCache = null
    this.mapBackdropCacheFor = null
    this.mapPlacementRenderItems = null
    this.mapPlacementRenderItemsFor = null
    this.lastMinimapPlayerCellSignature = null
    this.encounterLabel = '新手村'
    this.objectiveLabel = '在村庄中移动，靠近地标后按 F 互动'
    this.lootFeed = ['欢迎来到晨铃新手村。北侧传送门可以进入副本。']
    this.updateVillageHotspot()
    this.emitHud()
  }

  /** Backdrop cache can bake before PNG preload finishes — drop canvas so next frame rebuilds once assets exist. */
  invalidateVillageTerrainCache() {
    this.mapBackdropCache = null
    this.mapBackdropCacheFor = null
    this.mapPlacementRenderItems = null
    this.mapPlacementRenderItemsFor = null
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
    this.mapBackdropCache = null
    this.mapBackdropCacheFor = null
    this.mapPlacementRenderItems = null
    this.mapPlacementRenderItemsFor = null
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
      if (event.code === 'KeyW' || event.code === 'KeyA' || event.code === 'KeyS' || event.code === 'KeyD') {
        event.preventDefault()
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
      this.updateEnemy(enemy, dt)
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

    const portalHotspot = this.getRunPortalHotspot()
    const portalPos = worldFromCell(portalHotspot?.cell ?? this.run.portalCell)
    this.portalNearby = distance(this.player, portalPos) < (portalHotspot?.radius ?? PORTAL_RADIUS + 26)
    this.nearbyHotspot = this.portalNearby ? portalHotspot : null
    this.encounterLabel = this.portalNearby ? '传送点已就绪' : '副本探索'
    this.objectiveLabel = this.portalNearby
      ? (portalHotspot?.prompt ?? '按 F 交互并返回村庄')
      : '探索副本深处，靠近尽头传送点后撤离'

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
    if (!this.run) return false
    const prevX = enemy.x
    const prevY = enemy.y
    const nextX = enemy.x + dx
    const nextY = enemy.y + dy
    if (!collidesWithWalls(this.run.map.rows, nextX, enemy.y, enemy.radius)) enemy.x = nextX
    if (!collidesWithWalls(this.run.map.rows, enemy.x, nextY, enemy.radius)) enemy.y = nextY
    return Math.abs(enemy.x - prevX) > 0.01 || Math.abs(enemy.y - prevY) > 0.01
  }

  private setEnemyAiState(enemy: EnemyState, state: MonsterAiState) {
    if (enemy.aiState === state) return
    enemy.aiState = state
    enemy.stateTimeMs = 0
    enemy.attackHitDone = false
    enemy.state = state === 'chase' || state === 'wander' || state === 'charge' ? 'walk' : state === 'idle' ? 'idle' : 'attack'
  }

  private resetEnemyWander(enemy: EnemyState) {
    const ai = monsterAiConfigs[enemy.kind]
    enemy.wanderDir = randomDirection()
    enemy.aiTimerMs = randomBetween(ai.wanderIntervalMs[0], ai.wanderIntervalMs[1])
    this.setEnemyAiState(enemy, 'idle')
  }

  private updateEnemy(enemy: EnemyState, dt: number) {
    if (!this.player) return
    const ai = monsterAiConfigs[enemy.kind]
    enemy.attackCooldownMs = Math.max(0, enemy.attackCooldownMs - dt)
    enemy.hurtAnimMs = Math.max(0, enemy.hurtAnimMs - dt)
    enemy.stateTimeMs += dt
    enemy.animationTimeMs += dt

    const delta = { x: this.player.x - enemy.x, y: this.player.y - enemy.y }
    const dir = normalize(delta)
    const dist = Math.hypot(delta.x, delta.y)
    if (Math.abs(dir.x) > 0.08) enemy.facing = dir.x < 0 ? 'left' : 'right'

    if (dist <= ai.aggroRange) {
      enemy.aggroMs = ai.aggroMemoryMs
    } else {
      enemy.aggroMs = Math.max(0, enemy.aggroMs - dt)
    }

    if (enemy.aiState === 'windup') {
      if (enemy.kind === 'slime' && !enemy.attackHitDone && enemy.stateTimeMs >= ai.attackHitDelayMs) {
        if (dist <= ai.attackRange + this.player.radius) this.damagePlayer(enemy.damage)
        enemy.attackHitDone = true
      }
      if (enemy.stateTimeMs >= ai.attackWindupMs) {
        if (enemy.kind === 'boar') {
          enemy.chargeDir = dir
          this.setEnemyAiState(enemy, 'charge')
        } else {
          this.setEnemyAiState(enemy, 'recover')
        }
      }
      return
    }

    if (enemy.aiState === 'charge') {
      const chargeSpeed = ai.chargeSpeed ?? ai.baseSpeed
      const moved = this.tryMoveEnemy(enemy, enemy.chargeDir.x * chargeSpeed * (dt / 1000), enemy.chargeDir.y * chargeSpeed * (dt / 1000))
      if (!enemy.attackHitDone && distance(enemy, this.player) <= ai.attackRange + this.player.radius) {
        this.damagePlayer(enemy.damage)
        enemy.attackHitDone = true
      }
      if (!moved || enemy.stateTimeMs >= (ai.chargeDurationMs ?? 280)) {
        this.setEnemyAiState(enemy, 'recover')
      }
      return
    }

    if (enemy.aiState === 'recover') {
      if (enemy.stateTimeMs >= ai.attackRecoverMs) {
        this.setEnemyAiState(enemy, enemy.aggroMs > 0 ? 'chase' : 'idle')
        enemy.attackCooldownMs = randomBetween(ai.attackCooldownMs[0], ai.attackCooldownMs[1])
      }
      return
    }

    const boarChargeRange = enemy.kind === 'boar' ? Math.min(170, ai.aggroRange) : ai.attackRange
    const wantsAttack = enemy.attackCooldownMs <= 0 && dist <= boarChargeRange
    if ((enemy.aggroMs > 0 || dist <= ai.aggroRange) && dist <= ai.leashRange) {
      if (wantsAttack) {
        enemy.chargeDir = dir
        this.setEnemyAiState(enemy, 'windup')
        return
      }
      this.setEnemyAiState(enemy, 'chase')
      if (dist > ai.attackRange * 0.8) {
        this.tryMoveEnemy(enemy, dir.x * enemy.speed * (dt / 1000), dir.y * enemy.speed * (dt / 1000))
      }
      return
    }

    enemy.aiTimerMs -= dt
    if (enemy.aiState === 'wander') {
      this.tryMoveEnemy(enemy, enemy.wanderDir.x * ai.wanderSpeed * (dt / 1000), enemy.wanderDir.y * ai.wanderSpeed * (dt / 1000))
      if (enemy.aiTimerMs <= 0) this.resetEnemyWander(enemy)
      return
    }

    if (enemy.aiTimerMs <= 0) {
      enemy.wanderDir = randomDirection()
      enemy.aiTimerMs = randomBetween(ai.wanderDurationMs[0], ai.wanderDurationMs[1])
      this.setEnemyAiState(enemy, 'wander')
    } else {
      this.setEnemyAiState(enemy, 'idle')
    }
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
    this.applyAreaDamage(
      this.player.x + direction.x * 26,
      this.player.y + direction.y * 26,
      64,
      this.run.stats.attack * 2.4,
    )
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
    this.applyAreaDamage(
      this.player.x,
      this.player.y,
      54,
      this.run.stats.attack * 1.85 + this.run.stats.skillPower * 0.9,
    )
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
    if (enemy.health > 0) {
      enemy.hurtAnimMs = 320
      return
    }

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

  private getRunPortalHotspot() {
    return this.run?.map.hotspots?.find((hotspot) => hotspot.kind === 'portal') ?? null
  }

  private updateVillage(dt: number) {
    if (!this.player) return
    this.player.locomotionAnimElapsedMs += dt
    const prevHotspotId = this.nearbyHotspot?.id ?? null
    const input: Vector2 = {
      x: (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0),
      y: (this.keys.has('KeyS') ? 1 : 0) - (this.keys.has('KeyW') ? 1 : 0),
    }
    const move = normalize(input)
    this.player.moving = Math.abs(move.x) > 0 || Math.abs(move.y) > 0
    this.tryMovePlayer(move.x * 150 * (dt / 1000), move.y * 150 * (dt / 1000))
    this.emitMinimapPlayerCell()
    this.updateVillageHotspot()
    const nextHotspotId = this.nearbyHotspot?.id ?? null
    if (prevHotspotId !== nextHotspotId) {
      this.emitHud()
    }
  }

  private updateVillageHotspot() {
    if (!this.player) {
      this.nearbyHotspot = null
      return
    }
    const hotspots = starterVillage.hotspots ?? []
    let nearby: MapHotspot | null = null
    let nearbyDist = Number.POSITIVE_INFINITY
    for (const hotspot of hotspots) {
      const hotspotPos = worldFromCell(hotspot.cell)
      const dist = distance(this.player, hotspotPos)
      if (dist > hotspot.radius || dist >= nearbyDist) continue
      nearby = hotspot
      nearbyDist = dist
    }
    this.nearbyHotspot = nearby
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
      equipment: this.matrixEquipment,
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
      dungeonName: this.run ? this.run.map.name : starterVillage.name,
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

  private emitMinimapPlayerCell() {
    if (!this.player) return
    const cell = { x: Math.floor(this.player.x / TILE), y: Math.floor(this.player.y / TILE) }
    const signature = `${cell.x}:${cell.y}`
    if (signature === this.lastMinimapPlayerCellSignature) return
    this.lastMinimapPlayerCellSignature = signature
    this.callbacks.onMinimapPlayerCell?.(cell)
  }

  private render() {
    if (!this.ctx) return
    const ctx = this.ctx
    ctx.clearRect(0, 0, WIDTH, HEIGHT)

    if (this.phase === 'home') {
      this.renderMapScene(ctx)
      return
    }

    if (this.phase === 'boot' || this.phase === 'results') {
      this.renderIdleScene(ctx)
      return
    }

    if (!this.run) return
    const camera = this.getCamera()
    this.renderMapBackdrop(ctx, camera)

    ctx.save()
    ctx.imageSmoothingEnabled = false
    for (const segment of this.trailSegments) {
      ctx.fillStyle = `rgba(251,242,176,${segment.lifeMs / 600})`
      ctx.beginPath()
      ctx.arc(segment.x - camera.x, segment.y - camera.y, 18 - (1 - segment.lifeMs / 500) * 6, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    this.renderDepthSortedEntities(ctx, camera)

    for (const projectile of this.projectiles) {
      ctx.fillStyle = projectile.from === 'enemy' ? '#ffd6b3' : '#f7ffab'
      ctx.beginPath()
      ctx.arc(projectile.x - camera.x, projectile.y - camera.y, projectile.radius, 0, Math.PI * 2)
      ctx.fill()
    }

    if (this.portalNearby && this.player) {
      const portalHotspot = this.getRunPortalHotspot()
      const portal = worldFromCell(portalHotspot?.cell ?? this.run.portalCell)
      const text = portalHotspot?.prompt ?? 'Press F'
      ctx.fillStyle = 'rgba(8,12,10,0.58)'
      ctx.font = '700 15px sans-serif'
      const textWidth = Math.ceil(ctx.measureText(text).width)
      const bubbleWidth = Math.max(96, textWidth + 32)
      ctx.fillRect(portal.x - camera.x - bubbleWidth / 2, portal.y - camera.y - 56, bubbleWidth, 28)
      ctx.fillStyle = '#f7efcf'
      ctx.textAlign = 'center'
      ctx.fillText(text, portal.x - camera.x, portal.y - camera.y - 37)
      ctx.textAlign = 'start'
    }
  }

  private renderMapScene(ctx: CanvasRenderingContext2D) {
    const camera = this.getCamera()
    this.renderMapBackdrop(ctx, camera)
    this.renderDepthSortedEntities(ctx, camera)
    this.renderVillageHotspotPrompt(ctx, camera)
  }

  private renderVillageHotspotPrompt(ctx: CanvasRenderingContext2D, camera: Vector2) {
    if (!this.nearbyHotspot) return
    const anchor = worldFromCell(this.nearbyHotspot.cell)
    const text = this.nearbyHotspot.prompt
    const x = anchor.x - camera.x
    const tipY = anchor.y - camera.y
    const bubbleHeight = 34
    const triangleHeight = 9
    const cornerRadius = 9
    const paddingX = 18

    ctx.save()
    ctx.font = '800 14px sans-serif'
    const textWidth = ctx.measureText(text).width
    const bubbleWidth = Math.min(220, Math.max(112, textWidth + paddingX * 2))
    const bubbleX = clamp(x - bubbleWidth / 2, 10, WIDTH - bubbleWidth - 10)
    const bubbleY = clamp(tipY - bubbleHeight - triangleHeight, 10, HEIGHT - bubbleHeight - triangleHeight - 10)
    const triangleX = clamp(x, bubbleX + 18, bubbleX + bubbleWidth - 18)
    const triangleBaseY = bubbleY + bubbleHeight - 1

    ctx.beginPath()
    ctx.moveTo(bubbleX + cornerRadius, bubbleY)
    ctx.lineTo(bubbleX + bubbleWidth - cornerRadius, bubbleY)
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + cornerRadius)
    ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - cornerRadius)
    ctx.quadraticCurveTo(
      bubbleX + bubbleWidth,
      bubbleY + bubbleHeight,
      bubbleX + bubbleWidth - cornerRadius,
      bubbleY + bubbleHeight,
    )
    ctx.lineTo(triangleX + 9, triangleBaseY)
    ctx.lineTo(triangleX, triangleBaseY + triangleHeight)
    ctx.lineTo(triangleX - 9, triangleBaseY)
    ctx.lineTo(bubbleX + cornerRadius, bubbleY + bubbleHeight)
    ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - cornerRadius)
    ctx.lineTo(bubbleX, bubbleY + cornerRadius)
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + cornerRadius, bubbleY)
    ctx.closePath()

    ctx.fillStyle = 'rgba(24, 18, 12, 0.72)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(245, 214, 132, 0.88)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = '#fff0bc'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight / 2 + 1, bubbleWidth - paddingX)
    ctx.restore()
  }

  private buildMapPlacementRenderItems() {
    const map = this.getActiveMap()
    if (!map) return []
    if (this.mapPlacementRenderItems && this.mapPlacementRenderItemsFor === map.id) return this.mapPlacementRenderItems
    const backdrop =
      map.id === 'starter-village'
        ? getPixelKnightVillageAsset('starter-village-v7-backdrop')
        : getPixelKnightOtherworldMapAsset(getOtherworldMapBackdropAssetId(map.id))
    if (!backdrop?.naturalWidth) return []

    const pad = getMapImagePad(map, backdrop)
    const items: MapPlacementRenderItem[] = []
    const placements = map.id === 'starter-village' ? starterVillagePlacements : this.run?.mapPack.placements

    for (const placement of placements?.placements ?? []) {
      const image =
        map.id === 'starter-village'
          ? getPixelKnightVillageAsset(getStarterVillageAtomAssetId(placement.assetKey))
          : getPixelKnightOtherworldMapAsset(getOtherworldMapAtomAssetId(map.id, placement.assetKey))
      if (!image?.naturalWidth) continue
      const worldX = pad.x + placement.x
      const worldY = pad.y + placement.y
      const width = image.naturalWidth * placement.scale
      const height = image.naturalHeight * placement.scale
      items.push({
        image,
        worldX,
        worldY,
        width,
        height,
        sortY: worldY + height,
      })
    }

    items.sort((a, b) => a.sortY - b.sortY)
    this.mapPlacementRenderItems = items
    this.mapPlacementRenderItemsFor = map.id
    return items
  }

  private drawMapPlacement(ctx: CanvasRenderingContext2D, camera: Vector2, item: MapPlacementRenderItem) {
    const x = item.worldX - camera.x
    const y = item.worldY - camera.y
    if (x + item.width < 0 || y + item.height < 0 || x > WIDTH || y > HEIGHT) return
    ctx.drawImage(item.image, x, y, item.width, item.height)
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, camera: Vector2, enemy: EnemyState) {
    const x = enemy.x - camera.x
    const y = enemy.y - camera.y
    const cached = getPixelKnightMonsterFrames(enemy.kind)
    const drawState: MonsterState = enemy.hurtAnimMs > 0 ? 'attacked' : enemy.state
    if (cached) {
      drawMonster(ctx, cached.meta, cached.frames, {
        x,
        y: y + 8,
        state: drawState,
        timeMs:
          drawState === 'attacked'
            ? 320 - enemy.hurtAnimMs
            : drawState === 'idle' || drawState === 'walk'
              ? enemy.animationTimeMs
              : enemy.stateTimeMs,
        scale: (enemy.kind === 'boar' ? 0.48 : 0.25) * (enemy.elite ? 1.12 : 1),
        facing: enemy.facing,
      })
    } else {
      ctx.fillStyle = enemy.kind === 'boar' ? '#8f6a44' : '#5eaa60'
      ctx.beginPath()
      ctx.arc(x, y, enemy.radius, 0, Math.PI * 2)
      ctx.fill()
    }
    if (enemy.elite) {
      ctx.strokeStyle = '#ffdc75'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.ellipse(x, y + 10, enemy.radius * 1.25, enemy.radius * 0.54, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(17,21,18,0.85)'
    ctx.fillRect(x - 18, y - enemy.radius - 18, 36, 5)
    ctx.fillStyle = '#f4cd73'
    ctx.fillRect(x - 18, y - enemy.radius - 18, 36 * (enemy.health / enemy.maxHealth), 5)
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, camera: Vector2) {
    if (!this.player) return
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

  private renderDepthSortedEntities(ctx: CanvasRenderingContext2D, camera: Vector2) {
    const placements = this.buildMapPlacementRenderItems()
    const entities: Array<
      | { type: 'placement'; sortY: number; item: MapPlacementRenderItem }
      | { type: 'enemy'; sortY: number; enemy: EnemyState }
      | { type: 'player'; sortY: number }
    > = placements.map((item) => ({ type: 'placement', sortY: item.sortY, item }))
    for (const enemy of this.enemies) entities.push({ type: 'enemy', sortY: enemy.y + enemy.radius, enemy })
    if (this.player) entities.push({ type: 'player', sortY: this.player.y + 8 })
    entities.sort((a, b) => a.sortY - b.sortY)

    ctx.save()
    ctx.imageSmoothingEnabled = false

    for (const entity of entities) {
      if (entity.type === 'placement') this.drawMapPlacement(ctx, camera, entity.item)
      if (entity.type === 'enemy') this.drawEnemy(ctx, camera, entity.enemy)
      if (entity.type === 'player') this.drawPlayer(ctx, camera)
    }

    ctx.restore()
  }

  private bakeMapBackdropCacheIfNeeded() {
    const map = this.getActiveMap()
    if (!map) return
    if (this.mapBackdropCache && this.mapBackdropCacheFor === map.id) return
    const image =
      map.id === 'starter-village'
        ? getPixelKnightVillageAsset('starter-village-v7-backdrop')
        : getPixelKnightOtherworldMapAsset(getOtherworldMapBackdropAssetId(map.id))
    if (!image?.naturalWidth) return

    const pad = getMapImagePad(map, image)
    const worldWidth = map.rows[0].length * TILE
    const worldHeight = map.rows.length * TILE

    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(worldWidth)
    canvas.height = Math.ceil(worldHeight)
    const bctx = canvas.getContext('2d')
    if (!bctx) return
    bctx.imageSmoothingEnabled = false
    bctx.clearRect(0, 0, canvas.width, canvas.height)
    bctx.drawImage(image, pad.x, pad.y)
    this.mapBackdropCache = canvas
    this.mapBackdropCacheFor = map.id
  }

  private renderMapBackdrop(ctx: CanvasRenderingContext2D, camera: Vector2) {
    this.bakeMapBackdropCacheIfNeeded()
    const cache = this.mapBackdropCache
    if (!cache) return
    const sx = camera.x
    const sy = camera.y
    const sw = Math.min(WIDTH, Math.max(0, cache.width - camera.x))
    const sh = Math.min(HEIGHT, Math.max(0, cache.height - camera.y))
    if (sw <= 0 || sh <= 0) return
    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(cache, sx, sy, sw, sh, 0, 0, sw, sh)
    ctx.restore()
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
    ctx.fillRect(170, 220, 70, 54)
    ctx.fillStyle = '#2f5e4f'
    ctx.fillRect(160, 270, 96, 88)
    ctx.fillStyle = '#f0f1e2'
    ctx.fillRect(242, 238, 28, 82)

    ctx.fillStyle = 'rgba(18,24,20,0.24)'
    ctx.fillRect(0, HEIGHT - 118, WIDTH, 118)
    ctx.fillStyle = '#f6efdb'
    ctx.font = '900 50px sans-serif'
    ctx.fillText('PIXEL KNIGHT', 56, HEIGHT - 54)
    ctx.font = '600 18px sans-serif'
    ctx.fillText('Move freely, meet village landmarks, enter dungeons through the portal.', 60, HEIGHT - 24)
  }
}
