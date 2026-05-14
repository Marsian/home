export type MatrixFacing = 'left' | 'right'
export type MatrixCharacterMode = 'static' | 'idle' | 'walk' | 'attack'
export type MatrixPartKey = 'head' | 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg'
export type MatrixEquipmentSlot = 'mainHand' | 'offHand' | 'helmet' | 'armor'
export type MatrixWeaponType = 'sword'

export type PixelPoint = { x: number; y: number; color: string }
export type MatrixPart = {
  offset: [number, number]
  size: [number, number]
  points: PixelPoint[]
}

export type MatrixManifest = {
  anchorPart: 'torso'
  pixelScale: number
  parts: Record<MatrixPartKey, MatrixPart> & { hair?: MatrixPart }
}

type MatrixEquipmentAnchor =
  | {
      type: 'body'
      offset: [number, number]
    }
  | {
      type: 'part'
      part: MatrixPartKey
      offset: [number, number]
      rotateWithPart?: boolean
      pivot?: [number, number]
      angleOffset?: number
    }

export type MatrixEquipmentPiece = {
  id: string
  name: string
  slot: MatrixEquipmentSlot
  weaponType?: MatrixWeaponType
  anchorOffset?: [number, number]
  size?: [number, number]
  points?: PixelPoint[]
  parts?: Record<
    string,
    {
      size: [number, number]
      points: PixelPoint[]
      layer?: 'back' | 'base' | 'front'
    }
  >
}

const equipmentAnchorsBySlot: Record<MatrixEquipmentSlot, MatrixEquipmentAnchor> = {
  helmet: {
    type: 'part',
    part: 'head',
    offset: [0, 0],
  },
  armor: {
    type: 'part',
    part: 'torso',
    offset: [0, 0],
  },
  mainHand: {
    type: 'part',
    part: 'rightArm',
    offset: [-1, -2],
    rotateWithPart: true,
    pivot: [2, 10],
    angleOffset: 0.15,
  },
  offHand: {
    type: 'part',
    part: 'leftArm',
    offset: [1, -1.5],
    rotateWithPart: true,
    pivot: [7, 10],
  },
}

function resolvePartRotationPivot(partKey: MatrixPartKey, part: MatrixPart): [number, number] {
  // IMPORTANT: Always return the pivot in the unmirrored part-local coordinate space (facing = 'right').
  // Mirroring is handled by `drawRotatedMatrixPart`, and equipment attachment math relies on this.
  const basePivotX = part.size[0] / 2
  if (partKey === 'leftArm') return [part.size[0] - 1.15, 1.1]
  if (partKey === 'rightArm') return [1.15, 1.1]
  if (partKey === 'leftLeg' || partKey === 'rightLeg') {
    return [basePivotX, 0.5]
  }
  return [basePivotX, part.size[1] / 2]
}

type ArmPose = { x: number; y: number; angle: number }
type AttackPose = {
  torsoDx: number
  torsoDy: number
  headDy: number
  frontArm: ArmPose
}
const DEFAULT_ATTACK_DURATION_MS = 420

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function resolveUnarmedAttackPose(progress: number, facing: MatrixFacing): AttackPose {
  const p = Math.max(0, Math.min(1, progress))
  const forward = facing === 'right' ? 1 : -1

  const windup = Math.min(1, p / 0.25)
  const strike = p <= 0.25 ? 0 : Math.min(1, (p - 0.25) / 0.23)
  const recover = p <= 0.48 ? 0 : Math.min(1, (p - 0.48) / 0.52)

  const frontAngle = (windup * 0.25 - strike * 1.25 + recover * 0.55) * forward
  const frontX = -windup * 0.85 * forward + strike * 3.1 * forward - recover * 1.6 * forward
  const frontY = windup * 0.15 - strike * 0.35 + recover * 0.25

  return {
    torsoDx: strike * 0.65 * forward - recover * 0.4 * forward,
    torsoDy: -windup * 0.12 + strike * 0.1,
    headDy: -windup * 0.16 + strike * 0.08,
    frontArm: { x: frontX, y: frontY, angle: frontAngle },
  }
}

