export function PixelKnightThumbnail({ className }: { className?: string }) {
  // Use Vite `BASE_URL` so deployments under a sub-path still resolve `/public/*` assets.
  const src = `${import.meta.env.BASE_URL}images/pixel-knight-thumb.png`

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      role="presentation"
      className={className ? `${className} object-cover` : 'object-cover'}
    />
  )
}
