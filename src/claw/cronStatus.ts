/**
 * Shape of `cron_task_status.status` written by OpenClaw (observed from live data).
 * Fields are optional where we still want partial rendering.
 */
export type CronTask = {
  task_id: string
  task_name: string
  status: string
  last_run: string
  next_run: string
  last_result: string
  model: string
}

export type CronSummary = {
  healthy: boolean
  issues: unknown[]
}

export type CronStatusPayload = {
  check_time?: string
  total_tasks: number
  active_tasks: number
  failed_tasks: number
  tasks: CronTask[]
  summary?: CronSummary
}

function normalizeTask(raw: unknown): CronTask | null {
  if (!raw || typeof raw !== 'object') return null
  const x = raw as Record<string, unknown>
  return {
    task_id: String(x.task_id ?? ''),
    task_name: String(x.task_name ?? ''),
    status: String(x.status ?? ''),
    last_run: String(x.last_run ?? ''),
    next_run: String(x.next_run ?? ''),
    last_result: String(x.last_result ?? ''),
    model: String(x.model ?? ''),
  }
}

function normalizeSummary(raw: unknown): CronSummary | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const x = raw as Record<string, unknown>
  const issues = Array.isArray(x.issues) ? x.issues : []
  return {
    healthy: typeof x.healthy === 'boolean' ? x.healthy : issues.length === 0,
    issues,
  }
}

/** Derive counts from tasks when top-level counters are missing. */
function deriveCounts(tasks: CronTask[], o: Record<string, unknown>) {
  const failedGuess = tasks.filter(
    (t) =>
      /fail|error|stopped/i.test(t.status) ||
      /fail|error/i.test(t.last_result),
  ).length
  const activeGuess = tasks.filter((t) => /active|running/i.test(t.status)).length

  const total_tasks =
    typeof o.total_tasks === 'number' ? o.total_tasks : tasks.length
  const active_tasks =
    typeof o.active_tasks === 'number' ? o.active_tasks : activeGuess
  const failed_tasks =
    typeof o.failed_tasks === 'number' ? o.failed_tasks : failedGuess

  return { total_tasks, active_tasks, failed_tasks }
}

/**
 * Parse Supabase `status` JSON. Returns null only when `raw` is not a non-null object.
 */
export function parseCronStatus(raw: unknown): CronStatusPayload | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const tasksRaw = o.tasks
  const tasks: CronTask[] = Array.isArray(tasksRaw)
    ? (tasksRaw.map(normalizeTask).filter(Boolean) as CronTask[])
    : []

  const { total_tasks, active_tasks, failed_tasks } = deriveCounts(tasks, o)

  return {
    check_time: typeof o.check_time === 'string' ? o.check_time : undefined,
    total_tasks,
    active_tasks,
    failed_tasks,
    tasks,
    summary: normalizeSummary(o.summary),
  }
}
