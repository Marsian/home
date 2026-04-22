import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Pause, Play } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import pointMatrixData from '@/game-center/pixel-knight/assets/knight-point-matrix.json'

const originalBoardSrc = '/docs/pixel-knight-ai-candidates/direction-a-copper-shield-recruit-board.png'

const CANVAS_WIDTH = 960
const CANVAS_HEIGHT = 420
const PIXEL_SIZE = 8
const PREVIEW_CANVAS_WIDTH = 320
const PREVIEW_CANVAS_HEIGHT = 180
const PREVIEW_PIXEL_SIZE = 4

type DemoMode = 'idle' | 'walk'
type Facing = 'left' | 'right'
type PartKey = 'head' | 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg'
type PixelPoint = { x: number; y: number; color: string }
type MatrixPart = {
  offset: [number, number]
  size: [number, number]
  points: PixelPoint[]
}
type MatrixManifest = {
  anchorPart: 'torso'
  pixelScale: number
  parts: Record<PartKey, MatrixPart>
}

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

function buildCompositeBounds(parts: MatrixManifest['parts']) {
  const partKeys = Object.keys(parts) as PartKey[]
  const xs = partKeys.map((key) => parts[key].offset[0])
  const ys = partKeys.map((key) => parts[key].offset[1])
  const xe = partKeys.map((key) => parts[key].offset[0] + parts[key].size[0])
  const ye = partKeys.map((key) => parts[key].offset[1] + parts[key].size[1])
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xe),
    maxY: Math.max(...ye),
  }
}

function drawMatrixPart(
  ctx: CanvasRenderingContext2D,
  part: MatrixPart,
  x0: number,
  y0: number,
  pixelSize: number,
  facing: Facing = 'right',
) {
  for (const point of part.points) {
    const drawX = facing === 'right' ? point.x : part.size[0] - 1 - point.x
    ctx.fillStyle = point.color
    ctx.fillRect(
      Math.round(x0 + drawX * pixelSize),
      Math.round(y0 + point.y * pixelSize),
      pixelSize,
      pixelSize,
    )
  }
}

