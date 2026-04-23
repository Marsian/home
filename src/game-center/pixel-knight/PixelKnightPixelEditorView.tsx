import { useEffect, useMemo, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { ArrowLeft, Download, Eraser, Palette, Pipette, RotateCcw, RotateCw } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'

type PixelPoint = { x: number; y: number; color: string }
type PixelAsset = {
  size: [number, number]
  points: PixelPoint[]
  frontPoints?: PixelPoint[]
  backPoints?: PixelPoint[]
}
type MatrixPart = { size: [number, number]; points: PixelPoint[] }
type MatrixAsset = { parts: Record<string, MatrixPart> }
type EditableLayer = 'points' | 'frontPoints' | 'backPoints'
type LayerTab = 'frontPoints' | 'backPoints'
type ToolMode = 'paint' | 'erase' | 'pick'
type HsvColor = { h: number; s: number; v: number }
type PixelChange = {
  partKey?: string
  layer: EditableLayer
  x: number
  y: number
  prevColor: string | null
  nextColor: string | null
}

type JsonModule = { default: unknown }

const assetJsonModules = import.meta.glob('/src/game-center/pixel-knight/assets/**/*.json', {
  eager: true,
}) as Record<string, JsonModule>

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function isPixelAsset(value: unknown): value is PixelAsset {
  if (!value || typeof value !== 'object') return false
  const candidate = value as { size?: unknown; points?: unknown }
  return Array.isArray(candidate.size) && Array.isArray(candidate.points)
}

function isMatrixAsset(value: unknown): value is MatrixAsset {
  if (!value || typeof value !== 'object') return false
  const candidate = value as { parts?: unknown }
  return Boolean(candidate.parts && typeof candidate.parts === 'object')
}

function uniqueColors(points: PixelPoint[]) {
  return Array.from(new Set(points.map((point) => point.color.toLowerCase())))
}

function buildPointMap(points: PixelPoint[]) {
  const map = new Map<string, string>()
  for (const point of points) map.set(`${point.x},${point.y}`, point.color)
  return map
}

function toSortedPoints(map: Map<string, string>): PixelPoint[] {
  const points: PixelPoint[] = []
  for (const [key, color] of map) {
    const [x, y] = key.split(',').map(Number)
    points.push({ x, y, color })
  }
  return points.sort((a, b) => a.y - b.y || a.x - b.x)
}

const EDITOR_GRID_SIZE = 32

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (value: number) => value.toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function hexToRgb(hex: string): [number, number, number] | null {
  const normalized = hex.trim().toLowerCase()
  const match = normalized.match(/^#?([0-9a-f]{6})$/i)
  if (!match) return null
  const value = match[1]
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)]
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const hh = ((h % 360) + 360) % 360
  const ss = clamp(s, 0, 100) / 100
  const vv = clamp(v, 0, 100) / 100

  const c = vv * ss
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1))
  const m = vv - c

  let rr = 0
  let gg = 0
  let bb = 0
  if (hh < 60) [rr, gg, bb] = [c, x, 0]
  else if (hh < 120) [rr, gg, bb] = [x, c, 0]
  else if (hh < 180) [rr, gg, bb] = [0, c, x]
  else if (hh < 240) [rr, gg, bb] = [0, x, c]
  else if (hh < 300) [rr, gg, bb] = [x, 0, c]
  else [rr, gg, bb] = [c, 0, x]

  return [
    Math.round((rr + m) * 255),
    Math.round((gg + m) * 255),
    Math.round((bb + m) * 255),
  ]
}

function rgbToHsv(r: number, g: number, b: number): HsvColor {
  const rr = r / 255
  const gg = g / 255
  const bb = b / 255
  const max = Math.max(rr, gg, bb)
  const min = Math.min(rr, gg, bb)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === rr) h = 60 * (((gg - bb) / delta) % 6)
    else if (max === gg) h = 60 * ((bb - rr) / delta + 2)
    else h = 60 * ((rr - gg) / delta + 4)
  }
  if (h < 0) h += 360

  const s = max === 0 ? 0 : (delta / max) * 100
  const v = max * 100
  return { h, s, v }
}

