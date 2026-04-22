import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Database, Package2, Pause, Play, Swords } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import {
  difficultyConfigs,
  difficultyOrder,
  dungeons,
  experienceToNextLevel,
  getDungeonById,
  rarityLabel,
  rarityTone,
  skills,
  slotLabel,
} from './content/data'
import { clearPixelKnightPreloadCache, preloadGameData, preloadPixelKnightAssets } from './game/preload'
import { PixelKnightGame } from './pixelKnightGame'
import {
  applyPixelKnightRunResult,
  derivePixelKnightStats,
  loadPixelKnightProfile,
  pixelKnightItemStatLine,
  savePixelKnightProfile,
} from './profile'
import type {
  DungeonSelectState,
  ItemInstance,
  PixelKnightHudState,
  PixelKnightProfile,
  PreloadProgress,
  RunResult,
} from './types'
import { LoadingOverlay } from './ui/LoadingOverlay'

const initialPreload: PreloadProgress = {
  loaded: 0,
  total: 7,
  ratio: 0,
  label: '正在点亮圣殿',
}

const defaultHud: PixelKnightHudState = {
  phase: 'boot',
  dungeonName: '村庄大厅',
  difficultyLabel: '普通',
  objectiveLabel: '准备中',
  encounterLabel: '待机',
  health: 0,
  maxHealth: 0,
  enemiesLeft: 0,
  elapsedMs: 0,
  blessingActive: false,
  portalNearby: false,
  minimapRows: [],
  playerCell: { x: 0, y: 0 },
  portalCell: { x: 0, y: 0 },
  recentLoot: [],
  cooldowns: {
    basic: 0,
    whirlwind: 0,
    shield: 0,
    holy: 0,
    blessing: 0,
    dodge: 0,
  },
}

