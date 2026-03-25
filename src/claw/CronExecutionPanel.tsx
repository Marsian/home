import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { CronStatusPayload, CronTask } from './cronStatus'
import { CronExecutionPanelSkeleton } from './CronExecutionSkeleton'

function cn(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(' ')
}

function formatCheckTime(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

function StatusPill({ label, variant }: { label: string; variant: 'ok' | 'warn' | 'bad' | 'muted' }) {
  const styles = {
    ok: 'bg-green-500/15 text-green-800 ring-green-500/30 dark:text-green-200 dark:ring-green-400/25',
    warn: 'bg-amber-500/15 text-amber-900 ring-amber-500/25 dark:text-amber-200 dark:ring-amber-400/20',
    bad: 'bg-red-500/15 text-red-800 ring-red-500/25 dark:text-red-200 dark:ring-red-400/20',
    muted: 'bg-black/5 text-gray-700 ring-black/10 dark:bg-white/10 dark:text-muted-foreground dark:ring-white/10',
  } as const
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        styles[variant],
      )}
    >
      {label}
    </span>
  )
}

function taskStatusVariant(status: string, lastResult: string): 'ok' | 'warn' | 'bad' | 'muted' {
  if (/fail|error|stopped/i.test(status) || /fail|error/i.test(lastResult)) return 'bad'
  if (/\b(ok|success)\b/i.test(status) || /\b(ok|success)\b/i.test(lastResult)) return 'ok'
  if (/active|running/i.test(status)) return 'muted'
  return 'warn'
}

function formatToken(n: number | undefined): string {
  return n !== undefined ? String(n) : ''
}

function TaskCard({ task }: { task: CronTask }) {
  const sv = taskStatusVariant(task.status, task.last_result)
  const subtitle = task.task_id.trim()
  const displayId =
    subtitle.length > 56 ? `${subtitle.slice(0, 28)}…${subtitle.slice(-16)}` : subtitle

  return (
    <article
      className={cn(
        'flex w-full min-w-0 shrink-0 flex-col gap-4 rounded-xl border border-black/10 bg-white/80 p-4 shadow-xs backdrop-blur-sm',
        'dark:border-border dark:bg-muted/80',
        'transition-shadow hover:shadow-md dark:hover:border-border',
      )}
    >
      <div className="min-w-0 w-full">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight">{task.displayTitle}</h3>
          <StatusPill label={task.status || 'unknown'} variant={sv} />
        </div>
        {subtitle ? (
          <p
            className="mt-1 truncate font-mono text-[11px] text-muted-foreground"
            title={subtitle || undefined}
          >
            {displayId}
          </p>
        ) : null}
      </div>

      <dl
        className={cn(
          'grid w-full min-w-0 grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-3',
        )}
      >
        <div className="min-w-0">
          <dt className="font-mono text-[10px] text-muted-foreground">time</dt>
          <dd className="mt-0.5 break-words font-mono text-[11px] text-foreground">
            {task.time.trim() ? task.time : <span className="text-muted-foreground">—</span>}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="font-mono text-[10px] text-muted-foreground">duration_ms</dt>
          <dd className="mt-0.5 break-words font-mono text-[11px] tabular-nums text-foreground">
            {task.duration_ms.trim() ? task.duration_ms : <span className="text-muted-foreground">—</span>}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="font-mono text-[10px] text-muted-foreground">model</dt>
          <dd className="mt-0.5 break-words font-medium text-foreground">
            {task.model || <span className="text-muted-foreground">—</span>}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="font-mono text-[10px] text-muted-foreground">agent_id</dt>
          <dd className="mt-0.5 break-words font-mono text-[11px] text-foreground">
            {task.agent_id || <span className="text-muted-foreground">—</span>}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="font-mono text-[10px] text-muted-foreground">session_id</dt>
          <dd className="mt-0.5 break-words font-mono text-[11px] text-foreground">
            {task.session_id || <span className="text-muted-foreground">—</span>}
          </dd>
        </div>

        <div
          className={cn(
            'col-span-full grid w-full min-w-0 grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3',
          )}
        >
          <div className="min-w-0">
            <dt className="font-mono text-[10px] text-muted-foreground">input_tokens</dt>
            <dd className="mt-0.5 tabular-nums font-medium text-foreground">
              {formatToken(task.input_tokens) || <span className="text-muted-foreground">—</span>}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="font-mono text-[10px] text-muted-foreground">output_tokens</dt>
            <dd className="mt-0.5 tabular-nums font-medium text-foreground">
              {formatToken(task.output_tokens) || <span className="text-muted-foreground">—</span>}
            </dd>
          </div>
        </div>
      </dl>
    </article>
  )
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string
  value: number | string
  accent: 'neutral' | 'emerald' | 'rose' | 'slate'
}) {
  const ring =
    accent === 'emerald'
      ? 'ring-emerald-500/20 dark:ring-emerald-400/15'
      : accent === 'rose'
        ? 'ring-rose-500/20 dark:ring-rose-400/15'
        : accent === 'slate'
          ? 'ring-slate-400/20 dark:ring-slate-500/20'
          : 'ring-black/5 dark:ring-white/10'
  return (
    <div
      className={cn(
        'rounded-xl border border-black/10 bg-gradient-to-br from-white to-gray-50/90 px-4 py-3 dark:border-border dark:from-muted dark:to-card',
        'ring-1 ring-inset',
        ring,
      )}
    >
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </div>
    </div>
  )
}

