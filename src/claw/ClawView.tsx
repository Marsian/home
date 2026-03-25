import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CronStatusPanel } from './CronStatusPanel'
import { parseCronStatus } from './cronStatus'
import { getSupabaseClient } from './supabase'

type CronRow = {
  id: number
  created_at: string
  status: unknown
}

export default function ClawView() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [row, setRow] = useState<CronRow | null>(null)
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)

  const payload = useMemo(() => {
    if (!row) return null
    return parseCronStatus(row.status)
  }, [row])

  const pullLatest = useCallback(async () => {
    const supabase = getSupabaseClient()
    if (!supabase) {
      const msg = '无法初始化 Supabase 客户端（URL 或 Publishable Key 为空）'
      setError(msg)
      return
    }

    setLoading(true)
    setError(null)
    const { data, error: qErr } = await supabase
      .from('cron_task_status')
      .select('id, created_at, status')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setLoading(false)
    setFetchedAt(new Date().toISOString())

    if (qErr) {
      setRow(null)
      setError(qErr.message)
      return
    }

    if (!data) {
      setRow(null)
      return
    }

    setRow({
      id: Number(data.id),
      created_at: String(data.created_at),
      status: data.status as unknown,
    })
  }, [])

  useEffect(() => {
    void pullLatest()
  }, [pullLatest])

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-sm border-b border-black/5 dark:bg-card dark:border-border">
        <div className="mx-auto flex max-w-6xl items-center gap-3 pl-[88px] pr-4 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/')}
            className="bg-white/70 backdrop-blur-sm dark:bg-muted"
          >
            返回
          </Button>
          <div className="flex flex-col leading-tight">
            <div className="text-base font-semibold">Claw</div>
            <div className="text-xs text-muted-foreground">OpenClaw 状态</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl pl-[88px] pr-4 py-6">
        <CronStatusPanel
          loading={loading}
          error={error}
          fetchedAt={fetchedAt}
          rowId={row?.id ?? null}
          payload={payload}
          hasRow={row != null}
          onRefresh={() => void pullLatest()}
        />
      </main>
    </div>
  )
}
