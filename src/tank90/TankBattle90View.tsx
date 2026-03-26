import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

type Direction = 'up' | 'down' | 'left' | 'right'
type GameStatus = 'ready' | 'running' | 'paused' | 'won' | 'lost'

interface Tank {
  id: string
  x: number
  y: number
  dir: Direction
  speed: number
  reloadMs: number
  lastShotAt: number
  alive: boolean
  isEnemy: boolean
  aiTurnAt: number
}

interface Bullet {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  owner: 'player' | 'enemy'
  alive: boolean
}

interface Brick {
  x: number
  y: number
  size: number
  hp: number
}

interface Base {
  x: number
  y: number
  size: number
  alive: boolean
}

interface GameState {
  status: GameStatus
  level: number
  player: Tank
  enemies: Tank[]
  bullets: Bullet[]
  bricks: Brick[]
  base: Base
  spawnCooldown: number
  enemiesSpawned: number
  enemiesDestroyed: number
  enemiesTotal: number
  levelBannerUntil: number
  playerInvincibleUntil: number
}

interface InputState {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  fire: boolean
}

type GameEventType = 'info' | 'warn' | 'state' | 'combat'
type GameEvent = { t: number; type: GameEventType; msg: string }

const TILE = 16
const WORLD_W = TILE * 26
const WORLD_H = TILE * 26
const TANK_SIZE = TILE
const PLAYER_SPEED = 112
const ENEMY_SPEED_BASE = 62
const BULLET_SPEED = 220
const BASE_SIZE = TILE * 2
const SPAWN_POINTS = [
  { x: TILE * 2, y: TILE * 1 },
  { x: TILE * 12, y: TILE * 1 },
  { x: TILE * 22, y: TILE * 1 },
]

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function dirVector(dir: Direction) {
  if (dir === 'up') return { x: 0, y: -1 }
  if (dir === 'down') return { x: 0, y: 1 }
  if (dir === 'left') return { x: -1, y: 0 }
  return { x: 1, y: 0 }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function tankRect(tank: Tank) {
  return { x: tank.x, y: tank.y, w: TANK_SIZE, h: TANK_SIZE }
}

function spawnPlayer(): Tank {
  return {
    id: 'player',
    x: WORLD_W / 2 - TANK_SIZE / 2,
    y: WORLD_H - TILE * 4,
    dir: 'up',
    speed: PLAYER_SPEED,
    reloadMs: 260,
    lastShotAt: 0,
    alive: true,
    isEnemy: false,
    aiTurnAt: 0,
  }
}

function createBricks(level: number): Brick[] {
  const bricks: Brick[] = []
  const ring = [
    [11, 22],
    [12, 22],
    [13, 22],
    [14, 22],
    [11, 23],
    [14, 23],
    [11, 24],
    [14, 24],
  ]
  for (const [tx, ty] of ring) {
    bricks.push({ x: tx * TILE, y: ty * TILE, size: TILE, hp: 2 })
  }

  const laneRows = [6, 10, 14]
  for (const y of laneRows) {
    for (let x = 4; x <= 21; x += 2) {
      if ((x + y + level) % 3 === 0) {
        bricks.push({ x: x * TILE, y: y * TILE, size: TILE, hp: 1 + (level % 2) })
      }
    }
  }
  return bricks
}

function createState(level: number): GameState {
  return {
    status: 'ready',
    level,
    player: spawnPlayer(),
    enemies: [],
    bullets: [],
    bricks: createBricks(level),
    base: {
      x: WORLD_W / 2 - BASE_SIZE / 2,
      y: WORLD_H - BASE_SIZE - TILE,
      size: BASE_SIZE,
      alive: true,
    },
    spawnCooldown: 0,
    enemiesSpawned: 0,
    enemiesDestroyed: 0,
    enemiesTotal: 8 + (level - 1) * 2,
    levelBannerUntil: 1000,
    playerInvincibleUntil: 1800,
  }
}

function applyMovement(
  tank: Tank,
  dt: number,
  dir: Direction,
  bricks: Brick[],
  otherTanks: Tank[],
  base: Base,
) {
  const v = dirVector(dir)
  const nx = clamp(tank.x + v.x * tank.speed * dt, 0, WORLD_W - TANK_SIZE)
  const ny = clamp(tank.y + v.y * tank.speed * dt, 0, WORLD_H - TANK_SIZE)
  const nextRect = { x: nx, y: ny, w: TANK_SIZE, h: TANK_SIZE }

  for (const brick of bricks) {
    if (
      rectsOverlap(nextRect, { x: brick.x, y: brick.y, w: brick.size, h: brick.size })
    ) {
      return
    }
  }

  if (tank.isEnemy && rectsOverlap(nextRect, { x: base.x, y: base.y, w: base.size, h: base.size })) {
    return
  }

  for (const other of otherTanks) {
    if (!other.alive || other.id === tank.id) continue
    if (rectsOverlap(nextRect, tankRect(other))) return
  }

  tank.x = nx
  tank.y = ny
  tank.dir = dir
}

function createBullet(tank: Tank): Bullet {
  const v = dirVector(tank.dir)
  return {
    x: tank.x + TANK_SIZE / 2,
    y: tank.y + TANK_SIZE / 2,
    vx: v.x * BULLET_SPEED,
    vy: v.y * BULLET_SPEED,
    radius: 2.5,
    owner: tank.isEnemy ? 'enemy' : 'player',
    alive: true,
  }
}

function drawTank(ctx: CanvasRenderingContext2D, tank: Tank, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(tank.x, tank.y, TANK_SIZE, TANK_SIZE)
  ctx.fillStyle = '#0e1016'
  if (tank.dir === 'up') ctx.fillRect(tank.x + 6, tank.y - 2, 4, 6)
  if (tank.dir === 'down') ctx.fillRect(tank.x + 6, tank.y + 12, 4, 6)
  if (tank.dir === 'left') ctx.fillRect(tank.x - 2, tank.y + 6, 6, 4)
  if (tank.dir === 'right') ctx.fillRect(tank.x + 12, tank.y + 6, 6, 4)
}

export default function TankBattle90View() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stateRef = useRef<GameState>(createState(1))
  const inputRef = useRef<InputState>({
    up: false,
    down: false,
    left: false,
    right: false,
    fire: false,
  })
  const frameRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const eventsRef = useRef<GameEvent[]>([])
  const lastSnapshotRef = useRef<{
    status: GameStatus
    level: number
    enemiesDestroyed: number
    enemiesTotal: number
    playerAlive: boolean
    baseAlive: boolean
  } | null>(null)
  const [ui, setUi] = useState(() => ({
    level: 1,
    status: 'ready' as GameStatus,
    enemiesDestroyed: 0,
    enemiesTotal: stateRef.current.enemiesTotal,
    playerAlive: true,
  }))
  const [debugTick, setDebugTick] = useState(0)

  const debugEnabled = useMemo(() => {
    if (!import.meta.env.DEV) return false
    if (typeof window === 'undefined') return false
    const url = new URL(window.location.href)
    const flag = url.searchParams.get('debug')
    return flag === '1' || flag === 'true'
  }, [])

  function pushEvent(type: GameEventType, msg: string) {
    if (!debugEnabled) return
    const st = stateRef.current
    const t = performance.now()
    eventsRef.current = [{ t, type, msg }, ...eventsRef.current].slice(0, 24)
    // force rerender for overlay without involving per-frame React updates
    setDebugTick((x) => (x + 1) % 1_000_000)
    // keep TypeScript happy about unused st in case of future extension
    void st
  }

  function syncUiFromState(state: GameState) {
    setUi({
      level: state.level,
      status: state.status,
      enemiesDestroyed: state.enemiesDestroyed,
      enemiesTotal: state.enemiesTotal,
      playerAlive: state.player.alive,
    })
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const code = event.code
      if (code === 'KeyW') inputRef.current.up = true
      if (code === 'KeyS') inputRef.current.down = true
      if (code === 'KeyA') inputRef.current.left = true
      if (code === 'KeyD') inputRef.current.right = true
      if (code === 'Space') {
        inputRef.current.fire = true
        event.preventDefault()
      }
      if (code === 'KeyP') {
        const st = stateRef.current
        if (st.status === 'running') st.status = 'paused'
        else if (st.status === 'paused' || st.status === 'ready') st.status = 'running'
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      const code = event.code
      if (code === 'KeyW') inputRef.current.up = false
      if (code === 'KeyS') inputRef.current.down = false
      if (code === 'KeyA') inputRef.current.left = false
      if (code === 'KeyD') inputRef.current.right = false
      if (code === 'Space') inputRef.current.fire = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    const tick = (t: number) => {
      const state = stateRef.current
      const prev = lastTimeRef.current || t
      lastTimeRef.current = t
      const dt = Math.min((t - prev) / 1000, 1 / 30)

      if (state.levelBannerUntil > 0) state.levelBannerUntil -= dt * 1000

      if (state.status === 'running') {
        updateState(state, dt, t, inputRef.current)
      }
      draw(ctx, state)
      setUi((prevUi) => {
        if (
          prevUi.level === state.level &&
          prevUi.status === state.status &&
          prevUi.enemiesDestroyed === state.enemiesDestroyed &&
          prevUi.enemiesTotal === state.enemiesTotal &&
          prevUi.playerAlive === state.player.alive
        ) {
          return prevUi
        }
        return {
          level: state.level,
          status: state.status,
          enemiesDestroyed: state.enemiesDestroyed,
          enemiesTotal: state.enemiesTotal,
          playerAlive: state.player.alive,
        }
      })

      if (debugEnabled) {
        const snap = {
          status: state.status,
          level: state.level,
          enemiesDestroyed: state.enemiesDestroyed,
          enemiesTotal: state.enemiesTotal,
          playerAlive: state.player.alive,
          baseAlive: state.base.alive,
        }
        const prevSnap = lastSnapshotRef.current
        if (!prevSnap) {
          lastSnapshotRef.current = snap
        } else {
          if (prevSnap.status !== snap.status) {
            pushEvent('state', `STATUS ${prevSnap.status.toUpperCase()} -> ${snap.status.toUpperCase()}`)
          }
          if (prevSnap.level !== snap.level) {
            pushEvent('state', `LEVEL ${prevSnap.level} -> ${snap.level}`)
          }
          if (prevSnap.enemiesDestroyed !== snap.enemiesDestroyed) {
            pushEvent('combat', `KILLS ${snap.enemiesDestroyed}/${snap.enemiesTotal}`)
          }
          if (prevSnap.playerAlive !== snap.playerAlive) {
            pushEvent('combat', `PLAYER ${snap.playerAlive ? 'ALIVE' : 'DEAD'}`)
          }
          if (prevSnap.baseAlive !== snap.baseAlive) {
            pushEvent('combat', `BASE ${snap.baseAlive ? 'ALIVE' : 'DEAD'}`)
          }
          lastSnapshotRef.current = snap
        }
      }

      frameRef.current = window.requestAnimationFrame(tick)
    }

    frameRef.current = window.requestAnimationFrame(tick)
    return () => {
      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  function startOrRestart() {
    const next = createState(1)
    next.status = 'running'
    stateRef.current = next
    lastTimeRef.current = 0
    inputRef.current = {
      up: false,
      down: false,
      left: false,
      right: false,
      fire: false,
    }
    syncUiFromState(next)
    lastSnapshotRef.current = null
    pushEvent('info', 'RESTART -> LV.1')
  }

  function nextLevel() {
    if (stateRef.current.status !== 'won') return
    const level = stateRef.current.level + 1
    const next = createState(level)
    next.status = 'running'
    stateRef.current = next
    lastTimeRef.current = 0
    inputRef.current = {
      up: false,
      down: false,
      left: false,
      right: false,
      fire: false,
    }
    syncUiFromState(next)
    lastSnapshotRef.current = null
    pushEvent('info', `NEXT LV -> LV.${level}`)
  }

  return (
    <main className="min-h-screen bg-[#111317] text-[#f0dca2] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-mono text-2xl sm:text-3xl tracking-[0.14em] text-[#f8e8b8]">
          90 TANK BATTLE
        </h1>
        <p className="mt-2 font-mono text-xs sm:text-sm text-[#b89f61]">
          WASD MOVE / SPACE FIRE / P PAUSE
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="font-mono text-sm text-[#d7c48d]">
            LV.{ui.level} | ENEMY {ui.enemiesDestroyed}/{ui.enemiesTotal} |{' '}
            {ui.status.toUpperCase()} | PLAYER {ui.playerAlive ? 'ALIVE' : 'DEAD'}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={startOrRestart}
              className="font-mono bg-[#4b6a2e] hover:bg-[#5b7f38] text-[#f6f2dc]"
            >
              {ui.status === 'ready' ? 'START' : 'RESTART'}
            </Button>
            {ui.status === 'won' ? (
              <Button
                type="button"
                onClick={nextLevel}
                className="font-mono bg-[#2f4f72] hover:bg-[#3f6691] text-[#f6f2dc]"
              >
                NEXT LV
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[#5f5434] bg-[#0a0b0f] p-3 shadow-[0_0_0_1px_#000,inset_0_0_28px_#141926]">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={WORLD_W}
              height={WORLD_H}
              className="w-full max-w-[640px] mx-auto block border border-[#2f2a1b] bg-[#111317] [image-rendering:pixelated]"
            />

            {debugEnabled ? (
              <div className="pointer-events-none absolute left-3 top-3 right-3">
                <div className="pointer-events-auto inline-flex flex-col gap-2 rounded-lg border border-[#5f5434] bg-[#0a0b0f]/90 px-3 py-2 shadow-[0_0_0_1px_#000]">
                  <div className="font-mono text-[11px] tracking-[0.08em] text-[#b89f61]">
                    DEBUG MODE
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="font-mono border-[#5f5434] text-[#f0dca2] bg-transparent hover:bg-white/5"
                      onClick={() => {
                        const st = stateRef.current
                        st.enemies.forEach((e) => (e.alive = false))
                        st.enemiesDestroyed = st.enemiesTotal
                        st.enemiesSpawned = st.enemiesTotal
                        st.bullets = []
                        st.status = 'won'
                        syncUiFromState(st)
                        pushEvent('state', 'FORCE WIN')
                      }}
                    >
                      FORCE_WIN
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="font-mono border-[#5f5434] text-[#f0dca2] bg-transparent hover:bg-white/5"
                      onClick={() => {
                        const st = stateRef.current
                        st.base.alive = false
                        st.player.alive = false
                        st.status = 'lost'
                        syncUiFromState(st)
                        pushEvent('state', 'FORCE LOSE (BASE HIT)')
                      }}
                    >
                      FORCE_LOSE
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="font-mono border-[#5f5434] text-[#f0dca2] bg-transparent hover:bg-white/5"
                      onClick={() => {
                        const st = stateRef.current
                        st.enemies.forEach((e) => (e.alive = false))
                        st.bullets = []
                        st.enemiesDestroyed = st.enemiesTotal
                        st.enemiesSpawned = st.enemiesTotal
                        st.status = 'won'
                        syncUiFromState(st)
                        pushEvent('state', 'CLEAR ALL ENEMIES')
                      }}
                    >
                      CLEAR_ENEMIES
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="font-mono border-[#5f5434] text-[#f0dca2] bg-transparent hover:bg-white/5"
                      onClick={() => {
                        const st = stateRef.current
                        st.status = st.status === 'paused' ? 'running' : 'paused'
                        syncUiFromState(st)
                        pushEvent('state', `TOGGLE PAUSE -> ${st.status.toUpperCase()}`)
                      }}
                    >
                      TOGGLE_PAUSE
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    <div className="font-mono text-[11px] text-[#8f7e4f]">
                      EVENT_LOG ({eventsRef.current.length}) • tick {debugTick}
                    </div>
                    <div className="max-h-[140px] overflow-auto rounded-md border border-[#2f2a1b] bg-black/30 px-2 py-1">
                      <div className="space-y-1 font-mono text-[11px] text-[#d7c48d]">
                        {eventsRef.current.map((e, idx) => (
                          <div key={`${e.t}-${idx}`} className="whitespace-pre-wrap">
                            <span className="text-[#b89f61]">[{e.type.toUpperCase()}]</span> {e.msg}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <p className="mt-3 font-mono text-xs text-[#8f7e4f]">
          Protect the eagle base. Clear all enemies to advance level.
        </p>
      </div>
    </main>
  )
}

function updateState(state: GameState, dt: number, now: number, input: InputState) {
  state.playerInvincibleUntil = Math.max(0, state.playerInvincibleUntil - dt * 1000)
  const player = state.player
  const othersForPlayer = state.enemies
  if (player.alive) {
    if (input.up) applyMovement(player, dt, 'up', state.bricks, othersForPlayer, state.base)
    else if (input.down) applyMovement(player, dt, 'down', state.bricks, othersForPlayer, state.base)
    else if (input.left) applyMovement(player, dt, 'left', state.bricks, othersForPlayer, state.base)
    else if (input.right)
      applyMovement(player, dt, 'right', state.bricks, othersForPlayer, state.base)

    if (input.fire && now - player.lastShotAt > player.reloadMs) {
      player.lastShotAt = now
      state.bullets.push(createBullet(player))
    }
  }

  if (state.spawnCooldown <= 0) {
    const aliveEnemies = state.enemies.filter((e) => e.alive).length
    if (aliveEnemies < 4 && state.enemiesSpawned < state.enemiesTotal) {
      const spawn = SPAWN_POINTS[state.enemiesSpawned % SPAWN_POINTS.length]
      state.enemies.push({
        id: `enemy-${state.level}-${state.enemiesSpawned}`,
        x: spawn.x,
        y: spawn.y,
        dir: 'down',
        speed: ENEMY_SPEED_BASE + state.level * 4,
        reloadMs: 1100 - Math.min(450, state.level * 80),
        lastShotAt: now - 600,
        alive: true,
        isEnemy: true,
        aiTurnAt: now + 600,
      })
      state.enemiesSpawned += 1
      state.spawnCooldown = 0.7
    }
  } else {
    state.spawnCooldown -= dt
  }

  for (const enemy of state.enemies) {
    if (!enemy.alive) continue
    if (now >= enemy.aiTurnAt) {
      const dirs: Direction[] = ['up', 'down', 'left', 'right']
      enemy.dir = dirs[Math.floor(Math.random() * dirs.length)]
      enemy.aiTurnAt = now + 600 + Math.random() * 700
    }
    applyMovement(enemy, dt, enemy.dir, state.bricks, [state.player, ...state.enemies], state.base)
    if (now - enemy.lastShotAt > enemy.reloadMs && Math.random() < 0.02) {
      enemy.lastShotAt = now
      state.bullets.push(createBullet(enemy))
    }
  }

  for (const bullet of state.bullets) {
    if (!bullet.alive) continue
    bullet.x += bullet.vx * dt
    bullet.y += bullet.vy * dt
    if (bullet.x < 0 || bullet.x > WORLD_W || bullet.y < 0 || bullet.y > WORLD_H) {
      bullet.alive = false
      continue
    }

    for (const brick of state.bricks) {
      if (
        !bullet.alive ||
        !rectsOverlap(
          {
            x: bullet.x - bullet.radius,
            y: bullet.y - bullet.radius,
            w: bullet.radius * 2,
            h: bullet.radius * 2,
          },
          { x: brick.x, y: brick.y, w: brick.size, h: brick.size },
        )
      ) {
        continue
      }
      brick.hp -= 1
      bullet.alive = false
    }

    if (
      bullet.alive &&
      state.base.alive &&
      rectsOverlap(
        {
          x: bullet.x - bullet.radius,
          y: bullet.y - bullet.radius,
          w: bullet.radius * 2,
          h: bullet.radius * 2,
        },
        { x: state.base.x, y: state.base.y, w: state.base.size, h: state.base.size },
      )
    ) {
      state.base.alive = false
      bullet.alive = false
      state.status = 'lost'
    }

    if (!bullet.alive) continue
    if (bullet.owner === 'enemy') {
      if (
        state.player.alive &&
        state.playerInvincibleUntil <= 0 &&
        rectsOverlap(circleBox(bullet), tankRect(state.player))
      ) {
        state.player.alive = false
        bullet.alive = false
        state.status = 'lost'
      }
    } else {
      for (const enemy of state.enemies) {
        if (!enemy.alive || !bullet.alive) continue
        if (rectsOverlap(circleBox(bullet), tankRect(enemy))) {
          enemy.alive = false
          bullet.alive = false
          state.enemiesDestroyed += 1
        }
      }
    }
  }

  state.bricks = state.bricks.filter((b) => b.hp > 0)
  state.bullets = state.bullets.filter((b) => b.alive)
  state.enemies = state.enemies.filter((e) => e.alive || !e.isEnemy)

  if (
    state.status === 'running' &&
    state.enemiesDestroyed >= state.enemiesTotal &&
    state.enemies.filter((e) => e.alive).length === 0
  ) {
    state.status = 'won'
  }
}

function circleBox(bullet: Bullet) {
  return {
    x: bullet.x - bullet.radius,
    y: bullet.y - bullet.radius,
    w: bullet.radius * 2,
    h: bullet.radius * 2,
  }
}

function draw(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.clearRect(0, 0, WORLD_W, WORLD_H)
  ctx.fillStyle = '#161922'
  ctx.fillRect(0, 0, WORLD_W, WORLD_H)

  ctx.fillStyle = '#22293a'
  for (let y = 0; y < WORLD_H; y += TILE) {
    for (let x = 0; x < WORLD_W; x += TILE) {
      if ((x / TILE + y / TILE) % 2 === 0) ctx.fillRect(x, y, TILE, TILE)
    }
  }

  for (const brick of state.bricks) {
    ctx.fillStyle = brick.hp > 1 ? '#ba5d2e' : '#e79a52'
    ctx.fillRect(brick.x, brick.y, brick.size, brick.size)
    ctx.strokeStyle = '#2e1208'
    ctx.strokeRect(brick.x + 0.5, brick.y + 0.5, brick.size - 1, brick.size - 1)
  }

  if (state.base.alive) {
    ctx.fillStyle = '#d6c254'
    ctx.fillRect(state.base.x, state.base.y, state.base.size, state.base.size)
    ctx.fillStyle = '#3a2a18'
    ctx.fillRect(state.base.x + 6, state.base.y + 4, state.base.size - 12, state.base.size - 8)
  } else {
    ctx.fillStyle = '#6c3a3a'
    ctx.fillRect(state.base.x, state.base.y, state.base.size, state.base.size)
  }

  if (state.player.alive) {
    const blinking =
      state.playerInvincibleUntil > 0 &&
      Math.floor(state.playerInvincibleUntil / 120) % 2 === 0
    if (!blinking) {
      drawTank(ctx, state.player, '#54b96f')
    }
    if (state.playerInvincibleUntil > 0) {
      ctx.strokeStyle = '#f4e39e'
      ctx.lineWidth = 2
      ctx.strokeRect(state.player.x - 1, state.player.y - 1, TANK_SIZE + 2, TANK_SIZE + 2)
    }
  }
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue
    drawTank(ctx, enemy, '#d64f4f')
  }

  for (const bullet of state.bullets) {
    ctx.fillStyle = bullet.owner === 'player' ? '#f8ebbf' : '#ffb178'
    ctx.beginPath()
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2)
    ctx.fill()
  }

  if (state.levelBannerUntil > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(0, WORLD_H / 2 - 26, WORLD_W, 52)
    ctx.fillStyle = '#ffe5a1'
    ctx.font = 'bold 20px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`LEVEL ${state.level}`, WORLD_W / 2, WORLD_H / 2 + 7)
  }

  if (state.playerInvincibleUntil > 0 && state.status === 'running') {
    ctx.fillStyle = '#f4e39e'
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'left'
    ctx.fillText('SPAWN SHIELD', 8, 14)
  }

  if (state.status === 'paused') drawOverlay(ctx, 'PAUSED')
  if (state.status === 'won') drawOverlay(ctx, 'STAGE CLEAR')
  if (state.status === 'lost') drawOverlay(ctx, 'GAME OVER')
}

function drawOverlay(ctx: CanvasRenderingContext2D, text: string) {
  ctx.fillStyle = 'rgba(0,0,0,0.52)'
  ctx.fillRect(0, 0, WORLD_W, WORLD_H)
  ctx.fillStyle = '#f3e0ad'
  ctx.font = 'bold 28px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(text, WORLD_W / 2, WORLD_H / 2)
}

