import {
  resolvePartRotationPivot,
  resolveSwordAttackPose,
  type MatrixEquipmentPiece,
  type MatrixEquipmentSlot,
  type MatrixFacing,
  type MatrixManifest,
  type MatrixPartKey,
} from './matrixCharacterRenderer'

type MatrixEquipmentLoadout = Partial<Record<MatrixEquipmentSlot, MatrixEquipmentPiece | null>>

const SWORD_SLASH_START = 0.37
const SWORD_SLASH_END = 0.5
const SWORD_SLASH_FADE_END = 0.66
const SWORD_SLASH_TIP_OFFSET_PX = 6
const SWORD_SLASH_ANCHOR = { x: 88, y: 110 }
const SWORD_SLASH_BASE_PIXEL_SIZE = 2
const SWORD_TIP_LOCAL = { x: 10, y: 1 }

export const SWORD_SLASH_LIFE_MS = 420

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function rotatePoint(x: number, y: number, angle: number) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  }
}

function buildMatrixCompositeBounds(parts: MatrixManifest['parts']) {
  const keys = Object.keys(parts) as Array<MatrixPartKey | 'hair'>
  const xs: number[] = []
  const ys: number[] = []
  const xe: number[] = []
  const ye: number[] = []

  for (const key of keys) {
    const part = parts[key]
    if (!part) continue
    for (const point of part.points) {
      const x = part.offset[0] + point.x
      const y = part.offset[1] + point.y
      xs.push(x)
      ys.push(y)
      xe.push(x + 1)
      ye.push(y + 1)
    }
  }

  if (xs.length === 0 || ys.length === 0 || xe.length === 0 || ye.length === 0) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1 }
  }

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xe),
    maxY: Math.max(...ye),
  }
}

function resolveSwordTipEffectAnchor(options: {
  manifest: MatrixManifest
  equipment: MatrixEquipmentLoadout
  actorX: number
  actorFeetY: number
  pixelSize: number
  facing: MatrixFacing
  attackProgress: number
}) {
  const sword = options.equipment.mainHand
  const rightArm = options.manifest.parts.rightArm
  if (!rightArm || !sword?.size || sword.weaponType !== 'sword') return null

  const pixelSize = Math.max(1, Math.round(options.pixelSize))
  const effectScale = pixelSize / SWORD_SLASH_BASE_PIXEL_SIZE
  const bounds = buildMatrixCompositeBounds(options.manifest.parts)
  const totalWidth = bounds.maxX - bounds.minX
  const totalHeight = bounds.maxY - bounds.minY
  const groupLeft = Math.round(options.actorX - (totalWidth * pixelSize) / 2)
  const groupTop = Math.round(options.actorFeetY - totalHeight * pixelSize)

  const attackPose = resolveSwordAttackPose(options.attackProgress, options.facing).frontArm
  const localArmX = rightArm.offset[0] - bounds.minX
  const armBaseX =
    options.facing === 'right'
      ? localArmX + attackPose.x
      : totalWidth - localArmX - rightArm.size[0] - attackPose.x
  const armBaseY = rightArm.offset[1] - bounds.minY + attackPose.y
  const armWorld = {
    x: groupLeft + armBaseX * pixelSize,
    y: groupTop + armBaseY * pixelSize,
  }

  const [partPivotX, partPivotY] = resolvePartRotationPivot('rightArm', rightArm)
  const resolvedPartPivotX = options.facing === 'right' ? partPivotX : rightArm.size[0] - 1 - partPivotX
  const resolvedAnchorX = -1
  const resolvedAnchorY = -2
  const attachmentX = options.facing === 'right' ? resolvedAnchorX : rightArm.size[0] - resolvedAnchorX - 1
  const attachmentDelta = {
    x: attachmentX - resolvedPartPivotX,
    y: resolvedAnchorY - partPivotY,
  }
  const rotatedAttachment = rotatePoint(attachmentDelta.x, attachmentDelta.y, attackPose.angle)
  const rotatedAttachmentX = rotatedAttachment.x + resolvedPartPivotX
  const rotatedAttachmentY = rotatedAttachment.y + partPivotY

  const forward = options.facing === 'right' ? 1 : -1
  const equipmentAngle = attackPose.angle + 0.15 * forward
  const pivot = { x: 2, y: 10 }
  const effectivePivotX = options.facing === 'right' ? pivot.x : sword.size[0] - 1 - pivot.x
  const origin = {
    x: armWorld.x + rotatedAttachmentX * pixelSize,
    y: armWorld.y + rotatedAttachmentY * pixelSize,
  }
  const localTipX = options.facing === 'right' ? SWORD_TIP_LOCAL.x : sword.size[0] - 1 - SWORD_TIP_LOCAL.x
  const tipDelta = rotatePoint(
    (localTipX - effectivePivotX) * pixelSize,
    (SWORD_TIP_LOCAL.y - pivot.y) * pixelSize,
    equipmentAngle,
  )
  const tip = {
    x: origin.x + tipDelta.x,
    y: origin.y + tipDelta.y,
  }
  const angle = Math.atan2(tip.y - origin.y, tip.x - origin.x)

  return {
    x: tip.x + Math.cos(angle) * SWORD_SLASH_TIP_OFFSET_PX * effectScale,
    y: tip.y + Math.sin(angle) * SWORD_SLASH_TIP_OFFSET_PX * effectScale,
  }
}

export function drawSwordSlashEffect(
  ctx: CanvasRenderingContext2D,
  options: {
    frames: HTMLImageElement[]
    manifest: MatrixManifest
    equipment: MatrixEquipmentLoadout
    actorX: number
    actorFeetY: number
    pixelSize: number
    facing: MatrixFacing
    attackProgress: number
  },
) {
  if (options.frames.length === 0) return
  if (options.attackProgress < SWORD_SLASH_START || options.attackProgress > SWORD_SLASH_FADE_END) return

  const fxProgress = clamp(
    (options.attackProgress - SWORD_SLASH_START) / (SWORD_SLASH_FADE_END - SWORD_SLASH_START),
    0,
    1,
  )
  const anchorProgress = Math.min(options.attackProgress, SWORD_SLASH_END)
  const anchor = resolveSwordTipEffectAnchor({
    ...options,
    attackProgress: anchorProgress,
  })
  if (!anchor) return

  const frameIndex = Math.min(options.frames.length - 1, Math.floor(fxProgress * options.frames.length))
  const image = options.frames[frameIndex]
  const effectScale = Math.max(1, Math.round(options.pixelSize)) / SWORD_SLASH_BASE_PIXEL_SIZE

  ctx.save()
  ctx.translate(Math.round(anchor.x), Math.round(anchor.y))
  if (options.facing === 'left') ctx.scale(-1, 1)
  ctx.scale(effectScale, effectScale)
  ctx.globalAlpha *= 1 - Math.max(0, fxProgress - 0.78) / 0.22
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(image, -SWORD_SLASH_ANCHOR.x, -SWORD_SLASH_ANCHOR.y)
  ctx.restore()
}
