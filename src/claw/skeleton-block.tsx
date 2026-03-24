import type { HTMLAttributes } from 'react'

function cx(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(' ')
}

/** Loading placeholder (pulse); not tied to any component library. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        'animate-pulse rounded-md bg-black/10 motion-reduce:animate-none dark:bg-white/10',
        className,
      )}
      {...props}
    />
  )
}
