import ResumePage from './resume/ResumePage'

export default function App() {
  return (
    <div className="app-shell min-h-screen bg-white text-black">
      <div className="no-print mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4">
        <div className="text-sm text-gray-700">
          提示：浏览器选择 <span className="font-medium">“实际大小/不缩放”</span> 再打印导出 PDF，效果更稳定。
        </div>
        <button
          type="button"
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 shadow-sm hover:bg-gray-50"
          onClick={() => window.print()}
        >
          打印/导出 PDF
        </button>
      </div>

      <main className="app-main flex items-center justify-center px-4 pb-10 pt-2">
        <ResumePage />
      </main>
    </div>
  )
}

