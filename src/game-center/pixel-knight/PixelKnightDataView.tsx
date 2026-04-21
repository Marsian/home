import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import {
  difficultyConfigs,
  dungeons,
  experienceToNextLevel,
  legendaryPowers,
  rarityLabel,
  rarityTone,
  setBonuses,
  slotLabel,
} from './content/data'
import { derivePixelKnightStats, loadPixelKnightProfile, pixelKnightItemStatLine } from './profile'

export default function PixelKnightDataView() {
  const navigate = useNavigate()
  const profile = loadPixelKnightProfile()
  const stats = derivePixelKnightStats(profile)

  return (
    <main className="min-h-[100dvh] bg-[linear-gradient(180deg,#f7efd7_0%,#e3ecd1_100%)] px-4 py-6 pb-28 text-[#1a2f21] sm:px-6 sm:pl-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[0.72rem] tracking-[0.34em] text-[#516c4f] uppercase">Pixel Knight Data</div>
            <h1 className="mt-2 text-[clamp(2rem,5vw,4rem)] leading-none font-black tracking-[0.08em] text-[#183022] uppercase">
              数据后台
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#48604a]">
              这里单独放角色、掉落、难度和静态表。主游戏页不再展示这些后台信息。
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/games/pixel-knight')}
              className="border-[#314635]/18 bg-white/60 text-[#193123] hover:bg-white"
            >
              <ArrowLeft />
              返回游戏
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[1.8rem] border border-[#35503e]/12 bg-white/62 p-5 shadow-[0_18px_60px_rgba(51,73,55,0.12)]">
            <div className="text-[0.72rem] tracking-[0.3em] text-[#587052] uppercase">Profile</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <DataBox label="等级" value={`Lv.${profile.level}`} />
              <DataBox label="经验" value={`${profile.experience}/${experienceToNextLevel(profile.level)}`} />
              <DataBox label="攻击" value={stats.attack} />
              <DataBox label="护甲" value={stats.armor} />
              <DataBox label="技能" value={stats.skillPower} />
              <DataBox label="移速" value={stats.moveSpeed} />
              <DataBox label="金币" value={profile.gold} />
              <DataBox label="材料" value={profile.materials} />
            </div>

            <div className="mt-5 rounded-[1.2rem] border border-[#35503e]/10 bg-[#f7f4e6] p-4">
              <div className="text-[0.72rem] tracking-[0.22em] text-[#587052] uppercase">Unlocked Difficulties</div>
              <div className="mt-3 space-y-3">
                {dungeons.map((dungeon) => (
                  <div key={dungeon.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="w-24 font-semibold text-[#183022]">{dungeon.name}</span>
                    {profile.unlockedDifficultiesByDungeon[dungeon.id].map((difficulty) => (
                      <span key={difficulty} className="rounded-full border border-[#35503e]/10 bg-white px-3 py-1">
                        {difficultyConfigs[difficulty].label}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-[#35503e]/12 bg-[#203229]/96 p-5 text-[#f6eed4] shadow-[0_18px_60px_rgba(29,43,34,0.2)]">
            <div className="text-[0.72rem] tracking-[0.3em] text-[#c8d7c8]/72 uppercase">Equipment & Stash</div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {Object.entries(profile.equipment).map(([slot, item]) => (
                <div key={slot} className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-3">
                  <div className="text-[0.72rem] tracking-[0.22em] text-[#c8d7c8] uppercase">{slotLabel(slot as never)}</div>
                  <div className={cn('mt-2 text-sm font-black', item ? rarityTone(item.rarity) : 'text-[#fbf4dd]')}>
                    {item?.name ?? '未装备'}
                  </div>
                  <div className="mt-1 text-sm text-[#d9e2d0]">
                    {item ? pixelKnightItemStatLine(item) : '空'}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[0.72rem] tracking-[0.22em] text-[#c8d7c8] uppercase">Stash</div>
                <div className="text-sm text-[#cad8c9]">{profile.stash.length}/64</div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {profile.stash.length ? (
                  profile.stash.map((item) => (
                    <div key={item.id} className="rounded-[1rem] border border-white/10 bg-black/18 px-3 py-3">
                      <div className={cn('text-sm font-black', rarityTone(item.rarity))}>{item.name}</div>
                      <div className="mt-1 text-xs tracking-[0.18em] text-[#cad8c9] uppercase">
                        {rarityLabel(item.rarity)} · {slotLabel(item.slot)}
                      </div>
                      <div className="mt-2 text-sm text-[#f2ead2]">{pixelKnightItemStatLine(item)}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1rem] border border-dashed border-white/12 px-3 py-5 text-sm text-[#c0cfbf]">
                    还没有战利品。
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <section className="rounded-[1.8rem] border border-[#35503e]/12 bg-white/62 p-5 shadow-[0_18px_60px_rgba(51,73,55,0.12)]">
            <div className="text-[0.72rem] tracking-[0.3em] text-[#587052] uppercase">Legendary Powers</div>
            <div className="mt-4 grid gap-3">
              {legendaryPowers.map((power) => (
                <div key={power.id} className="rounded-[1.1rem] border border-[#35503e]/10 bg-[#f7f4e6] px-4 py-3">
                  <div className="font-black text-[#183022]">{power.name}</div>
                  <div className="mt-1 text-sm text-[#526752]">{power.description}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-[#35503e]/12 bg-white/62 p-5 shadow-[0_18px_60px_rgba(51,73,55,0.12)]">
            <div className="text-[0.72rem] tracking-[0.3em] text-[#587052] uppercase">Static Tables</div>
            <div className="mt-4 grid gap-3">
              {setBonuses.map((bonus) => (
                <div key={bonus.id} className="rounded-[1.1rem] border border-[#35503e]/10 bg-[#f7f4e6] px-4 py-3">
                  <div className="font-black text-[#183022]">{bonus.name}</div>
                  <div className="mt-1 text-sm text-[#526752]">{bonus.description}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[1.2rem] border border-[#35503e]/10 bg-[#f7f4e6] p-4">
              <div className="text-[0.72rem] tracking-[0.22em] text-[#587052] uppercase">保存数据</div>
              <pre className="mt-3 overflow-auto rounded-[0.9rem] bg-[#203229] p-3 text-xs leading-6 text-[#d4e1d0]">
{JSON.stringify(profile, null, 2)}
              </pre>
            </div>

            <div className="mt-4 text-sm text-[#526752]">
              返回主游戏页：
              <Link to="/games/pixel-knight" className="ml-2 font-semibold text-[#183022] underline underline-offset-4">
                /games/pixel-knight
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

function DataBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[1.1rem] border border-[#35503e]/10 bg-[#f7f4e6] px-4 py-3">
      <div className="text-[0.72rem] tracking-[0.22em] text-[#587052] uppercase">{label}</div>
      <div className="mt-1 text-lg font-black text-[#183022]">{value}</div>
    </div>
  )
}
