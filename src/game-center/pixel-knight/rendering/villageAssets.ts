import starterVillageV7BackdropUrl from '@/game-center/pixel-knight/maps/starter-village/backdrop.png'

/** Village runtime currently draws only the packed backdrop; legacy sliced/terrain PNGs were removed from `assets/village`. */
export type VillageAssetId = 'starter-village-v7-backdrop'

type VillageAssetMeta = {
  src: string
  width: number
  height: number
  anchorX: number
  anchorY: number
}

export const villageAssetRegistry: Record<VillageAssetId, VillageAssetMeta> = {
  'starter-village-v7-backdrop': { src: starterVillageV7BackdropUrl, width: 1254, height: 1254, anchorX: 0, anchorY: 0 },
}

export const villageAssetSources: Record<VillageAssetId, string> = Object.fromEntries(
  Object.entries(villageAssetRegistry).map(([id, meta]) => [id, meta.src]),
) as Record<VillageAssetId, string>

export function getVillageAssetMeta(assetId: VillageAssetId) {
  return villageAssetRegistry[assetId]
}
