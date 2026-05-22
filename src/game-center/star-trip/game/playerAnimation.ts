import * as THREE from 'three'

import type { PicoParts } from './playerModel'

export type PlayerAnimMode = 'walk' | 'run' | 'jump' | 'jet' | 'glide'

export type PlayerAnimationState = {
  mode: PlayerAnimMode
  speed: number
  elapsed: number
  delta: number
  jetActive: boolean
  gait: PicoGroundGaitMetrics
}

export type GroundGaitMode = 'walk' | 'run'

export type PicoGroundGaitModeMetrics = {
  angularSpeed: number
  legSwing: number
  visualStepLength: number
  cadence: number
  speed: number
}

export type PicoGroundGaitMetrics = {
  effectiveLegLength: number
  modes: Record<GroundGaitMode, PicoGroundGaitModeMetrics>
}

type PicoPose = {
  modelY: number
  modelRotX: number
  bodyRotX: number
  headY: number
  headRotX: number
  headRotZ: number
  leftLegRotX: number
  rightLegRotX: number
  leftWingRotX: number
  leftWingRotZ: number
  rightWingRotX: number
  rightWingRotZ: number
}

const poseState = new WeakMap<PicoParts, PicoPose>()
const gaitPhaseState = new WeakMap<PicoParts, number>()

const groundGaitStyle: Record<GroundGaitMode, Pick<PicoGroundGaitModeMetrics, 'angularSpeed' | 'legSwing'>> = {
  walk: { angularSpeed: 7.5, legSwing: 0.58 },
  run: { angularSpeed: 11, legSwing: 0.68 },
}

function getObjectHeight(object: THREE.Object3D | null) {
  if (!object) return 0
  object.updateWorldMatrix(true, true)
  const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3())
  return size.y
}

function createGaitModeMetrics(effectiveLegLength: number, mode: GroundGaitMode): PicoGroundGaitModeMetrics {
  const style = groundGaitStyle[mode]
  const visualStepLength = 2 * effectiveLegLength * Math.sin(style.legSwing)
  const cadence = style.angularSpeed / Math.PI
  return {
    ...style,
    visualStepLength,
    cadence,
    speed: visualStepLength * cadence,
  }
}

export function createPicoGroundGait(parts: PicoParts): PicoGroundGaitMetrics {
  const measuredLegLength = (getObjectHeight(parts.leftLeg) + getObjectHeight(parts.rightLeg)) / 2
  const effectiveLegLength = measuredLegLength > 0 ? measuredLegLength : 0.36
  return {
    effectiveLegLength,
    modes: {
      walk: createGaitModeMetrics(effectiveLegLength, 'walk'),
      run: createGaitModeMetrics(effectiveLegLength, 'run'),
    },
  }
}

function getGroundGaitBlend(state: PlayerAnimationState) {
  const walk = state.gait.modes.walk
  const run = state.gait.modes.run
  const runBlend = THREE.MathUtils.smoothstep(state.speed, walk.speed, run.speed)
  const angularSpeed = THREE.MathUtils.lerp(walk.angularSpeed, run.angularSpeed, runBlend)
  const legSwing = THREE.MathUtils.lerp(walk.legSwing, run.legSwing, runBlend)
  const speed = THREE.MathUtils.lerp(walk.speed, run.speed, runBlend)
  return { angularSpeed, legSwing, speed }
}

function updateGaitPhase(parts: PicoParts, angularSpeed: number, state: PlayerAnimationState, activeAmount: number) {
  const previous = gaitPhaseState.get(parts) ?? 0
  const phase = previous + angularSpeed * state.delta * activeAmount
  const twoPi = Math.PI * 2
  const wrapped = ((phase % twoPi) + twoPi) % twoPi
  gaitPhaseState.set(parts, wrapped)
  return wrapped
}

function createPose(): PicoPose {
  return {
    modelY: 0,
    modelRotX: 0,
    bodyRotX: 0,
    headY: 0,
    headRotX: 0,
    headRotZ: 0,
    leftLegRotX: 0,
    rightLegRotX: 0,
    leftWingRotX: 0,
    leftWingRotZ: 0,
    rightWingRotX: 0,
    rightWingRotZ: 0,
  }
}