function formatTime(ms: number) {
  const total = Math.floor(ms / 1000)
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export default function PixelKnightView() {
  const navigate = useNavigate()
  const hostRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<PixelKnightGame | null>(null)

  const [profile, setProfile] = useState<PixelKnightProfile>(() => loadPixelKnightProfile())
  const [preload, setPreload] = useState(initialPreload)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'loading' | 'home' | 'playing' | 'results' | 'error'>('loading')
  const [hud, setHud] = useState(defaultHud)
  const [selected, setSelected] = useState<DungeonSelectState>({
    dungeonId: 'sunmeadow',
    selectedDifficulty: 'normal',
    unlockedDifficulties: ['normal'],
  })
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [lastResult, setLastResult] = useState<RunResult | null>(null)

  useEffect(() => {
    savePixelKnightProfile(profile)
  }, [profile])

  useEffect(() => {
    const dungeonId = selected.dungeonId
    setSelected((current) => ({
      dungeonId,
      selectedDifficulty:
        profile.unlockedDifficultiesByDungeon[dungeonId].includes(current.selectedDifficulty)
          ? current.selectedDifficulty
          : profile.unlockedDifficultiesByDungeon[dungeonId][0],
      unlockedDifficulties: profile.unlockedDifficultiesByDungeon[dungeonId],
    }))
  }, [profile.unlockedDifficultiesByDungeon, selected.dungeonId])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const game = new PixelKnightGame(host, {
      onHud: (state) => setHud(state),
      onRunComplete: (result) => {
        setLastResult(result)
        setProfile((current) => applyPixelKnightRunResult(current, result))
        setPhase('results')
      },
      onError: (message) => {
        setLoadError(message)
        setPhase('error')
      },
    })
    gameRef.current = game
    game.bootstrap()
    return () => {
      game.dispose()
      gameRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const start = async () => {
      setPhase('loading')
      setLoadError(null)
      setPreload(initialPreload)
      try {
        await preloadGameData()
        await preloadPixelKnightAssets((progress) => {
          if (!cancelled) setPreload(progress)
        })
        if (cancelled) return
        setProfile((current) => ({ ...current, hasCompletedInitialLoad: true }))
        setPhase('home')
      } catch (error) {
        if (cancelled) return
        setLoadError(error instanceof Error ? error.message : '预载失败')
        setPhase('error')
      }
    }
    void start()
    return () => {
      cancelled = true
    }
  }, [])

  const playerStats = useMemo(() => derivePixelKnightStats(profile), [profile])
  const xpRatio = profile.experience / experienceToNextLevel(profile.level)

  const startRun = () => {
    gameRef.current?.startRun({
      dungeonId: selected.dungeonId,
      difficulty: selected.selectedDifficulty,
      stats: playerStats,
    })
    setPhase('playing')
    setInventoryOpen(false)
  }

  const retryPreload = () => {
    clearPixelKnightPreloadCache()
    setLoadError(null)
    setPhase('loading')
    setPreload(initialPreload)
    void preloadPixelKnightAssets((progress) => setPreload(progress))
      .then(() => {
        setProfile((current) => ({ ...current, hasCompletedInitialLoad: true }))
        setPhase('home')
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : '预载失败')
        setPhase('error')
      })
  }

  const equipItem = (item: ItemInstance) => {
    setProfile((current) => {
      const existing = current.equipment[item.slot] ?? null
      return {
        ...current,
        equipment: {
          ...current.equipment,
          [item.slot]: item,
        },
        stash: [existing, ...current.stash.filter((candidate) => candidate.id !== item.id)].filter(
          Boolean,
        ) as ItemInstance[],
      }
    })
  }

  const backToHome = () => {
    gameRef.current?.stopToHome()
    setPhase('home')
    setInventoryOpen(false)
  }

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,rgba(248,226,164,0.86),transparent_26%),linear-gradient(180deg,#f8ebc4_0%,#cedfba_38%,#769f7f_100%)] px-4 py-5 pb-28 text-[#142218] sm:px-6 sm:pl-24">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[0.72rem] tracking-[0.34em] text-[#516c4f] uppercase">Pixel Knight</div>
            <h1 className="mt-1 text-[clamp(2.1rem,6vw,4.2rem)] leading-none font-black tracking-[0.08em] text-[#183022] uppercase">
              像素骑士
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/games')}
              className="border-[#314635]/18 bg-[#f7efd7]/70 text-[#193123] hover:bg-[#fff5dc]"
            >
              <ArrowLeft />
              返回
            </Button>
            <Button
              type="button"
              variant="outline"
              asChild
              className="border-[#314635]/18 bg-[#f7efd7]/70 text-[#193123] hover:bg-[#fff5dc]"
            >
              <Link to="/games/pixel-knight/character-demo">
                <Package2 />
                角色 Demo
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              asChild
              className="border-[#314635]/18 bg-[#f7efd7]/70 text-[#193123] hover:bg-[#fff5dc]"
            >
              <Link to="/games/pixel-knight/data">
                <Database />
                数据后台
              </Link>
            </Button>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-[2rem] border border-[#2c4d39]/16 bg-[#1c261f]/95 text-[#f5eed5] shadow-[0_24px_90px_rgba(27,34,28,0.22)]">
          <div className="relative aspect-[16/10] min-h-[420px] bg-[#121714]">
            <div ref={hostRef} className="absolute inset-0" />

            {(phase === 'loading' || phase === 'error') && (
              <LoadingOverlay progress={preload} error={loadError} onRetry={retryPreload} />
            )}

            {phase === 'home' ? (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(248,222,156,0.16),transparent_24%),linear-gradient(180deg,rgba(9,12,10,0.22),rgba(7,10,8,0.58))] p-4">
                <div className="grid w-full max-w-5xl gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[1.8rem] border border-[#f3d48f]/16 bg-[#172019]/86 p-5 backdrop-blur-[3px]">
                    <div className="text-[0.72rem] tracking-[0.3em] text-[#efd9a2]/72 uppercase">Start Run</div>
                    <div className="mt-2 text-[clamp(2rem,4vw,3.2rem)] font-black tracking-[0.08em] text-[#fbf4dd]">
                      村庄大厅
                    </div>
                    <div className="mt-4 grid gap-3">
                      {dungeons.map((dungeon) => {
                        const active = dungeon.id === selected.dungeonId
                        return (
                          <button
                            key={dungeon.id}
                            type="button"
                            onClick={() =>
                              setSelected({
                                dungeonId: dungeon.id,
                                selectedDifficulty: profile.unlockedDifficultiesByDungeon[dungeon.id][0],
                                unlockedDifficulties: profile.unlockedDifficultiesByDungeon[dungeon.id],
                              })
                            }
                            className={cn(
                              'rounded-[1.3rem] border px-4 py-3 text-left transition',
                              active
                                ? 'border-[#f3d48f]/20 bg-[#f3d48f]/10 text-[#fbf4dd]'
                                : 'border-white/10 bg-white/4 text-[#d9e2d0] hover:bg-white/8',
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-black tracking-[0.05em]">{dungeon.name}</div>
                                <div className={cn('mt-1 text-sm', active ? 'text-[#ead7ac]' : 'text-[#b9cbb8]')}>
                                  {dungeon.subtitle}
                                </div>
                              </div>
                              <div
                                className="h-11 w-11 rounded-[0.9rem] border border-white/10"
                                style={{
                                  background: `linear-gradient(135deg, ${dungeon.palette.sky}, ${dungeon.palette.ground})`,
                                }}
                              />
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="rounded-[1.8rem] border border-white/10 bg-black/28 p-5 backdrop-blur-[3px]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[0.72rem] tracking-[0.3em] text-[#c8d7c8]/72 uppercase">Knight</div>
                        <div className="mt-1 text-2xl font-black tracking-[0.06em] text-[#fbf4dd]">Lv.{profile.level}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInventoryOpen((current) => !current)}
                        className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-sm text-[#d6dfcd]"
                      >
                        <Package2 className="mr-1 inline size-4" />
                        背包
                      </button>
                    </div>

                    <div className="mt-4 h-3 overflow-hidden rounded-full border border-white/10 bg-black/24">
                      <div
                        className="h-full bg-[linear-gradient(90deg,#f2ce74,#f8f2b4)]"
                        style={{ width: `${xpRatio * 100}%` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-sm text-[#d8d0b7]">
                      <span>{profile.experience}/{experienceToNextLevel(profile.level)} XP</span>
                      <span>{profile.completedRuns} clears</span>
                    </div>

                    <div className="mt-5">
                      <div className="text-[0.72rem] tracking-[0.28em] text-[#c8d7c8]/72 uppercase">Difficulty</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {difficultyOrder.map((difficulty) => {
                          const unlocked = profile.unlockedDifficultiesByDungeon[selected.dungeonId].includes(difficulty)
                          const active = difficulty === selected.selectedDifficulty
                          return (
                            <button
                              key={difficulty}
                              type="button"
                              disabled={!unlocked}
                              onClick={() =>
                                unlocked &&
                                setSelected((current) => ({
                                  ...current,
                                  selectedDifficulty: difficulty,
                                }))
                              }
                              className={cn(
                                'rounded-full border px-4 py-2 text-sm font-semibold transition',
                                unlocked
                                  ? active
                                    ? 'border-[#f3d48f]/20 bg-[#f3d48f]/10 text-[#fbf4dd]'
                                    : 'border-white/10 bg-white/4 text-[#d7e1cf] hover:bg-white/8'
                                  : 'cursor-not-allowed border-white/8 bg-black/10 text-[#788678]',
                              )}
                            >
                              {difficultyConfigs[difficulty].label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                      <HomeStat label="攻击" value={playerStats.attack} />
                      <HomeStat label="护甲" value={playerStats.armor} />
                      <HomeStat label="技能" value={playerStats.skillPower} />
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                      <HomeStat label="经验" value={`${difficultyConfigs[selected.selectedDifficulty].experienceMultiplier.toFixed(2)}x`} />
                      <HomeStat label="金币" value={`${difficultyConfigs[selected.selectedDifficulty].goldMultiplier.toFixed(2)}x`} />
                      <HomeStat label="掉落" value={`${difficultyConfigs[selected.selectedDifficulty].magicFind.toFixed(2)}x`} />
                    </div>

                    <Button
                      type="button"
                      onClick={startRun}
                      className="mt-5 h-12 w-full rounded-full bg-[#f3d48f] text-[#2e2414] hover:bg-[#ffe2a6]"
                    >
                      <Swords />
                      开始副本
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {phase === 'playing' || hud.phase === 'paused' ? (
              <>
                <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-[260px] rounded-[1.2rem] border border-white/10 bg-black/34 px-4 py-3 backdrop-blur-[2px]">
                    <div className="flex items-center justify-between gap-4 text-xs tracking-[0.2em] uppercase text-[#b8ccaf]">
                      <span>{hud.dungeonName}</span>
                      <span>{hud.difficultyLabel}</span>
                    </div>
                    <div className="mt-2 flex justify-between gap-3 text-sm text-[#f7efd8]">
                      <span>{hud.portalNearby ? '传送点可交互' : '探索中'}</span>
                      <span>{hud.encounterLabel}</span>
                    </div>
                    <div className="mt-1 text-xs text-[#dccb9c]">{hud.objectiveLabel}</div>
                    <div className="mt-3 h-3 overflow-hidden rounded-full border border-[#f3d48f]/14 bg-black/25">
                      <div
                        className="h-full bg-[linear-gradient(90deg,#f5d275,#f7f0b1,#9ce59f)]"
                        style={{ width: `${hud.maxHealth ? (hud.health / hud.maxHealth) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-sm text-[#f6f0d6]">
                      <span>
                        HP {Math.max(0, Math.round(hud.health))}/{Math.round(hud.maxHealth)}
                      </span>
                      <span>{formatTime(hud.elapsedMs)}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="pointer-events-none rounded-[1.2rem] border border-white/10 bg-black/34 p-3 backdrop-blur-[2px]">
                      <MiniMap hud={hud} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setInventoryOpen((current) => !current)}
                      className="pointer-events-auto rounded-[1rem] border border-white/10 bg-black/34 px-4 py-3 text-sm text-[#f6f0d6] backdrop-blur-[2px]"
                    >
                      <Package2 className="mr-2 inline size-4" />
                      背包
                    </button>
                    <button
                      type="button"
                      onClick={() => gameRef.current?.setPaused(hud.phase !== 'paused')}
                      className="pointer-events-auto rounded-[1rem] border border-white/10 bg-black/34 px-4 py-3 text-sm text-[#f6f0d6] backdrop-blur-[2px]"
                    >
                      {hud.phase === 'paused' ? <Play className="mr-2 inline size-4" /> : <Pause className="mr-2 inline size-4" />}
                      {hud.phase === 'paused' ? '继续' : '暂停'}
                    </button>
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <div className="rounded-[1.4rem] border border-white/10 bg-black/34 px-4 py-3 backdrop-blur-[2px]">
                      <div className="text-[0.72rem] tracking-[0.28em] text-[#b8ccaf] uppercase">Run Feed</div>
                      <div className="mt-2 space-y-1 text-sm text-[#f2ead2]">
                        {(hud.recentLoot.length ? hud.recentLoot : ['保持移动，围着敌人切入，再用旋风清场。']).map((entry) => (
                          <div key={entry}>{entry}</div>
                        ))}
                        {hud.portalNearby ? <div className="text-[#a8f6ff]">靠近传送点，按 `F` 返回村庄。</div> : null}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {[
                        ['LMB', '斩击', hud.cooldowns.basic],
                        ['RMB', '旋风', hud.cooldowns.whirlwind],
                        ['Q', '盾击', hud.cooldowns.shield],
                        ['E', '突进', hud.cooldowns.holy],
                        ['R', '祝福', hud.cooldowns.blessing],
                        ['Space', '闪避', hud.cooldowns.dodge],
                      ].map(([key, label, cd]) => (
                        <div
                          key={key}
                          className="rounded-[1.05rem] border border-white/10 bg-black/34 px-3 py-2 text-center backdrop-blur-[2px]"
                        >
                          <div className="text-[0.68rem] tracking-[0.18em] text-[#b8ccaf] uppercase">{key}</div>
                          <div className="mt-1 text-sm font-semibold text-[#fbf5db]">{label}</div>
                          <div className="mt-1 text-xs text-[#d8cba4]">{Number(cd) > 0 ? `${Math.ceil(Number(cd) / 100) / 10}s` : 'Ready'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {phase === 'results' && lastResult ? (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-[linear-gradient(180deg,rgba(29,41,31,0.54),rgba(12,16,13,0.84))] p-4">
                <div className="w-full max-w-3xl rounded-[1.9rem] border border-[#f3d48f]/16 bg-[#1a241d]/92 p-6 text-[#f7f0d5] shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-[0.72rem] tracking-[0.32em] text-[#f9c76a]/78 uppercase">Run Result</div>
                      <h2 className="mt-2 text-[clamp(1.8rem,4vw,2.8rem)] leading-none font-black tracking-[0.06em]">
                        {lastResult.victory ? '副本凯旋' : '本次退场'}
                      </h2>
                      <div className="mt-2 text-sm text-[#d6ceb4]">
                        {getDungeonById(lastResult.dungeonId).name} · {difficultyConfigs[lastResult.difficulty].label} · {formatTime(lastResult.durationMs)}
                      </div>
                    </div>
                    {lastResult.rewards.unlockedDifficulty ? (
                      <div className="rounded-full border border-[#f3d48f]/16 bg-[#f3d48f]/10 px-3 py-1 text-sm text-[#f6dfab]">
                        已解锁 {difficultyConfigs[lastResult.rewards.unlockedDifficulty].label}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <ResultStat label="经验" value={`+${lastResult.rewards.experienceGained}`} />
                    <ResultStat label="金币" value={`+${lastResult.rewards.goldGained}`} />
                    <ResultStat label="材料" value={`+${lastResult.rewards.materialsGained}`} />
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {lastResult.rewards.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => equipItem(item)}
                        className="rounded-[1.3rem] border border-white/10 bg-white/6 px-4 py-3 text-left transition hover:bg-white/10"
                      >
                        <div className={cn('text-sm font-black', rarityTone(item.rarity))}>{item.name}</div>
                        <div className="mt-1 text-xs tracking-[0.18em] text-[#cad8c9] uppercase">
                          {rarityLabel(item.rarity)} · {slotLabel(item.slot)}
                        </div>
                        <div className="mt-2 text-sm text-[#f2ead2]">{pixelKnightItemStatLine(item)}</div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={startRun}
                      className="h-11 rounded-full bg-[#f3d48f] px-5 text-[#2e2414] hover:bg-[#ffe2a6]"
                    >
                      再来一局
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={backToHome}
                      className="h-11 rounded-full border-white/12 bg-white/4 text-[#f6f0d6] hover:bg-white/8"
                    >
                      返回村庄
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {inventoryOpen ? (
              <div className="absolute inset-y-0 right-0 z-30 w-full max-w-[420px] border-l border-white/10 bg-[linear-gradient(180deg,rgba(18,24,20,0.95),rgba(10,14,11,0.98))] p-4 shadow-[-16px_0_48px_rgba(0,0,0,0.32)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[0.72rem] tracking-[0.3em] text-[#c8d7c8]/72 uppercase">Inventory</div>
                    <div className="mt-1 text-2xl font-black tracking-[0.06em] text-[#fbf4dd]">骑士装备</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInventoryOpen(false)}
                    className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-sm text-[#d6dfcd]"
                  >
                    关闭
                  </button>
                </div>

                <div className="mt-4 grid gap-2 text-sm">
                  <div className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-3 text-[#d8d0b7]">
                    Lv.{profile.level} · 攻击 {playerStats.attack} · 护甲 {playerStats.armor} · 金币 {profile.gold}
                  </div>
                </div>

                <div className="mt-4 grid max-h-[calc(100%-8rem)] gap-3 overflow-y-auto pr-1">
                  {(Object.entries(profile.equipment) as Array<[keyof PixelKnightProfile['equipment'], ItemInstance | null | undefined]>).map(([slot, item]) => (
                    <div key={slot} className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-3">
                      <div className="text-[0.72rem] tracking-[0.24em] text-[#c8d7c8] uppercase">{slotLabel(slot as never)}</div>
                      <div className={cn('mt-2 text-sm font-black', item ? rarityTone(item.rarity) : 'text-[#fbf4dd]')}>
                        {item?.name ?? '未装备'}
                      </div>
                      <div className="mt-1 text-sm text-[#d9e2d0]">
                        {item ? pixelKnightItemStatLine(item) : '从战利品中点击即可装备。'}
                      </div>
                    </div>
                  ))}

                  <div className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-3">
                    <div className="text-[0.72rem] tracking-[0.24em] text-[#c8d7c8] uppercase">Backpack</div>
                    <div className="mt-3 space-y-3">
                      {profile.stash.length ? (
                        profile.stash.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => equipItem(item)}
                            className="w-full rounded-[1rem] border border-white/10 bg-black/18 px-3 py-3 text-left transition hover:bg-black/28"
                          >
                            <div className={cn('text-sm font-black', rarityTone(item.rarity))}>{item.name}</div>
                            <div className="mt-1 text-xs tracking-[0.18em] text-[#cad8c9] uppercase">
                              {rarityLabel(item.rarity)} · {slotLabel(item.slot)}
                            </div>
                            <div className="mt-2 text-sm text-[#f2ead2]">{pixelKnightItemStatLine(item)}</div>
                          </button>
                        ))
                      ) : (
                        <div className="rounded-[1rem] border border-dashed border-white/12 px-3 py-5 text-sm text-[#c0cfbf]">
                          还没有战利品，先去打一趟副本。
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  )
}

function HomeStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[1rem] border border-white/10 bg-white/5 px-3 py-3">
      <div className="text-[0.68rem] tracking-[0.22em] text-[#c8d7c8] uppercase">{label}</div>
      <div className="mt-1 text-lg font-black text-[#fbf4dd]">{value}</div>
    </div>
  )
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-3">
      <div className="text-[0.72rem] tracking-[0.22em] text-[#c8d7c8] uppercase">{label}</div>
      <div className="mt-1 text-lg font-black text-[#fbf4dd]">{value}</div>
    </div>
  )
}

function MiniMap({ hud }: { hud: PixelKnightHudState }) {
  const rows = hud.minimapRows
  if (!rows.length) return <div className="h-[108px] w-[192px]" />

  return (
    <svg viewBox={`0 0 ${rows[0].length} ${rows.length}`} className="h-[108px] w-[192px] overflow-hidden rounded-[0.8rem]">
      {rows.map((row, y) =>
        row.split('').map((cell, x) => {
          const fill = cell === '#' ? '#33473a' : '#d6dfb6'
          return <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill} />
        }),
      )}
      <rect x={hud.portalCell.x} y={hud.portalCell.y} width="1" height="1" fill="#7ae4ff" />
      <rect x={hud.playerCell.x} y={hud.playerCell.y} width="1" height="1" fill="#ffde7a" />
    </svg>
  )
}
