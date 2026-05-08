import { ArrowLeft, ChevronRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { MonsterCanvasPreview } from '@/game-center/pixel-knight/components/MonsterCanvasPreview'
import { monsterCatalog } from '@/game-center/pixel-knight/monsters/monsterCatalog'

export default function PixelKnightMonsterListView() {
  const navigate = useNavigate()

  return (
    <main className="min-h-[100dvh] bg-[linear-gradient(180deg,#dff2cf_0%,#9fc499_50%,#506e55_100%)] px-4 py-5 text-[#152417] sm:px-6 sm:pl-24">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-[0.72rem] tracking-[0.34em] text-[#4b684f] uppercase">Pixel Knight Prototype</div>
            <h1 className="mt-1 text-[clamp(2rem,5vw,3.8rem)] leading-none font-black tracking-[0.08em] text-[#183022] uppercase">
              怪物图鉴
            </h1>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/games/pixel-knight')}
            className="border-[#314635]/18 bg-[#f7efd7]/80 text-[#193123] hover:bg-[#fff5dc]"
          >
            <ArrowLeft />
            返回游戏
          </Button>
        </div>

        {monsterCatalog.length === 0 ? (
          <section className="rounded-lg border border-[#2d5037]/16 bg-[#eef4dd]/78 p-6 text-[#20331f]">
            暂无怪物资源
          </section>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {monsterCatalog.map((entry) => (
              <Link
                key={entry.meta.id}
                to={`/games/pixel-knight/monsters/${entry.meta.id}`}
                className="group overflow-hidden rounded-lg border border-[#2d5037]/16 bg-[#f6f1df]/82 text-[#20331f] shadow-[0_16px_48px_rgba(35,57,36,0.16)] transition hover:-translate-y-0.5 hover:bg-[#fff8e8]"
              >
                <MonsterCanvasPreview monster={entry} state="idle" compact className="p-3" />
                <div className="flex items-center justify-between gap-3 border-t border-[#39553e]/12 px-4 py-3">
                  <div>
                    <div className="text-lg font-black tracking-[0.08em]">{entry.meta.name}</div>
                    <div className="mt-1 text-xs text-[#647353]">{entry.folder}/monster.meta.json</div>
                  </div>
                  <ChevronRight className="size-5 text-[#7a8a5c] transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
