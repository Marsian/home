/**
 * Map editor discovers packs under `maps/<slug>/` (backdrop, atoms, JSON).
 * Glob patterns must stay static literals for Vite.
 */

export type PixelKnightMapFolderMeta = {
  id?: string
  name?: string
}

export type PixelKnightMapFolderInfo = {
  slug: string
  backdropUrl: string
  meta: PixelKnightMapFolderMeta | null
}

const backdropModules = import.meta.glob('/src/game-center/pixel-knight/maps/*/backdrop.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const metaModules = import.meta.glob('/src/game-center/pixel-knight/maps/*/map.meta.json', {
  eager: true,
  import: 'default',
}) as Record<string, PixelKnightMapFolderMeta>

const atomModulesAll = import.meta.glob('/src/game-center/pixel-knight/maps/*/atoms/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const placementsModules = import.meta.glob('/src/game-center/pixel-knight/maps/*/placements.v1.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>

const obstaclesModules = import.meta.glob('/src/game-center/pixel-knight/maps/*/obstacles16.v1.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>

function globKeyForSlug(record: Record<string, unknown>, slug: string, endsWith: string): string | undefined {
  return Object.keys(record).find((k) => k.includes(`/maps/${slug}/`) && k.endsWith(endsWith))
}

/** Sorted list of map folders that contain `backdrop.png`. */
export function listPixelKnightMapFolders(): PixelKnightMapFolderInfo[] {
  const result: PixelKnightMapFolderInfo[] = []
  for (const path of Object.keys(backdropModules)) {
    const slug = path.match(/\/maps\/([^/]+)\/backdrop\.png$/)?.[1]
    if (!slug) continue
    const metaKey = globKeyForSlug(metaModules as Record<string, unknown>, slug, 'map.meta.json')
    result.push({
      slug,
      backdropUrl: backdropModules[path],
      meta: metaKey ? (metaModules[metaKey] ?? null) : null,
    })
  }
  return result.sort((a, b) => a.slug.localeCompare(b.slug))
}

export function getBackdropUrlForMapSlug(slug: string): string | undefined {
  const key = globKeyForSlug(backdropModules as Record<string, unknown>, slug, 'backdrop.png')
  return key ? backdropModules[key] : undefined
}

export function isKnownPixelKnightMapSlug(slug: string): boolean {
  return Boolean(getBackdropUrlForMapSlug(slug))
}

export type EditorPlacementPayload = {
  id: string
  assetKey: string
  x: number
  y: number
  scale: number
}

export type EditorPlacementsFileV1 = {
  image?: { width: number; height: number }
  placements?: EditorPlacementPayload[]
}

export type EditorObstaclesFileV1 = {
  tile?: number
  cols?: number
  rows?: number
  image?: { width: number; height: number }
  blocked?: Array<{ col: number; row: number }>
}

export function getPlacementsFileForMapSlug(slug: string): EditorPlacementsFileV1 | null {
  const key = globKeyForSlug(placementsModules, slug, 'placements.v1.json')
  if (!key) return null
  const raw = placementsModules[key]
  return raw && typeof raw === 'object' ? (raw as EditorPlacementsFileV1) : null
}

export function getObstaclesFileForMapSlug(slug: string): EditorObstaclesFileV1 | null {
  const key = globKeyForSlug(obstaclesModules, slug, 'obstacles16.v1.json')
  if (!key) return null
  const raw = obstaclesModules[key]
  return raw && typeof raw === 'object' ? (raw as EditorObstaclesFileV1) : null
}

export function atomAssetsForMapSlug(slug: string): Array<{ key: string; src: string }> {
  return Object.entries(atomModulesAll)
    .filter(([path]) => path.includes(`/maps/${slug}/atoms/`))
    .map(([path, src]) => {
      const filename = path.split('/').pop() ?? ''
      return { filename, src }
    })
    .filter((e) => e.filename.endsWith('.png'))
    .sort((a, b) => a.filename.localeCompare(b.filename))
    .map(({ filename, src }) => ({
      key: filename.replace('.png', ''),
      src,
    }))
}

export function displayNameForMapFolder(info: PixelKnightMapFolderInfo): string {
  const name = info.meta?.name
  if (typeof name === 'string' && name.trim()) return name.trim()
  return info.slug
}
