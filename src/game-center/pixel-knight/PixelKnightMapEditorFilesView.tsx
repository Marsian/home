import { ArrowLeft, Hammer } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import villageBackdrop from '@/game-center/pixel-knight/assets/village/v7-front/full/starter-village-front-small-plaza-all-roads-connected.png'

export default function PixelKnightMapEditorFilesView() {
  const navigate = useNavigate()

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
          <div className="rounded-[1.2rem] border border-[#2f4328]/10 bg-[#fffdf4] p-3 shadow-[0_18px_70px_rgba(60,66,31,0.14)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black tracking-[0.08em] text-[#243019]">新手村</div>
                <div className="mt-1 text-xs text-[#5b6646]">v7 · 1254×1254 · 障碍 16px/格 · placement 像素坐标</div>
              </div>
              <Button
                type="button"
                onClick={() => navigate('/games/pixel-knight/map-editor/edit')}
                className="bg-[#30422a] text-[#fbf5e5] hover:bg-[#23321d]"
              >
                <Hammer />
                编辑
              </Button>
            </div>
            <div className="mt-3 overflow-hidden rounded-[0.95rem] border border-[#2f4328]/10 bg-[#1f2a19]">
              <img src={villageBackdrop} alt="新手村 snapshot" className="block aspect-[16/9] w-full object-cover" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

