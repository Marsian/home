import { useCallback, useMemo, useState } from 'react'
import { ArrowLeft, ArrowLeftRight, Pause, Play } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MonsterCanvasPreview } from '@/game-center/pixel-knight/components/MonsterCanvasPreview'
import { monsterCatalog } from '@/game-center/pixel-knight/monsters/monsterCatalog'
import type { MonsterFacing, MonsterState } from '@/game-center/pixel-knight/rendering/monsterRenderer'

const stateLabels: Record<MonsterState, string> = {
  idle: 'Idle',
  walk: 'Walk',
  attack: 'Attack',
  attacked: 'Attacked',
  death: 'Death',
  vaporize: 'Vaporize',
}

const stateOrder: MonsterState[] = ['idle', 'walk', 'attack', 'attacked', 'death', 'vaporize']

export default function PixelKnightMonsterDetailView() {
  const navigate = useNavigate()
  const { monsterId } = useParams()
  const monster = useMemo(() => monsterCatalog.find((entry) => entry.meta.id === monsterId), [monsterId])
  const [state, setState] = useState<MonsterState>('idle')
  const [facing, setFacing] = useState<MonsterFacing>('right')
  const [paused, setPaused] = useState(false)

  const availableStates = useMemo(
    () => stateOrder.filter((monsterState) => !!monster?.meta.animations[monsterState]),
    [monster],
  )

  const handleNonLoopComplete = useCallback(() => {
    if (!monster) return
    setState(monster.meta.defaultState)
  }, [monster])

  if (!monster) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#dff2cf] px-4 text-[#20331f] sm:pl-24">
        <div className="rounded-lg border border-[#2d5037]/16 bg-[#f6f1df]/82 p-6 text-center">
          <div className="text-lg font-black">没有找到这个怪物</div>
          <Button
            type="button"
            onClick={() => navigate('/games/pixel-knight/monsters')}
            className="mt-4 bg-[#244332] text-[#f6f0de] hover:bg-[#183425]"
          >
            返回怪物图鉴
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,rgba(178,230,255,0.72),transparent_28%),linear-gradient(180deg,#dff2cf_0%,#9fc499_48%,#506e55_100%)] px-4 py-5 text-[#152417] sm:px-6 sm:pl-24">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[0.72rem] tracking-[0.34em] text-[#4b684f] uppercase">Monster Detail</div>
            <h1 className="mt-1 text-[clamp(2rem,5vw,3.8rem)] leading-none font-black tracking-[0.08em] text-[#183022] uppercase">
              {monster.meta.name}
            </h1>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/games/pixel-knight/monsters')}
            className="border-[#314635]/18 bg-[#f7efd7]/70 text-[#193123] hover:bg-[#fff5dc]"
          >
            <ArrowLeft />
            返回图鉴
          </Button>
        </div>

        <section className="overflow-hidden rounded-lg border border-[#2d5037]/16 bg-[#eef4dd]/70 shadow-[0_20px_80px_rgba(35,57,36,0.18)] backdrop-blur-sm">
          <div className="grid gap-0 lg:grid-cols-[1.12fr_0.88fr]">
            <div className="border-b border-[#2d5037]/10 p-4 lg:border-r lg:border-b-0 lg:p-6">
              <MonsterCanvasPreview
                monster={monster}
                state={state}
                facing={facing}
                paused={paused}
                onNonLoopComplete={handleNonLoopComplete}
              />
            </div>

            <div className="space-y-4 p-5 lg:p-6">
              <div className="rounded-lg border border-[#39553e]/14 bg-[#f6f1df]/78 p-4">
                <div className="text-[0.68rem] tracking-[0.26em] text-[#617253] uppercase">资源定义</div>
                <div className="mt-2 text-sm font-black tracking-[0.08em] text-[#20331f]">{monster.meta.name}</div>
                <div className="mt-1 text-xs text-[#647353]">{monster.folder}/monster.meta.json</div>
                <Link
                  to="/games/pixel-knight/monsters"
                  className="mt-3 inline-flex text-sm font-bold text-[#9b5e31] hover:text-[#6f4022]"
                >
                  查看全部怪物
                </Link>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => setPaused((current) => !current)}
                  className="bg-[#244332] text-[#f6f0de] hover:bg-[#183425]"
                >
                  {paused ? <Play /> : <Pause />}
                  {paused ? '继续' : '暂停'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFacing((current) => (current === 'right' ? 'left' : 'right'))}
                  className="border-[#314635]/18 bg-[#f7efd7]/70 text-[#193123] hover:bg-[#fff5dc]"
                >
                  <ArrowLeftRight />
                  朝向：{facing === 'right' ? '右' : '左'}
                </Button>
              </div>

              <div className="rounded-lg border border-[#39553e]/14 bg-[#f6f1df]/78 p-4">
                <div className="text-[0.68rem] tracking-[0.26em] text-[#617253] uppercase">动作状态</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {availableStates.map((monsterState) => {
                    const active = monsterState === state
                    return (
                      <Button
                        key={monsterState}
                        type="button"
                        variant={active ? 'default' : 'outline'}
                        onClick={() => {
                          setState(monsterState)
                          if (paused) setPaused(false)
                        }}
                        className={cn(
                          active
                            ? 'bg-[#b96d43] text-[#fff6e6] hover:bg-[#985635]'
                            : 'border-[#314635]/18 bg-[#fff8e8]/76 text-[#193123] hover:bg-[#fffdf1]',
                        )}
                      >
                        {stateLabels[monsterState]}
                      </Button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
