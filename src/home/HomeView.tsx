import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import '@fontsource/open-sans/300.css'
import '@fontsource/open-sans/500.css'
import {
  FileText,
  Moon,
  Sun,
} from 'lucide-react'

function cn(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(' ')
}

export default function HomeView() {
  const navigate = useNavigate()

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored =
      typeof window !== 'undefined' ? window.localStorage.getItem('theme') : null
    if (stored === 'light' || stored === 'dark') return stored
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
    return prefersDark ? 'dark' : 'light'
  })

  function toggleTheme() {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      window.localStorage.setItem('theme', next)
      return next
    })
  }

  // Ensure the homepage stays truly full-screen (no scrollbar).
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    const prevHeight = document.body.style.height
    document.body.style.overflow = 'hidden'
    document.body.style.height = '100vh'

    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.height = prevHeight
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const isDark = theme === 'dark'

  return (
    <div
      className={cn(
        'relative h-screen bg-white text-black dark:bg-[#050A12] dark:text-white transition-colors overflow-hidden',
      )}
    >
      {/* Floating icon menu */}
      <div className="fixed left-[18px] top-1/2 -translate-y-1/2 z-[60]">
        <div
          className={cn(
            'rounded-[18px] backdrop-blur border shadow-xl px-[10px] py-[10px]',
            isDark
              ? 'bg-[#0f172a]/85 border-white/10'
              : 'bg-white/85 border-black/5',
          )}
        >
          <div className="flex flex-col gap-[8px]">
            <button
              type="button"
              onClick={() => navigate('/resume')}
              className={cn(
                'h-[40px] w-[40px] rounded-[14px] flex items-center justify-center',
                isDark
                  ? 'text-[#8ab4ff] hover:text-[#c3dcff] hover:bg-[#8ab4ff]/10 focus-visible:ring-[#8ab4ff]/40'
                  : 'text-[#4679bd] hover:text-[#2e5fa0] hover:bg-[#4679bd]/10 focus-visible:ring-[#4679bd]/40',
                'focus-visible:outline-none focus-visible:ring-2',
                'transition-colors',
              )}
              aria-label="Resume"
              title="Resume"
            >
              <FileText className="h-[20px] w-[20px]" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className={cn(
                'h-[40px] w-[40px] rounded-[14px] flex items-center justify-center',
                isDark
                  ? 'text-[#8ab4ff] hover:text-[#c3dcff] hover:bg-[#8ab4ff]/10 focus-visible:ring-[#8ab4ff]/40'
                  : 'text-[#4679bd] hover:text-[#2e5fa0] hover:bg-[#4679bd]/10 focus-visible:ring-[#4679bd]/40',
                'focus-visible:outline-none focus-visible:ring-2',
                'transition-colors',
              )}
              aria-label="Theme"
              title="Theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-[20px] w-[20px]" aria-hidden="true" />
              ) : (
                <Moon className="h-[20px] w-[20px]" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div
        className={cn(
          'transition-transform duration-[400ms] overflow-x-hidden h-full',
        )}
      >
        <section
          className={cn(
            'relative w-full h-full overflow-hidden text-center',
            'transition-colors',
            'bg-no-repeat bg-center bg-cover',
            'max-md:bg-contain max-md:bg-top',
            "bg-[url('/images/Waikiki.jpg')]",
          )}
        >
          <div
            aria-hidden="true"
            className={cn(
              'absolute inset-0 bg-black/10 transition-colors',
              isDark && 'bg-black/45',
            )}
          />

          <div className="relative h-full flex items-center justify-center">
            <div className="w-[80%] max-w-[700px]">
              <h1
                className={cn(
                  'text-[3.2rem] sm:text-[5rem] font-bold tracking-[-0.03em] text-white/95 drop-shadow-[0_1px_3px_#000]',
                  'animate-fade-in-down-home [animation-delay:0.18s]',
                )}
              >
                Yanxi Wang
              </h1>
              <h2
                className={cn(
                  'm-0 text-[1.35rem] sm:text-[2rem] leading-[1.35em] font-bold text-white/90 drop-shadow-[0_1px_1px_#000]',
                  'font-serif animate-fade-in-down-home [animation-delay:0.22s]',
                )}
              >
                Web Developer
              </h2>
            </div>
          </div>

        </section>

        {/* timeline removed */}
      </div>
    </div>
  )
}

