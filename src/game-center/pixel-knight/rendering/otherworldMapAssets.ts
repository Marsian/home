const otherworldBackdropModules = import.meta.glob('/src/game-center/pixel-knight/maps/*/backdrop.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const otherworldAtomModules = import.meta.glob('/src/game-center/pixel-knight/maps/*/atoms/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

export type OtherworldMapAssetId = `${string}-backdrop` | `${string}-atom-${string}`

type OtherworldMapAssetMeta = {
  src: string
  width: number
  height: number
  anchorX: number
  anchorY: number
}

function mapSlugFromPath(path: string) {
  return path.match(/\/maps\/([^/]+)\//)?.[1] ?? ''
}

const otherworldBackdropRegistry = Object.fromEntries(
  Object.entries(otherworldBackdropModules)
    .map(([path, src]) => {
      const mapId = mapSlugFromPath(path)
      if (!mapId || mapId === 'starter-village') return null
      return [getOtherworldMapBackdropAssetId(mapId), { src, width: 0, height: 0, anchorX: 0, anchorY: 0 }]
    })
    .filter((entry): entry is [OtherworldMapAssetId, OtherworldMapAssetMeta] => Boolean(entry)),
)

const otherworldAtomRegistry = Object.fromEntries(
  Object.entries(otherworldAtomModules)
    .map(([path, src]) => {
      const mapId = mapSlugFromPath(path)
      const assetKey = path.split('/').pop()?.replace('.png', '') ?? ''
      if (!mapId || mapId === 'starter-village' || !assetKey) return null
      return [getOtherworldMapAtomAssetId(mapId, assetKey), { src, width: 0, height: 0, anchorX: 0, anchorY: 0 }]
    })
    .filter((entry): entry is [OtherworldMapAssetId, OtherworldMapAssetMeta] => Boolean(entry)),
)

export const otherworldMapAssetRegistry: Record<OtherworldMapAssetId, OtherworldMapAssetMeta> = {
  ...otherworldBackdropRegistry,
  ...otherworldAtomRegistry,
}

export const otherworldMapAssetSources: Record<OtherworldMapAssetId, string> = Object.fromEntries(
  Object.entries(otherworldMapAssetRegistry).map(([id, meta]) => [id, meta.src]),
) as Record<OtherworldMapAssetId, string>

export function getOtherworldMapBackdropAssetId(mapId: string): OtherworldMapAssetId {
  return `${mapId}-backdrop`
}

export function getOtherworldMapAtomAssetId(mapId: string, assetKey: string): OtherworldMapAssetId {
  return `${mapId}-atom-${assetKey}`
}
