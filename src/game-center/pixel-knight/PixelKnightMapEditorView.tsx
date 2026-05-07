import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { ArrowLeft, Crosshair, Download, Grid3X3, Hand, Layers, MapPin, Plus, RotateCcw, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  atomAssetsForMapSlug,
  displayNameForMapFolder,
  getBackdropUrlForMapSlug,
  getMapMetaFileForMapSlug,
  getObstaclesFileForMapSlug,
  getPlacementsFileForMapSlug,
  isKnownPixelKnightMapSlug,
  listPixelKnightMapFolders,
  type EditorHotspotPayload,
  type EditorPlacementPayload,
} from '@/game-center/pixel-knight/maps/mapEditorAssets'

const TILE = 16

type EditorTab = 'placement' | 'obstacles' | 'interactions'
type AtomAsset = { key: string; src: string }
type Placement = EditorPlacementPayload
type Hotspot = EditorHotspotPayload

const HOTSPOT_KINDS = ['portal', 'shop', 'stash', 'blacksmith', 'notice-board', 'gemsmith'] as const

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function normalizeScale(value: number) {
  return Math.round(clamp(value, 0.15, 6) * 100) / 100
}

function worldFromCell(cell: { x: number; y: number }) {
  return { x: cell.x * TILE + TILE / 2, y: cell.y * TILE + TILE / 2 }
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
  const { mapSlug = '' } = useParams<{ mapSlug: string }>()
  const [tab, setTab] = useState<EditorTab>('placement')

  const backdropUrl = useMemo(() => (mapSlug ? getBackdropUrlForMapSlug(mapSlug) : undefined), [mapSlug])

  const mapDisplayName = useMemo(() => {
    const folder = listPixelKnightMapFolders().find((m) => m.slug === mapSlug)
    return folder ? displayNameForMapFolder(folder) : mapSlug
  }, [mapSlug])

  const atoms = useMemo<AtomAsset[]>(() => (mapSlug ? atomAssetsForMapSlug(mapSlug) : []), [mapSlug])

  const [imgSize, setImgSize] = useState({ width: 1254, height: 1254 })
  const viewport = useViewport()
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [spacePanning, setSpacePanning] = useState(false)
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)

  const cols = Math.ceil(imgSize.width / TILE)
  const rows = Math.ceil(imgSize.height / TILE)

  const [placements, setPlacements] = useState<Placement[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<Uint8Array>(() => new Uint8Array(cols * rows))
  const [mapMeta, setMapMeta] = useState({
    id: mapSlug || 'map',
    kind: 'village',
    name: mapDisplayName,
    start: { x: 0, y: 0 },
    portal: { x: 0, y: 0 },
  })
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null)

  const selected = useMemo(() => placements.find((p) => p.id === selectedId) ?? null, [placements, selectedId])
  const selectedHotspot = useMemo(
    () => hotspots.find((hotspot) => hotspot.id === selectedHotspotId) ?? null,
    [hotspots, selectedHotspotId],
  )

  const fitViewportToImage = (size = imgSize) => {
    if (!canvasRef.current) {
      viewport.setZoom(1)
      viewport.setPan({ x: 0, y: 0 })
      return
    }

    const rect = canvasRef.current.getBoundingClientRect()
    const nextZoom = clamp(Math.min(rect.width / size.width, rect.height / size.height), 0.15, 6)
    viewport.setZoom(nextZoom)
    viewport.setPan({
      x: (rect.width - size.width * nextZoom) / 2,
      y: (rect.height - size.height * nextZoom) / 2,
    })
  }

  useEffect(() => {
    if (!mapSlug || !isKnownPixelKnightMapSlug(mapSlug)) {
      navigate('/games/pixel-knight/map-editor', { replace: true })
    }
  }, [mapSlug, navigate])

  useEffect(() => {
    window.requestAnimationFrame(() => fitViewportToImage())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when switching map folder
  }, [mapSlug])

  useEffect(() => {
    const pack = mapSlug ? getPlacementsFileForMapSlug(mapSlug) : null
    const list = pack?.placements
    if (Array.isArray(list) && list.every((p) => p && typeof p.id === 'string' && typeof p.assetKey === 'string')) {
      setPlacements(list as Placement[])
    } else {
      setPlacements([])
    }
    setSelectedId(null)
  }, [mapSlug])

  useEffect(() => {
    const meta = mapSlug ? getMapMetaFileForMapSlug(mapSlug) : null
    setMapMeta({
      id: typeof meta?.id === 'string' ? meta.id : mapSlug || 'map',
      kind: typeof meta?.kind === 'string' ? meta.kind : 'village',
      name: typeof meta?.name === 'string' ? meta.name : mapDisplayName,
      start: meta?.start ?? { x: 0, y: 0 },
      portal: meta?.portal ?? { x: 0, y: 0 },
    })
    setHotspots(
      Array.isArray(meta?.hotspots)
        ? meta.hotspots.filter((hotspot) => hotspot && typeof hotspot.id === 'string' && typeof hotspot.label === 'string')
        : [],
    )
    setSelectedHotspotId(null)
  }, [mapSlug, mapDisplayName])

  useEffect(() => {
    const c = Math.ceil(imgSize.width / TILE)
    const r = Math.ceil(imgSize.height / TILE)
    const next = new Uint8Array(c * r)
    const obs = mapSlug ? getObstaclesFileForMapSlug(mapSlug) : null
    if (obs?.blocked?.length) {
      for (const cell of obs.blocked) {
        if (cell.col >= 0 && cell.col < c && cell.row >= 0 && cell.row < r) {
          next[cell.row * c + cell.col] = 1
        }
      }
    }
    setBlocked(next)
  }, [mapSlug, imgSize.width, imgSize.height])

  useEffect(() => {
    if (tab === 'interactions' && !selectedHotspotId && hotspots.length > 0) {
      setSelectedHotspotId(hotspots[0].id)
    }
  }, [hotspots, selectedHotspotId, tab])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpacePanning(true)
      if (event.code === 'Backspace' || event.code === 'Delete') {
        const target = event.target
        if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
        event.preventDefault()
        if (tab === 'interactions' && selectedHotspotId) {
          removeHotspot(selectedHotspotId)
          return
        }
        if (!selectedId) return
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
  }, [selectedId, selectedHotspotId, tab])

  const onWheel = (event: React.WheelEvent) => {
    if (!canvasRef.current) return
    event.preventDefault()
    const rect = canvasRef.current.getBoundingClientRect()
    const mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    const before = viewport.screenToWorld(mouse)
    const nextZoom = clamp(viewport.zoom * (event.deltaY > 0 ? 0.92 : 1.08), 0.35, 6)
    viewport.setZoom(nextZoom)
    viewport.setPan({ x: mouse.x - before.x * nextZoom, y: mouse.y - before.y * nextZoom })
  }

  const onPointerDownPan = (event: ReactPointerEvent) => {
    if (tab === 'placement') {
      const target = event.target
      if (target instanceof HTMLElement && !target.closest('[data-placement-id]')) {
        setSelectedId(null)
      }
    }
    if (tab === 'interactions') {
      const target = event.target
      if (target instanceof HTMLElement && !target.closest('[data-hotspot-id]')) {
        setSelectedHotspotId(null)
      }
    }
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
    const handle = event.currentTarget as HTMLElement
    handle.setPointerCapture(event.pointerId)
    const placementElement = handle.parentElement
    const canvasElement = canvasRef.current
    const initial = placements.find((p) => p.id === id)
    if (!initial || !placementElement || !canvasElement) return
    const placementRect = placementElement.getBoundingClientRect()
    const baseWidth = placementRect.width / viewport.zoom / initial.scale
    const baseHeight = placementRect.height / viewport.zoom / initial.scale
    if (baseWidth <= 0 || baseHeight <= 0) return

    const pointerToWorld = (clientX: number, clientY: number) => {
      const canvasRect = canvasElement.getBoundingClientRect()
      return viewport.screenToWorld({ x: clientX - canvasRect.left, y: clientY - canvasRect.top })
    }
    const startPointer = pointerToWorld(event.clientX, event.clientY)
    const startHandle = { x: initial.x + baseWidth * initial.scale, y: initial.y + baseHeight * initial.scale }
    const pointerOffset = { x: startPointer.x - startHandle.x, y: startPointer.y - startHandle.y }
    const baseVectorLengthSq = baseWidth * baseWidth + baseHeight * baseHeight
    setSelectedId(id)

    const onMove = (e: PointerEvent) => {
      const pointer = pointerToWorld(e.clientX, e.clientY)
      const handleTarget = { x: pointer.x - pointerOffset.x, y: pointer.y - pointerOffset.y }
      const dx = handleTarget.x - initial.x
      const dy = handleTarget.y - initial.y
      const projectedScale = (dx * baseWidth + dy * baseHeight) / baseVectorLengthSq
      const nextScale = normalizeScale(projectedScale)
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
    downloadJson('placements.v1.json', {
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
    downloadJson('obstacles16.v1.json', {
      tile: TILE,
      cols: currentCols,
      rows: currentRows,
      image: imgSize,
      blocked: blockedCells,
    })
  }

  const exportMapMeta = () => {
    downloadJson('map.meta.json', {
      ...mapMeta,
      hotspots,
    })
  }

  const addHotspot = () => {
    const nextIndex = hotspots.length + 1
    const hotspot: Hotspot = {
      id: `hotspot-${nextIndex}`,
      kind: 'shop',
      label: `交互点 ${nextIndex}`,
      prompt: '按 F：互动',
      cell: { x: Math.floor(cols / 2), y: Math.floor(rows / 2) },
      radius: 22,
    }
    setHotspots((prev) => [...prev, hotspot])
    setSelectedHotspotId(hotspot.id)
  }

  const updateHotspot = (id: string, patch: Partial<Hotspot>) => {
    setHotspots((prev) => prev.map((hotspot) => (hotspot.id === id ? { ...hotspot, ...patch } : hotspot)))
  }

  const updateHotspotCell = (id: string, patch: Partial<Hotspot['cell']>) => {
    setHotspots((prev) =>
      prev.map((hotspot) =>
        hotspot.id === id
          ? {
              ...hotspot,
              cell: {
                x: clamp(Math.round(patch.x ?? hotspot.cell.x), 0, cols - 1),
                y: clamp(Math.round(patch.y ?? hotspot.cell.y), 0, rows - 1),
              },
            }
          : hotspot,
      ),
    )
  }

  const removeHotspot = (id: string) => {
    setHotspots((prev) => prev.filter((hotspot) => hotspot.id !== id))
    setSelectedHotspotId((prev) => (prev === id ? null : prev))
  }

  const startMoveHotspot = (event: ReactPointerEvent, id: string) => {
    if (spacePanning || !canvasRef.current) return
    event.stopPropagation()
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    setSelectedHotspotId(id)

    const moveTo = (clientX: number, clientY: number) => {
      if (!canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      const world = viewport.screenToWorld({ x: clientX - rect.left, y: clientY - rect.top })
      updateHotspotCell(id, { x: Math.floor(world.x / TILE), y: Math.floor(world.y / TILE) })
    }

    const onMove = (e: PointerEvent) => moveTo(e.clientX, e.clientY)
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
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

  if (!mapSlug || !backdropUrl) {
    return (
      <main className="min-h-[100dvh] bg-[linear-gradient(180deg,#f8ebc8_0%,#d6ddb1_100%)] px-4 py-5 text-[#1d2516] sm:px-6 sm:pl-24">
        <p className="text-sm text-[#5b6646]">加载地图…</p>
      </main>
    )
  }

  return (
    <main className="min-h-[100dvh] bg-[linear-gradient(180deg,#f8ebc8_0%,#d6ddb1_100%)] px-4 py-5 pb-28 text-[#1d2516] sm:px-6 sm:pl-24">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[0.72rem] tracking-[0.34em] text-[#637044] uppercase">Pixel Knight Tools</div>
            <h1 className="mt-1 text-[clamp(2rem,5vw,3.8rem)] leading-none font-black tracking-[0.08em] text-[#28321b] uppercase">
              地图编辑器
            </h1>
            {mapSlug ? (
              <div className="mt-2 text-xs font-bold tracking-[0.12em] text-[#5a6647]">
                {mapDisplayName}
                <span className="ml-2 font-mono text-[0.65rem] font-normal text-[#7a8470]">maps/{mapSlug}</span>
              </div>
            ) : null}
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
              <div className="grid grid-cols-3 overflow-hidden rounded-md border border-[#455037]/20 bg-[#f8efd8]/70 p-0.5">
                <button
                  type="button"
                  onClick={() => setTab('placement')}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-black tracking-[0.12em]',
                    tab === 'placement' ? 'bg-[#2f4328] text-[#f6f0de]' : 'text-[#243019] hover:bg-[#fff7df]',
                  )}
                >
                  <Layers className="size-3.5" />
                  素材
                </button>
                <button
                  type="button"
                  onClick={() => setTab('obstacles')}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-black tracking-[0.12em]',
                    tab === 'obstacles' ? 'bg-[#2f4328] text-[#f6f0de]' : 'text-[#243019] hover:bg-[#fff7df]',
                  )}
                >
                  <Grid3X3 className="size-3.5" />
                  障碍
                </button>
                <button
                  type="button"
                  onClick={() => setTab('interactions')}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-black tracking-[0.12em]',
                    tab === 'interactions' ? 'bg-[#2f4328] text-[#f6f0de]' : 'text-[#243019] hover:bg-[#fff7df]',
                  )}
                >
                  <MapPin className="size-3.5" />
                  交互
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
                  onClick={() => fitViewportToImage()}
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
                ) : tab === 'obstacles' ? (
                  <Button
                    type="button"
                    onClick={exportObstacles}
                    className="h-8 bg-[#30422a] px-2 text-xs text-[#fbf5e5] hover:bg-[#23321d]"
                  >
                    <Download className="size-3" />
                    导出 obstacles
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={exportMapMeta}
                    className="h-8 bg-[#30422a] px-2 text-xs text-[#fbf5e5] hover:bg-[#23321d]"
                  >
                    <Download className="size-3" />
                    导出 map.meta
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

                  <div className="rounded-[1rem] border border-[#2f4328]/10 bg-[#fffdf4] p-3">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-black tracking-[0.18em] text-[#243019] uppercase">选中</div>
                      {selected ? <div className="truncate text-xs font-bold text-[#4f5d3e]">{selected.assetKey}</div> : null}
                    </div>
                    {selected ? (
                      <label className="mt-2 flex items-center gap-2">
                        <span className="w-12 text-xs font-bold text-[#39452c]">scale</span>
                        <input
                          type="number"
                          min={0.15}
                          max={6}
                          step={0.01}
                          value={selected.scale.toFixed(2)}
                          onChange={(e) => {
                            const next = normalizeScale(Number(e.target.value) || 0.15)
                            setPlacements((prev) => prev.map((p) => (p.id === selected.id ? { ...p, scale: next } : p)))
                          }}
                          className="w-full rounded-md border border-[#2f4328]/15 bg-white px-2 py-1.5 text-sm font-bold text-[#243019] outline-none focus:border-[#bd842b]"
                          aria-label="scale"
                        />
                      </label>
                    ) : null}
                  </div>

                </>
              ) : tab === 'interactions' ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs tracking-[0.26em] text-[#6c7753] uppercase">交互对象 ({hotspots.length})</div>
                    <Button
                      type="button"
                      onClick={addHotspot}
                      className="h-7 bg-[#30422a] px-2 text-xs text-[#fbf5e5] hover:bg-[#23321d]"
                    >
                      <Plus className="size-3" />
                      新增
                    </Button>
                  </div>

                  <div className="max-h-48 space-y-1 overflow-auto pr-1">
                    {hotspots.map((hotspot) => (
                      <button
                        key={hotspot.id}
                        type="button"
                        onClick={() => setSelectedHotspotId(hotspot.id)}
                        className={cn(
                          'flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-xs',
                          hotspot.id === selectedHotspotId
                            ? 'border-[#2f4328]/30 bg-[#30422a] text-[#fbf5e5]'
                            : 'border-[#2f4328]/10 bg-[#fffdf4] text-[#243019]',
                        )}
                      >
                        <span className="truncate font-bold">{hotspot.label || hotspot.id}</span>
                        <span className="text-[0.65rem] opacity-75">
                          {hotspot.cell.x},{hotspot.cell.y}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-[1rem] border border-[#2f4328]/10 bg-[#fffdf4] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-black tracking-[0.18em] text-[#243019] uppercase">Meta</div>
                      {selectedHotspot ? (
                        <button
                          type="button"
                          onClick={() => removeHotspot(selectedHotspot.id)}
                          className="grid size-5 place-items-center rounded-full bg-[#d93636] text-white opacity-70 transition-opacity hover:opacity-100"
                          aria-label="删除交互对象"
                          title="删除"
                        >
                          <X className="size-3 stroke-[3]" />
                        </button>
                      ) : null}
                    </div>

                    <label className="mt-2 block text-xs font-bold text-[#39452c]">
                      map name
                      <input
                        type="text"
                        value={mapMeta.name}
                        onChange={(e) => setMapMeta((prev) => ({ ...prev, name: e.target.value }))}
                        className="mt-1 w-full rounded-md border border-[#2f4328]/15 bg-white px-2 py-1.5 text-sm font-bold text-[#243019] outline-none focus:border-[#bd842b]"
                      />
                    </label>

                    {selectedHotspot ? (
                      <div className="mt-3 space-y-2">
                        <label className="block text-xs font-bold text-[#39452c]">
                          id
                          <input
                            type="text"
                            value={selectedHotspot.id}
                            onChange={(e) => {
                              const nextId = e.target.value.trim() || selectedHotspot.id
                              setHotspots((prev) =>
                                prev.map((hotspot) => (hotspot.id === selectedHotspot.id ? { ...hotspot, id: nextId } : hotspot)),
                              )
                              setSelectedHotspotId(nextId)
                            }}
                            className="mt-1 w-full rounded-md border border-[#2f4328]/15 bg-white px-2 py-1.5 text-sm text-[#243019] outline-none focus:border-[#bd842b]"
                          />
                        </label>

                        <label className="block text-xs font-bold text-[#39452c]">
                          kind
                          <select
                            value={selectedHotspot.kind}
                            onChange={(e) => updateHotspot(selectedHotspot.id, { kind: e.target.value })}
                            className="mt-1 w-full rounded-md border border-[#2f4328]/15 bg-white px-2 py-1.5 text-sm text-[#243019] outline-none focus:border-[#bd842b]"
                          >
                            {HOTSPOT_KINDS.map((kind) => (
                              <option key={kind} value={kind}>
                                {kind}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block text-xs font-bold text-[#39452c]">
                          label
                          <input
                            type="text"
                            value={selectedHotspot.label}
                            onChange={(e) => updateHotspot(selectedHotspot.id, { label: e.target.value })}
                            className="mt-1 w-full rounded-md border border-[#2f4328]/15 bg-white px-2 py-1.5 text-sm text-[#243019] outline-none focus:border-[#bd842b]"
                          />
                        </label>

                        <label className="block text-xs font-bold text-[#39452c]">
                          prompt
                          <input
                            type="text"
                            value={selectedHotspot.prompt}
                            onChange={(e) => updateHotspot(selectedHotspot.id, { prompt: e.target.value })}
                            className="mt-1 w-full rounded-md border border-[#2f4328]/15 bg-white px-2 py-1.5 text-sm text-[#243019] outline-none focus:border-[#bd842b]"
                          />
                        </label>

                        <div className="grid grid-cols-3 gap-2">
                          <label className="block text-xs font-bold text-[#39452c]">
                            cell x
                            <input
                              type="number"
                              value={selectedHotspot.cell.x}
                              onChange={(e) => updateHotspotCell(selectedHotspot.id, { x: Number(e.target.value) || 0 })}
                              className="mt-1 w-full rounded-md border border-[#2f4328]/15 bg-white px-2 py-1.5 text-sm text-[#243019] outline-none focus:border-[#bd842b]"
                            />
                          </label>
                          <label className="block text-xs font-bold text-[#39452c]">
                            cell y
                            <input
                              type="number"
                              value={selectedHotspot.cell.y}
                              onChange={(e) => updateHotspotCell(selectedHotspot.id, { y: Number(e.target.value) || 0 })}
                              className="mt-1 w-full rounded-md border border-[#2f4328]/15 bg-white px-2 py-1.5 text-sm text-[#243019] outline-none focus:border-[#bd842b]"
                            />
                          </label>
                          <label className="block text-xs font-bold text-[#39452c]">
                            radius
                            <input
                              type="number"
                              min={1}
                              value={selectedHotspot.radius}
                              onChange={(e) =>
                                updateHotspot(selectedHotspot.id, { radius: Math.max(1, Math.round(Number(e.target.value) || 1)) })
                              }
                              className="mt-1 w-full rounded-md border border-[#2f4328]/15 bg-white px-2 py-1.5 text-sm text-[#243019] outline-none focus:border-[#bd842b]"
                            />
                          </label>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="rounded-[1rem] border border-[#2f4328]/10 bg-[#fffdf4] p-3 text-xs text-[#4f5d3e] whitespace-pre-line">
                  {`- 左键：添加障碍
- Shift 或右键：移除障碍
- Space：拖拽平移
- 滚轮：缩放`}
                  <div className="mt-2 text-[#5b6646]">
                    当前网格：{TILE}px/格（{cols}×{rows}）
                  </div>
                </div>
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
                    src={backdropUrl}
                    alt={mapDisplayName}
                    draggable={false}
                    onLoad={(e) => {
                      const img = e.currentTarget
                      const nextSize = { width: img.naturalWidth || 1254, height: img.naturalHeight || 1254 }
                      setImgSize(nextSize)
                      window.requestAnimationFrame(() => fitViewportToImage(nextSize))
                    }}
                    style={{
                      imageRendering: 'pixelated',
                      width: imgSize.width,
                      height: imgSize.height,
                      maxWidth: 'none',
                      opacity: tab === 'obstacles' ? 0.7 : 1,
                    }}
                  />

                  {tab === 'placement'
                    ? placements.map((p) => {
                        const asset = atoms.find((a) => a.key === p.assetKey)
                        if (!asset) return null
                        const active = p.id === selectedId
                        return (
                          <div
                            key={p.id}
                            data-placement-id={p.id}
                            className={cn(
                              'absolute select-none',
                              active
                                ? 'cursor-move outline outline-2 outline-offset-2 outline-[#ffd36d]'
                                : 'outline outline-1 outline-transparent',
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
                              <>
                                <button
                                  type="button"
                                  className="absolute -right-2.5 -top-2.5 grid size-4 place-items-center rounded-full border border-white/70 bg-[#d93636] text-white opacity-60 shadow-sm transition-opacity hover:opacity-100"
                                  onPointerDown={(e) => {
                                    e.stopPropagation()
                                    e.preventDefault()
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setPlacements((prev) => prev.filter((item) => item.id !== p.id))
                                    setSelectedId(null)
                                  }}
                                  title="删除"
                                  aria-label="删除"
                                >
                                  <X className="size-2.5 stroke-[3]" />
                                </button>
                                <div
                                  className="absolute -bottom-2 -right-2 size-3 cursor-nwse-resize rounded-sm border border-[#2f4328]/20 bg-[#f7d88a] shadow-sm"
                                  onPointerDown={(e) => startResizePlacement(e, p.id)}
                                  title="拖拽等比缩放"
                                />
                              </>
                            ) : null}
                          </div>
                        )
                      })
                    : null}

                  {tab === 'interactions'
                    ? hotspots.map((hotspot) => {
                        const center = worldFromCell(hotspot.cell)
                        const active = hotspot.id === selectedHotspotId
                        return (
                          <div
                            key={hotspot.id}
                            data-hotspot-id={hotspot.id}
                            className="absolute cursor-move select-none"
                            style={{
                              left: center.x,
                              top: center.y,
                              width: hotspot.radius * 2,
                              height: hotspot.radius * 2,
                              transform: 'translate(-50%, -50%)',
                            }}
                            onPointerDown={(e) => startMoveHotspot(e, hotspot.id)}
                            title={hotspot.label}
                          >
                            <div
                              className={cn(
                                'absolute inset-0 rounded-full border-2',
                                active
                                  ? 'border-[#ffd36d] bg-[#ffd36d]/24 shadow-[0_0_0_2px_rgba(36,48,25,0.28)]'
                                  : 'border-[#7ae4ff]/80 bg-[#7ae4ff]/14',
                              )}
                            />
                            <div
                              className={cn(
                                'absolute left-1/2 top-1/2 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-[0.6rem] font-black',
                                active
                                  ? 'border-[#243019] bg-[#ffd36d] text-[#243019]'
                                  : 'border-white/70 bg-[#214153] text-white',
                              )}
                            >
                              <Crosshair className="size-3" />
                            </div>
                            <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-[#172013]/85 px-1.5 py-0.5 text-[0.62rem] font-bold text-white">
                              {hotspot.label}
                            </div>
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
                      >
                        {Array.from({ length: cols + 1 }, (_, c) => (
                          <line
                            key={`c-${c}`}
                            x1={c * TILE}
                            y1={0}
                            x2={c * TILE}
                            y2={imgSize.height}
                            stroke={c % 4 === 0 ? 'rgba(255,211,109,0.95)' : 'rgba(255,255,255,0.58)'}
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
                            stroke={r % 4 === 0 ? 'rgba(255,211,109,0.95)' : 'rgba(255,255,255,0.58)'}
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
                                  className="absolute border border-[#461f14]/35 bg-[#d93636]/70"
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
