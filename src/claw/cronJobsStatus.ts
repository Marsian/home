/**
 * `cron_jobs.status` JSON — job registry snapshot from OpenClaw.
 */

import { isRecord, num, str, unwrapJson } from './cronStatus'

export class CronJobEntry {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly status: string,
  ) {}

  static fromJSON(raw: unknown): CronJobEntry | null {
    if (!isRecord(raw)) return null
    return new CronJobEntry(str(raw.id), str(raw.name), str(raw.status))
  }
}

export class CronJobsPayload {
  constructor(
    readonly check_time: string,
    readonly total_jobs: number,
    readonly active_jobs: number,
    readonly paused_jobs: number,
    readonly error_jobs: number,
    readonly jobs: CronJobEntry[],
  ) {}

  static parse(raw: unknown): CronJobsPayload | null {
    const data = unwrapJson(raw)
    if (!isRecord(data)) return null
    const jobsRaw = data.jobs
    if (!Array.isArray(jobsRaw)) return null

    const jobs: CronJobEntry[] = []
    for (const item of jobsRaw) {
      const j = CronJobEntry.fromJSON(item)
      if (j) jobs.push(j)
    }

    const total_jobs = num(data.total_jobs) ?? jobs.length

    return new CronJobsPayload(
      str(data.check_time),
      total_jobs,
      num(data.active_jobs) ?? 0,
      num(data.paused_jobs) ?? 0,
      num(data.error_jobs) ?? 0,
      jobs,
    )
  }
}

export function parseCronJobsStatus(raw: unknown): CronJobsPayload | null {
  return CronJobsPayload.parse(raw)
}
