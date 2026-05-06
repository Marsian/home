import { useMemo, useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'

type PixelPoint = { x: number; y: number; color: string }
type PixelAsset = {
  size: [number, number]
  points: PixelPoint[]
  frontPoints?: PixelPoint[]
  backPoints?: PixelPoint[]
}
type MatrixPart = {
  size: [number, number]
  points: PixelPoint[]
  offset?: [number, number]
}
type MatrixAsset = { parts: Record<string, MatrixPart> }
type JsonModule = { default: unknown }
type FileTreeNode = {
  name: string
  path?: string
  children?: FileTreeNode[]
}

const assetJsonModules = import.meta.glob('/src/game-center/pixel-knight/assets/**/*.json', {
  eager: true,
}) as Record<string, JsonModule>

type PreviewPixel = { x: number; y: number; color: string }

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

function addPointsToMap(map: Map<string, string>, points: PixelPoint[], offsetX = 0, offsetY = 0) {
  for (const point of points) {
    map.set(`${point.x + offsetX},${point.y + offsetY}`, point.color)
  }
}

function normalizePointMap(map: Map<string, string>) {
  const entries = Array.from(map.entries())
  if (!entries.length) return { pixels: [] as PreviewPixel[], width: 1, height: 1 }

  const coords = entries.map(([key]) => key.split(',').map(Number) as [number, number])
  const minX = Math.min(...coords.map(([x]) => x))
  const minY = Math.min(...coords.map(([, y]) => y))
  const maxX = Math.max(...coords.map(([x]) => x))
  const maxY = Math.max(...coords.map(([, y]) => y))

  const pixels = entries.map(([key, color]) => {
    const [x, y] = key.split(',').map(Number)
    return { x: x - minX, y: y - minY, color }
  })
  return { pixels, width: maxX - minX + 1, height: maxY - minY + 1 }
}

function buildPreview(value: unknown) {
  const map = new Map<string, string>()
  if (isPixelAsset(value)) {
    if (value.frontPoints && value.backPoints) {
      addPointsToMap(map, value.backPoints)
      addPointsToMap(map, value.frontPoints)
    } else {
      addPointsToMap(map, value.points)
    }
    return normalizePointMap(map)
  }

  if (isMatrixAsset(value)) {
    // Preserve insertion order from JSON.parse (same order as keys appear in the file).
    for (const key of Object.keys(value.parts)) {
      const part = value.parts[key]
      const offset = part.offset ?? [0, 0]
      addPointsToMap(map, part.points, offset[0], offset[1])
    }
    return normalizePointMap(map)
  }

  return { pixels: [] as PreviewPixel[], width: 1, height: 1 }
}

function buildFileTree(paths: string[]): FileTreeNode[] {
  const root: FileTreeNode = { name: 'root', children: [] }

  for (const fullPath of paths) {
    const relativePath = fullPath.replace('/src/game-center/pixel-knight/assets/', '')
    const segments = relativePath.split('/').filter(Boolean)
    let cursor = root

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index]
      const isLeaf = index === segments.length - 1
      const children = cursor.children ?? []
      let child = children.find((node) => node.name === segment)
      if (!child) {
        child = { name: segment, children: isLeaf ? undefined : [] }
        children.push(child)
        cursor.children = children
      }
      if (isLeaf) {
        child.path = fullPath
      } else {
        child.children = child.children ?? []
        cursor = child
      }
    }
  }

  const sortNodes = (nodes: FileTreeNode[]) => {
    nodes.sort((a, b) => {
      const aDir = Boolean(a.children?.length)
      const bDir = Boolean(b.children?.length)
      if (aDir !== bDir) return aDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    for (const node of nodes) {
      if (node.children?.length) sortNodes(node.children)
    }
  }

  sortNodes(root.children ?? [])
  return root.children ?? []
}

export default function PixelKnightPixelEditorFilesView() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const filePaths = useMemo(() => Object.keys(assetJsonModules).sort(), [])
  const fileTree = useMemo(() => buildFileTree(filePaths), [filePaths])
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({})

  const selectedPath = useMemo(() => {
    const fromQuery = searchParams.get('file')
    if (fromQuery && filePaths.includes(fromQuery)) return fromQuery
    return filePaths[0] ?? ''
  }, [searchParams, filePaths])

  const selectedDoc = selectedPath ? assetJsonModules[selectedPath].default : null
  const preview = useMemo(() => buildPreview(selectedDoc), [selectedDoc])
  const previewPixelSize = useMemo(() => {
    const longest = Math.max(preview.width, preview.height)
    return Math.max(2, Math.floor(220 / Math.max(1, longest)))
  }, [preview.width, preview.height])

  const selectFile = (path: string) => {
    setSearchParams({ file: path })
  }

  const toggleDir = (id: string) => {
    setExpandedDirs((prev) => {
      const current = prev[id] ?? true
      return { ...prev, [id]: !current }
    })
  }

  const goEdit = () => {
    if (!selectedPath) return
    navigate(`/games/pixel-knight/pixel-editor/edit?file=${encodeURIComponent(selectedPath)}`)
  }

  return (
    <main className="min-h-[100dvh] bg-[linear-gradient(180deg,#f8ebc8_0%,#d6ddb1_100%)] px-4 py-5 pb-28 text-[#1d2516] sm:px-6 sm:pl-24">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[0.72rem] tracking-[0.34em] text-[#637044] uppercase">Pixel Knight Tools</div>
            <h1 className="mt-1 text-[clamp(2rem,5vw,3.8rem)] leading-none font-black tracking-[0.08em] text-[#28321b] uppercase">
              像素文件
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
              <div className="text-xs tracking-[0.26em] text-[#6c7753] uppercase">文件列表 ({filePaths.length})</div>
              <div className="max-h-[560px] space-y-2 overflow-auto pr-1">
                <FileTreeView
                  nodes={fileTree}
                  selectedPath={selectedPath}
                  expandedDirs={expandedDirs}
                  onToggleDir={toggleDir}
                  onSelectFile={selectFile}
                />
              </div>
            </aside>

            <div className="rounded-[1.1rem] border border-[#495738]/14 bg-[#fff6e2]/75 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs tracking-[0.26em] text-[#6c7753] uppercase">文件预览</div>
                <button
                  type="button"
                  onClick={goEdit}
                  className="inline-flex items-center gap-1 rounded-md border border-[#455037]/20 bg-[#f8efd8]/70 px-2 py-1 text-xs text-[#243019]"
                >
                  <Pencil className="size-3" />
                  编辑
                </button>
              </div>
              <div className="mb-3 text-xs text-[#4f5d3e]">
                {selectedPath ? selectedPath.replace('/src/game-center/pixel-knight/assets/', '') : '暂无文件'}
              </div>
              {preview.pixels.length > 0 ? (
                <div className="rounded border border-[#455037]/15 bg-[#e6ddbf] p-3">
                  <div className="flex min-h-[240px] items-center justify-center rounded border border-[#455037]/12 bg-[#f1e8cf] p-3">
                    <div
                      className="relative"
                      style={{
                        width: `${preview.width * previewPixelSize}px`,
                        height: `${preview.height * previewPixelSize}px`,
                      }}
                    >
                      {preview.pixels.map((pixel) => (
                        <span
                          key={`${pixel.x}-${pixel.y}-${pixel.color}`}
                          className="absolute block"
                          style={{
                            left: `${pixel.x * previewPixelSize}px`,
                            top: `${pixel.y * previewPixelSize}px`,
                            width: `${previewPixelSize}px`,
                            height: `${previewPixelSize}px`,
                            backgroundColor: pixel.color,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-[#4f5d3e]">该文件暂不支持点阵预览。</div>
              )}
            </div>
          </div>
        </section>

      </div>
    </main>
  )
}

function FileTreeView({
  nodes,
  selectedPath,
  expandedDirs,
  onToggleDir,
  onSelectFile,
  depth = 0,
  parentId = '',
}: {
  nodes: FileTreeNode[]
  selectedPath: string
  expandedDirs: Record<string, boolean>
  onToggleDir: (id: string) => void
  onSelectFile: (path: string) => void
  depth?: number
  parentId?: string
}) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => {
        const nodeId = parentId ? `${parentId}/${node.name}` : node.name
        const isDir = Boolean(node.children?.length)
        const isExpanded = expandedDirs[nodeId] ?? true
        const isActiveFile = Boolean(node.path && node.path === selectedPath)
        return (
          <div key={nodeId}>
            {isDir ? (
              <button
                type="button"
                onClick={() => onToggleDir(nodeId)}
                className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-xs text-[#243019] hover:bg-[#f8efd8]/70"
                style={{ paddingLeft: `${8 + depth * 14}px` }}
              >
                {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                <span>{node.name}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => node.path && onSelectFile(node.path)}
                className={
                  isActiveFile
                    ? 'w-full rounded-md border border-[#2f4328]/40 bg-[#2f4328] px-2 py-1 text-left text-xs text-[#f6f0de]'
                    : 'w-full rounded-md border border-transparent px-2 py-1 text-left text-xs text-[#243019] hover:bg-[#f8efd8]/70'
                }
                style={{ paddingLeft: `${26 + depth * 14}px` }}
              >
                {node.name}
              </button>
            )}
            {isDir && isExpanded && node.children?.length ? (
              <FileTreeView
                nodes={node.children}
                selectedPath={selectedPath}
                expandedDirs={expandedDirs}
                onToggleDir={onToggleDir}
                onSelectFile={onSelectFile}
                depth={depth + 1}
                parentId={nodeId}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
