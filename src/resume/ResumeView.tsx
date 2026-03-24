import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import ResumePage from './ResumePage'

export default function ResumeView() {
  const navigate = useNavigate()

  return (
    <div className="app-shell min-h-screen bg-background text-foreground transition-colors">
      <div className="no-print pointer-events-none fixed left-4 top-4 z-50">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="pointer-events-auto bg-white/70 text-foreground shadow-xs backdrop-blur-sm transition-opacity hover:bg-white hover:opacity-100 focus-visible:opacity-100 opacity-60 dark:border-border dark:bg-card dark:text-card-foreground dark:hover:bg-muted"
          onClick={() => navigate('/')}
        >
          返回
        </Button>
      </div>

      <div className="no-print pointer-events-none fixed right-4 top-4 z-50">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="pointer-events-auto bg-white/70 text-foreground shadow-xs backdrop-blur-sm transition-opacity hover:bg-white hover:opacity-100 focus-visible:opacity-100 opacity-60 dark:border-border dark:bg-card dark:text-card-foreground dark:hover:bg-muted"
          onClick={() => window.print()}
        >
          打印/导出 PDF
        </Button>
      </div>

      <main className="app-main flex items-center justify-center pl-[88px] pr-4 pb-10 pt-2">
        <ResumePage />
      </main>
    </div>
  )
}

