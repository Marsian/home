import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowLeftRight, Pause, Play } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import pointMatrixData from '@/game-center/pixel-knight/assets/characters/knight.json'
import armorData from '@/game-center/pixel-knight/assets/equipment/armor/iron-armor.json'
import helmetData from '@/game-center/pixel-knight/assets/equipment/helmet/cloth-cap.json'
import helmetAzureData from '@/game-center/pixel-knight/assets/equipment/helmet/iron-helmet.json'
import shieldData from '@/game-center/pixel-knight/assets/equipment/off-hand/wood-shield.json'
import swordData from '@/game-center/pixel-knight/assets/equipment/main-hand/iron-sword.json'
import {
  drawMatrixCharacter,
  type MatrixEquipmentPiece,
  type MatrixEquipmentSlot,
  type MatrixCharacterMode,
  type MatrixFacing,
  type MatrixManifest,
} from '@/game-center/pixel-knight/rendering/matrixCharacterRenderer'

const CANVAS_WIDTH = 960
const CANVAS_HEIGHT = 540
const PIXEL_SIZE = 8
const BASE_ATTACK_DURATION_MS = 420

type DemoMode = MatrixCharacterMode
type Facing = MatrixFacing

const helmetVariants: MatrixEquipmentPiece[] = [
  helmetData as MatrixEquipmentPiece,
  helmetAzureData as unknown as MatrixEquipmentPiece,
]

const equipmentCatalog: Record<MatrixEquipmentSlot, MatrixEquipmentPiece> = {
  helmet: helmetData as MatrixEquipmentPiece,
  armor: armorData as MatrixEquipmentPiece,
  mainHand: swordData as MatrixEquipmentPiece,
  offHand: shieldData as MatrixEquipmentPiece,
}

function EquipmentPreview({ piece }: { piece: MatrixEquipmentPiece }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const entries = piece.parts
      ? Object.values(piece.parts).sort((a, b) => {
          const rank = (layer?: 'back' | 'base' | 'front') => (layer === 'back' ? 0 : layer === 'front' ? 2 : 1)
          return rank(a.layer) - rank(b.layer)
        })
      : piece.size && piece.points
        ? [{ size: piece.size, points: piece.points }]
        : []
    if (entries.length === 0) return

    const width = Math.max(...entries.map((entry) => entry.size[0]))
    const height = Math.max(...entries.map((entry) => entry.size[1]))
    const pixel = 3
    canvas.width = width * pixel
    canvas.height = height * pixel
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = false

    for (const entry of entries) {
      for (const point of entry.points) {
        ctx.fillStyle = point.color
        ctx.fillRect(point.x * pixel, point.y * pixel, pixel, pixel)
      }
    }
  }, [piece])

  return (
    <canvas
      ref={canvasRef}
      className="h-10 w-10 rounded-sm border border-[#4b5838]/20 bg-[#efe6cf]"
      style={{ imageRendering: 'pixelated' }}
    />
  )
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

