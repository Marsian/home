import { cn } from '@/lib/utils'

export function PixelKnightThumbnail({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative h-full w-full overflow-hidden bg-[linear-gradient(180deg,#f8dca4_0%,#88c565_58%,#355f49_100%)]',
        className,
      )}
    >
      <div className="absolute inset-x-0 top-[16%] flex justify-center gap-1 opacity-70">
        {Array.from({ length: 4 }).map((_, index) => (
          <span key={index} className="h-1.5 w-1.5 rounded-[2px] bg-[#fff6da]" />
        ))}
      </div>
      <div className="absolute left-[34%] top-[26%] h-[24%] w-[28%] bg-[#f5d9a1]" />
      <div className="absolute left-[30%] top-[47%] h-[30%] w-[34%] bg-[#315a4f]" />
      <div className="absolute left-[58%] top-[36%] h-[28%] w-[10%] bg-[#eff5e8]" />
      <div className="absolute inset-x-[12%] bottom-[12%] h-[13%] rounded-[8px] border border-black/10 bg-black/16" />
    </div>
  )
}

