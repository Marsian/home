/**
 * `cron_task_status.status` JSON — fixed shape from OpenClaw.
 */

function unwrapJson(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x)
}

function str(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v)
  return undefined
}

export class CronSummary {
  constructor(
    readonly healthy: boolean,
    readonly issues: unknown[],
  ) {}

  static fromJSON(raw: unknown): CronSummary | undefined {
    if (!isRecord(raw)) return undefined
    const issues = Array.isArray(raw.issues) ? raw.issues : []
    const healthy = typeof raw.healthy === 'boolean' ? raw.healthy : issues.length === 0
    return new CronSummary(healthy, issues)
  }
}

export class CronTask {
  constructor(
    readonly job_name: string,
    readonly status: string,
    readonly task_id: string,
    readonly task_name: string,
    readonly last_run: string,
    readonly next_run: string,
    readonly last_result: string,
    readonly time: string,
    readonly duration_ms: string,
    readonly model: string,
    readonly agent_id: string,
    readonly session_id: string,
    readonly input_tokens: number | undefined,
    readonly output_tokens: number | undefined,
  ) {}

  /** 卡片标题：优先 job_name，否则 task_name */
  get displayTitle(): string {
    return this.job_name.trim() || this.task_name.trim() || '未命名任务'
  }

  static fromJSON(raw: unknown): CronTask | null {
    if (!isRecord(raw)) return null
    return new CronTask(
      str(raw.job_name),
      str(raw.status),
      str(raw.task_id),
      str(raw.task_name),
      str(raw.last_run),
      str(raw.next_run),
      str(raw.last_result),
      str(raw.time),
      str(raw.duration_ms),
      str(raw.model),
      str(raw.agent_id),
      str(raw.session_id),
      num(raw.input_tokens),
      num(raw.output_tokens),
    )
  }
}

export class CronStatusPayload {
  constructor(
    readonly check_time: string,
    readonly total_tasks: number,
    readonly active_tasks: number,
    readonly failed_tasks: number,
    readonly tasks: CronTask[],
    readonly summary: CronSummary | undefined,
  ) {}

  static parse(raw: unknown): CronStatusPayload | null {
    const data = unwrapJson(raw)
    if (!isRecord(data)) return null
    const tasksRaw = data.tasks
    if (!Array.isArray(tasksRaw)) return null

    const tasks: CronTask[] = []
    for (const item of tasksRaw) {
      const t = CronTask.fromJSON(item)
      if (t) tasks.push(t)
    }

    const failedGuess = tasks.filter(
      (t) => /fail|error|stopped/i.test(t.status) || /fail|error/i.test(t.last_result),
    ).length
    const activeGuess = tasks.filter((t) => /active|running/i.test(t.status)).length

    const total_tasks = num(data.total_tasks) ?? tasks.length
    const active_tasks = num(data.active_tasks) ?? activeGuess
    const failed_tasks = num(data.failed_tasks) ?? failedGuess

    const summary =
      CronSummary.fromJSON(data.summary) ??
      (Array.isArray(data.issues)
        ? new CronSummary(
            typeof data.healthy === 'boolean' ? data.healthy : data.issues.length === 0,
            data.issues,
          )
        : undefined)

    return new CronStatusPayload(
      str(data.check_time),
      total_tasks,
      active_tasks,
      failed_tasks,
      tasks,
      summary,
    )
  }
}

export function parseCronStatus(raw: unknown): CronStatusPayload | null {
  return CronStatusPayload.parse(raw)
}