function restore(parts: PicoParts) {
  for (const [object, transform] of parts.baseTransforms) {
    object.position.copy(transform.position)
    object.rotation.copy(transform.rotation)
    object.scale.copy(transform.scale)
  }
}

function getTargetPose(parts: PicoParts, state: PlayerAnimationState) {
  const pose = createPose()
  const groundGait = getGroundGaitBlend(state)
  const groundActive = state.mode === 'walk' || state.mode === 'run'
  const walkAmount = groundActive ? THREE.MathUtils.clamp(state.speed / Math.max(groundGait.speed, 0.001), 0, 1) : 0
  const activeAmount = groundActive ? walkAmount : 0
  const stride = updateGaitPhase(parts, groundGait.angularSpeed, state, activeAmount)
  const breath = Math.sin(state.elapsed * 3.2) * 0.018 * activeAmount
  const strideSwing = Math.sin(stride) * walkAmount
  const strideCounter = Math.sin(stride + Math.PI) * walkAmount

  pose.modelY = breath + Math.abs(strideSwing) * 0.02
  pose.headY = breath * 0.35
  pose.headRotZ = Math.sin(state.elapsed * 1.6) * 0.025 * activeAmount
  pose.leftLegRotX = strideSwing * groundGait.legSwing
  pose.rightLegRotX = strideCounter * groundGait.legSwing
  pose.leftWingRotX = strideCounter * (groundGait.legSwing + 0.04)
  pose.rightWingRotX = strideSwing * (groundGait.legSwing + 0.04)
  pose.leftWingRotZ = -0.08
  pose.rightWingRotZ = 0.08

  if (state.mode === 'jump' || state.mode === 'jet') {
    pose.leftLegRotX += 0.12
    pose.rightLegRotX += 0.1
    pose.leftWingRotZ += -0.24
    pose.leftWingRotX += -0.06
    pose.rightWingRotZ += 0.24
    pose.rightWingRotX += -0.06
  }

  if (state.mode === 'glide') {
    pose.modelRotX = 0.6
    pose.leftWingRotZ += -0.86
    pose.leftWingRotX += -0.18
    pose.rightWingRotZ += 0.86
    pose.rightWingRotX += -0.18
    pose.leftLegRotX += 0.16
    pose.rightLegRotX += 0.16
  }

  return pose
}

function smoothPose(current: PicoPose, target: PicoPose, alpha: number) {
  for (const key of Object.keys(current) as Array<keyof PicoPose>) {
    current[key] = THREE.MathUtils.lerp(current[key], target[key], alpha)
  }
}

function applyPose(parts: PicoParts, pose: PicoPose) {
  parts.model.position.y += pose.modelY
  parts.model.rotation.x += pose.modelRotX
  if (parts.body) parts.body.rotation.x += pose.bodyRotX
  if (parts.head) {
    parts.head.position.y += pose.headY
    parts.head.rotation.x += pose.headRotX
    parts.head.rotation.z += pose.headRotZ
  }
  if (parts.leftLeg) parts.leftLeg.rotation.x += pose.leftLegRotX
  if (parts.rightLeg) parts.rightLeg.rotation.x += pose.rightLegRotX
  if (parts.leftWing) {
    parts.leftWing.rotation.x += pose.leftWingRotX
    parts.leftWing.rotation.z += pose.leftWingRotZ
  }
  if (parts.rightWing) {
    parts.rightWing.rotation.x += pose.rightWingRotX
    parts.rightWing.rotation.z += pose.rightWingRotZ
  }
}

export function updatePicoAnimation(parts: PicoParts, state: PlayerAnimationState) {
  restore(parts)

  const targetPose = getTargetPose(parts, state)
  const currentPose = poseState.get(parts) ?? { ...targetPose }
  const alpha = 1 - Math.exp(-state.delta * 14)
  smoothPose(currentPose, targetPose, alpha)
  poseState.set(parts, currentPose)
  applyPose(parts, currentPose)

  if (parts.flame) parts.flame.visible = state.jetActive
  if (state.jetActive && parts.flame) {
    const pulse = 0.86 + Math.sin(state.elapsed * 28) * 0.18
    parts.flame.scale.set(0.85 + pulse * 0.16, 0.85 + pulse * 0.16, pulse)
  }
}
