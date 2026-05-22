import { useEffect, useRef, useState } from 'react'
import { Cog, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import {
  createStarTripGame,
  STAR_TRIP_DEFAULT_PIXELATION_LEVEL,
  STAR_TRIP_MAX_PIXELATION_LEVEL,
  type StarTripGame,
  type StarTripRenderSettings,
} from './game/starTripGame'

const backBtnClass =
  'border-[#365045]/35 bg-[#fff3d3]/70 text-[#18372f] shadow-sm hover:bg-[#fff8e8] dark:border-[#fff3d3]/18 dark:bg-[#fff3d3]/10 dark:text-[#fff3d3] dark:hover:bg-[#fff3d3]/16'

const STAR_TRIP_RENDER_SETTINGS_KEY = 'star-trip-render-settings-v1'

function normalizePixelationLevel(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numberValue)) return STAR_TRIP_DEFAULT_PIXELATION_LEVEL
  return Math.min(STAR_TRIP_MAX_PIXELATION_LEVEL, Math.max(0, Math.round(numberValue)))
}

function loadRenderSettings(): StarTripRenderSettings {
  if (typeof window === 'undefined') {
    return { pixelationLevel: STAR_TRIP_DEFAULT_PIXELATION_LEVEL }
  }
  try {
    const raw = window.localStorage.getItem(STAR_TRIP_RENDER_SETTINGS_KEY)
    if (!raw) return { pixelationLevel: STAR_TRIP_DEFAULT_PIXELATION_LEVEL }
    const parsed = JSON.parse(raw) as Partial<StarTripRenderSettings>
    return { pixelationLevel: normalizePixelationLevel(parsed.pixelationLevel) }
  } catch {
    return { pixelationLevel: STAR_TRIP_DEFAULT_PIXELATION_LEVEL }
  }
}

