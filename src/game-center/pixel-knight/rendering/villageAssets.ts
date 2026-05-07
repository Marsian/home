import starterVillageV7BackdropUrl from '@/game-center/pixel-knight/maps/starter-village/backdrop.png'

const starterVillageAtomModules = import.meta.glob('/src/game-center/pixel-knight/maps/starter-village/atoms/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

export type VillageAssetId = 'starter-village-v7-backdrop' | `starter-village-atom-${string}`

type VillageAssetMeta = {
  src: string
  width: number
  height: number
  anchorX: number
  anchorY: number
}

const starterVillageAtomRegistry = Object.fromEntries(
  Object.entries(starterVillageAtomModules).map(([path, src]) => {
    const assetKey = path.split('/').pop()?.replace('.png', '') ?? path
    return [getStarterVillageAtomAssetId(assetKey), { src, width: 0, height: 0, anchorX: 0, anchorY: 0 }]
  }),
) as Record<`starter-village-atom-${string}`, VillageAssetMeta>

export const villageAssetRegistry: Record<VillageAssetId, VillageAssetMeta> = {
  'starter-village-v7-backdrop': { src: starterVillageV7BackdropUrl, width: 1254, height: 1254, anchorX: 0, anchorY: 0 },
  ...starterVillageAtomRegistry,
}

export const villageAssetSources: Record<VillageAssetId, string> = Object.fromEntries(
  Object.entries(villageAssetRegistry).map(([id, meta]) => [id, meta.src]),
) as Record<VillageAssetId, string>

export function getVillageAssetMeta(assetId: VillageAssetId) {
  return villageAssetRegistry[assetId]
}

export function getStarterVillageAtomAssetId(assetKey: string): `starter-village-atom-${string}` {
  return `starter-village-atom-${assetKey}`
}
