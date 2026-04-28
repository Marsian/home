import decorBushBerryUrl from '@/game-center/pixel-knight/assets/village/sliced/decor-bush-berry.png'
import decorBushFlowerUrl from '@/game-center/pixel-knight/assets/village/sliced/decor-bush-flower.png'
import decorBushLeafyUrl from '@/game-center/pixel-knight/assets/village/sliced/decor-bush-leafy.png'
import decorGrassPatchFlowersUrl from '@/game-center/pixel-knight/assets/village/sliced/decor-grass-patch-flowers.png'
import decorGrassPatchLargeUrl from '@/game-center/pixel-knight/assets/village/sliced/decor-grass-patch-large.png'
import decorGrassPatchRockUrl from '@/game-center/pixel-knight/assets/village/sliced/decor-grass-patch-rock.png'
import decorPineSmallUrl from '@/game-center/pixel-knight/assets/village/sliced/decor-pine-small.png'
import decorSignpostDoubleUrl from '@/game-center/pixel-knight/assets/village/sliced/decor-signpost-double.png'
import decorSignpostSingleUrl from '@/game-center/pixel-knight/assets/village/sliced/decor-signpost-single.png'
import landmarkBlacksmithUrl from '@/game-center/pixel-knight/assets/village/sliced/landmark-blacksmith-forge.png'
import landmarkNoticeBoardUrl from '@/game-center/pixel-knight/assets/village/sliced/landmark-notice-board.png'
import landmarkPortalUrl from '@/game-center/pixel-knight/assets/village/sliced/landmark-portal-gate.png'
import landmarkShopUrl from '@/game-center/pixel-knight/assets/village/sliced/landmark-shop-stall.png'
import landmarkStorageChestUrl from '@/game-center/pixel-knight/assets/village/sliced/landmark-storage-chest.png'
import landmarkLanternPostUrl from '@/game-center/pixel-knight/assets/village/sliced/landmark-lantern-post.png'
import tileDirtCornerUrl from '@/game-center/pixel-knight/assets/village/sliced/tile-dirt-corner.png'
import tileDirtEdgeUrl from '@/game-center/pixel-knight/assets/village/sliced/tile-dirt-edge.png'
import tileDirtPlainUrl from '@/game-center/pixel-knight/assets/village/sliced/tile-dirt-plain.png'
import tileDirtRoundUrl from '@/game-center/pixel-knight/assets/village/sliced/tile-dirt-round.png'
import tileDirtStraightUrl from '@/game-center/pixel-knight/assets/village/sliced/tile-dirt-straight.png'
import tileDirtTJunctionUrl from '@/game-center/pixel-knight/assets/village/sliced/tile-dirt-t-junction.png'
import tileGrassDaisiesUrl from '@/game-center/pixel-knight/assets/village/sliced/tile-grass-daisies.png'
import tileGrassMixedUrl from '@/game-center/pixel-knight/assets/village/sliced/tile-grass-mixed.png'
import tileGrassPlainUrl from '@/game-center/pixel-knight/assets/village/sliced/tile-grass-plain.png'
import tileGrassRocksUrl from '@/game-center/pixel-knight/assets/village/sliced/tile-grass-rocks.png'
import tileGrassWhiteFlowersUrl from '@/game-center/pixel-knight/assets/village/sliced/tile-grass-white-flowers.png'
import tileGrassYellowFlowersUrl from '@/game-center/pixel-knight/assets/village/sliced/tile-grass-yellow-flowers.png'
import tilePlazaCircleUrl from '@/game-center/pixel-knight/assets/village/sliced/tile-plaza-circle.png'
import tilePlazaCrackedUrl from '@/game-center/pixel-knight/assets/village/sliced/tile-plaza-cracked.png'
import tilePlazaDiamondUrl from '@/game-center/pixel-knight/assets/village/sliced/tile-plaza-diamond.png'
import tilePlazaMossyUrl from '@/game-center/pixel-knight/assets/village/sliced/tile-plaza-mossy.png'
import tilePlazaStoneUrl from '@/game-center/pixel-knight/assets/village/sliced/tile-plaza-stone.png'
import terrainDirtFieldUrl from '@/game-center/pixel-knight/assets/village/terrain/terrain-dirt-field.png'
import terrainBrickRoadHorizontalUrl from '@/game-center/pixel-knight/assets/village/terrain/terrain-brick-road-horizontal.png'
import terrainBrickRoadVerticalUrl from '@/game-center/pixel-knight/assets/village/terrain/terrain-brick-road-vertical.png'
import terrainGrassFieldUrl from '@/game-center/pixel-knight/assets/village/terrain/terrain-grass-field.png'
import type { MapHotspot, VillageDecorKind } from '../types'

