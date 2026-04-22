import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Pause, Play } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import pointMatrixData from '@/game-center/pixel-knight/assets/knight-point-matrix.json'
import {
  drawMatrixCharacter,
  type MatrixCharacterMode,
  type MatrixFacing,
  type MatrixManifest,
} from '@/game-center/pixel-knight/rendering/matrixCharacterRenderer'

const CANVAS_WIDTH = 960
const CANVAS_HEIGHT = 540
const PIXEL_SIZE = 8
const PREVIEW_CANVAS_WIDTH = 320
const PREVIEW_CANVAS_HEIGHT = 180
const PREVIEW_PIXEL_SIZE = 4

type DemoMode = MatrixCharacterMode
type Facing = MatrixFacing

function drawGround(ctx: CanvasRenderingContext2D, timeMs: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
  gradient.addColorStop(0, '#f3dfaa')
  gradient.addColorStop(0.52, '#d2c486')
  gradient.addColorStop(1, '#7f8451')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  for (let index = 0; index < 13; index += 1) {
    const x = 56 + index * 70
    const y = 68 + (index % 2) * 16
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.fillRect(x, y, 10, 10)
  }

  ctx.fillStyle = '#41543c'
  ctx.fillRect(0, 306, CANVAS_WIDTH, 114)
  ctx.fillStyle = '#688455'
  ctx.fillRect(0, 288, CANVAS_WIDTH, 28)

  for (let col = 0; col < 18; col += 1) {
    const tileX = col * 56
    ctx.fillStyle = col % 2 === 0 ? '#8c8f5a' : '#9ea266'
    ctx.fillRect(tileX, 306, 56, 20)
    ctx.fillStyle = 'rgba(53,61,34,0.32)'
    ctx.fillRect(tileX + 8, 312, 38, 7)
  }

  const sparkle = Math.sin(timeMs / 260) * 0.5 + 0.5
  ctx.fillStyle = `rgba(255,244,191,${0.1 + sparkle * 0.14})`
  ctx.fillRect(696, 98, 7, 7)
  ctx.fillRect(734, 132, 5, 5)
  ctx.fillRect(772, 88, 6, 6)
}