function hexToHsv(hex: string): HsvColor {
  const rgb = hexToRgb(hex)
  if (!rgb) return { h: 0, s: 0, v: 0 }
  return rgbToHsv(rgb[0], rgb[1], rgb[2])
}

function applyPixelChangeToDoc(doc: unknown, change: PixelChange, direction: 'prev' | 'next') {
  if (!doc) return doc
  const draft = deepClone(doc)
  const target = isPixelAsset(draft)
    ? draft
    : isMatrixAsset(draft) && change.partKey
      ? draft.parts[change.partKey]
      : null
  if (!target) return doc

  const currentLayerPoints =
    change.layer === 'points'
      ? target.points
      : change.layer === 'frontPoints'
        ? (target as PixelAsset).frontPoints ?? []
        : (target as PixelAsset).backPoints ?? []
  const map = buildPointMap(currentLayerPoints)
  const key = `${change.x},${change.y}`
  const nextColor = direction === 'next' ? change.nextColor : change.prevColor
  if (nextColor === null) map.delete(key)
  else map.set(key, nextColor)

  const nextLayerPoints = toSortedPoints(map)
  if (change.layer === 'points') {
    target.points = nextLayerPoints
  } else if (change.layer === 'frontPoints') {
    ;(target as PixelAsset).frontPoints = nextLayerPoints
  } else {
    ;(target as PixelAsset).backPoints = nextLayerPoints
  }
  return draft
}

