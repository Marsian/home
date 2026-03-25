import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { CronJobEntry, CronJobsPayload } from './cronJobsStatus'

function cn(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(' ')
}

function formatCheckTime(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

function jobPillVariant(status: string): 'ok' | 'warn' | 'bad' | 'muted' {
  const s = status.toLowerCase()
  if (/error|fail/i.test(s)) return 'bad'
  if (/pause|paused/i.test(s)) return 'warn'
  if (/active|ok|running/i.test(s)) return 'ok'
  return 'muted'
}

function Pill({ label, variant }: { label: string; variant: 'ok' | 'warn' | 'bad' | 'muted' }) {
  const styles = {
    ok: 'bg-green-500/15 text-green-800 ring-green-500/30 dark:text-green-200 dark:ring-green-400/25',
    warn: 'bg-amber-500/15 text-amber-900 ring-amber-500/25 dark:text-amber-200 dark:ring-amber-400/20',
    bad: 'bg-red-500/15 text-red-800 ring-red-500/25 dark:text-red-200 dark:ring-red-400/20',
    muted: 'bg-black/5 text-gray-700 ring-black/10 dark:bg-white/10 dark:text-muted-foreground dark:ring-white/10',
  } as const
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        styles[variant],
      )}
    >
      {label}
    </span>
  )
}

const jobStatStyles = {
  total:
    'border-slate-200/70 bg-slate-50/40 dark:border-slate-800/80 dark:bg-slate-950/25',
  active:
    'border-emerald-200/50 bg-emerald-500/[0.06] dark:border-emerald-900/35 dark:bg-emerald-500/[0.07]',
  paused:
    'border-amber-200/50 bg-amber-500/[0.06] dark:border-amber-900/35 dark:bg-amber-500/[0.07]',
  error:
    'border-rose-200/50 bg-rose-500/[0.06] dark:border-rose-900/35 dark:bg-rose-500/[0.07]',
} as const

function JobsSkeleton() {
  return (
    <div className="mt-4 space-y-2" aria-busy aria-label="加载 Jobs">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  )
}

type Props = {
  loading: boolean
  error: string | null
  fetchedAt: string | null
  rowId: number | null
  payload: CronJobsPayload | null
  hasRow: boolean
  onRefresh: () => void
}

export function CronJobsPanel({ loading, error, fetchedAt, rowId, payload, hasRow, onRefresh }: Props) {
  return (
    <section className="rounded-xl border border-black/10 bg-white/70 p-5 backdrop-blur-sm dark:border-border dark:bg-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Cron Jobs</h2>
          {loading && !payload && !error ? (
            <div className="mt-4 space-y-1" aria-hidden>
              <Skeleton className="h-3 w-48 max-w-full" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
          ) : (
            <div className="mt-4 min-w-0 space-y-1 text-xs leading-[1.1rem] text-muted-foreground">
              <p className="flex flex-wrap items-center gap-x-1">
                <span>
                  数据源：<code className="rounded bg-black/5 px-1 dark:bg-white/10">cron_jobs</code>
                </span>
                {rowId != null ? (
                  <span>
                    · 行 <span className="tabular-nums">#{rowId}</span>
                  </span>
                ) : null}
                {fetchedAt && !payload ? (
                  <span>
                    · 上次同步 {new Date(fetchedAt).toLocaleString()}
                  </span>
                ) : null}
              </p>
              {payload ? (
                <p className="flex flex-wrap items-baseline gap-x-1.5">
                  <span>检测时间 {formatCheckTime(payload.check_time)}</span>
                  <span className="text-muted-foreground/40" aria-hidden>
                    ·
                  </span>
                  <span>
                    上次同步 {fetchedAt ? new Date(fetchedAt).toLocaleString() : '—'}
                  </span>
                </p>
              ) : null}
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={loading}
          onClick={onRefresh}
          className="shrink-0"
          aria-label={loading ? '拉取中' : '刷新'}
          title="刷新"
        >
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} aria-hidden />
        </Button>
      </div>

      {error ? (
        <div
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {loading && !payload && !error ? <JobsSkeleton /> : null}

      {!loading && !payload && !error && !hasRow ? (
        <div className="mt-6 rounded-lg border border-dashed border-black/15 bg-white/50 py-10 text-center text-sm text-muted-foreground dark:border-border dark:bg-muted/50">
          暂无 <code className="text-xs">cron_jobs</code> 数据。
        </div>
      ) : null}

      {!loading && hasRow && !payload && !error ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          无法解析 <code className="font-mono text-xs">status</code> JSON。
        </div>
      ) : null}

      {payload ? (
        <div className="mt-3 min-w-0 space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ['总计', payload.total_jobs, 'total'],
                ['活跃', payload.active_jobs, 'active'],
                ['暂停', payload.paused_jobs, 'paused'],
                ['异常', payload.error_jobs, 'error'],
              ] as const
            ).map(([label, value, kind]) => (
              <div
                key={label}
                className={cn(
                  'rounded-lg border px-3 py-2 ring-1 ring-inset ring-black/[0.03] dark:ring-white/[0.04]',
                  jobStatStyles[kind],
                )}
              >
                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className="text-lg font-semibold tabular-nums text-foreground">{value}</div>
              </div>
            ))}
          </div>
          <ul className="space-y-2">
            {payload.jobs.map((job: CronJobEntry) => (
              <li
                key={job.id || job.name}
                className="flex min-w-0 items-start justify-between gap-2 rounded-lg border border-black/10 bg-white/60 px-3 py-2 dark:border-border dark:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium leading-snug">{job.name.trim() || job.id || '—'}</p>
                  {job.id ? (
                    <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground" title={job.id}>
                      {job.id}
                    </p>
                  ) : null}
                </div>
                <Pill label={job.status || '—'} variant={jobPillVariant(job.status)} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