function drawAnimatedLegPart(
  ctx: CanvasRenderingContext2D,
  part: MatrixPart,
  x0: number,
  y0: number,
  pixelSize: number,
  facing: Facing,
  phase: number,
) {
  const stage =
    phase > 0.55
      ? 'front'
      : phase > 0.15
        ? 'frontContact'
        : phase < -0.55
          ? 'back'
          : phase < -0.15
            ? 'backContact'
            : 'center'

  const stageOffsets = {
    center: { upperDx: 0, upperDy: 0, lowerDx: 0, lowerDy: 0, footLift: 0 },
    frontContact: { upperDx: 0, upperDy: 0, lowerDx: 1, lowerDy: 0, footLift: 0 },
    front: { upperDx: 0, upperDy: 0, lowerDx: 1, lowerDy: -1, footLift: 1 },
    backContact: { upperDx: -1, upperDy: 0, lowerDx: -1, lowerDy: 0, footLift: 0 },
    back: { upperDx: -1, upperDy: 0, lowerDx: -1, lowerDy: 0, footLift: 0 },
  }[stage]

  const direction = facing === 'right' ? 1 : -1
  const kneeStartY = 4
  const footStartY = 6

  for (const point of part.points) {
    const mirroredX = facing === 'right' ? point.x : part.size[0] - 1 - point.x
    const isLower = point.y >= kneeStartY
    const isFoot = point.y >= footStartY
    const xOffset = (isLower ? stageOffsets.lowerDx : stageOffsets.upperDx) * direction
    const yOffset =
      (isLower ? stageOffsets.lowerDy : stageOffsets.upperDy) + (isFoot ? -stageOffsets.footLift : 0)

    ctx.fillStyle = point.color
    ctx.fillRect(
      Math.round(x0 + (mirroredX + xOffset) * pixelSize),
      Math.round(y0 + (point.y + yOffset) * pixelSize),
      pixelSize,
      pixelSize,
    )
  }
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  manifest: MatrixManifest,
  options: {
    actorX: number
    actorFeetY: number
    pixelSize: number
    facing: Facing
    mode: DemoMode
    timeMs: number
  },
) {
  const bounds = buildCompositeBounds(manifest.parts)
  const totalWidth = bounds.maxX - bounds.minX
  const totalHeight = bounds.maxY - bounds.minY
  const groupLeft = options.actorX - (totalWidth * options.pixelSize) / 2
  const groupTop = options.actorFeetY - totalHeight * options.pixelSize

  const idleBreath = Math.sin(options.timeMs / 280)
  const walkPhase = (options.timeMs / 1000) * 7
  const swing = Math.sin(walkPhase)
  const swingOpposite = Math.sin(walkPhase + Math.PI)

  const currentMode = options.mode
  const torsoBob = currentMode === 'idle' ? idleBreath * 0.38 : Math.sin(walkPhase * 2) * 0.9
  const headBob = currentMode === 'idle' ? idleBreath * 0.38 - 0.7 : Math.sin(walkPhase * 2 + 0.4) * 0.8 - 0.7
  const leftLegPhase = currentMode === 'walk' ? swing : 0
  const rightLegPhase = currentMode === 'walk' ? swingOpposite : 0
  const leftLegX = 0
  const leftLegY = 0
  const rightLegX = 0
  const rightLegY = 0
  const leftArmX = currentMode === 'walk' ? swingOpposite * 0.38 : 0
  const leftArmY = currentMode === 'walk' ? Math.max(0, -swingOpposite) * 0.2 + torsoBob : idleBreath * 0.38
  const rightArmX = currentMode === 'walk' ? swing * 0.38 : 0
  const rightArmY = currentMode === 'walk' ? Math.max(0, -swing) * 0.2 + torsoBob : idleBreath * 0.38

  const getPartBaseX = (part: MatrixPart, dx: number) => {
    const localX = part.offset[0] - bounds.minX
    if (options.facing === 'right') return localX + dx
    return totalWidth - localX - part.size[0] - dx
  }

  const drawPart = (key: PartKey, dx: number, dy: number) => {
    const part = manifest.parts[key]
    const baseX = getPartBaseX(part, dx)
    const baseY = part.offset[1] - bounds.minY + dy
    drawMatrixPart(
      ctx,
      part,
      groupLeft + baseX * options.pixelSize,
      groupTop + baseY * options.pixelSize,
      options.pixelSize,
      options.facing,
    )
  }

  const drawLegPart = (key: 'leftLeg' | 'rightLeg', dx: number, dy: number, phase: number) => {
    const part = manifest.parts[key]
    const baseX = getPartBaseX(part, dx)
    const baseY = part.offset[1] - bounds.minY + dy
    drawAnimatedLegPart(
      ctx,
      part,
      groupLeft + baseX * options.pixelSize,
      groupTop + baseY * options.pixelSize,
      options.pixelSize,
      options.facing,
      phase,
    )
  }

  const armBackKey: PartKey = options.facing === 'right' ? 'leftArm' : 'rightArm'
  const armFrontKey: PartKey = options.facing === 'right' ? 'rightArm' : 'leftArm'
  const frontLegKey: 'leftLeg' | 'rightLeg' = leftLegPhase >= rightLegPhase ? 'leftLeg' : 'rightLeg'
  const backLegKey: 'leftLeg' | 'rightLeg' = frontLegKey === 'leftLeg' ? 'rightLeg' : 'leftLeg'
  const armOffsets: Record<'leftArm' | 'rightArm', { x: number; y: number }> = {
    leftArm: { x: leftArmX, y: currentMode === 'walk' ? leftArmY : leftArmY },
    rightArm: { x: rightArmX, y: currentMode === 'walk' ? rightArmY : rightArmY },
  }
  const legOffsets: Record<'leftLeg' | 'rightLeg', { x: number; y: number; phase: number }> = {
    leftLeg: { x: leftLegX, y: currentMode === 'walk' ? torsoBob + leftLegY : leftLegY, phase: leftLegPhase },
    rightLeg: { x: rightLegX, y: currentMode === 'walk' ? torsoBob + rightLegY : rightLegY, phase: rightLegPhase },
  }

  drawPart(armBackKey, armOffsets[armBackKey].x, armOffsets[armBackKey].y)
  drawLegPart(backLegKey, legOffsets[backLegKey].x, legOffsets[backLegKey].y, legOffsets[backLegKey].phase)
  drawLegPart(frontLegKey, legOffsets[frontLegKey].x, legOffsets[frontLegKey].y, legOffsets[frontLegKey].phase)
  drawPart(armFrontKey, armOffsets[armFrontKey].x, armOffsets[armFrontKey].y)
  drawPart('torso', 0, torsoBob)
  drawPart('head', 0, headBob)
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
  }, [])

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
    const actorFeetY = 292
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
        drawCharacter(ctx, manifestRef.current, {
          actorX,
          actorFeetY,
          pixelSize: PIXEL_SIZE,
          facing,
          mode: modeRef.current,
          timeMs: elapsed,
        })

        previewCtx.fillStyle = '#000000'
        previewCtx.fillRect(0, 0, PREVIEW_CANVAS_WIDTH, PREVIEW_CANVAS_HEIGHT)
        drawCharacter(previewCtx, manifestRef.current, {
          actorX: 98,
          actorFeetY: 156,
          pixelSize: PREVIEW_PIXEL_SIZE,
          facing: 'right',
          mode: 'idle',
          timeMs: elapsed,
        })
        drawCharacter(previewCtx, manifestRef.current, {
          actorX: 222,
          actorFeetY: 156,
          pixelSize: PREVIEW_PIXEL_SIZE,
          facing: 'left',
          mode: 'idle',
          timeMs: elapsed,
        })
      }

      ctx.fillStyle = '#f6efd7'
      ctx.font = '900 34px sans-serif'
      ctx.fillText('A1 Point-Matrix Demo', 44, 56)
      ctx.font = '600 16px sans-serif'
      ctx.fillStyle = '#fff3d1'
      ctx.fillText('Canvas-only render: every part is drawn from point-matrix JSON, not from PNG sprites.', 46, 84)

      animationFrame = requestAnimationFrame(render)
    }

    animationFrame = requestAnimationFrame(render)
    return () => {
      disposed = true
      cancelAnimationFrame(animationFrame)
    }
  }, [ready])

  const partSummaries = manifestRef.current
    ? (Object.entries(manifestRef.current.parts) as Array<[PartKey, MatrixPart]>).map(([key, part]) => ({
        key,
        count: part.points.length,
        size: `${part.size[0]}x${part.size[1]}`,
      }))
    : []

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
            <Button
              type="button"
              variant="outline"
              asChild
              className="border-[#455037]/18 bg-[#f7efd7]/70 text-[#243019] hover:bg-[#fff7df]"
            >
              <Link to="/games/pixel-knight/data">数据后台</Link>
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
                className="block aspect-[16/7] w-full rounded-[1.6rem] border border-[#344129]/12 bg-[#d9d5ad] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            <div className="space-y-4 p-5 lg:p-6">
              <div className="rounded-[1.5rem] border border-[#495738]/10 bg-[#fff7e7]/76 p-4">
                <div className="text-[0.72rem] tracking-[0.3em] text-[#6f7a55] uppercase">Pipeline</div>
                <div className="mt-2 text-2xl font-black tracking-[0.06em] text-[#24311a]">A1 点阵源数据</div>
                <p className="mt-3 text-sm leading-6 text-[#536045]">
                  当前 demo 不再读取任何角色 PNG 来渲染。`head / torso / arms / legs`
                  六个部件都已经被提取为像素点阵，运行时直接在 canvas 上逐点绘制，再做 `idle / walk`。
                </p>
              </div>

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

              <div className="rounded-[1.5rem] border border-[#495738]/10 bg-[#fff9ed]/84 p-4">
                <div className="text-[0.72rem] tracking-[0.3em] text-[#6f7a55] uppercase">Assembled</div>
                <div className="mt-3 rounded-[1rem] border border-[#232323] bg-black p-3">
                  <canvas
                    ref={previewCanvasRef}
                    width={PREVIEW_CANVAS_WIDTH}
                    height={PREVIEW_CANVAS_HEIGHT}
                    className="mx-auto h-36 w-auto"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <div className="mt-3 text-sm leading-6 text-[#536045]">
                  当前 demo 只保留完整角色的拼接结果，不再单独展示 parts。右侧同时渲染左右两个朝向，并且和左侧主画布使用的是同一套点阵数据与锚点。
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-[#495738]/10 bg-[#fff7e7]/76 p-4 text-sm leading-6 text-[#536045]">
                点阵源数据文件位于 <code>src/game-center/pixel-knight/assets/knight-point-matrix.json</code>。
                当前 6 个部件共 {partSummaries.reduce((sum, part) => sum + part.count, 0)} 个像素点，
                已按统一图层顺序拼接为完整角色。<br />
                <a
                  href={originalBoardSrc}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#7a4d22] underline underline-offset-4"
                >
                  查看原始 A1 候选板
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
