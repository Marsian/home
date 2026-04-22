export type MatrixFacing = 'left' | 'right'
export type MatrixCharacterMode = 'idle' | 'walk'
export type MatrixPartKey = 'head' | 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg'

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

  const pivotXPx = pivotX * pixelSize
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
  },
) {
  const bounds = buildCompositeBounds(manifest.parts)
  const totalWidth = bounds.maxX - bounds.minX
  const totalHeight = bounds.maxY - bounds.minY
  const groupLeft = options.actorX - (totalWidth * options.pixelSize) / 2
  const groupTop = options.actorFeetY - totalHeight * options.pixelSize

  const idleBreath = Math.sin(options.timeMs / 280)
  const walkPhase = (options.timeMs / 1000) * 7
  const swing = Math.sin(walkPhase)
  const swingOpposite = Math.sin(walkPhase + Math.PI)

  const currentMode = options.mode
  const torsoBob = currentMode === 'idle' ? idleBreath * 0.38 : Math.sin(walkPhase * 2) * 0.9
  const headBob = currentMode === 'idle' ? idleBreath * 0.38 - 0.7 : Math.sin(walkPhase * 2 + 0.4) * 0.8 - 0.7
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
  const leftArmX = currentMode === 'walk' ? swingOpposite * 0.38 : 0
  const leftArmY = currentMode === 'walk' ? Math.max(0, -swingOpposite) * 0.2 + torsoBob : idleBreath * 0.38
  const rightArmX = currentMode === 'walk' ? swing * 0.38 : 0
  const rightArmY = currentMode === 'walk' ? Math.max(0, -swing) * 0.2 + torsoBob : idleBreath * 0.38

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

  const drawLegPart = (key: 'leftLeg' | 'rightLeg', dx: number, dy: number, angle: number) => {
    const part = manifest.parts[key]
    const baseX = getPartBaseX(part, dx)
    const baseY = part.offset[1] - bounds.minY + dy
    drawRotatedMatrixPart(
      ctx,
      part,
      groupLeft + baseX * options.pixelSize,
      groupTop + baseY * options.pixelSize,
      options.pixelSize,
      options.facing,
      angle,
      part.size[0] / 2,
      0.5,
    )
  }

  const armBackKey: MatrixPartKey = options.facing === 'right' ? 'leftArm' : 'rightArm'
  const armFrontKey: MatrixPartKey = options.facing === 'right' ? 'rightArm' : 'leftArm'
  const frontLegKey: 'leftLeg' | 'rightLeg' = leftLegPhase >= rightLegPhase ? 'leftLeg' : 'rightLeg'
  const backLegKey: 'leftLeg' | 'rightLeg' = frontLegKey === 'leftLeg' ? 'rightLeg' : 'leftLeg'
  const armOffsets: Record<'leftArm' | 'rightArm', { x: number; y: number }> = {
    leftArm: { x: leftArmX, y: leftArmY },
    rightArm: { x: rightArmX, y: rightArmY },
  }
  const legOffsets: Record<'leftLeg' | 'rightLeg', { x: number; y: number; angle: number }> = {
    leftLeg: { x: leftLegX, y: currentMode === 'walk' ? torsoBob + leftLegY : leftLegY, angle: leftLegAngle },
    rightLeg: { x: rightLegX, y: currentMode === 'walk' ? torsoBob + rightLegY : rightLegY, angle: rightLegAngle },
  }

  drawPart(armBackKey, armOffsets[armBackKey].x, armOffsets[armBackKey].y)
  drawLegPart(backLegKey, legOffsets[backLegKey].x, legOffsets[backLegKey].y, legOffsets[backLegKey].angle)
  drawLegPart(frontLegKey, legOffsets[frontLegKey].x, legOffsets[frontLegKey].y, legOffsets[frontLegKey].angle)
  drawPart(armFrontKey, armOffsets[armFrontKey].x, armOffsets[armFrontKey].y)
  drawPart('torso', 0, torsoBob)
  drawPart('head', 0, headBob)
}