export default function PixelKnightCharacterDemoView() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const pausedRef = useRef(false)
  const modeRef = useRef<DemoMode>('walk')
  const manifestRef = useRef<MatrixManifest | null>(null)

  const [paused, setPaused] = useState(false)
  const [mode, setMode] = useState<DemoMode>('walk')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    manifestRef.current = pointMatrixData as MatrixManifest
    setReady(true)
  }, [pointMatrixData])

  useEffect(() => {
    const canvas = canvasRef.current
    const previewCanvas = previewCanvasRef.current
    if (!canvas || !previewCanvas) return
    const ctx = canvas.getContext('2d')
    const previewCtx = previewCanvas.getContext('2d')
    if (!ctx || !previewCtx) return

    let disposed = false
    let animationFrame = 0
    let elapsed = 0
    let actorX = 180
    const actorFeetY = Math.round(CANVAS_HEIGHT * 0.74)
    let facing: Facing = 'right'
    let lastTs = performance.now()

    const render = (timestamp: number) => {
      if (disposed) return
      const dt = Math.min(34, timestamp - lastTs)
      lastTs = timestamp

      if (!pausedRef.current) elapsed += dt
      if (!pausedRef.current && modeRef.current === 'walk') {
        const velocity = 90 * (dt / 1000)
        actorX += facing === 'right' ? velocity : -velocity
        if (actorX > 792) facing = 'left'
        if (actorX < 168) facing = 'right'
      }

      drawGround(ctx, elapsed)

      ctx.fillStyle = 'rgba(18,28,16,0.22)'
      ctx.beginPath()
      ctx.ellipse(actorX, actorFeetY + 10, 72, 18, 0, 0, Math.PI * 2)
      ctx.fill()

      if (ready && manifestRef.current) {
        drawMatrixCharacter(ctx, manifestRef.current, {
          actorX,
          actorFeetY,
          pixelSize: PIXEL_SIZE,
          facing,
          mode: modeRef.current,
          timeMs: elapsed,
        })

        previewCtx.fillStyle = '#000000'
        previewCtx.fillRect(0, 0, PREVIEW_CANVAS_WIDTH, PREVIEW_CANVAS_HEIGHT)
        drawMatrixCharacter(previewCtx, manifestRef.current, {
          actorX: 98,
          actorFeetY: 156,
          pixelSize: PREVIEW_PIXEL_SIZE,
          facing: 'right',
          mode: 'idle',
          timeMs: elapsed,
        })
        drawMatrixCharacter(previewCtx, manifestRef.current, {
          actorX: 222,
          actorFeetY: 156,
          pixelSize: PREVIEW_PIXEL_SIZE,
          facing: 'left',
          mode: 'idle',
          timeMs: elapsed,
        })
      }

      animationFrame = requestAnimationFrame(render)
    }

    animationFrame = requestAnimationFrame(render)
    return () => {
      disposed = true
      cancelAnimationFrame(animationFrame)
    }
  }, [ready])

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,rgba(249,225,163,0.85),transparent_28%),linear-gradient(180deg,#f7ebc8_0%,#c8cd8e_46%,#77824f_100%)] px-4 py-5 text-[#1d2516] sm:px-6 sm:pl-24">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[0.72rem] tracking-[0.34em] text-[#637044] uppercase">Pixel Knight Prototype</div>
            <h1 className="mt-1 text-[clamp(2rem,5vw,3.8rem)] leading-none font-black tracking-[0.08em] text-[#28321b] uppercase">
              点阵角色 Demo
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/games/pixel-knight')}
              className="border-[#455037]/18 bg-[#f7efd7]/70 text-[#243019] hover:bg-[#fff7df]"
            >
              <ArrowLeft />
              返回游戏
            </Button>
          </div>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-[#435437]/16 bg-[#f6f0db]/60 shadow-[0_20px_80px_rgba(60,66,31,0.16)] backdrop-blur-sm">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="border-b border-[#4a563d]/10 p-4 lg:border-r lg:border-b-0 lg:p-6">
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="block aspect-[16/9] w-full rounded-[1.6rem] border border-[#344129]/12 bg-[#d9d5ad] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            <div className="space-y-4 p-5 lg:p-6">
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => setPaused((current) => !current)}
                  className="bg-[#30422a] text-[#fbf5e5] hover:bg-[#23321d]"
                >
                  {paused ? <Play /> : <Pause />}
                  {paused ? '继续' : '暂停'}
                </Button>
                <Button
                  type="button"
                  variant={mode === 'walk' ? 'default' : 'outline'}
                  onClick={() => setMode('walk')}
                  className={
                    mode === 'walk'
                      ? 'bg-[#b8773d] text-[#fff5df] hover:bg-[#9a6331]'
                      : 'border-[#455037]/18 bg-[#f7efd7]/70 text-[#243019] hover:bg-[#fff7df]'
                  }
                >
                  Walk
                </Button>
                <Button
                  type="button"
                  variant={mode === 'idle' ? 'default' : 'outline'}
                  onClick={() => setMode('idle')}
                  className={
                    mode === 'idle'
                      ? 'bg-[#b8773d] text-[#fff5df] hover:bg-[#9a6331]'
                      : 'border-[#455037]/18 bg-[#f7efd7]/70 text-[#243019] hover:bg-[#fff7df]'
                  }
                >
                  Idle
                </Button>
              </div>

              <div className="overflow-hidden rounded-[1.5rem] border border-[#232323] bg-black">
                <canvas
                  ref={previewCanvasRef}
                  width={PREVIEW_CANVAS_WIDTH}
                  height={PREVIEW_CANVAS_HEIGHT}
                  className="block h-auto w-full"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
