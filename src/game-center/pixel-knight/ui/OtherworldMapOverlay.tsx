import { useMemo, useState } from 'react'
import { Swords } from 'lucide-react'

import otherworldMapBaseDetail2x from '@/game-center/pixel-knight/assets/otherworld/otherworld-map-base-biomes@2x-detail.png'
import autumnWoodEntrance from '@/game-center/pixel-knight/assets/otherworld/04-autumn-spirit-grove-left.png'
import clockTempleEntrance from '@/game-center/pixel-knight/assets/otherworld/08-ancient-clockwork-temple-front.png'
import cloudAltarEntrance from '@/game-center/pixel-knight/assets/otherworld/10-sky-altar-portal-left.png'
import crystalRiftEntrance from '@/game-center/pixel-knight/assets/otherworld/06-shadow-crystal-rift-front.png'
import emberForgeEntrance from '@/game-center/pixel-knight/assets/otherworld/01-volcanic-forge-gate-right.png'
import frostPeakEntrance from '@/game-center/pixel-knight/assets/otherworld/02-frost-peak-shrine-front.png'
import jadeTowerEntrance from '@/game-center/pixel-knight/assets/otherworld/03-emerald-ruin-tower-left.png'
import mushroomMarshEntrance from '@/game-center/pixel-knight/assets/otherworld/09-mushroom-swamp-hut-left.png'
import sunObeliskEntrance from '@/game-center/pixel-knight/assets/otherworld/05-desert-sun-obelisk-right.png'
import tideCaveEntrance from '@/game-center/pixel-knight/assets/otherworld/07-tropical-tide-cave-right.png'
import closeButtonFrame from '@/game-center/pixel-knight/assets/ui/inventory/close-button-v2.png'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { DifficultyTier, DungeonId } from '../types'

type OtherworldEntrance = {
  dungeonId: DungeonId
  name: string
  src: string
  x: number
  y: number
  width: number
  imageWidth: number
  imageHeight: number
  zIndex: number
}

const otherworldEntrances: OtherworldEntrance[] = [
  { dungeonId: 'ember-forge', name: '熔炉', src: emberForgeEntrance, x: 28, y: 26.5, width: 8, imageWidth: 371, imageHeight: 338, zIndex: 10 },
  { dungeonId: 'frost-peak', name: '霜峰', src: frostPeakEntrance, x: 47, y: 21, width: 8, imageWidth: 312, imageHeight: 348, zIndex: 11 },
  { dungeonId: 'jade-tower', name: '翠塔', src: jadeTowerEntrance, x: 68.5, y: 26, width: 8.5, imageWidth: 291, imageHeight: 339, zIndex: 12 },
  { dungeonId: 'sun-obelisk', name: '沙碑', src: sunObeliskEntrance, x: 19.5, y: 47.5, width: 8.5, imageWidth: 339, imageHeight: 365, zIndex: 20 },
  { dungeonId: 'crystal-rift', name: '晶隙', src: crystalRiftEntrance, x: 48, y: 45, width: 8, imageWidth: 322, imageHeight: 350, zIndex: 21 },
  { dungeonId: 'autumn-wood', name: '枫林入口', src: autumnWoodEntrance, x: 82, y: 45.5, width: 9, imageWidth: 305, imageHeight: 324, zIndex: 22 },
  { dungeonId: 'tide-cave', name: '潮洞', src: tideCaveEntrance, x: 23.2, y: 72.5, width: 9, imageWidth: 349, imageHeight: 360, zIndex: 30 },
  { dungeonId: 'clock-temple', name: '机殿', src: clockTempleEntrance, x: 44.2, y: 75.5, width: 9, imageWidth: 305, imageHeight: 343, zIndex: 31 },
  { dungeonId: 'mushroom-marsh', name: '蘑沼', src: mushroomMarshEntrance, x: 65.7, y: 67.5, width: 9, imageWidth: 314, imageHeight: 346, zIndex: 32 },
  { dungeonId: 'cloud-altar', name: '云坛', src: cloudAltarEntrance, x: 78, y: 81, width: 10, imageWidth: 313, imageHeight: 360, zIndex: 33 },
]

