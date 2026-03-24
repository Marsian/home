import { Skeleton } from '@/components/ui/skeleton'

function cn(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(' ')
}

function TaskCardSkeleton() {
  return (
    <div
      className={cn(
        'flex w-full min-w-0 shrink-0 flex-col gap-4 rounded-xl border border-black/10 bg-white/50 p-4 dark:border-border dark:bg-muted/50',
        'sm:flex-row sm:items-start sm:gap-6',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="mt-1 h-3 w-full max-w-xl" />
      </div>
      <div
        className={cn(
          'grid w-full shrink-0 grid-cols-2 gap-x-6 gap-y-2 text-xs sm:w-96 sm:flex-none sm:shrink-0 sm:grid-cols-4',
        )}
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="min-w-0">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="mt-0.5 h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function CronStatusPanelSkeleton() {
  return (
    <div className="mt-6 w-full min-w-0 space-y-8" aria-busy="true" aria-label="加载任务状态">
      <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-stretch">
        <div
          className={cn(
            'flex min-h-[6.625rem] flex-1 flex-col justify-center rounded-xl border border-black/10 px-4 py-4 lg:max-w-md',
            'dark:border-border',
          )}
        >
          <div className="flex items-center gap-2">
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="mt-2 h-3 w-48" />
          <Skeleton className="mt-3 h-3 w-full max-w-xs" />
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'min-h-[6.625rem] rounded-xl border border-black/10 px-4 py-3 ring-1 ring-inset ring-black/5',
                'dark:border-border dark:ring-white/5',
              )}
            >
              <Skeleton className="h-3 w-12" />
              <Skeleton className="mt-1 h-8 w-10" />
            </div>
          ))}
        </div>
      </div>

      <div className="w-full min-w-0">
        <Skeleton className="h-3 w-20" />
        <div
          className={cn(
            'mt-3 flex w-full min-w-0 max-h-[calc(5*10.5rem+4*0.75rem)] flex-col gap-3 overflow-hidden',
          )}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <TaskCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
