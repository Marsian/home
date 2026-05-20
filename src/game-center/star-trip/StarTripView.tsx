import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { createStarTripGame } from './game/starTripGame'

const backBtnClass =
  'border-[#365045]/35 bg-[#fff3d3]/70 text-[#18372f] shadow-sm hover:bg-[#fff8e8] dark:border-[#fff3d3]/18 dark:bg-[#fff3d3]/10 dark:text-[#fff3d3] dark:hover:bg-[#fff3d3]/16'

export default function StarTripView() {
  const navigate = useNavigate()
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    const game = createStarTripGame(host)
    return () => game.dispose()
  }, [])

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
            ref={hostRef}
            data-testid="star-trip-playfield"
            className="relative aspect-[16/10] w-full min-h-[220px]"
            aria-label="A Star Trip playfield"
          />
        </div>
      </div>
    </main>
  )
}
