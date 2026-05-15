import type { MonsterFrameUrls, MonsterMeta } from '@/game-center/pixel-knight/rendering/monsterRenderer'

const metaModules = import.meta.glob('./*/monster.meta.json', {
  eager: true,
  import: 'default',
}) as Record<string, MonsterMeta>

const frameModules = import.meta.glob('./*/frames/*/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>

export type MonsterCatalogEntry = {
  folder: string
  meta: MonsterMeta
  frameUrls: MonsterFrameUrls
}

function resolveFolder(path: string) {
  const match = path.match(/^\.\/([^/]+)\/monster\.meta\.json$/)
  if (!match) throw new Error(`Unexpected monster metadata path: ${path}`)
  return match[1]
}

function resolveFrameUrls(folder: string, meta: MonsterMeta): MonsterFrameUrls {
  return Object.fromEntries(
    Object.values(meta.animations)
      .filter((animation) => !!animation)
      .flatMap((animation) => animation.frames)
      .flatMap((framePath) => {
        const modulePath = `./${folder}/${framePath}`
        const url = frameModules[modulePath]
        if (!url) {
          console.warn(`Missing monster frame asset: ${modulePath}`)
          return []
        }
        return [[framePath, url] as const]
      }),
  )
}

export const monsterCatalog: MonsterCatalogEntry[] = Object.entries(metaModules)
  .map(([path, meta]) => {
    const folder = resolveFolder(path)
    return {
      folder,
      meta,
      frameUrls: resolveFrameUrls(folder, meta),
    }
  })
  .sort((a, b) => a.meta.name.localeCompare(b.meta.name, 'zh-Hans-CN'))