export type VillageAssetId =
  | 'terrain-grass-field'
  | 'terrain-dirt-field'
  | 'terrain-brick-road-vertical'
  | 'terrain-brick-road-horizontal'
  | 'tile-grass-plain'
  | 'tile-grass-mixed'
  | 'tile-grass-daisies'
  | 'tile-grass-rocks'
  | 'tile-grass-white-flowers'
  | 'tile-grass-yellow-flowers'
  | 'tile-dirt-plain'
  | 'tile-dirt-edge'
  | 'tile-dirt-straight'
  | 'tile-dirt-corner'
  | 'tile-dirt-t-junction'
  | 'tile-dirt-round'
  | 'tile-plaza-stone'
  | 'tile-plaza-cracked'
  | 'tile-plaza-diamond'
  | 'tile-plaza-mossy'
  | 'tile-plaza-circle'
  | 'landmark-portal-gate'
  | 'landmark-shop-stall'
  | 'landmark-storage-chest'
  | 'landmark-blacksmith-forge'
  | 'landmark-notice-board'
  | 'landmark-lantern-post'
  | 'decor-bush-berry'
  | 'decor-bush-flower'
  | 'decor-bush-leafy'
  | 'decor-grass-patch-flowers'
  | 'decor-grass-patch-large'
  | 'decor-grass-patch-rock'
  | 'decor-pine-small'
  | 'decor-signpost-single'
  | 'decor-signpost-double'

type VillageAssetMeta = {
  src: string
  width: number
  height: number
  anchorX: number
  anchorY: number
}

export const villageAssetRegistry: Record<VillageAssetId, VillageAssetMeta> = {
  'terrain-grass-field': { src: terrainGrassFieldUrl, width: 480, height: 480, anchorX: 240, anchorY: 240 },
  'terrain-dirt-field': { src: terrainDirtFieldUrl, width: 480, height: 480, anchorX: 240, anchorY: 240 },
  'terrain-brick-road-vertical': {
    src: terrainBrickRoadVerticalUrl,
    width: 240,
    height: 720,
    anchorX: 120,
    anchorY: 360,
  },
  'terrain-brick-road-horizontal': {
    src: terrainBrickRoadHorizontalUrl,
    width: 720,
    height: 240,
    anchorX: 360,
    anchorY: 120,
  },
  'tile-grass-plain': { src: tileGrassPlainUrl, width: 60, height: 60, anchorX: 30, anchorY: 30 },
  'tile-grass-mixed': { src: tileGrassMixedUrl, width: 60, height: 60, anchorX: 30, anchorY: 30 },
  'tile-grass-daisies': { src: tileGrassDaisiesUrl, width: 60, height: 60, anchorX: 30, anchorY: 30 },
  'tile-grass-rocks': { src: tileGrassRocksUrl, width: 60, height: 60, anchorX: 30, anchorY: 30 },
  'tile-grass-white-flowers': { src: tileGrassWhiteFlowersUrl, width: 60, height: 60, anchorX: 30, anchorY: 30 },
  'tile-grass-yellow-flowers': { src: tileGrassYellowFlowersUrl, width: 60, height: 60, anchorX: 30, anchorY: 30 },
  'tile-dirt-plain': { src: tileDirtPlainUrl, width: 60, height: 60, anchorX: 30, anchorY: 30 },
  'tile-dirt-edge': { src: tileDirtEdgeUrl, width: 60, height: 60, anchorX: 30, anchorY: 30 },
  'tile-dirt-straight': { src: tileDirtStraightUrl, width: 60, height: 60, anchorX: 30, anchorY: 30 },
  'tile-dirt-corner': { src: tileDirtCornerUrl, width: 60, height: 60, anchorX: 30, anchorY: 30 },
  'tile-dirt-t-junction': { src: tileDirtTJunctionUrl, width: 60, height: 60, anchorX: 30, anchorY: 30 },
  'tile-dirt-round': { src: tileDirtRoundUrl, width: 60, height: 60, anchorX: 30, anchorY: 30 },
  'tile-plaza-stone': { src: tilePlazaStoneUrl, width: 60, height: 60, anchorX: 30, anchorY: 30 },
  'tile-plaza-cracked': { src: tilePlazaCrackedUrl, width: 60, height: 60, anchorX: 30, anchorY: 30 },
  'tile-plaza-diamond': { src: tilePlazaDiamondUrl, width: 60, height: 60, anchorX: 30, anchorY: 30 },
  'tile-plaza-mossy': { src: tilePlazaMossyUrl, width: 60, height: 60, anchorX: 30, anchorY: 30 },
  'tile-plaza-circle': { src: tilePlazaCircleUrl, width: 60, height: 60, anchorX: 30, anchorY: 30 },
  'landmark-portal-gate': { src: landmarkPortalUrl, width: 172, height: 178, anchorX: 86, anchorY: 89 },
  'landmark-shop-stall': { src: landmarkShopUrl, width: 178, height: 150, anchorX: 89, anchorY: 75 },
  'landmark-storage-chest': { src: landmarkStorageChestUrl, width: 160, height: 128, anchorX: 80, anchorY: 64 },
  'landmark-blacksmith-forge': { src: landmarkBlacksmithUrl, width: 156, height: 138, anchorX: 78, anchorY: 69 },
  'landmark-notice-board': { src: landmarkNoticeBoardUrl, width: 148, height: 132, anchorX: 74, anchorY: 66 },
  'landmark-lantern-post': { src: landmarkLanternPostUrl, width: 72, height: 96, anchorX: 36, anchorY: 48 },
  'decor-bush-berry': { src: decorBushBerryUrl, width: 42, height: 42, anchorX: 21, anchorY: 21 },
  'decor-bush-flower': { src: decorBushFlowerUrl, width: 42, height: 42, anchorX: 21, anchorY: 21 },
  'decor-bush-leafy': { src: decorBushLeafyUrl, width: 42, height: 42, anchorX: 21, anchorY: 21 },
  'decor-grass-patch-flowers': { src: decorGrassPatchFlowersUrl, width: 44, height: 38, anchorX: 22, anchorY: 19 },
  'decor-grass-patch-large': { src: decorGrassPatchLargeUrl, width: 46, height: 38, anchorX: 23, anchorY: 19 },
  'decor-grass-patch-rock': { src: decorGrassPatchRockUrl, width: 42, height: 36, anchorX: 21, anchorY: 18 },
  'decor-pine-small': { src: decorPineSmallUrl, width: 58, height: 70, anchorX: 29, anchorY: 35 },
  'decor-signpost-single': { src: decorSignpostSingleUrl, width: 44, height: 52, anchorX: 22, anchorY: 26 },
  'decor-signpost-double': { src: decorSignpostDoubleUrl, width: 52, height: 58, anchorX: 26, anchorY: 29 },
}

