import { useEffect, useRef, useState } from 'react'

import type { MonsterCatalogEntry } from '@/game-center/pixel-knight/monsters/monsterCatalog'
import {
  drawMonster,
  getMonsterAnimationDuration,
  loadMonsterFrames,
  type MonsterFacing,
  type MonsterFrameSet,
  type MonsterState,
} from '@/game-center/pixel-knight/rendering/monsterRenderer'

const STAGE_WIDTH = 960
const STAGE_HEIGHT = 540

function drawStage(ctx: CanvasRenderingContext2D, elapsedMs: number, compact: boolean) {
  const width = compact ? 360 : STAGE_WIDTH
  const height = compact ? 240 : STAGE_HEIGHT

  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, '#d7f2ff')
  gradient.addColorStop(0.48, '#b8d9ad')
  gradient.addColorStop(1, '#405a45')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  const groundTop = compact ? 154 : 318
  ctx.fillStyle = '#617c50'
  ctx.fillRect(0, groundTop, width, compact ? 16 : 30)
  ctx.fillStyle = '#26382b'
  ctx.fillRect(0, groundTop + (compact ? 16 : 20), width, height - groundTop)

  for (let index = 0; index < (compact ? 8 : 18); index += 1) {
    const tileWidth = compact ? 48 : 58
    const x = index * tileWidth
    ctx.fillStyle = index % 2 === 0 ? '#78945d' : '#86a56a'
    ctx.fillRect(x, groundTop + (compact ? 16 : 20), tileWidth, compact ? 10 : 18)
  }

  if (!compact) {
    const shimmer = Math.sin(elapsedMs / 360) * 0.5 + 0.5
    ctx.fillStyle = `rgba(245,253,255,${0.14 + shimmer * 0.12})`
    ctx.fillRect(700, 96, 8, 8)
    ctx.fillRect(744, 132, 5, 5)
    ctx.fillRect(788, 82, 6, 6)
  }
}

export function MonsterCanvasPreview({
  monster,
  state,
  facing = 'right',
  paused = false,
  compact = false,
  className,
  onNonLoopComplete,
}: {
  monster: MonsterCatalogEntry
  state: MonsterState
  facing?: MonsterFacing
  paused?: boolean
  compact?: boolean
  className?: string
  onNonLoopComplete?: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const framesRef = useRef<MonsterFrameSet>({})
  const elapsedRef = useRef(0)
  const stateStartMsRef = useRef(0)
  const completionRef = useRef(false)
  const stateRef = useRef(state)
  const facingRef = useRef(facing)
  const pausedRef = useRef(paused)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    stateRef.current = state
    stateStartMsRef.current = elapsedRef.current
    completionRef.current = false
  }, [state])

  useEffect(() => {
    facingRef.current = facing
  }, [facing])

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    let disposed = false
    setReady(false)
    setLoadError(null)
    framesRef.current = {}

    loadMonsterFrames(monster.meta, monster.frameUrls)
      .then((frames) => {
        if (disposed) return
        framesRef.current = frames
        elapsedRef.current = 0
        stateStartMsRef.current = 0
        completionRef.current = false
        setReady(true)
      })
      .catch((error: unknown) => {
        if (disposed) return
        setLoadError(error instanceof Error ? error.message : '怪物资源加载失败')
      })

    return () => {
      disposed = true
    }
  }, [monster])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let disposed = false
    let frameId = 0
    let lastTs = performance.now()

    const render = (timestamp: number) => {
      if (disposed) return

      const dt = Math.min(34, timestamp - lastTs)
      lastTs = timestamp
      if (!pausedRef.current) elapsedRef.current += dt

      const elapsed = elapsedRef.current
      const activeState = stateRef.current
      const stateTimeMs = elapsed - stateStartMsRef.current
      const animation = monster.meta.animations[activeState]
      if (animation && !animation.loop && stateTimeMs >= getMonsterAnimationDuration(animation) + 220 && !completionRef.current) {
        completionRef.current = true
        onNonLoopComplete?.()
      }

      drawStage(ctx, elapsed, compact)

      const pulse = Math.sin(elapsed / 240) * 0.5 + 0.5
      ctx.fillStyle = `rgba(8,18,16,${0.22 + pulse * 0.04})`
      ctx.beginPath()
      if (compact) {
        ctx.ellipse(180, 172, 54 + pulse * 3, 12 + pulse, 0, 0, Math.PI * 2)
      } else {
        ctx.ellipse(480, 384, 118 + pulse * 5, 25 + pulse * 2, 0, 0, Math.PI * 2)
      }
      ctx.fill()

      if (ready) {
        drawMonster(ctx, monster.meta, framesRef.current, {
          x: compact ? 180 : 480,
          y: compact ? 180 : 392,
          state: activeState,
          timeMs: stateTimeMs,
          scale: compact ? 0.72 : 1.45,
          facing: facingRef.current,
        })
      }

      frameId = requestAnimationFrame(render)
    }

    frameId = requestAnimationFrame(render)
    return () => {
      disposed = true
      cancelAnimationFrame(frameId)
    }
  }, [compact, monster, onNonLoopComplete, ready])

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        width={compact ? 360 : STAGE_WIDTH}
        height={compact ? 240 : STAGE_HEIGHT}
        className={`block w-full rounded-lg border border-[#243d2b]/12 bg-[#b6d0ae] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ${
          compact ? 'aspect-[3/2]' : 'aspect-[16/9]'
        }`}
        style={{ imageRendering: 'pixelated' }}
      />
      {loadError ? <div className="mt-2 text-xs text-[#8a3327]">{loadError}</div> : null}
    </div>
  )
}
