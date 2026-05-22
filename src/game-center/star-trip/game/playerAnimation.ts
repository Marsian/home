import * as THREE from 'three'

import type { PicoParts } from './playerModel'

export type PlayerAnimMode = 'walk' | 'run' | 'jump' | 'jet' | 'glide'

export type PlayerAnimationState = {
  mode: PlayerAnimMode
  speed: number
  elapsed: number
  delta: number
  jetActive: boolean
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

function getTargetPose(state: PlayerAnimationState) {
  const pose = createPose()
  const stride = state.elapsed * (state.mode === 'run' ? 11 : 7.5)
  const walkAmount = state.mode === 'walk' || state.mode === 'run' ? THREE.MathUtils.clamp(state.speed / 2.5, 0, 1) : 0
  const activeAmount = state.mode === 'walk' || state.mode === 'run' ? walkAmount : 0
  const breath = Math.sin(state.elapsed * 3.2) * 0.018 * activeAmount
  const strideSwing = Math.sin(stride) * walkAmount
  const strideCounter = Math.sin(stride + Math.PI) * walkAmount

  pose.modelY = breath + Math.abs(strideSwing) * 0.02
  pose.headY = breath * 0.35
  pose.headRotZ = Math.sin(state.elapsed * 1.6) * 0.025 * activeAmount
  pose.leftLegRotX = strideSwing * 0.58
  pose.rightLegRotX = strideCounter * 0.58
  pose.leftWingRotX = strideCounter * 0.62
  pose.rightWingRotX = strideSwing * 0.62
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

  const targetPose = getTargetPose(state)
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
