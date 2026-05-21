import * as THREE from 'three'

import type { PicoParts } from './playerModel'

export type PlayerAnimMode = 'walk' | 'run' | 'jump' | 'jet' | 'glide'

export type PlayerAnimationState = {
  mode: PlayerAnimMode
  speed: number
  elapsed: number
  jetActive: boolean
}

function restore(parts: PicoParts) {
  for (const [object, transform] of parts.baseTransforms) {
    object.position.copy(transform.position)
    object.rotation.copy(transform.rotation)
    object.scale.copy(transform.scale)
  }
}

export function updatePicoAnimation(parts: PicoParts, state: PlayerAnimationState) {
  const stride = state.elapsed * (state.mode === 'run' ? 11 : 7.5)
  const walkAmount = state.mode === 'walk' || state.mode === 'run' ? THREE.MathUtils.clamp(state.speed / 2.5, 0, 1) : 0
  const activeAmount = state.mode === 'walk' ? walkAmount : 1
  const breath = Math.sin(state.elapsed * 3.2) * 0.018 * activeAmount
  const strideSwing = Math.sin(stride) * walkAmount
  const strideCounter = Math.sin(stride + Math.PI) * walkAmount

  restore(parts)

  parts.model.position.y += breath + Math.abs(strideSwing) * 0.02
  if (parts.body) parts.body.rotation.x = 0
  if (parts.head) {
    parts.head.position.y += breath * 0.35
    parts.head.rotation.z += Math.sin(state.elapsed * 1.6) * 0.025 * activeAmount
    parts.head.rotation.x = 0
  }

  if (parts.leftLeg) parts.leftLeg.rotation.x += strideSwing * 0.58
  if (parts.rightLeg) parts.rightLeg.rotation.x += strideCounter * 0.58
  if (parts.leftWing) {
    parts.leftWing.rotation.z += -0.08
    parts.leftWing.rotation.x += strideCounter * 0.62
  }
  if (parts.rightWing) {
    parts.rightWing.rotation.z += 0.08
    parts.rightWing.rotation.x += strideSwing * 0.62
  }

  if (state.mode === 'jump') {
    if (parts.body) parts.body.rotation.x = -0.1
    if (parts.leftLeg) parts.leftLeg.rotation.x += 0.28
    if (parts.rightLeg) parts.rightLeg.rotation.x += 0.22
    if (parts.leftWing) parts.leftWing.rotation.z += -0.42
    if (parts.rightWing) parts.rightWing.rotation.z += 0.42
  }

  if (state.mode === 'jet') {
    if (parts.body) parts.body.rotation.x = -0.16
    if (parts.head) parts.head.rotation.x = 0.06
    if (parts.leftLeg) parts.leftLeg.rotation.x += 0.34
    if (parts.rightLeg) parts.rightLeg.rotation.x += 0.32
    if (parts.leftWing) {
      parts.leftWing.rotation.z += -0.54
      parts.leftWing.rotation.x += -0.14
    }
    if (parts.rightWing) {
      parts.rightWing.rotation.z += 0.54
      parts.rightWing.rotation.x += -0.14
    }
  }

  if (state.mode === 'glide') {
    if (parts.body) parts.body.rotation.x = 0.18
    if (parts.head) parts.head.rotation.x = -0.08
    if (parts.leftWing) {
      parts.leftWing.rotation.z += -0.86
      parts.leftWing.rotation.x += -0.18
    }
    if (parts.rightWing) {
      parts.rightWing.rotation.z += 0.86
      parts.rightWing.rotation.x += -0.18
    }
    if (parts.leftLeg) parts.leftLeg.rotation.x += 0.16
    if (parts.rightLeg) parts.rightLeg.rotation.x += 0.16
  }

  if (parts.flame) parts.flame.visible = state.jetActive
  if (state.jetActive && parts.flame) {
    const pulse = 0.86 + Math.sin(state.elapsed * 28) * 0.18
    parts.flame.scale.set(0.85 + pulse * 0.16, 0.85 + pulse * 0.16, pulse)
  }
}
