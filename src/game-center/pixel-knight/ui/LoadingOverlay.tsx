import { cn } from '@/lib/utils'

import type { PreloadProgress } from '../types'

type LoadingOverlayProps = {
  progress: PreloadProgress
  error?: string | null
  onRetry?: () => void
}

export function LoadingOverlay({ progress, error, onRetry }: LoadingOverlayProps) {
  const percent = Math.round(progress.ratio * 100)

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[linear-gradient(180deg,rgba(29,41,31,0.7),rgba(12,16,13,0.84))] backdrop-blur-[2px]">
      <div className="w-[min(82vw,440px)] rounded-[1.8rem] border border-[#f7e1a4]/28 bg-[#1c261f]/94 p-6 text-[#f7f0d5] shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[0.72rem] tracking-[0.34em] text-[#f9c76a]/78 uppercase">Pixel Knight</div>
            <h2 className="mt-2 text-[clamp(1.8rem,4vw,2.6rem)] leading-none font-black tracking-[0.08em]">
              像素骑士
            </h2>
          </div>
          <div className="rounded-full border border-[#f7e1a4]/16 bg-[#f7e1a4]/6 px-3 py-1 text-xs tracking-[0.2em] uppercase text-[#efd69c]">
            {error ? 'Retry' : `${percent}%`}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-[auto_1fr_auto] gap-2 text-[0.8rem] text-[#d8d2b9]">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#f1c05c] shadow-[0_0_14px_rgba(241,192,92,0.65)]" />
          <div>{error ?? progress.label}</div>
          <div className="font-semibold tabular-nums">{progress.loaded}/{progress.total}</div>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full border border-[#f7e1a4]/10 bg-black/24">
          <div
            className={cn(
              'h-full rounded-full bg-[linear-gradient(90deg,#f9cc6f,#f7e6a8,#8be59f)] transition-[width] duration-200 ease-out',
              error && 'bg-[linear-gradient(90deg,#ff9b73,#ffc481)]',
            )}
            style={{ width: `${error ? 100 : percent}%` }}
          />
        </div>

        <p className="mt-4 text-sm leading-6 text-[#d9d1b3]">
          {error
            ? '首次进入需要完整准备素材与配置。重试后会重新进行预载，不会直接跳过。'
            : '首次进入会预载资源与副本表，同会话内再次开局只保留较短过渡。'}
        </p>

        {error ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 inline-flex h-10 items-center justify-center rounded-full border border-[#ffd7a1]/30 bg-[#f6d28d] px-5 text-sm font-semibold text-[#443117] transition hover:bg-[#ffe5b5]"
          >
            重新点亮圣殿
          </button>
        ) : null}
      </div>
    </div>
  )
}