type Props = {
  loading: boolean
  error: string | null
  fetchedAt: string | null
  rowId: number | null
  payload: CronStatusPayload | null
  hasRow: boolean
  onRefresh: () => void
}

export function CronExecutionPanel({ loading, error, fetchedAt, rowId, payload, hasRow, onRefresh }: Props) {
  const issues = payload?.summary?.issues ?? []

  return (
    <section
      className={cn(
        'rounded-xl border border-black/10 bg-white/70 p-5 backdrop-blur-sm dark:border-border dark:bg-card',
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Cron 执行记录</h2>
          {loading && !payload && !error ? (
            <div className="mt-4 space-y-1" aria-hidden>
              <Skeleton className="h-3 w-56 max-w-full" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
          ) : (
            <div className="mt-4 min-w-0 space-y-1 text-xs leading-[1.1rem] text-muted-foreground">
              <p className="flex flex-wrap items-center gap-x-1">
                <span>
                  数据源：<code className="rounded bg-black/5 px-1 dark:bg-white/10">cron_task_status</code>
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

      {loading && !payload && !error ? <CronExecutionPanelSkeleton /> : null}

      {!loading && !payload && !error && !hasRow ? (
        <div className="mt-6 rounded-lg border border-dashed border-black/15 bg-white/50 py-12 text-center text-sm text-muted-foreground dark:border-border dark:bg-muted/50">
          暂无数据行。OpenClaw 写入后此处将展示统计与任务卡片。
        </div>
      ) : null}

      {!loading && hasRow && !payload && !error ? (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          无法识别 <code className="font-mono text-xs">status</code> 的结构，请查看控制台中的原始 JSON。
        </div>
      ) : null}

      {payload ? (
        <div className="mt-3 w-full min-w-0 space-y-4">
          <div className="grid min-w-0 grid-cols-3 gap-3">
            <StatTile label="总任务" value={payload.total_tasks} accent="slate" />
            <StatTile label="活跃" value={payload.active_tasks} accent="emerald" />
            <StatTile label="失败" value={payload.failed_tasks} accent="rose" />
          </div>

          {issues.length > 0 ? (
            <ul className="list-inside list-disc text-xs text-rose-800 dark:text-rose-200">
              {issues.map((issue, i) => (
                <li key={i} className="break-words">
                  {typeof issue === 'string' ? issue : JSON.stringify(issue)}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="w-full min-w-0 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">任务列表</h3>
            {payload.tasks.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">暂无任务项。</p>
            ) : (
              <div className={cn('mt-3 flex w-full min-w-0 flex-col gap-3')}>
                {payload.tasks.map((task, i) => (
                  <TaskCard key={task.task_id ? `${task.task_id}-${i}` : `task-${i}`} task={task} />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
