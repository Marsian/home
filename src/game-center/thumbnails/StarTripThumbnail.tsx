import starTripThumbnail from '@/game-center/star-trip/assets/star-trip-thumbnail-v0.1.png'
import { cn } from '@/lib/utils'

export function StarTripThumbnail({ className }: { className?: string }) {
  return (
    <img
      src={starTripThumbnail}
      className={cn('h-full w-full object-cover', className)}
      alt="A Star Trip"
      loading="lazy"
      decoding="async"
    />
  )
}
