import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { ArrowLeft, Download, Grid3X3, Hand, Layers, RotateCcw, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import villageBackdrop from '@/game-center/pixel-knight/assets/village/v7-front/full/starter-village-front-small-plaza-all-roads-connected.png'

const TILE = 16

type EditorTab = 'placement' | 'obstacles'
type AtomAsset = { key: string; src: string }
type Placement = { id: string; assetKey: string; x: number; y: number; scale: number }

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function useViewport() {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  return {
    zoom,
    pan,
    setZoom,
    setPan,
    worldToScreen: (p: { x: number; y: number }) => ({ x: p.x * zoom + pan.x, y: p.y * zoom + pan.y }),
    screenToWorld: (p: { x: number; y: number }) => ({ x: (p.x - pan.x) / zoom, y: (p.y - pan.y) / zoom }),
  }
}

export default function PixelKnightMapEditorView() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<EditorTab>('placement')

  const atomModules = useMemo(() => {
    return import.meta.glob('/src/game-center/pixel-knight/assets/village/v7-front/atoms/*.png', {
      eager: true,
      import: 'default',
    }) as Record<string, string>
  }, [])

  const atoms = useMemo<AtomAsset[]>(() => {
    const keys = Object.keys(atomModules)
      .map((p) => p.split('/').at(-1) ?? p)
      .sort((a, b) => a.localeCompare(b))
    return keys.map((filename) => ({
      key: filename.replace('.png', ''),
      src: atomModules[`/src/game-center/pixel-knight/assets/village/v7-front/atoms/${filename}`],
    }))
  }, [atomModules])

  const [imgSize, setImgSize] = useState({ width: 1254, height: 1254 })
  const viewport = useViewport()
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [spacePanning, setSpacePanning] = useState(false)
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)

  const [placements, setPlacements] = useState<Placement[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(() => placements.find((p) => p.id === selectedId) ?? null, [placements, selectedId])

  // obstacles: bitmap in cols*rows
  const cols = Math.ceil(imgSize.width / TILE)
  const rows = Math.ceil(imgSize.height / TILE)
  const [blocked, setBlocked] = useState<Uint8Array>(() => new Uint8Array(cols * rows))

  useEffect(() => {
    // Re-init obstacle bitmap when image size changes.
    setBlocked(new Uint8Array(Math.ceil(imgSize.width / TILE) * Math.ceil(imgSize.height / TILE)))
  }, [imgSize.width, imgSize.height])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpacePanning(true)
      if (event.code === 'Backspace' || event.code === 'Delete') {
        if (!selectedId) return
        const target = event.target
        if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
        event.preventDefault()
        setPlacements((prev) => prev.filter((p) => p.id !== selectedId))
        setSelectedId(null)
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpacePanning(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [selectedId])

  const onWheel = (event: React.WheelEvent) => {
    if (!canvasRef.current) return
    event.preventDefault()
    const rect = canvasRef.current.getBoundingClientRect()
    const mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    const before = viewport.screenToWorld(mouse)
    const nextZoom = clamp(viewport.zoom * (event.deltaY > 0 ? 0.92 : 1.08), 0.35, 6)
    viewport.setZoom(nextZoom)
    // Keep mouse anchored in world-space.
    const afterScreen = viewport.worldToScreen(before)
    viewport.setPan((prev) => ({ x: prev.x + (mouse.x - afterScreen.x), y: prev.y + (mouse.y - afterScreen.y) }))
  }

  const onPointerDownPan = (event: ReactPointerEvent) => {
    if (!spacePanning) return
    event.preventDefault()
    panStartRef.current = { x: event.clientX, y: event.clientY, panX: viewport.pan.x, panY: viewport.pan.y }
  }

  const onPointerMovePan = (event: ReactPointerEvent) => {
    if (!panStartRef.current) return
    const dx = event.clientX - panStartRef.current.x
    const dy = event.clientY - panStartRef.current.y
    viewport.setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy })
  }

  const onPointerUpPan = () => {
    panStartRef.current = null
  }

  const onDropAtom = (event: React.DragEvent) => {
    if (!canvasRef.current) return
    event.preventDefault()
    const assetKey = event.dataTransfer.getData('text/pixelKnightAtom')
    if (!assetKey) return
    const rect = canvasRef.current.getBoundingClientRect()
    const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    const world = viewport.screenToWorld(screen)
    const id = `p-${Math.round(performance.now())}-${Math.random().toString(16).slice(2)}`
    setPlacements((prev) => [...prev, { id, assetKey, x: world.x, y: world.y, scale: 1 }])
    setSelectedId(id)
  }

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const startMovePlacement = (event: ReactPointerEvent, id: string) => {
    if (spacePanning) return
    event.stopPropagation()
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    const start = { x: event.clientX, y: event.clientY }
    const initial = placements.find((p) => p.id === id)
    if (!initial) return
    setSelectedId(id)

    const onMove = (e: PointerEvent) => {
      const dx = (e.clientX - start.x) / viewport.zoom
      const dy = (e.clientY - start.y) / viewport.zoom
      setPlacements((prev) => prev.map((p) => (p.id === id ? { ...p, x: initial.x + dx, y: initial.y + dy } : p)))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const startResizePlacement = (event: ReactPointerEvent, id: string) => {
    event.stopPropagation()
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    const start = { x: event.clientX, y: event.clientY }
    const initial = placements.find((p) => p.id === id)
    if (!initial) return
    setSelectedId(id)

    const onMove = (e: PointerEvent) => {
      // Use signed delta so dragging back shrinks; normalize by zoom to stay "handy".
      const dx = (e.clientX - start.x) / viewport.zoom
      const dy = (e.clientY - start.y) / viewport.zoom
      const delta = (dx + dy) / 2
      const nextScale = clamp(initial.scale + delta / 220, 0.15, 6)
      setPlacements((prev) => prev.map((p) => (p.id === id ? { ...p, scale: nextScale } : p)))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const exportPlacements = () => {
    downloadJson('starterVillagePlacements.v1.json', {
      image: imgSize,
      placements,
    })
  }

  const exportObstacles = () => {
    const currentCols = Math.ceil(imgSize.width / TILE)
    const currentRows = Math.ceil(imgSize.height / TILE)
    const blockedCells: Array<{ col: number; row: number }> = []
    for (let row = 0; row < currentRows; row += 1) {
      for (let col = 0; col < currentCols; col += 1) {
        const index = row * currentCols + col
        if (blocked[index]) blockedCells.push({ col, row })
      }
    }
    downloadJson('starterVillageObstacles16.v1.json', {
      tile: TILE,
      cols: currentCols,
      rows: currentRows,
      image: imgSize,
      blocked: blockedCells,
    })
  }

  const toggleObstacleAt = (worldX: number, worldY: number, value: 0 | 1) => {
    const col = Math.floor(worldX / TILE)
    const row = Math.floor(worldY / TILE)
    const currentCols = Math.ceil(imgSize.width / TILE)
    const currentRows = Math.ceil(imgSize.height / TILE)
    if (col < 0 || row < 0 || col >= currentCols || row >= currentRows) return
    const index = row * currentCols + col
    setBlocked((prev) => {
      const next = new Uint8Array(prev)
      next[index] = value
      return next
    })
  }

  const obstaclePaintRef = useRef<{ mode: 'add' | 'erase' } | null>(null)

  const onPointerDownObstacles = (event: ReactPointerEvent) => {
    if (!canvasRef.current) return
    if (spacePanning) return
    event.preventDefault()
    const rect = canvasRef.current.getBoundingClientRect()
    const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    const world = viewport.screenToWorld(screen)
    const mode: 'add' | 'erase' = event.button === 2 || event.shiftKey ? 'erase' : 'add'
    obstaclePaintRef.current = { mode }
    toggleObstacleAt(world.x, world.y, mode === 'add' ? 1 : 0)
  }

  const onPointerMoveObstacles = (event: ReactPointerEvent) => {
    if (!canvasRef.current) return
    if (!obstaclePaintRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    const world = viewport.screenToWorld(screen)
    toggleObstacleAt(world.x, world.y, obstaclePaintRef.current.mode === 'add' ? 1 : 0)
  }

  const onPointerUpObstacles = () => {
    obstaclePaintRef.current = null
  }

  const drawTransformStyle = useMemo(() => {
    return {
      transform: `translate(${viewport.pan.x}px, ${viewport.pan.y}px) scale(${viewport.zoom})`,
      transformOrigin: '0 0',
    } as const
  }, [viewport.pan.x, viewport.pan.y, viewport.zoom])

  return (
    <main className="min-h-[100dvh] bg-[linear-gradient(180deg,#f8ebc8_0%,#d6ddb1_100%)] px-4 py-5 pb-28 text-[#1d2516] sm:px-6 sm:pl-24">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[0.72rem] tracking-[0.34em] text-[#637044] uppercase">Pixel Knight Tools</div>
            <h1 className="mt-1 text-[clamp(2rem,5vw,3.8rem)] leading-none font-black tracking-[0.08em] text-[#28321b] uppercase">
              地图编辑器
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/games/pixel-knight/map-editor')}
              className="border-[#455037]/18 bg-[#f7efd7]/70 text-[#243019] hover:bg-[#fff7df]"
            >
              <ArrowLeft />
              返回地图列表
            </Button>
          </div>
        </div>

        <section className="rounded-[1.8rem] border border-[#435437]/16 bg-[#f6f0db]/75 p-4 shadow-[0_20px_80px_rgba(60,66,31,0.16)] lg:p-5">
          <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
            <aside className="space-y-3 rounded-[1.1rem] border border-[#495738]/14 bg-[#fff6e2]/75 p-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTab('placement')}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-black tracking-[0.18em] uppercase',
                    tab === 'placement'
                      ? 'border-[#2f4328]/40 bg-[#2f4328] text-[#f6f0de]'
                      : 'border-[#455037]/20 bg-[#f8efd8]/70 text-[#243019]',
                  )}
                >
                  <Layers className="size-4" />
                  Placement
                </button>
                <button
                  type="button"
                  onClick={() => setTab('obstacles')}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-black tracking-[0.18em] uppercase',
                    tab === 'obstacles'
                      ? 'border-[#2f4328]/40 bg-[#2f4328] text-[#f6f0de]'
                      : 'border-[#455037]/20 bg-[#f8efd8]/70 text-[#243019]',
                  )}
                >
                  <Grid3X3 className="size-4" />
                  Obstacles
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="text-xs tracking-[0.26em] text-[#6c7753] uppercase">工具</div>
                <div className="text-[0.7rem] text-[#5a6647]">
                  <span className="inline-flex items-center gap-1">
                    <Hand className="size-3" /> Space 拖拽平移
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    viewport.setZoom(1)
                    viewport.setPan({ x: 0, y: 0 })
                  }}
                  variant="outline"
                  className="h-8 border-[#455037]/20 bg-[#f8efd8]/70 px-2 text-xs text-[#243019] hover:bg-[#fff7df]"
                >
                  <RotateCcw className="size-3" />
                  复位视图
                </Button>

                {tab === 'placement' ? (
                  <Button
                    type="button"
                    onClick={exportPlacements}
                    className="h-8 bg-[#30422a] px-2 text-xs text-[#fbf5e5] hover:bg-[#23321d]"
                  >
                    <Download className="size-3" />
                    导出 placements
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={exportObstacles}
                    className="h-8 bg-[#30422a] px-2 text-xs text-[#fbf5e5] hover:bg-[#23321d]"
                  >
                    <Download className="size-3" />
                    导出 obstacles
                  </Button>
                )}
              </div>

              {tab === 'placement' ? (
                <>
                  <div className="mt-2 text-xs tracking-[0.26em] text-[#6c7753] uppercase">原子素材 ({atoms.length})</div>
                  <div className="max-h-[520px] overflow-auto pr-1">
                    <div className="grid grid-cols-3 gap-2">
                      {atoms.map((asset) => (
                        <div key={asset.key} className="rounded-lg border border-[#2f4328]/10 bg-[#fffdf4] p-2">
                          <img
                            src={asset.src}
                            alt={asset.key}
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData('text/pixelKnightAtom', asset.key)}
                            className="h-16 w-full object-contain"
                            style={{ imageRendering: 'pixelated' }}
                          />
                          <div className="mt-1 truncate text-[0.62rem] font-bold text-[#2a371d]">{asset.key}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selected ? (
                    <div className="rounded-[1rem] border border-[#2f4328]/10 bg-[#fffdf4] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-black tracking-[0.18em] text-[#243019] uppercase">选中</div>
                        <button
                          type="button"
                          onClick={() => {
                            setPlacements((prev) => prev.filter((p) => p.id !== selected.id))
                            setSelectedId(null)
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-[#612c1f]/20 bg-[#fff1ea] px-2 py-1 text-xs font-bold text-[#612c1f]"
                        >
                          <Trash2 className="size-3" />
                          删除
                        </button>
                      </div>
                      <div className="mt-1 text-xs text-[#4f5d3e]">asset: {selected.assetKey}</div>
                      <div className="mt-2">
                        <div className="mb-1 text-[0.68rem] font-bold text-[#39452c]">scale: {selected.scale.toFixed(2)}x</div>
                        <input
                          type="range"
                          min={0.15}
                          max={6}
                          step={0.01}
                          value={selected.scale}
                          onChange={(e) => {
                            const next = Number(e.target.value)
                            setPlacements((prev) => prev.map((p) => (p.id === selected.id ? { ...p, scale: next } : p)))
                          }}
                          className="w-full"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-[#5b6646]">提示：拖拽素材到右侧地图；点击可选中；Delete 删除。</div>
                  )}
                </>
              ) : (
                <div className="rounded-[1rem] border border-[#2f4328]/10 bg-[#fffdf4] p-3 text-xs text-[#4f5d3e]">
                  - 左键：添加障碍{'\n'}- Shift 或右键：移除障碍{'\n'}- Space：拖拽平移{'\n'}- 滚轮：缩放{'\n'}\n+                  \n+                  当前网格：{TILE}px/格（{cols}×{rows}）\n+                </div>
              )}
            </aside>

            <div className="rounded-[1.1rem] border border-[#495738]/14 bg-[#fff6e2]/75 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs tracking-[0.26em] text-[#6c7753] uppercase">画布</div>
                <div className="text-xs text-[#5b6646]">
                  zoom {viewport.zoom.toFixed(2)} · pan {Math.round(viewport.pan.x)},{Math.round(viewport.pan.y)}
                </div>
              </div>

              <div
                ref={canvasRef}
                className={cn(
                  'relative h-[640px] w-full overflow-hidden rounded-[1rem] border border-[#2f4328]/14 bg-[#1b2316]',
                  spacePanning ? 'cursor-grab' : tab === 'obstacles' ? 'cursor-crosshair' : 'cursor-default',
                )}
                onWheel={onWheel}
                onPointerDown={onPointerDownPan}
                onPointerMove={onPointerMovePan}
                onPointerUp={onPointerUpPan}
                onPointerCancel={onPointerUpPan}
                onDrop={tab === 'placement' ? onDropAtom : undefined}
                onDragOver={tab === 'placement' ? onDragOver : undefined}
                onContextMenu={(e) => e.preventDefault()}
                onPointerDownCapture={tab === 'obstacles' ? onPointerDownObstacles : undefined}
                onPointerMoveCapture={tab === 'obstacles' ? onPointerMoveObstacles : undefined}
                onPointerUpCapture={tab === 'obstacles' ? onPointerUpObstacles : undefined}
                onPointerLeave={tab === 'obstacles' ? onPointerUpObstacles : undefined}
              >
                <div className="absolute left-0 top-0" style={drawTransformStyle}>
                  <img
                    src={villageBackdrop}
                    alt="starter village"
                    draggable={false}
                    onLoad={(e) => {
                      const img = e.currentTarget
                      setImgSize({ width: img.naturalWidth || 1254, height: img.naturalHeight || 1254 })
                    }}
                    style={{ imageRendering: 'pixelated' }}
                  />

                  {tab === 'placement'
                    ? placements.map((p) => {
                        const asset = atoms.find((a) => a.key === p.assetKey)
                        if (!asset) return null
                        const active = p.id === selectedId
                        return (
                          <div
                            key={p.id}
                            className={cn(
                              'absolute select-none',
                              active ? 'outline outline-2 outline-[#ffd36d]' : 'outline outline-1 outline-transparent',
                            )}
                            style={{
                              left: p.x,
                              top: p.y,
                              transform: `scale(${p.scale})`,
                              transformOrigin: '0 0',
                            }}
                            onPointerDown={(e) => startMovePlacement(e, p.id)}
                          >
                            <img
                              src={asset.src}
                              alt={p.assetKey}
                              draggable={false}
                              style={{ imageRendering: 'pixelated' }}
                              className="pointer-events-none"
                            />
                            {active ? (
                              <div
                                className="absolute -bottom-2 -right-2 size-4 rounded-sm border border-[#2f4328]/20 bg-[#f7d88a] shadow"
                                onPointerDown={(e) => startResizePlacement(e, p.id)}
                                title="拖拽等比缩放"
                              />
                            ) : null}
                          </div>
                        )
                      })
                    : null}

                  {tab === 'obstacles' ? (
                    <>
                      {/* grid lines */}
                      <svg
                        width={imgSize.width}
                        height={imgSize.height}
                        className="absolute left-0 top-0 pointer-events-none"
                        style={{ opacity: 0.22 }}
                      >
                        {Array.from({ length: cols + 1 }, (_, c) => (
                          <line
                            key={`c-${c}`}
                            x1={c * TILE}
                            y1={0}
                            x2={c * TILE}
                            y2={imgSize.height}
                            stroke="rgba(255,255,255,0.25)"
                            strokeWidth={1}
                          />
                        ))}
                        {Array.from({ length: rows + 1 }, (_, r) => (
                          <line
                            key={`r-${r}`}
                            x1={0}
                            y1={r * TILE}
                            x2={imgSize.width}
                            y2={r * TILE}
                            stroke="rgba(255,255,255,0.25)"
                            strokeWidth={1}
                          />
                        ))}
                      </svg>
                      {/* blocked cells */}
                      <div className="absolute left-0 top-0 pointer-events-none">
                        {(() => {
                          const items: React.ReactNode[] = []
                          for (let r = 0; r < rows; r += 1) {
                            for (let c = 0; c < cols; c += 1) {
                              const index = r * cols + c
                              if (!blocked[index]) continue
                              items.push(
                                <div
                                  key={`${c}-${r}`}
                                  className="absolute bg-[#111818]/55"
                                  style={{ left: c * TILE, top: r * TILE, width: TILE, height: TILE }}
                                />,
                              )
                            }
                          }
                          return items
                        })()}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

