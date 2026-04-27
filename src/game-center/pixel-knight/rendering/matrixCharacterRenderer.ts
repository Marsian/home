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
  parts: Record<MatrixPartKey, MatrixPart>
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
    offset: [0, 0],
    rotateWithPart: true,
    pivot: [1, 9],
  },
  offHand: {
    type: 'part',
    part: 'leftArm',
    offset: [0, 0],
    rotateWithPart: true,
    pivot: [7, 7],
  },
}

function resolvePartRotationPivot(partKey: MatrixPartKey, part: MatrixPart, facing: MatrixFacing): [number, number] {
  const basePivotX = part.size[0] / 2
  const mirroredPivotX = facing === 'right' ? basePivotX : part.size[0] - basePivotX
  if (partKey === 'leftArm' || partKey === 'rightArm') return [mirroredPivotX, 0.6]
  if (partKey === 'leftLeg' || partKey === 'rightLeg') return [mirroredPivotX, 0.5]
  return [mirroredPivotX, part.size[1] / 2]
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

function buildCompositeBounds(parts: MatrixManifest['parts']) {
  const partKeys = Object.keys(parts) as MatrixPartKey[]
  const xs = partKeys.map((key) => parts[key].offset[0])
  const ys = partKeys.map((key) => parts[key].offset[1])
  const xe = partKeys.map((key) => parts[key].offset[0] + parts[key].size[0])
  const ye = partKeys.map((key) => parts[key].offset[1] + parts[key].size[1])
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
  for (const point of part.points) {
    const drawX = facing === 'right' ? point.x : part.size[0] - 1 - point.x
    ctx.fillStyle = point.color
    ctx.fillRect(
      Math.round(x0 + drawX * pixelSize),
      Math.round(y0 + point.y * pixelSize),
      pixelSize,
      pixelSize,
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
  const resolvedPivotX = facing === 'right' ? pivotX : part.size[0] - 1 - pivotX
  const partWidthPx = part.size[0] * pixelSize
  const partHeightPx = part.size[1] * pixelSize
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
      drawX * pixelSize,
      point.y * pixelSize,
      pixelSize,
      pixelSize,
    )
  }

  const pivotXPx = resolvedPivotX * pixelSize
  const pivotYPx = pivotY * pixelSize
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
  const totalWidth = bounds.maxX - bounds.minX
  const totalHeight = bounds.maxY - bounds.minY
  const groupLeft = options.actorX - (totalWidth * options.pixelSize) / 2
  const groupTop = options.actorFeetY - totalHeight * options.pixelSize

  const locomotionTimeMs = options.mode === 'static' ? 0 : options.locomotionTimeMs ?? options.timeMs
  const idleBreath = Math.sin(locomotionTimeMs / 280)
  const walkPhase = (locomotionTimeMs / 1000) * 7
  const swing = Math.sin(walkPhase)
  const swingOpposite = Math.sin(walkPhase + Math.PI)

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
  const leftLegPhase = currentMode === 'walk' ? swing : 0
  const rightLegPhase = currentMode === 'walk' ? swingOpposite : 0
  const legStanceInset = 0.35
  const leftLegX = legStanceInset
  const rightLegX = -legStanceInset
  const legLift = currentMode === 'walk' ? 0.2 : 0
  const leftLegY = Math.max(0, -leftLegPhase) * legLift
  const rightLegY = Math.max(0, -rightLegPhase) * legLift
  const maxLegAngle = Math.PI / 4
  const leftLegAngle = currentMode === 'walk' ? leftLegPhase * maxLegAngle : 0
  const rightLegAngle = currentMode === 'walk' ? rightLegPhase * maxLegAngle : 0
  const leftArmXBase = currentMode === 'walk' ? swingOpposite * 0.38 : 0
  const rightArmXBase = currentMode === 'walk' ? swing * 0.38 : 0
  const leftArmYBase =
    options.mode === 'attack' ? 0 : currentMode === 'walk' ? Math.max(0, -swingOpposite) * 0.2 + torsoBob : idleBreath * 0.38
  const rightArmYBase =
    options.mode === 'attack' ? 0 : currentMode === 'walk' ? Math.max(0, -swing) * 0.2 + torsoBob : idleBreath * 0.38

  const getPartBaseX = (part: MatrixPart, dx: number) => {
    const localX = part.offset[0] - bounds.minX
    if (options.facing === 'right') return localX + dx
    return totalWidth - localX - part.size[0] - dx
  }

  const drawPart = (key: MatrixPartKey, dx: number, dy: number) => {
    const part = manifest.parts[key]
    const baseX = getPartBaseX(part, dx)
    const baseY = part.offset[1] - bounds.minY + dy
    drawMatrixPart(
      ctx,
      part,
      groupLeft + baseX * options.pixelSize,
      groupTop + baseY * options.pixelSize,
      options.pixelSize,
      options.facing,
    )
  }

  const resolvePartWorld = (key: MatrixPartKey, dx: number, dy: number) => {
    const part = manifest.parts[key]
    const baseX = getPartBaseX(part, dx)
    const baseY = part.offset[1] - bounds.minY + dy
    return {
      x: groupLeft + baseX * options.pixelSize,
      y: groupTop + baseY * options.pixelSize,
    }
  }

  const drawArmPart = (key: 'leftArm' | 'rightArm', dx: number, dy: number, angle: number) => {
    const part = manifest.parts[key]
    const baseX = getPartBaseX(part, dx)
    const baseY = part.offset[1] - bounds.minY + dy
    const [pivotX, pivotY] = resolvePartRotationPivot(key, part, options.facing)
    drawRotatedMatrixPart(
      ctx,
      part,
      groupLeft + baseX * options.pixelSize,
      groupTop + baseY * options.pixelSize,
      options.pixelSize,
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
    const [pivotX, pivotY] = resolvePartRotationPivot(key, part, options.facing)
    drawRotatedMatrixPart(
      ctx,
      part,
      groupLeft + baseX * options.pixelSize,
      groupTop + baseY * options.pixelSize,
      options.pixelSize,
      options.facing,
      angle,
      pivotX,
      pivotY,
    )
  }

  const armBackKey: MatrixPartKey = options.facing === 'right' ? 'rightArm' : 'rightArm'
  const armFrontKey: MatrixPartKey = options.facing === 'right' ? 'leftArm' : 'leftArm'
  const frontLegKey: 'leftLeg' | 'rightLeg' = leftLegPhase >= rightLegPhase ? 'leftLeg' : 'rightLeg'
  const backLegKey: 'leftLeg' | 'rightLeg' = frontLegKey === 'leftLeg' ? 'rightLeg' : 'leftLeg'
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
      x: leftArmXBase + armAttackOffsets.leftArm.x,
      y: leftArmYBase + armAttackOffsets.leftArm.y,
      angle: armAttackOffsets.leftArm.angle,
    },
    rightArm: {
      x: rightArmXBase + armAttackOffsets.rightArm.x,
      y: rightArmYBase + armAttackOffsets.rightArm.y,
      angle: armAttackOffsets.rightArm.angle,
    },
  }
  const legOffsets: Record<'leftLeg' | 'rightLeg', { x: number; y: number; angle: number }> = {
    leftLeg: { x: leftLegX, y: currentMode === 'walk' ? torsoBob + leftLegY : leftLegY, angle: leftLegAngle },
    rightLeg: { x: rightLegX, y: currentMode === 'walk' ? torsoBob + rightLegY : rightLegY, angle: rightLegAngle },
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
          groupLeft + drawX * options.pixelSize,
          groupTop + drawY * options.pixelSize,
          options.pixelSize,
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
      const angle = (anchor.rotateWithPart ? transform.angle : 0) + (anchor.angleOffset ?? 0)
      if (usesAttachmentAnchor) {
        const [partPivotX, partPivotY] = resolvePartRotationPivot(anchor.part, anchorPart, options.facing)
        const dx = attachmentX - partPivotX
        const dy = resolvedAnchorY - partPivotY
        const cosA = Math.cos(transform.angle)
        const sinA = Math.sin(transform.angle)
        const rotatedAttachmentX = dx * cosA - dy * sinA + partPivotX
        const rotatedAttachmentY = dx * sinA + dy * cosA + partPivotY
        const effectivePivotX = options.facing === 'right' ? pivot[0] : entry.size[0] - 1 - pivot[0]
        const x0 = partWorld.x + (rotatedAttachmentX - effectivePivotX) * options.pixelSize
        const y0 = partWorld.y + (rotatedAttachmentY - pivot[1]) * options.pixelSize
        drawRotatedMatrixPart(ctx, piecePart, x0, y0, options.pixelSize, options.facing, angle, pivot[0], pivot[1])
        continue
      }

      const drawLocalX =
        options.facing === 'right' ? resolvedAnchorX : anchorPart.size[0] - resolvedAnchorX - entry.size[0]
      const drawLocalY = resolvedAnchorY
      const x0 = partWorld.x + drawLocalX * options.pixelSize
      const y0 = partWorld.y + drawLocalY * options.pixelSize
      drawMatrixPart(ctx, piecePart, x0, y0, options.pixelSize, options.facing)
    }
  }

  const drawHandEquipmentForArm = (armKey: MatrixPartKey) => {
    const handSlot = armKey === 'rightArm' ? 'mainHand' : armKey === 'leftArm' ? 'offHand' : null
    if (!handSlot) return
    const piece = options.equipment?.[handSlot]
    if (piece) drawEquipmentPiece(piece)
  }

  drawArmPart(armBackKey, armOffsets[armBackKey].x, armOffsets[armBackKey].y, armOffsets[armBackKey].angle)
  drawLegPart(backLegKey, legOffsets[backLegKey].x, legOffsets[backLegKey].y, legOffsets[backLegKey].angle)
  drawLegPart(frontLegKey, legOffsets[frontLegKey].x, legOffsets[frontLegKey].y, legOffsets[frontLegKey].angle)
  drawPart('torso', partTransforms.torso.x, partTransforms.torso.y)
  drawArmPart(armFrontKey, armOffsets[armFrontKey].x, armOffsets[armFrontKey].y, armOffsets[armFrontKey].angle)
  const armor = options.equipment?.armor
  if (armor) drawEquipmentPiece(armor)
  const helmet = options.equipment?.helmet
  if (helmet) drawEquipmentPiece(helmet, 'back')
  drawPart('head', partTransforms.head.x, partTransforms.head.y)
  if (helmet) drawEquipmentPiece(helmet, 'front')
  drawHandEquipmentForArm(armBackKey)
  drawHandEquipmentForArm(armFrontKey)
}