export default function PixelKnightPixelEditorView() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const filePaths = useMemo(() => Object.keys(assetJsonModules).sort(), [])
  const selectedPath = useMemo(() => {
    const fromQuery = searchParams.get('file')
    if (fromQuery && filePaths.includes(fromQuery)) return fromQuery
    return filePaths[0] ?? ''
  }, [searchParams, filePaths])
  const [doc, setDoc] = useState<unknown>(() => {
    const initial = filePaths[0]
    if (!initial) return null
    return deepClone(assetJsonModules[initial].default)
  })
  const [historyChanges, setHistoryChanges] = useState<PixelChange[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [selectedPart, setSelectedPart] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState('#2e1c2c')
  const [toolMode, setToolMode] = useState<ToolMode>('paint')
  const [selectedLayerTab, setSelectedLayerTab] = useState<LayerTab>('frontPoints')
  const [customColors, setCustomColors] = useState<string[]>([])
  const [customPickerOpen, setCustomPickerOpen] = useState(false)
  const [customColorDraft, setCustomColorDraft] = useState('#2e1c2c')
  const [customHsvDraft, setCustomHsvDraft] = useState<HsvColor>(() => hexToHsv('#2e1c2c'))

  useEffect(() => {
    const fromQuery = searchParams.get('file')
    if (selectedPath && fromQuery !== selectedPath) {
      setSearchParams({ file: selectedPath }, { replace: true })
    }
  }, [searchParams, selectedPath, setSearchParams])

  useEffect(() => {
    if (!selectedPath) {
      setDoc(null)
      return
    }
    setDoc(deepClone(assetJsonModules[selectedPath].default))
    setHistoryChanges([])
    setHistoryIndex(-1)
    setSelectedPart('')
  }, [selectedPath])

  const partKeys = useMemo(() => {
    if (!isMatrixAsset(doc)) return []
    return Object.keys(doc.parts).sort()
  }, [doc])

  const activePart = useMemo(() => {
    if (!partKeys.length) return ''
    return partKeys.includes(selectedPart) ? selectedPart : partKeys[0]
  }, [partKeys, selectedPart])

  const activeAsset = useMemo<PixelAsset | null>(() => {
    if (isPixelAsset(doc)) return doc
    if (isMatrixAsset(doc) && activePart) return doc.parts[activePart]
    return null
  }, [doc, activePart])

  const hasLayeredPoints = useMemo(() => {
    return Boolean(activeAsset?.frontPoints && activeAsset?.backPoints)
  }, [activeAsset])

  const activeLayerTab = useMemo<LayerTab>(() => {
    if (!hasLayeredPoints) return 'frontPoints'
    return selectedLayerTab
  }, [hasLayeredPoints, selectedLayerTab])

  const pointsMap = useMemo(() => {
    if (!activeAsset) return new Map<string, string>()
    return buildPointMap(activeAsset.points)
  }, [activeAsset])

  const frontMap = useMemo(() => {
    if (!activeAsset?.frontPoints) return new Map<string, string>()
    return buildPointMap(activeAsset.frontPoints)
  }, [activeAsset])

  const backMap = useMemo(() => {
    if (!activeAsset?.backPoints) return new Map<string, string>()
    return buildPointMap(activeAsset.backPoints)
  }, [activeAsset])

  const palette = useMemo(() => {
    const fromAsset = activeAsset
      ? uniqueColors([
          ...activeAsset.points,
          ...(activeAsset.frontPoints ?? []),
          ...(activeAsset.backPoints ?? []),
        ])
      : []
    const common = ['#2e1c2c', '#ffffff', '#bfddd1', '#95adb4', '#86718c', '#000000']
    const base = Array.from(new Set([...fromAsset, ...common]))
    const extras = customColors.filter((color) => !base.includes(color))
    return [...base, ...extras]
  }, [activeAsset, customColors])

  const updateSelectedColor = (color: string) => {
    const normalized = color.trim().toLowerCase()
    const rgb = hexToRgb(normalized)
    if (!rgb) return
    setSelectedColor(rgbToHex(rgb[0], rgb[1], rgb[2]))
    setToolMode('paint')
  }

  const openCustomPicker = () => {
    const initial = hexToRgb(selectedColor) ? selectedColor : '#2e1c2c'
    const rgb = hexToRgb(initial)
    if (!rgb) return
    setCustomColorDraft(rgbToHex(rgb[0], rgb[1], rgb[2]))
    setCustomHsvDraft(rgbToHsv(rgb[0], rgb[1], rgb[2]))
    setCustomPickerOpen(true)
  }

  const confirmCustomColor = () => {
    const rgb = hexToRgb(customColorDraft)
    if (!rgb) return
    const color = rgbToHex(rgb[0], rgb[1], rgb[2])
    setCustomColors((prev) => (prev.includes(color) ? prev : [...prev, color]))
    updateSelectedColor(color)
    setCustomPickerOpen(false)
  }

  const applyPixel = (layer: EditableLayer, x: number, y: number) => {
    if (!activeAsset) return
    if (x < 0 || y < 0 || x >= EDITOR_GRID_SIZE || y >= EDITOR_GRID_SIZE) return
    const key = `${x},${y}`

    const currentLayerPoints =
      layer === 'points'
        ? activeAsset.points
        : layer === 'frontPoints'
          ? activeAsset.frontPoints ?? []
          : activeAsset.backPoints ?? []
    const sourceMap = buildPointMap(currentLayerPoints)
    if (toolMode === 'pick') {
      const picked = sourceMap.get(key)
      if (picked) updateSelectedColor(picked)
      return
    }

    const validColor = hexToRgb(selectedColor)
    if (toolMode !== 'erase' && !validColor) return

    const prevColor = sourceMap.get(key)?.toLowerCase() ?? null
    const nextColor = toolMode === 'erase' ? null : selectedColor.toLowerCase()
    if (prevColor === nextColor) return

    const change: PixelChange = {
      partKey: isMatrixAsset(doc) ? activePart : undefined,
      layer,
      x,
      y,
      prevColor,
      nextColor,
    }
    setDoc((current: unknown) => applyPixelChangeToDoc(current, change, 'next'))
    setHistoryChanges((prev) => {
      const truncated = prev.slice(0, historyIndex + 1)
      return [...truncated, change]
    })
    setHistoryIndex((prev) => prev + 1)
  }

  const undo = () => {
    if (historyIndex < 0) return
    const change = historyChanges[historyIndex]
    if (!change) return
    setDoc((current: unknown) => applyPixelChangeToDoc(current, change, 'prev'))
    setHistoryIndex((prev) => prev - 1)
  }

  const redo = () => {
    const redoIndex = historyIndex + 1
    if (redoIndex >= historyChanges.length) return
    const change = historyChanges[redoIndex]
    if (!change) return
    setDoc((current: unknown) => applyPixelChangeToDoc(current, change, 'next'))
    setHistoryIndex((prev) => prev + 1)
  }

  const canUndo = historyIndex >= 0
  const canRedo = historyIndex + 1 < historyChanges.length

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }

      const commandKey = event.metaKey || event.ctrlKey
      if (!commandKey) return

      const key = event.key.toLowerCase()
      if (key === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (key === 'y') {
        event.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [historyChanges.length, historyIndex])

  const exportJson = () => {
    if (!doc || !selectedPath) return
    const basename = selectedPath.split('/').at(-1) ?? 'pixel-asset.json'
    const blob = new Blob([`${JSON.stringify(doc, null, 2)}\n`], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = basename
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-[100dvh] bg-[linear-gradient(180deg,#f8ebc8_0%,#d6ddb1_100%)] px-4 py-5 pb-28 text-[#1d2516] sm:px-6 sm:pl-24">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[0.72rem] tracking-[0.34em] text-[#637044] uppercase">Pixel Knight Tools</div>
            <h1 className="mt-1 text-[clamp(2rem,5vw,3.8rem)] leading-none font-black tracking-[0.08em] text-[#28321b] uppercase">
              像素编辑器
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/games/pixel-knight/character-demo')}
              className="border-[#455037]/18 bg-[#f7efd7]/70 text-[#243019] hover:bg-[#fff7df]"
            >
              <ArrowLeft />
              返回 Demo
            </Button>
          </div>
        </div>

        <section className="rounded-[1.8rem] border border-[#435437]/16 bg-[#f6f0db]/75 p-4 shadow-[0_20px_80px_rgba(60,66,31,0.16)] lg:p-5">
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <aside className="space-y-3 rounded-[1.1rem] border border-[#495738]/14 bg-[#fff6e2]/75 p-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      navigate(
                        `/games/pixel-knight/pixel-editor${selectedPath ? `?file=${encodeURIComponent(selectedPath)}` : ''}`,
                      )
                    }
                    className="h-8 border-[#455037]/20 bg-[#f8efd8]/70 px-2 text-xs text-[#243019] hover:bg-[#fff7df]"
                  >
                    <ArrowLeft className="size-3" />
                    返回文件页
                  </Button>
                  <Button
                    type="button"
                    onClick={exportJson}
                    className="h-8 bg-[#30422a] px-2 text-xs text-[#fbf5e5] hover:bg-[#23321d]"
                  >
                    <Download className="size-3" />
                    导出
                  </Button>
                </div>
                <div className="mt-2 text-xs text-[#4f5d3e] break-all">
                  {selectedPath ? selectedPath.replace('/src/game-center/pixel-knight/assets/', '') : '未选择'}
                </div>
              </div>

              {partKeys.length ? (
                <div>
                  <div className="mb-2 text-xs tracking-[0.26em] text-[#6c7753] uppercase">部件</div>
                  <div className="flex flex-wrap gap-2">
                    {partKeys.map((key) => {
                      const active = key === activePart
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedPart(key)}
                          className={
                            active
                              ? 'rounded-md border border-[#2f4328]/40 bg-[#2f4328] px-2 py-1 text-xs text-[#f6f0de]'
                              : 'rounded-md border border-[#455037]/20 bg-[#f8efd8]/70 px-2 py-1 text-xs text-[#243019]'
                          }
                        >
                          {key}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              <div>
                <div className="mb-2 text-xs tracking-[0.26em] text-[#6c7753] uppercase">颜色</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setToolMode((mode) => (mode === 'pick' ? 'paint' : 'pick'))}
                    className={
                      toolMode === 'pick'
                        ? 'inline-flex items-center gap-1 rounded-md bg-[#30422a] px-2 py-1 text-xs text-[#fbf5e5]'
                        : 'inline-flex items-center gap-1 rounded-md border border-[#455037]/20 bg-[#f8efd8]/70 px-2 py-1 text-xs text-[#243019]'
                    }
                  >
                    <Pipette className="size-3" />
                    画布取色
                  </button>
                  <button
                    type="button"
                    onClick={() => setToolMode((mode) => (mode === 'erase' ? 'paint' : 'erase'))}
                    className={
                      toolMode === 'erase'
                        ? 'inline-flex items-center gap-1 rounded-md bg-[#30422a] px-2 py-1 text-xs text-[#fbf5e5]'
                        : 'inline-flex items-center gap-1 rounded-md border border-[#455037]/20 bg-[#f8efd8]/70 px-2 py-1 text-xs text-[#243019]'
                    }
                  >
                    <Eraser className="size-3" />
                    擦除
                  </button>
                  <button
                    type="button"
                    onClick={openCustomPicker}
                    className="inline-flex items-center gap-1 rounded-md border border-[#455037]/20 bg-[#f8efd8]/70 px-2 py-1 text-xs text-[#243019] hover:bg-[#fff7df]"
                  >
                    <Palette className="size-3" />
                    自定义颜色
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {palette.map((color) => {
                    const isSelected = selectedColor === color && toolMode === 'paint'
                    return (
                      <div key={color} className="relative h-7 w-7">
                        {isSelected ? (
                          <span className="pointer-events-none absolute -inset-1 rounded-md border-2 border-[#2f4328]" />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => updateSelectedColor(color)}
                          className="relative z-10 block h-full w-full rounded border border-black/20"
                          style={{ backgroundColor: color }}
                          aria-label={color}
                          title={color}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </aside>

            <div className="rounded-[1.1rem] border border-[#495738]/14 bg-[#fff6e2]/75 p-3">
              {activeAsset ? (
                <>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="text-xs tracking-[0.26em] text-[#6c7753] uppercase">
                      画布固定 {EDITOR_GRID_SIZE} x {EDITOR_GRID_SIZE} · 资源尺寸 {activeAsset.size[0]} x {activeAsset.size[1]}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={undo}
                        disabled={!canUndo}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#455037]/20 bg-[#f8efd8]/70 text-[#243019] disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Undo"
                        title="Undo"
                      >
                        <RotateCcw className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={redo}
                        disabled={!canRedo}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#455037]/20 bg-[#f8efd8]/70 text-[#243019] disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Redo"
                        title="Redo"
                      >
                        <RotateCw className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <div
                    className={hasLayeredPoints ? 'space-y-3' : ''}
                  >
                    {hasLayeredPoints ? (
                      <>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedLayerTab('frontPoints')}
                            className={
                              activeLayerTab === 'frontPoints'
                                ? 'rounded-md border border-[#2f4328]/40 bg-[#2f4328] px-2 py-1 text-xs text-[#f6f0de]'
                                : 'rounded-md border border-[#455037]/20 bg-[#f8efd8]/70 px-2 py-1 text-xs text-[#243019]'
                            }
                          >
                            Front
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedLayerTab('backPoints')}
                            className={
                              activeLayerTab === 'backPoints'
                                ? 'rounded-md border border-[#2f4328]/40 bg-[#2f4328] px-2 py-1 text-xs text-[#f6f0de]'
                                : 'rounded-md border border-[#455037]/20 bg-[#f8efd8]/70 px-2 py-1 text-xs text-[#243019]'
                            }
                          >
                            Back
                          </button>
                        </div>
                        <LayerCanvas
                          label={activeLayerTab === 'frontPoints' ? 'Front' : 'Back'}
                          map={activeLayerTab === 'frontPoints' ? frontMap : backMap}
                          onPaint={(x, y) =>
                            applyPixel(activeLayerTab === 'frontPoints' ? 'frontPoints' : 'backPoints', x, y)
                          }
                          toolMode={toolMode}
                        />
                      </>
                    ) : (
                      <LayerCanvas
                        label="Points"
                        map={pointsMap}
                        onPaint={(x, y) => applyPixel('points', x, y)}
                        toolMode={toolMode}
                      />
                    )}
                  </div>
                </>
              ) : (
                <div className="text-sm text-[#4f5d3e]">该文件暂不支持点阵编辑。</div>
              )}
            </div>
          </div>
        </section>
      </div>
      {customPickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-[420px] rounded-xl border border-[#455037]/20 bg-[#fff6e2] p-3 shadow-[0_20px_60px_rgba(30,35,20,0.35)]">
            <div className="mb-2 text-xs tracking-[0.26em] text-[#6c7753] uppercase">自定义颜色</div>
            <SpectrumPicker
              hsv={customHsvDraft}
              onChange={(next) => {
                setCustomHsvDraft(next)
                const rgb = hsvToRgb(next.h, next.s, next.v)
                setCustomColorDraft(rgbToHex(rgb[0], rgb[1], rgb[2]))
              }}
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customColorDraft}
                  onChange={(event) => {
                    const next = event.target.value.toLowerCase()
                    setCustomColorDraft(next)
                    const rgb = hexToRgb(next)
                    if (rgb) {
                      setCustomHsvDraft(rgbToHsv(rgb[0], rgb[1], rgb[2]))
                    }
                  }}
                  className="h-8 w-[120px] rounded border border-[#455037]/20 bg-[#fff7e6] px-2 text-xs tracking-wide uppercase text-[#243019]"
                  placeholder="#rrggbb"
                />
                <div
                  className="h-8 w-8 rounded border border-[#455037]/20"
                  style={{ backgroundColor: hexToRgb(customColorDraft) ? customColorDraft : 'transparent' }}
                  title={customColorDraft}
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCustomPickerOpen(false)}
                  className="h-8 rounded-md border border-[#455037]/20 bg-[#f8efd8]/70 px-3 text-xs text-[#243019]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={confirmCustomColor}
                  disabled={!hexToRgb(customColorDraft)}
                  className="h-8 rounded-md bg-[#30422a] px-3 text-xs text-[#fbf5e5] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function LayerCanvas({
  label,
  map,
  onPaint,
  toolMode,
}: {
  label: string
  map: Map<string, string>
  onPaint: (x: number, y: number) => void
  toolMode: ToolMode
}) {
  const cursor = toolMode === 'paint' ? 'crosshair' : toolMode === 'erase' ? 'not-allowed' : 'copy'

  return (
    <div className="rounded border border-[#455037]/15 bg-[#e6ddbf] p-3">
      <div className="mb-2 text-xs tracking-[0.22em] text-[#6c7753] uppercase">{label}</div>
      <div
        className="grid gap-0"
        style={{
          gridTemplateColumns: `repeat(${EDITOR_GRID_SIZE}, minmax(0, 1fr))`,
          width: '100%',
        }}
      >
        {Array.from({ length: EDITOR_GRID_SIZE * EDITOR_GRID_SIZE }, (_, index) => {
          const x = index % EDITOR_GRID_SIZE
          const y = Math.floor(index / EDITOR_GRID_SIZE)
          const color = map.get(`${x},${y}`)
          return (
            <button
              key={`${label}-${x}-${y}`}
              type="button"
              onMouseDown={() => onPaint(x, y)}
              className="aspect-square w-full border border-black/8"
              style={{ backgroundColor: color ?? 'transparent', cursor }}
              title={`(${x}, ${y}) ${color ?? 'empty'}`}
            />
          )
        })}
      </div>
    </div>
  )
}

function SpectrumPicker({
  hsv,
  onChange,
}: {
  hsv: HsvColor
  onChange: (next: HsvColor) => void
}) {
  const svBackground = `hsl(${Math.round(hsv.h)} 100% 50%)`

  const applySvFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = clamp(event.clientX - rect.left, 0, rect.width)
    const y = clamp(event.clientY - rect.top, 0, rect.height)
    onChange({
      h: hsv.h,
      s: (x / rect.width) * 100,
      v: 100 - (y / rect.height) * 100,
    })
  }

  return (
    <div className="space-y-2">
      <div
        className="relative h-28 cursor-crosshair overflow-hidden rounded border border-[#455037]/20"
        style={{ backgroundColor: svBackground }}
        onPointerDown={applySvFromPointer}
        onPointerMove={(event) => {
          if (event.buttons === 1) applySvFromPointer(event)
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#fff,transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,black,transparent)]" />
        <div
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
          style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={360}
        value={Math.round(hsv.h)}
        onChange={(event) => onChange({ h: Number(event.target.value), s: hsv.s, v: hsv.v })}
        className="h-2 w-full cursor-pointer appearance-none rounded bg-[linear-gradient(to_right,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)]"
      />
    </div>
  )
}
