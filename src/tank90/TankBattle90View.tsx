import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { TouchControls } from './TouchControls'
import { WORLD_H, WORLD_W } from './core/constants'
import { draw } from './core/render'
import { createState } from './core/state'
import type { GameState, GameStatus, InputState } from './core/types'
import { updateState } from './core/update'

type GameEvent = { t: number; type: 'info' | 'warn' | 'state' | 'combat'; msg: string }
const MOVEMENT_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

export default function TankBattle90View() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stateRef = useRef<GameState>(createState(1))
  const inputRef = useRef<InputState>({ up: false, down: false, left: false, right: false, fire: false })
  const frameRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const eventsRef = useRef<GameEvent[]>([])
  const [ui, setUi] = useState({ stage: 1, status: 'ready' as GameStatus, enemiesDestroyed: 0, enemiesTotal: stateRef.current.enemiesTotal, playerAlive: true })
  const [debugTick, setDebugTick] = useState(0)
  const [showTouchControls, setShowTouchControls] = useState(false)

  const debugEnabled = useMemo(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') return false
    const flag = new URL(window.location.href).searchParams.get('debug')
    return flag === '1' || flag === 'true'
  }, [])

  useEffect(() => {
    const compute = () => setShowTouchControls((window.matchMedia?.('(pointer: coarse)')?.matches ?? false) || window.innerWidth < 900)
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  const syncUi = (state: GameState) =>
    setUi({ stage: state.level, status: state.status, enemiesDestroyed: state.enemiesDestroyed, enemiesTotal: state.enemiesTotal, playerAlive: state.player.alive })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const code = event.code
      if ((MOVEMENT_KEYS.has(code) || code === 'Space') && !isInteractiveTarget(event.target)) event.preventDefault()
      if (code === 'KeyW' || code === 'ArrowUp') inputRef.current.up = true
      if (code === 'KeyS' || code === 'ArrowDown') inputRef.current.down = true
      if (code === 'KeyA' || code === 'ArrowLeft') inputRef.current.left = true
      if (code === 'KeyD' || code === 'ArrowRight') inputRef.current.right = true
      if (code === 'Space') inputRef.current.fire = true
      if (code === 'KeyP') {
        const st = stateRef.current
        st.status = st.status === 'running' ? 'paused' : 'running'
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      const code = event.code
      if ((MOVEMENT_KEYS.has(code) || code === 'Space') && !isInteractiveTarget(event.target)) event.preventDefault()
      if (code === 'KeyW' || code === 'ArrowUp') inputRef.current.up = false
      if (code === 'KeyS' || code === 'ArrowDown') inputRef.current.down = false
      if (code === 'KeyA' || code === 'ArrowLeft') inputRef.current.left = false
      if (code === 'KeyD' || code === 'ArrowRight') inputRef.current.right = false
      if (code === 'Space') inputRef.current.fire = false
    }
    window.addEventListener('keydown', onKeyDown, { passive: false })
    window.addEventListener('keyup', onKeyUp, { passive: false })
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
      const dt = Math.min((t - (lastTimeRef.current || t)) / 1000, 1 / 30)
      lastTimeRef.current = t
      if (state.levelBannerUntil > 0) state.levelBannerUntil -= dt * 1000
      if (state.status === 'running') updateState(state, dt, t, inputRef.current)
      draw(ctx, state)
      syncUi(state)
      frameRef.current = window.requestAnimationFrame(tick)
    }
    frameRef.current = window.requestAnimationFrame(tick)
    return () => {
      if (frameRef.current != null) window.cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const startOrRestart = () => {
    const st = stateRef.current
    if (st.status === 'ready') {
      st.status = 'running'
      return
    }
    const next = createState(1)
    next.status = 'running'
    stateRef.current = next
    inputRef.current = { up: false, down: false, left: false, right: false, fire: false }
    syncUi(next)
  }

  const nextStage = () => {
    if (stateRef.current.status !== 'won') return
    const next = createState(stateRef.current.level + 1)
    next.status = 'running'
    stateRef.current = next
    inputRef.current = { up: false, down: false, left: false, right: false, fire: false }
    syncUi(next)
  }

  const controlsHint = showTouchControls ? 'TOUCH: DRAG JOYSTICK MOVE / HOLD FIRE SHOOT / PAUSE TOGGLE' : 'KEYBOARD: WASD + ARROWS MOVE / SPACE FIRE / P PAUSE'

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8 pb-36 sm:px-6 sm:pb-12 sm:pl-24">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-mono text-2xl sm:text-3xl tracking-[0.14em] text-foreground">90 TANK BATTLE</h1>
        <p className="mt-2 font-mono text-xs sm:text-sm tracking-[0.06em] text-muted-foreground">{controlsHint}</p>
        <div className="mt-6 rounded-lg border border-border bg-card px-3 py-2 shadow-sm sm:px-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-mono text-sm text-card-foreground">STAGE {ui.stage} | ENEMY {ui.enemiesDestroyed}/{ui.enemiesTotal} | {ui.status.toUpperCase()} | PLAYER {ui.playerAlive ? 'ALIVE' : 'DEAD'}</div>
            <div className="flex items-center gap-2">
              <Button type="button" onClick={startOrRestart} className="font-mono">{ui.status === 'ready' ? 'START' : 'RESTART'}</Button>
              {ui.status === 'won' ? <Button type="button" onClick={nextStage} className="font-mono">NEXT STAGE</Button> : null}
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="relative mx-auto w-full max-w-[640px] aspect-square">
            <canvas ref={canvasRef} width={WORLD_W} height={WORLD_H} className="block h-full w-full border border-[#2f2a1b] bg-[#111317] [image-rendering:pixelated]" data-testid="tank90-canvas" />
            {debugEnabled ? (
              <div className="absolute left-2 top-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => { const st = stateRef.current; st.enemies.forEach((e) => (e.alive = false)); st.enemiesDestroyed = st.enemiesTotal; st.enemiesSpawned = st.enemiesTotal; st.status = 'won'; syncUi(st) }}>FORCE_WIN</Button>
                <Button size="sm" variant="outline" onClick={() => { const st = stateRef.current; st.base.alive = false; st.player.alive = false; st.status = 'lost'; syncUi(st) }}>FORCE_LOSE</Button>
                <Button size="sm" variant="outline" onClick={() => { const st = stateRef.current; st.enemies.forEach((e) => (e.alive = false)); st.enemiesDestroyed = st.enemiesTotal; st.enemiesSpawned = st.enemiesTotal; st.status = 'won'; syncUi(st) }}>CLEAR_ENEMIES</Button>
                <Button size="sm" variant="outline" onClick={() => { const st = stateRef.current; st.status = st.status === 'paused' ? 'running' : 'paused'; syncUi(st) }}>TOGGLE_PAUSE</Button>
                <div className="sr-only">DEBUG {eventsRef.current.length} {debugTick}</div>
              </div>
            ) : null}
          </div>
        </div>
        {showTouchControls ? (
          <TouchControls className="max-w-[640px] mx-auto" onMoveChange={(next) => Object.assign(inputRef.current, next)} onFireChange={(fire) => { inputRef.current.fire = fire }} onPauseToggle={() => { const st = stateRef.current; st.status = st.status === 'paused' ? 'running' : 'paused'; syncUi(st) }} />
        ) : null}
        <p className="mt-4 font-mono text-xs leading-relaxed text-muted-foreground">{stateRef.current.levelIntent}</p>
      </div>
    </main>
  )
}