function resolveSwordAttackPose(progress: number, facing: MatrixFacing): AttackPose {
  const p = Math.max(0, Math.min(1, progress))
  const forward = facing === 'right' ? 1 : -1

  // Keyframed slash curve: neutral -> windup -> slash -> neutral.
  const neutral = { x: 0, y: 0, angle: 0 }
  const windup = { x: -1.15 * forward, y: -1.1, angle: -1.45 * forward }
  const slash = { x: 1.95 * forward, y: 0.48, angle: 1.15 * forward }

  let frontX = neutral.x
  let frontY = neutral.y
  let frontAngle = neutral.angle
  if (p < 0.24) {
    const t = p / 0.24
    frontX = lerp(neutral.x, windup.x, t)
    frontY = lerp(neutral.y, windup.y, t)
    frontAngle = lerp(neutral.angle, windup.angle, t)
  } else if (p < 0.5) {
    const t = (p - 0.24) / (0.5 - 0.24)
    frontX = lerp(windup.x, slash.x, t)
    frontY = lerp(windup.y, slash.y, t)
    frontAngle = lerp(windup.angle, slash.angle, t)
  } else {
    const t = (p - 0.5) / 0.5
    frontX = lerp(slash.x, neutral.x, t)
    frontY = lerp(slash.y, neutral.y, t)
    frontAngle = lerp(slash.angle, neutral.angle, t)
  }

  return {
    torsoDx: 0,
    torsoDy: 0,
    headDy: 0,
    frontArm: { x: frontX, y: frontY, angle: frontAngle },
  }
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor
}

function resolveWalkArmArcOffset(screenSide: 'left' | 'right', cycle: number) {
  const orbitCenter = { x: 12, y: 4.5 }
  const neutralPivot = {
    x: screenSide === 'left' ? 6.85 : 17.15,
    y: 18.1,
  }
  const radiusX = neutralPivot.x - orbitCenter.x
  const radiusY = neutralPivot.y - orbitCenter.y
  const radius = Math.hypot(radiusX, radiusY)
  const baseAngle = Math.atan2(radiusY, radiusX)
  const outwardDirection = screenSide === 'left' ? 1 : -1
  const outwardAngle = 0.2 * outwardDirection
  const inwardAngle = -0.72 * outwardDirection
  const arcProgress = cycle < 0.5 ? cycle * 2 : 2 - cycle * 2
  const angle = baseAngle + lerp(inwardAngle, outwardAngle, arcProgress)
  const currentPivot = {
    x: orbitCenter.x + Math.cos(angle) * radius,
    y: orbitCenter.y + Math.sin(angle) * radius,
  }
  const tangentAngle = Math.atan2(currentPivot.y - orbitCenter.y, currentPivot.x - orbitCenter.x) - Math.PI / 2

  return {
    x: currentPivot.x - neutralPivot.x,
    y: currentPivot.y - neutralPivot.y,
    angle: tangentAngle,
  }
}

function resolveWalkLegOffset(phase: number) {
  const liftY = (1 - Math.abs(phase)) * 0.18

  return {
    x: phase * 0.32,
    y: liftY,
    angle: phase * 0.84,
    phase,
  }
}