export default function PixelKnightCharacterDemoView() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pausedRef = useRef(false)
  const modeRef = useRef<DemoMode>('walk')
  const manifestRef = useRef<MatrixManifest | null>(null)
  const elapsedRef = useRef(0)
  const attackStartMsRef = useRef<number | null>(null)
  const queuedAttackRef = useRef(false)
  const attackDurationMsRef = useRef(BASE_ATTACK_DURATION_MS)
  const facingOverrideRef = useRef<Facing | null>(null)

  const [paused, setPaused] = useState(false)
  const [mode, setMode] = useState<DemoMode>('walk')
  const [ready, setReady] = useState(false)
  const [selectedHelmetId, setSelectedHelmetId] = useState(helmetAzureData.id as string)
  const [facingOverride, setFacingOverride] = useState<Facing | null>(null)
  const [equippedSlots, setEquippedSlots] = useState<Record<MatrixEquipmentSlot, boolean>>({
    helmet: false,
    armor: false,
    mainHand: false,
    offHand: false,
  })
  const selectedHelmet = helmetVariants.find((piece) => piece.id === selectedHelmetId) ?? helmetVariants[0]

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    facingOverrideRef.current = facingOverride
  }, [facingOverride])

  useEffect(() => {
    manifestRef.current = pointMatrixData as MatrixManifest
    setReady(true)
  }, [pointMatrixData])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

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
      elapsedRef.current = elapsed
      if (modeRef.current === 'attack' && attackStartMsRef.current !== null) {
        const attackElapsed = elapsed - attackStartMsRef.current
        if (attackElapsed >= attackDurationMsRef.current) {
          if (queuedAttackRef.current) {
            queuedAttackRef.current = false
            attackStartMsRef.current = elapsed
          } else {
            attackStartMsRef.current = null
            modeRef.current = 'idle'
            setMode('idle')
          }
        }
      }
      if (!pausedRef.current && modeRef.current === 'walk') {
        const velocity = 90 * (dt / 1000)
        const override = facingOverrideRef.current
        if (override) facing = override
        actorX += facing === 'right' ? velocity : -velocity
        if (!override) {
          if (actorX > 792) facing = 'left'
          if (actorX < 168) facing = 'right'
        } else {
          actorX = Math.max(168, Math.min(792, actorX))
        }
      }

      drawGround(ctx, elapsed)

      const idleBreath = Math.sin(elapsed / 280)
      const shadowPulse = 0.96 + (modeRef.current === 'idle' ? idleBreath * 0.025 : 0)
      ctx.fillStyle = 'rgba(18,28,16,0.22)'
      ctx.beginPath()
      ctx.ellipse(
        actorX,
        actorFeetY + 4 + (modeRef.current === 'idle' ? idleBreath * 0.8 : 0),
        72 * shadowPulse,
        18 + (modeRef.current === 'idle' ? idleBreath * 0.35 : 0),
        0,
        0,
        Math.PI * 2,
      )
      ctx.fill()

      if (ready && manifestRef.current) {
        const equippedPieces: Partial<Record<MatrixEquipmentSlot, MatrixEquipmentPiece | null>> = {
          helmet: equippedSlots.helmet ? selectedHelmet : null,
          armor: equippedSlots.armor ? equipmentCatalog.armor : null,
          mainHand: equippedSlots.mainHand ? equipmentCatalog.mainHand : null,
          offHand: equippedSlots.offHand ? equipmentCatalog.offHand : null,
        }
        const actionTimeMs =
          modeRef.current === 'attack' && attackStartMsRef.current !== null
            ? Math.max(0, elapsed - attackStartMsRef.current)
            : elapsed

        drawMatrixCharacter(ctx, manifestRef.current, {
          actorX,
          actorFeetY,
          pixelSize: PIXEL_SIZE,
          facing,
          mode: modeRef.current,
          timeMs: actionTimeMs,
          attackDurationMs: attackDurationMsRef.current,
          equipment: equippedPieces,
        })
      }

      animationFrame = requestAnimationFrame(render)
    }

    animationFrame = requestAnimationFrame(render)
    return () => {
      disposed = true
      cancelAnimationFrame(animationFrame)
    }
  }, [ready, equippedSlots, selectedHelmet])

  const triggerAttack = () => {
    if (modeRef.current === 'attack' && attackStartMsRef.current !== null) {
      // Coalesce repeated calls into one queued follow-up attack.
      queuedAttackRef.current = true
      return
    }
    attackStartMsRef.current = elapsedRef.current
    modeRef.current = 'attack'
    setMode('attack')
    if (pausedRef.current) setPaused(false)
  }

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
              <Link to="/games/pixel-knight/pixel-editor">像素编辑器</Link>
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
                  variant="outline"
                  onClick={() =>
                    setFacingOverride((current) => {
                      if (!current) return 'left'
                      return current === 'left' ? 'right' : 'left'
                    })
                  }
                  className="border-[#455037]/18 bg-[#f7efd7]/70 text-[#243019] hover:bg-[#fff7df]"
                >
                  <ArrowLeftRight />
                  {facingOverride ? `朝向：${facingOverride === 'left' ? '左' : '右'}` : '切换左右方向'}
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
                  variant={mode === 'static' ? 'default' : 'outline'}
                  onClick={() => setMode('static')}
                  className={
                    mode === 'static'
                      ? 'bg-[#b8773d] text-[#fff5df] hover:bg-[#9a6331]'
                      : 'border-[#455037]/18 bg-[#f7efd7]/70 text-[#243019] hover:bg-[#fff7df]'
                  }
                >
                  Static
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
                <Button
                  type="button"
                  variant={mode === 'attack' ? 'default' : 'outline'}
                  onClick={triggerAttack}
                  className={
                    mode === 'attack'
                      ? 'bg-[#b8773d] text-[#fff5df] hover:bg-[#9a6331]'
                      : 'border-[#455037]/18 bg-[#f7efd7]/70 text-[#243019] hover:bg-[#fff7df]'
                  }
                >
                  普攻
                </Button>
              </div>

              <div className="rounded-[1.35rem] border border-[#495738]/14 bg-[#f7efd8]/72 p-3 sm:p-4">
                <div className="text-[0.68rem] tracking-[0.26em] text-[#6c7753] uppercase">装备面板</div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {(Object.keys(equipmentCatalog) as MatrixEquipmentSlot[]).map((slot) => {
                    const equipped = equippedSlots[slot]
                    const item = slot === 'helmet' ? selectedHelmet : equipmentCatalog[slot]
                    return (
                      <div
                        key={slot}
                        className="rounded-xl border border-[#495738]/12 bg-[#fff6e2]/80 px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <EquipmentPreview piece={item} />
                            <div className="text-sm text-[#334126]">{item.name}</div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant={equipped ? 'default' : 'outline'}
                            onClick={() =>
                              setEquippedSlots((current) => ({
                                ...current,
                                [slot]: !current[slot],
                              }))
                            }
                            className={
                              equipped
                                ? 'h-8 bg-[#2f4328] text-[#f6f0de] hover:bg-[#22331d]'
                                : 'h-8 border-[#455037]/20 bg-[#f8efd8]/70 text-[#243019] hover:bg-[#fff7df]'
                            }
                          >
                            {equipped ? '卸下' : '穿上'}
                          </Button>
                        </div>
                        {slot === 'helmet' ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {helmetVariants.map((piece) => {
                              const active = piece.id === selectedHelmetId
                              return (
                                <button
                                  key={piece.id}
                                  type="button"
                                  onClick={() => setSelectedHelmetId(piece.id)}
                                  className={
                                    active
                                      ? 'rounded-md border border-[#2f4328]/40 bg-[#2f4328] px-2 py-1 text-xs text-[#f6f0de]'
                                      : 'rounded-md border border-[#455037]/20 bg-[#f8efd8]/70 px-2 py-1 text-xs text-[#243019]'
                                  }
                                >
                                  {piece.name}
                                </button>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