export const villageAssetSources: Record<VillageAssetId, string> = Object.fromEntries(
  Object.entries(villageAssetRegistry).map(([id, meta]) => [id, meta.src]),
) as Record<VillageAssetId, string>

export function getVillageAssetMeta(assetId: VillageAssetId) {
  return villageAssetRegistry[assetId]
}

export function resolveLandmarkAsset(kind: MapHotspot['kind']): VillageAssetId {
  switch (kind) {
    case 'portal':
      return 'landmark-portal-gate'
    case 'shop':
      return 'landmark-shop-stall'
    case 'stash':
      return 'landmark-storage-chest'
    case 'blacksmith':
      return 'landmark-blacksmith-forge'
    case 'notice-board':
      return 'landmark-notice-board'
    case 'gemsmith':
      return 'landmark-lantern-post'
  }
}

export function resolveDecorAsset(kind: VillageDecorKind): VillageAssetId {
  return `decor-${kind}` as VillageAssetId
}

function hashIndex(col: number, row: number, variants: VillageAssetId[]) {
  return variants[Math.abs((col * 7 + row * 11) % variants.length)]
}

function coarseHashIndex(col: number, row: number, variants: VillageAssetId[]) {
  // Use a coarser grid so texture variation forms patches, not checkerboard noise.
  return variants[Math.abs((Math.floor(col / 2) * 5 + Math.floor(row / 2) * 7) % variants.length)]
}

export function resolveVillageTileAsset(tile: string, col: number, row: number, rows: string[]): VillageAssetId {
  if (tile === 'p') {
    const variant = Math.abs((Math.floor(col / 4) * 3 + Math.floor(row / 4) * 5) % 11)
    if (variant === 0) return 'tile-plaza-cracked'
    return 'tile-plaza-stone'
  }

  if (tile === 'r') {
    const read = (x: number, y: number) => rows[y]?.[x]
    const connects = (x: number, y: number) => {
      const t = read(x, y)
      return t === 'r' || t === 'p' || t === 'S' || t === 'P'
    }
    const north = connects(col, row - 1)
    const east = connects(col + 1, row)
    const south = connects(col, row + 1)
    const west = connects(col - 1, row)
    const count = [north, east, south, west].filter(Boolean).length

    if (count >= 4) return 'tile-dirt-round'
    if (count >= 3) return 'tile-dirt-t-junction'
    if (count === 2) {
      if ((north && south) || (east && west)) return 'tile-dirt-straight'
      return 'tile-dirt-corner'
    }
    if (count === 1) return 'tile-dirt-edge'
    return 'tile-dirt-plain'
  }

  const patch = coarseHashIndex(col, row, ['tile-grass-plain', 'tile-grass-plain', 'tile-grass-mixed'])
  return patch
}
