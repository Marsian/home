export type MonsterState = 'idle' | 'walk' | 'attack' | 'attacked'
export type MonsterFacing = 'left' | 'right'

export type MonsterAnimation = {
  frameDurationMs: number
  loop: boolean
  frames: string[]
}

export type MonsterMeta = {
  id: string
  name: string
  defaultState: MonsterState
  frameSize: [number, number]
  anchor: [number, number]
  animations: Record<MonsterState, MonsterAnimation>
}

export type MonsterFrameSet = Partial<Record<MonsterState, HTMLImageElement[]>>
export type MonsterFrameUrls = Record<string, string>

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Failed to load monster frame: ${src}`))
    image.src = src
  })
}

export async function loadMonsterFrames(meta: MonsterMeta, frameUrls: MonsterFrameUrls) {
  const entries = await Promise.all(
    Object.entries(meta.animations).map(async ([state, animation]) => {
      const frames = await Promise.all(
        animation.frames.map((framePath) => {
          const url = frameUrls[framePath]
          if (!url) throw new Error(`Missing monster frame URL for ${meta.id}: ${framePath}`)
          return loadImage(url)
        }),
      )
      return [state as MonsterState, frames] as const
    }),
  )

  return Object.fromEntries(entries) as MonsterFrameSet
}

export function resolveMonsterFrameIndex(animation: MonsterAnimation, timeMs: number) {
  const frameCount = animation.frames.length
  if (frameCount <= 1) return 0
  const rawIndex = Math.floor(Math.max(0, timeMs) / Math.max(1, animation.frameDurationMs))
  return animation.loop ? positiveModulo(rawIndex, frameCount) : Math.min(frameCount - 1, rawIndex)
}

export function getMonsterAnimationDuration(animation: MonsterAnimation) {
  return animation.frames.length * Math.max(1, animation.frameDurationMs)
}

export function drawMonster(
  ctx: CanvasRenderingContext2D,
  meta: MonsterMeta,
  frames: MonsterFrameSet,
  options: {
    x: number
    y: number
    state: MonsterState
    timeMs: number
    scale?: number
    facing?: MonsterFacing
    alpha?: number
  },
) {
  const animation = meta.animations[options.state] ?? meta.animations[meta.defaultState]
  const stateFrames = frames[options.state] ?? frames[meta.defaultState]
  if (!animation || !stateFrames || stateFrames.length === 0) return

  const frameIndex = resolveMonsterFrameIndex(animation, options.timeMs)
  const image = stateFrames[Math.min(frameIndex, stateFrames.length - 1)]
  const scale = options.scale ?? 1
  const facing = options.facing ?? 'right'
  const [anchorX, anchorY] = meta.anchor
  const [frameWidth, frameHeight] = meta.frameSize

  ctx.save()
  ctx.globalAlpha *= options.alpha ?? 1
  ctx.imageSmoothingEnabled = false
  ctx.translate(options.x, options.y)
  ctx.scale(facing === 'left' ? -scale : scale, scale)
  ctx.drawImage(image, -anchorX, -anchorY, frameWidth, frameHeight)
  ctx.restore()
}
