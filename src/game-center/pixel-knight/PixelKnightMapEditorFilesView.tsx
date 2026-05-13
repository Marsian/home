import { useMemo } from 'react'
import { ArrowLeft, Hammer } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  displayNameForMapFolder,
  listPixelKnightMapFolders,
} from '@/game-center/pixel-knight/maps/mapEditorAssets'

export default function PixelKnightMapEditorFilesView() {
  const navigate = useNavigate()

  const maps = useMemo(() => listPixelKnightMapFolders(), [])

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
              onClick={() => navigate('/games/pixel-knight')}
              className="border-[#455037]/18 bg-[#f7efd7]/70 text-[#243019] hover:bg-[#fff7df]"
            >
              <ArrowLeft />
              返回游戏
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs tracking-[0.26em] text-[#6c7753] uppercase">地图列表</div>
          <div className="space-y-2">
            {maps.map((map) => (
              <div
                key={map.slug}
                className="flex min-h-24 items-center gap-3 rounded-lg border border-[#2f4328]/10 bg-[#fffdf4] p-2.5 shadow-[0_10px_30px_rgba(60,66,31,0.1)]"
              >
                <div className="h-20 w-32 shrink-0 overflow-hidden rounded-md border border-[#2f4328]/10 bg-[#1f2a19] sm:w-36">
                  <img
                    src={map.backdropUrl}
                    alt=""
                    className="block h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black tracking-[0.08em] text-[#243019]">{displayNameForMapFolder(map)}</div>
                  <div className="mt-1 truncate font-mono text-[0.65rem] text-[#5b6646]">maps/{map.slug}</div>
                </div>
                <Button
                  type="button"
                  onClick={() => navigate(`/games/pixel-knight/map-editor/edit/${encodeURIComponent(map.slug)}`)}
                  className="h-10 shrink-0 bg-[#30422a] px-3 text-[#fbf5e5] hover:bg-[#23321d] sm:px-4"
                >
                  <Hammer />
                  编辑
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