function saveRenderSettings(settings: StarTripRenderSettings) {
  try {
    window.localStorage.setItem(STAR_TRIP_RENDER_SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Storage can be unavailable in private or embedded contexts; gameplay should keep working.
  }
}

function pixelationLabel(level: number) {
  return `${level}px`
}

export default function StarTripView() {
  const navigate = useNavigate()
  const hostRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<StarTripGame | null>(null)
  const settingsPanelRef = useRef<HTMLElement | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [renderSettings, setRenderSettings] = useState<StarTripRenderSettings>(() => loadRenderSettings())
  const initialRenderSettingsRef = useRef(renderSettings)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    let disposed = false

    createStarTripGame(host, { renderSettings: initialRenderSettingsRef.current })
      .then((createdGame) => {
        if (disposed) {
          createdGame.dispose()
          return
        }
        gameRef.current = createdGame
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        host.replaceChildren()
        const errorEl = document.createElement('pre')
        errorEl.dataset.testid = 'star-trip-load-error'
        errorEl.className = 'm-4 whitespace-pre-wrap rounded-lg bg-red-950/80 p-4 text-sm text-red-100'
        errorEl.textContent = `Star Trip failed to load Pico model:\\n${message}`
        host.appendChild(errorEl)
        throw error
      })

    return () => {
      disposed = true
      gameRef.current?.dispose()
      gameRef.current = null
    }
  }, [])

  useEffect(() => {
    const normalized = { pixelationLevel: normalizePixelationLevel(renderSettings.pixelationLevel) }
    gameRef.current?.setRenderSettings(normalized)
    saveRenderSettings(normalized)
  }, [renderSettings])

  useEffect(() => {
    if (!settingsOpen) return
    window.requestAnimationFrame(() => settingsPanelRef.current?.focus({ preventScroll: true }))
  }, [settingsOpen])

  const updatePixelationLevel = (level: number) => {
    setRenderSettings({ pixelationLevel: normalizePixelationLevel(level) })
  }

  const closeSettings = () => {
    setSettingsOpen(false)
    window.requestAnimationFrame(() => gameRef.current?.focus())
  }

  return (
    <main
      className={cn(
        'star-trip-page relative min-h-[100dvh] w-full overflow-hidden',
        'bg-[linear-gradient(180deg,#e8efd8_0%,#c9dfd5_48%,#a9c9c8_100%)] text-[#18372f]',
        'dark:bg-[linear-gradient(180deg,#102d3a_0%,#123b3c_55%,#172534_100%)] dark:text-[#fff3d3]',
        'px-4 py-8 pb-28 sm:px-6 sm:pb-12 sm:pl-24',
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-1 bg-gradient-to-r from-transparent via-[#e55d55]/60 to-transparent dark:via-[#fff3d3]/36"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-70 dark:opacity-55"
        style={{
          background:
            'radial-gradient(70% 50% at 18% 12%, rgba(255,243,211,0.48), transparent 58%), radial-gradient(60% 48% at 86% 20%, rgba(105,166,198,0.28), transparent 62%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-[1] mx-auto max-w-4xl">
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/games')}
            className={backBtnClass}
            aria-label="Back to game center"
          >
            Back
          </Button>
        </div>

        <div
          className={cn(
            'relative mt-6 w-full overflow-hidden rounded-xl border shadow-xl ring-1',
            'border-[#365045]/20 bg-[#102d3a] ring-black/10',
            'dark:border-[#fff3d3]/16 dark:ring-black/35',
          )}
        >
          <div
            data-testid="star-trip-playfield"
            className="relative aspect-[16/10] w-full min-h-[220px]"
            aria-label="A Star Trip playfield"
          >
            <div ref={hostRef} className="absolute inset-0" aria-hidden={settingsOpen ? true : undefined} />
            {!settingsOpen ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  'absolute right-3 top-3 z-20 size-9 rounded-lg border shadow-sm backdrop-blur-md',
                  'border-[#fff3d3]/24 bg-[#102d3a]/48 text-[#fff3d3] hover:bg-[#fff3d3]/16 hover:text-[#fff8e8]',
                  'focus-visible:ring-[#fff3d3]/45',
                )}
                aria-label="Open render settings"
                aria-expanded={false}
                data-testid="star-trip-settings-button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation()
                  setSettingsOpen(true)
                }}
              >
                <Cog aria-hidden="true" />
              </Button>
            ) : null}

            {settingsOpen ? (
              <section
                ref={settingsPanelRef}
                className={cn(
                  'absolute inset-2 z-30 flex flex-col overflow-hidden rounded-xl border p-4 shadow-2xl backdrop-blur-md sm:inset-4 sm:p-6',
                  'border-[#fff3d3]/22 bg-[#102d3a]/88 text-[#fff3d3]',
                )}
                aria-label="Render settings"
                data-testid="star-trip-settings-panel"
                tabIndex={-1}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerMove={(event) => event.stopPropagation()}
                onWheel={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                onKeyUp={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold leading-8">配置</h2>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 self-start rounded-lg text-[#fff3d3]/80 hover:bg-[#fff3d3]/12 hover:text-[#fff8e8]"
                    aria-label="Close render settings"
                    data-testid="star-trip-settings-close"
                    onClick={closeSettings}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>

                <div className="mt-auto grid gap-4 pb-1 sm:mt-16">
                  <div className="flex items-end justify-between gap-4">
                    <label htmlFor="star-trip-pixelation-level" className="text-sm font-medium">
                      像素化幅度
                    </label>
                    <output
                      htmlFor="star-trip-pixelation-level"
                      className="min-w-14 rounded-md border border-[#fff3d3]/18 bg-[#fff3d3]/10 px-2 py-1 text-center text-sm font-semibold"
                      data-testid="star-trip-pixelation-value"
                    >
                      {pixelationLabel(renderSettings.pixelationLevel)}
                    </output>
                  </div>
                  <input
                    id="star-trip-pixelation-level"
                    type="range"
                    min={0}
                    max={STAR_TRIP_MAX_PIXELATION_LEVEL}
                    step={1}
                    value={renderSettings.pixelationLevel}
                    aria-label="Pixelation level"
                    data-testid="star-trip-pixelation-slider"
                    className="h-2 w-full cursor-pointer accent-[#ffd99b]"
                    onChange={(event) => updatePixelationLevel(Number(event.currentTarget.value))}
                  />
                  <div className="flex justify-between text-[11px] text-[#fff3d3]/58">
                    <span>0px</span>
                    <span>3px</span>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}
