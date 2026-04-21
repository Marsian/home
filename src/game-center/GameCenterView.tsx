import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { games } from './gameRegistry'

export default function GameCenterView() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground transition-colors">
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0',
          'bg-[radial-gradient(circle_at_top,_oklch(0.92_0.06_95/0.65),_transparent_30%),linear-gradient(180deg,_oklch(0.985_0.01_95),_oklch(0.95_0.015_240))]',
          'dark:bg-[radial-gradient(circle_at_top,_oklch(0.38_0.1_230/0.35),_transparent_30%),linear-gradient(180deg,_oklch(0.22_0.03_255),_oklch(0.15_0.025_250))]',
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-64 opacity-35',
          'bg-[linear-gradient(90deg,transparent_0,oklch(0.7_0.16_95/0.16)_18%,transparent_40%,oklch(0.72_0.13_40/0.12)_75%,transparent_100%)]',
          'dark:bg-[linear-gradient(90deg,transparent_0,oklch(0.8_0.17_95/0.2)_18%,transparent_40%,oklch(0.75_0.18_30/0.14)_75%,transparent_100%)]',
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 opacity-[0.14]',
          'bg-[linear-gradient(to_right,oklch(0.45_0.03_250/0.18)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.45_0.03_250/0.18)_1px,transparent_1px)] bg-[size:32px_32px]',
          'dark:bg-[linear-gradient(to_right,oklch(1_0_0/0.14)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0/0.14)_1px,transparent_1px)]',
        )}
      />
      <main
        className={cn(
          'relative mx-auto max-w-4xl px-4 pt-8 pb-[calc(5rem+env(safe-area-inset-bottom))]',
          'overflow-x-hidden sm:px-6 sm:pl-[88px] sm:pt-10',
        )}
      >
        <div className="max-w-2xl">
          <div className="inline-flex items-center rounded-full border border-foreground/10 bg-background/50 px-3 py-1 text-[0.68rem] font-semibold tracking-[0.32em] text-foreground/60 uppercase shadow-[inset_0_1px_0_oklch(1_0_0/0.12)] backdrop-blur-[3px] dark:border-white/14 dark:bg-white/6 dark:text-white/72">
            Arcade Select
          </div>
          <div className="mt-5">
            <div>
              <h1 className="text-[clamp(2.2rem,5.8vw,4.4rem)] leading-none font-bold tracking-[0.08em] text-foreground uppercase">
                Game Center
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-foreground/66 sm:text-[0.95rem] dark:text-white/72">
                Choose a cabinet and jump straight in.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:mt-10">
          {games.map((game) => (
            <Button
              key={game.id}
              type="button"
              onClick={() => navigate(game.route)}
              aria-label={game.cardLabel}
              className={cn(
                'group relative h-auto w-full overflow-hidden rounded-[1.6rem] border-0 p-0 text-left text-inherit',
                'bg-transparent shadow-none transition-transform duration-200 will-change-transform',
                'hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-[oklch(0.78_0.18_95/0.55)] focus-visible:ring-offset-0',
              )}
            >
              <div
                aria-hidden="true"
                className={cn(
                  'absolute inset-0 rounded-[1.6rem]',
                  'bg-[linear-gradient(135deg,oklch(0.99_0.01_95/0.92),oklch(0.95_0.015_240/0.92))]',
                  'dark:bg-[linear-gradient(135deg,oklch(0.23_0.035_255/0.96),oklch(0.19_0.03_250/0.98))]',
                )}
              />
              <div
                aria-hidden="true"
                className={cn(
                  'absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,oklch(0.72_0.12_95/0.5),transparent)] opacity-80',
                  'dark:bg-[linear-gradient(90deg,transparent,oklch(0.92_0.04_95/0.7),transparent)]',
                )}
              />
              <div
                aria-hidden="true"
                className={cn(
                  'absolute inset-0 rounded-[1.6rem] border border-black/8 dark:border-white/10',
                  'shadow-[0_18px_60px_oklch(0.55_0.02_250/0.14),inset_0_1px_0_oklch(1_0_0/0.45)] dark:shadow-[0_18px_60px_oklch(0.02_0_0/0.42),inset_0_1px_0_oklch(1_0_0/0.08)]',
                )}
              />
              <div className="relative flex w-full flex-col gap-4 p-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:gap-5 sm:p-5">
                <div
                  className={cn(
                    'flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem]',
                    'border border-black/8 bg-[linear-gradient(180deg,oklch(0.97_0.02_95),oklch(0.92_0.015_240))] dark:border-white/10 dark:bg-[linear-gradient(180deg,oklch(0.28_0.035_255),oklch(0.2_0.025_250))]',
                    'shadow-[inset_0_1px_0_oklch(1_0_0/0.72),0_12px_24px_oklch(0.55_0.02_250/0.16)] transition-transform duration-200 group-hover:scale-[1.04] dark:shadow-[inset_0_1px_0_oklch(1_0_0/0.08),0_12px_24px_oklch(0.02_0_0/0.25)]',
                  )}
                >
                  {game.thumbnail}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="min-w-0">
                    <div className="truncate text-[1.05rem] font-bold tracking-[0.12em] text-foreground uppercase dark:text-white">
                      {game.title}
                    </div>
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </main>
    </div>
  )
}