const mapAspectRatio = 1570 / 1002
const focusScale = 3
const closeButtonClassName =
  'absolute right-3 top-3 z-40 h-12 w-12 transition hover:scale-105 active:scale-95 sm:right-5 sm:top-5 sm:h-14 sm:w-14'

export function OtherworldMapOverlay({
  selectedDungeonId,
  unlockedDifficultiesByDungeon,
  availableDungeonIds,
  onSelectDungeon,
  onEnter,
  onClose,
}: {
  selectedDungeonId: DungeonId
  unlockedDifficultiesByDungeon: Record<DungeonId, DifficultyTier[]>
  availableDungeonIds: DungeonId[]
  onSelectDungeon: (dungeonId: DungeonId) => void
  onEnter: () => void
  onClose: () => void
}) {
  const availableDungeonSet = useMemo(() => new Set(availableDungeonIds), [availableDungeonIds])
  const [focusedDungeonId, setFocusedDungeonId] = useState<DungeonId | null>(null)
  const focusedEntrance = useMemo(
    () => otherworldEntrances.find((entry) => entry.dungeonId === focusedDungeonId) ?? null,
    [focusedDungeonId],
  )
  const focusedEntranceHeight = focusedEntrance
    ? focusedEntrance.width * (focusedEntrance.imageHeight / focusedEntrance.imageWidth) * mapAspectRatio
    : 0
  const focusedEntranceCenterY = focusedEntrance ? focusedEntrance.y - focusedEntranceHeight * 0.5 : 50
  const cameraStyle = {
    transform: focusedEntrance
      ? `translate(calc(50% - ${focusedEntrance.x * focusScale}%), calc(50% - ${focusedEntranceCenterY * focusScale}%)) scale(${focusScale})`
      : 'translate(0%, 0%) scale(1)',
    transformOrigin: '0 0',
  }

  const selectEntrance = (entrance: OtherworldEntrance) => {
    onSelectDungeon(entrance.dungeonId)
    setFocusedDungeonId(entrance.dungeonId)
  }
  const focusedEntranceAvailable = focusedEntrance ? availableDungeonSet.has(focusedEntrance.dungeonId) : false
  const focusedEntranceUnlocked = focusedEntrance
    ? Boolean(unlockedDifficultiesByDungeon[focusedEntrance.dungeonId]?.length)
    : false

  return (
    <div className="absolute inset-0 z-30 overflow-hidden bg-[#071017] text-[#fff0c8]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(77,177,188,0.18),transparent_36%),linear-gradient(180deg,rgba(8,12,18,0.12),rgba(4,7,10,0.42))]" />

      <div className="absolute inset-0 grid place-items-center overflow-hidden">
        <div
          className={cn(
            'relative aspect-[1570/1002] h-full max-h-full w-full max-w-full transition-transform duration-500 ease-out motion-reduce:transition-none',
            focusedEntrance ? 'drop-shadow-[0_34px_80px_rgba(0,0,0,0.55)]' : null,
          )}
          style={cameraStyle}
        >
          <img
            src={otherworldMapBaseDetail2x}
            alt=""
            className="absolute inset-0 h-full w-full select-none object-contain"
            draggable={false}
            style={{ imageRendering: 'pixelated' }}
          />

          {otherworldEntrances.map((entrance) => {
            const focused = focusedDungeonId === entrance.dungeonId
            const muted = focusedDungeonId != null && !focused
            return (
              <button
                key={entrance.dungeonId}
                type="button"
                onClick={() => selectEntrance(entrance)}
                className={cn(
                  'group absolute outline-none transition duration-150 ease-out motion-reduce:transition-none',
                  muted ? 'brightness-[0.62] saturate-[0.75] opacity-65' : 'opacity-100',
                  focused ? 'brightness-110' : null,
                )}
                style={{
                  left: `${entrance.x}%`,
                  top: `${entrance.y}%`,
                  width: `${entrance.width}%`,
                  zIndex: entrance.zIndex,
                  transform: 'translate(-50%, -100%)',
                  transformOrigin: '50% 88%',
                }}
                aria-label={`选择${entrance.name}`}
                aria-pressed={selectedDungeonId === entrance.dungeonId}
              >
                <img
                  src={entrance.src}
                  alt=""
                  className={cn(
                    'h-auto w-full select-none object-contain drop-shadow-[0_10px_7px_rgba(18,12,8,0.38)] transition duration-150 motion-reduce:transition-none',
                    'group-hover:scale-105 group-hover:drop-shadow-[0_14px_10px_rgba(18,12,8,0.44)] group-focus-visible:scale-105 group-active:scale-[1.02]',
                    focused ? 'scale-105' : null,
                  )}
                  draggable={false}
                  style={{ imageRendering: 'pixelated' }}
                />
              </button>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className={closeButtonClassName}
        aria-label="关闭异界地图"
      >
        <img
          src={closeButtonFrame}
          alt=""
          className="h-full w-full object-contain"
          draggable={false}
          style={{ imageRendering: 'pixelated' }}
        />
      </button>

      {focusedEntrance ? (
        <>
          <div
            className="absolute inset-x-0 top-0 z-40 h-[18%] min-h-[5.75rem] bg-[#050607] shadow-[0_18px_42px_rgba(0,0,0,0.46)]"
            style={{
              clipPath:
                'polygon(0 0,100% 0,100% 82%,96% 90%,92% 82%,88% 90%,84% 82%,80% 90%,76% 82%,72% 90%,68% 82%,64% 90%,60% 82%,56% 90%,52% 82%,48% 90%,44% 82%,40% 90%,36% 82%,32% 90%,28% 82%,24% 90%,20% 82%,16% 90%,12% 82%,8% 90%,4% 82%,0 90%)',
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center pb-[1.8%]">
              <button
                type="button"
                onClick={() => setFocusedDungeonId(null)}
                className={closeButtonClassName}
                aria-label="取消入口选择"
              >
                <img
                  src={closeButtonFrame}
                  alt=""
                  className="h-full w-full object-contain"
                  draggable={false}
                  style={{ imageRendering: 'pixelated' }}
                />
              </button>
              <div
                className="text-[clamp(2rem,5.5vw,4rem)] font-black leading-none tracking-[0.16em] text-[#f6df9f]"
                style={{ textShadow: '0 4px 0 #2b0f0d, 4px 0 0 #2b0f0d, -4px 0 0 #2b0f0d, 0 -4px 0 #2b0f0d' }}
              >
                {focusedEntrance.name}
              </div>
            </div>
          </div>

          <div
            className="absolute inset-x-0 bottom-0 z-40 flex h-[18%] min-h-[5.75rem] items-center justify-center bg-[#050607] px-4 pt-[1.8%] shadow-[0_-18px_42px_rgba(0,0,0,0.46)]"
            style={{
              clipPath:
                'polygon(0 10%,4% 18%,8% 10%,12% 18%,16% 10%,20% 18%,24% 10%,28% 18%,32% 10%,36% 18%,40% 10%,44% 18%,48% 10%,52% 18%,56% 10%,60% 18%,64% 10%,68% 18%,72% 10%,76% 18%,80% 10%,84% 18%,88% 10%,92% 18%,96% 10%,100% 18%,100% 100%,0 100%)',
            }}
          >
              <Button
                type="button"
                onClick={() => {
                  if (focusedEntranceAvailable && focusedEntranceUnlocked) onEnter()
                }}
                disabled={!focusedEntranceAvailable || !focusedEntranceUnlocked}
                className="h-12 min-w-[10rem] rounded-none border-2 border-[#7a441f] bg-[#d9422f] px-8 text-lg font-black tracking-[0.12em] text-[#fff2c7] shadow-[inset_0_2px_0_rgba(255,255,255,0.28),0_4px_0_#6f271f] hover:bg-[#ef543b] active:translate-y-0.5 sm:h-14"
              >
                <Swords className="size-5" />
                {focusedEntranceAvailable ? '进入' : '未开放'}
              </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}