function buildCompositeBounds(parts: MatrixManifest['parts']) {
  const partKeys = Object.keys(parts) as (MatrixPartKey | 'hair')[]
  const xs: number[] = []
  const ys: number[] = []
  const xe: number[] = []
  const ye: number[] = []

  for (const key of partKeys) {
    const part = parts[key]
    if (!part) continue

    // Prefer computing bounds from actual pixels so empty padding rows/cols in `size`
    // don't affect how the character is positioned relative to `actorFeetY`.
    if (part.points.length > 0) {
      for (const point of part.points) {
        const x = part.offset[0] + point.x
        const y = part.offset[1] + point.y
        xs.push(x)
        ys.push(y)
        xe.push(x + 1)
        ye.push(y + 1)
      }
      continue
    }

    xs.push(part.offset[0])
    ys.push(part.offset[1])
    xe.push(part.offset[0] + part.size[0])
    ye.push(part.offset[1] + part.size[1])
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

function drawMatrixPart(
  ctx: CanvasRenderingContext2D,
  part: MatrixPart,
  x0: number,
  y0: number,
  pixelSize: number,
  facing: MatrixFacing = 'right',
) {
  const resolvedPixelSize = Math.max(1, Math.round(pixelSize))
  for (const point of part.points) {
    const drawX = facing === 'right' ? point.x : part.size[0] - 1 - point.x
    ctx.fillStyle = point.color
    ctx.fillRect(
      Math.round(x0 + drawX * resolvedPixelSize),
      Math.round(y0 + point.y * resolvedPixelSize),
      resolvedPixelSize,
      resolvedPixelSize,
    )
  }
}

function drawRotatedMatrixPart(
  ctx: CanvasRenderingContext2D,
  part: MatrixPart,
  x0: number,
  y0: number,
  pixelSize: number,
  facing: MatrixFacing,
  angleRad: number,
  pivotX: number,
  pivotY: number,
) {
  const resolvedPixelSize = Math.max(1, Math.round(pixelSize))
  const resolvedPivotX = facing === 'right' ? pivotX : part.size[0] - 1 - pivotX
  const partWidthPx = Math.ceil(part.size[0] * resolvedPixelSize)
  const partHeightPx = Math.ceil(part.size[1] * resolvedPixelSize)
  const partCanvas = document.createElement('canvas')
  partCanvas.width = partWidthPx
  partCanvas.height = partHeightPx
  const partCtx = partCanvas.getContext('2d')
  if (!partCtx) return

  partCtx.imageSmoothingEnabled = false
  for (const point of part.points) {
    const drawX = facing === 'right' ? point.x : part.size[0] - 1 - point.x
    partCtx.fillStyle = point.color
    partCtx.fillRect(
      drawX * resolvedPixelSize,
      point.y * resolvedPixelSize,
      resolvedPixelSize,
      resolvedPixelSize,
    )
  }

  const pivotXPx = resolvedPivotX * resolvedPixelSize
  const pivotYPx = pivotY * resolvedPixelSize
  const originX = Math.round(x0 + pivotXPx)
  const originY = Math.round(y0 + pivotYPx)

  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.translate(originX, originY)
  ctx.rotate(angleRad)
  ctx.drawImage(partCanvas, -pivotXPx, -pivotYPx)
  ctx.restore()
}

function resolveEquipmentLayerEntries(
  piece: MatrixEquipmentPiece,
  layer: 'all' | 'back' | 'front',
): Array<{ size: [number, number]; points: PixelPoint[] }> {
  if (piece.parts) {
    const entries = Object.values(piece.parts)
    if (layer === 'all') {
      return entries
        .filter((part) => (part.layer ?? 'base') === 'base')
        .map((part) => ({ size: part.size, points: part.points }))
    }
    return entries
      .filter((part) => (part.layer ?? 'base') === layer)
      .map((part) => ({ size: part.size, points: part.points }))
  }

  if (piece.size && piece.points) {
    if (layer === 'back') return []
    return [{ size: piece.size, points: piece.points }]
  }
  return []
}

export function drawMatrixCharacter(
  ctx: CanvasRenderingContext2D,
  manifest: MatrixManifest,
  options: {
    actorX: number
    actorFeetY: number
    pixelSize: number
    facing: MatrixFacing
    mode: MatrixCharacterMode
    timeMs: number
    attackDurationMs?: number
    attackLocomotionMode?: 'idle' | 'walk'
    locomotionTimeMs?: number
    attackTimeMs?: number
    equipment?: Partial<Record<MatrixEquipmentSlot, MatrixEquipmentPiece | null>>
  },
) {
  const bounds = buildCompositeBounds(manifest.parts)
  const pixelSize = Math.max(1, Math.round(options.pixelSize))
  const totalWidth = bounds.maxX - bounds.minX
  const totalHeight = bounds.maxY - bounds.minY
  const groupLeft = Math.round(options.actorX - (totalWidth * pixelSize) / 2)
  const groupTop = Math.round(options.actorFeetY - totalHeight * pixelSize)

  const locomotionTimeMs = options.mode === 'static' ? 0 : options.locomotionTimeMs ?? options.timeMs
  const forward = options.facing === 'right' ? 1 : -1
  const idleBreath = Math.sin(locomotionTimeMs / 280)
  // Mirror the gait when the actor is mirrored.
  const walkPhase = (locomotionTimeMs / 1000) * 7 * forward
  const walkCycle = positiveModulo(walkPhase / (Math.PI * 2), 1)

  const attackDurationMs = Math.max(1, options.attackDurationMs ?? DEFAULT_ATTACK_DURATION_MS)
  const activeWeaponType = options.equipment?.mainHand?.weaponType
  const attackTimeMs = options.attackTimeMs ?? options.timeMs
  const attackPose =
    options.mode === 'attack'
      ? activeWeaponType === 'sword'
        ? resolveSwordAttackPose(attackTimeMs / attackDurationMs, options.facing)
        : resolveUnarmedAttackPose(attackTimeMs / attackDurationMs, options.facing)
      : null
  const currentMode: MatrixCharacterMode =
    options.mode === 'attack' ? (options.attackLocomotionMode === 'walk' ? 'walk' : 'idle') : options.mode
  const torsoBob =
    currentMode === 'static' ? 0 : currentMode === 'idle' ? idleBreath * 0.38 : Math.sin(walkPhase * 2) * 0.9
  const torsoOffsetX = attackPose ? attackPose.torsoDx : 0
  const headBobBase =
    currentMode === 'static' ? 0 : currentMode === 'idle' ? idleBreath * 0.38 - 0.7 : Math.sin(walkPhase * 2 + 0.4) * 0.8 - 0.7
  const headBob = headBobBase + (attackPose ? attackPose.headDy : 0)
  const legWalkOffsets: Record<'leftLeg' | 'rightLeg', { x: number; y: number; angle: number; phase: number }> = {
    leftLeg: { x: 0, y: 0, angle: 0, phase: 0 },
    rightLeg: { x: 0, y: 0, angle: 0, phase: 0 },
  }
  if (currentMode === 'walk') {
    const normalizedLegCycle = positiveModulo(walkCycle, 1)
    const legPhase = normalizedLegCycle < 0.5 ? normalizedLegCycle * 4 - 1 : 3 - normalizedLegCycle * 4
    const screenLeftLegKey: 'leftLeg' | 'rightLeg' = options.facing === 'right' ? 'leftLeg' : 'rightLeg'
    const screenRightLegKey: 'leftLeg' | 'rightLeg' = screenLeftLegKey === 'leftLeg' ? 'rightLeg' : 'leftLeg'
    const screenLeftOffset = resolveWalkLegOffset(legPhase)
    const screenRightOffset = resolveWalkLegOffset(-legPhase)
    const toLocalX = (screenX: number) => (options.facing === 'right' ? screenX : -screenX)
    const toLocalAngle = (screenAngle: number) => (options.facing === 'right' ? screenAngle : -screenAngle)
    legWalkOffsets[screenLeftLegKey] = {
      ...screenLeftOffset,
      x: toLocalX(screenLeftOffset.x),
      angle: toLocalAngle(screenLeftOffset.angle),
    }
    legWalkOffsets[screenRightLegKey] = {
      ...screenRightOffset,
      x: toLocalX(screenRightOffset.x),
      angle: toLocalAngle(screenRightOffset.angle),
    }
  }

  const armRestY = options.mode === 'attack' ? 0 : currentMode === 'walk' ? torsoBob : idleBreath * 0.38
  const screenLeftArmKey: 'leftArm' | 'rightArm' = options.facing === 'right' ? 'leftArm' : 'rightArm'
  const screenRightArmKey: 'leftArm' | 'rightArm' = screenLeftArmKey === 'leftArm' ? 'rightArm' : 'leftArm'
  const armWalkOffsets: Record<'leftArm' | 'rightArm', ArmPose> = {
    leftArm: { x: 0, y: 0, angle: 0 },
    rightArm: { x: 0, y: 0, angle: 0 },
  }
  if (currentMode === 'walk') {
    const screenLeftOffset = resolveWalkArmArcOffset('left', walkCycle)
    const screenRightOffset = resolveWalkArmArcOffset('right', walkCycle)
    const toLocalX = (screenX: number) => (options.facing === 'right' ? screenX : -screenX)
    armWalkOffsets[screenLeftArmKey] = {
      ...screenLeftOffset,
      x: toLocalX(screenLeftOffset.x),
    }
    armWalkOffsets[screenRightArmKey] = {
      ...screenRightOffset,
      x: toLocalX(screenRightOffset.x),
    }
  }

  const getPartBaseX = (part: MatrixPart, dx: number) => {
    const localX = part.offset[0] - bounds.minX
    if (options.facing === 'right') return localX + dx
    return totalWidth - localX - part.size[0] - dx
  }

  const drawPartPixels = (part: MatrixPart, dx: number, dy: number) => {
    const baseX = getPartBaseX(part, dx)
    const baseY = part.offset[1] - bounds.minY + dy
    drawMatrixPart(
      ctx,
      part,
      groupLeft + baseX * pixelSize,
      groupTop + baseY * pixelSize,
      pixelSize,
      options.facing,
    )
  }

  const drawPart = (key: MatrixPartKey, dx: number, dy: number) => {
    drawPartPixels(manifest.parts[key], dx, dy)
  }

  const resolvePartWorld = (key: MatrixPartKey, dx: number, dy: number) => {
    const part = manifest.parts[key]
    const baseX = getPartBaseX(part, dx)
    const baseY = part.offset[1] - bounds.minY + dy
    return {
      x: groupLeft + baseX * pixelSize,
      y: groupTop + baseY * pixelSize,
    }
  }

  const drawArmPart = (key: 'leftArm' | 'rightArm', dx: number, dy: number, angle: number) => {
    const part = manifest.parts[key]
    const baseX = getPartBaseX(part, dx)
    const baseY = part.offset[1] - bounds.minY + dy
    const [pivotX, pivotY] = resolvePartRotationPivot(key, part)
    drawRotatedMatrixPart(
      ctx,
      part,
      groupLeft + baseX * pixelSize,
      groupTop + baseY * pixelSize,
      pixelSize,
      options.facing,
      angle,
      pivotX,
      pivotY,
    )
  }

  const drawLegPart = (key: 'leftLeg' | 'rightLeg', dx: number, dy: number, angle: number) => {
    const part = manifest.parts[key]
    const baseX = getPartBaseX(part, dx)
    const baseY = part.offset[1] - bounds.minY + dy
    const [pivotX, pivotY] = resolvePartRotationPivot(key, part)
    drawRotatedMatrixPart(
      ctx,
      part,
      groupLeft + baseX * pixelSize,
      groupTop + baseY * pixelSize,
      pixelSize,
      options.facing,
      angle,
      pivotX,
      pivotY,
    )
  }

  const armBackKey: 'leftArm' | 'rightArm' = 'rightArm'
  const armFrontKey: 'leftArm' | 'rightArm' = 'leftArm'
  const backLegKey: 'leftLeg' | 'rightLeg' = 'rightLeg'
  const frontLegKey: 'leftLeg' | 'rightLeg' = 'leftLeg'
  const attackFrontKey: 'leftArm' | 'rightArm' = 'rightArm'
  const armAttackOffsets: Record<'leftArm' | 'rightArm', ArmPose> = {
    leftArm: { x: 0, y: 0, angle: 0 },
    rightArm: { x: 0, y: 0, angle: 0 },
  }
  if (attackPose) {
    armAttackOffsets[attackFrontKey] = attackPose.frontArm
  }
  const armOffsets: Record<'leftArm' | 'rightArm', ArmPose> = {
    leftArm: {
      x: armWalkOffsets.leftArm.x + armAttackOffsets.leftArm.x,
      y: armRestY + armWalkOffsets.leftArm.y + armAttackOffsets.leftArm.y,
      angle: armWalkOffsets.leftArm.angle + armAttackOffsets.leftArm.angle,
    },
    rightArm: {
      x: armWalkOffsets.rightArm.x + armAttackOffsets.rightArm.x,
      y: armRestY + armWalkOffsets.rightArm.y + armAttackOffsets.rightArm.y,
      angle: armWalkOffsets.rightArm.angle + armAttackOffsets.rightArm.angle,
    },
  }
  const legOffsets: Record<'leftLeg' | 'rightLeg', { x: number; y: number; angle: number }> = {
    leftLeg: {
      x: legWalkOffsets.leftLeg.x,
      y: currentMode === 'walk' ? torsoBob + legWalkOffsets.leftLeg.y : 0,
      angle: legWalkOffsets.leftLeg.angle,
    },
    rightLeg: {
      x: legWalkOffsets.rightLeg.x,
      y: currentMode === 'walk' ? torsoBob + legWalkOffsets.rightLeg.y : 0,
      angle: legWalkOffsets.rightLeg.angle,
    },
  }

  const partTransforms: Record<MatrixPartKey, ArmPose> = {
    head: { x: 0, y: headBob, angle: 0 },
    torso: { x: torsoOffsetX, y: torsoBob + (attackPose ? attackPose.torsoDy : 0), angle: 0 },
    leftArm: armOffsets.leftArm,
    rightArm: armOffsets.rightArm,
    leftLeg: { x: legOffsets.leftLeg.x, y: legOffsets.leftLeg.y, angle: legOffsets.leftLeg.angle },
    rightLeg: { x: legOffsets.rightLeg.x, y: legOffsets.rightLeg.y, angle: legOffsets.rightLeg.angle },
  }

  const drawEquipmentPiece = (piece: MatrixEquipmentPiece, layer: 'all' | 'back' | 'front' = 'all') => {
    const layerEntries = resolveEquipmentLayerEntries(piece, layer)
    if (layerEntries.length === 0) return

    const anchor = equipmentAnchorsBySlot[piece.slot]
    const anchorOffset = piece.anchorOffset ?? [0, 0]
    const resolvedAnchorX = anchor.offset[0] + anchorOffset[0]
    const resolvedAnchorY = anchor.offset[1] + anchorOffset[1]
    for (const entry of layerEntries) {
      const piecePart: MatrixPart = { offset: [0, 0], size: entry.size, points: entry.points }
      if (anchor.type === 'body') {
        const localX = resolvedAnchorX - bounds.minX
        const drawX = options.facing === 'right' ? localX : totalWidth - localX - entry.size[0]
        const drawY = resolvedAnchorY - bounds.minY
        drawMatrixPart(
          ctx,
          piecePart,
          groupLeft + drawX * pixelSize,
          groupTop + drawY * pixelSize,
          pixelSize,
          options.facing,
        )
        continue
      }

      const anchorPart = manifest.parts[anchor.part]
      const transform = partTransforms[anchor.part]
      const partWorld = resolvePartWorld(anchor.part, transform.x, transform.y)
      const pivot = anchor.pivot ?? [entry.size[0] / 2, entry.size[1] / 2]
      const usesAttachmentAnchor = !!anchor.rotateWithPart
      const attachmentX =
        options.facing === 'right'
          ? resolvedAnchorX
          : anchorPart.size[0] - resolvedAnchorX - 1
      // When the whole character is mirrored, a positive visual offset becomes a negative rotation in local space.
      const signedAngleOffset = (anchor.angleOffset ?? 0) * forward
      const angle = (anchor.rotateWithPart ? transform.angle : 0) + signedAngleOffset
      if (usesAttachmentAnchor) {
        const [partPivotX, partPivotY] = resolvePartRotationPivot(anchor.part, anchorPart)
        const resolvedPartPivotX = options.facing === 'right' ? partPivotX : anchorPart.size[0] - 1 - partPivotX
        const dx = attachmentX - resolvedPartPivotX
        const dy = resolvedAnchorY - partPivotY
        const cosA = Math.cos(transform.angle)
        const sinA = Math.sin(transform.angle)
        const rotatedAttachmentX = dx * cosA - dy * sinA + resolvedPartPivotX
        const rotatedAttachmentY = dx * sinA + dy * cosA + partPivotY
        const effectivePivotX = options.facing === 'right' ? pivot[0] : entry.size[0] - 1 - pivot[0]
        const x0 = partWorld.x + (rotatedAttachmentX - effectivePivotX) * pixelSize
        const y0 = partWorld.y + (rotatedAttachmentY - pivot[1]) * pixelSize
        drawRotatedMatrixPart(ctx, piecePart, x0, y0, pixelSize, options.facing, angle, pivot[0], pivot[1])
        continue
      }

      const drawLocalX =
        options.facing === 'right' ? resolvedAnchorX : anchorPart.size[0] - resolvedAnchorX - entry.size[0]
      const drawLocalY = resolvedAnchorY
      const x0 = partWorld.x + drawLocalX * pixelSize
      const y0 = partWorld.y + drawLocalY * pixelSize
      drawMatrixPart(ctx, piecePart, x0, y0, pixelSize, options.facing)
    }
  }

  const drawHandEquipmentForArm = (armKey: MatrixPartKey) => {
    const handSlot = armKey === 'rightArm' ? 'mainHand' : armKey === 'leftArm' ? 'offHand' : null
    if (!handSlot) return
    const piece = options.equipment?.[handSlot]
    if (piece) drawEquipmentPiece(piece)
  }

  drawArmPart(armBackKey, armOffsets[armBackKey].x, armOffsets[armBackKey].y, armOffsets[armBackKey].angle)
  drawHandEquipmentForArm(armBackKey)
  drawLegPart(backLegKey, legOffsets[backLegKey].x, legOffsets[backLegKey].y, legOffsets[backLegKey].angle)
  drawLegPart(frontLegKey, legOffsets[frontLegKey].x, legOffsets[frontLegKey].y, legOffsets[frontLegKey].angle)
  drawPart('torso', partTransforms.torso.x, partTransforms.torso.y)
  const armor = options.equipment?.armor
  if (armor) drawEquipmentPiece(armor)
  drawArmPart(armFrontKey, armOffsets[armFrontKey].x, armOffsets[armFrontKey].y, armOffsets[armFrontKey].angle)
  const helmet = options.equipment?.helmet
  if (helmet) drawEquipmentPiece(helmet, 'back')
  drawPart('head', partTransforms.head.x, partTransforms.head.y)
  const hair = manifest.parts.hair
  if (!helmet && hair && hair.points.length > 0) {
    drawPartPixels(hair, partTransforms.head.x, partTransforms.head.y)
  }
  if (helmet) drawEquipmentPiece(helmet, 'front')
  drawHandEquipmentForArm(armFrontKey)
}
