import * as THREE from 'three'

import type { PicoParts } from './playerModel'

export type PlayerAnimMode = 'idle' | 'walk' | 'run' | 'jump' | 'jet' | 'glide'

export type PlayerAnimationState = {
  mode: PlayerAnimMode
  speed: number
  elapsed: number
  jetActive: boolean
}

export function updatePicoAnimation(parts: PicoParts, state: PlayerAnimationState) {
  const stride = state.elapsed * (state.mode === 'run' ? 11 : 7.5)
  const walkAmount = state.mode === 'walk' || state.mode === 'run' ? THREE.MathUtils.clamp(state.speed / 2.5, 0, 1) : 0
  const breath = Math.sin(state.elapsed * 3.2) * 0.018
  const strideSwing = Math.sin(stride) * walkAmount
  const strideCounter = Math.sin(stride + Math.PI) * walkAmount

  parts.body.position.y = 0.58 + breath + Math.abs(strideSwing) * 0.025
  parts.head.position.y = 0.98 + breath * 0.55
  parts.head.rotation.z = Math.sin(state.elapsed * 1.6) * 0.025

  parts.leftLeg.rotation.x = strideSwing * 0.72
  parts.rightLeg.rotation.x = strideCounter * 0.72
  parts.leftWing.rotation.z = -0.12 + strideCounter * 0.18
  parts.rightWing.rotation.z = 0.12 - strideSwing * 0.18
  parts.leftWing.rotation.x = strideCounter * 0.16
  parts.rightWing.rotation.x = strideSwing * 0.16
  parts.crest.rotation.z = Math.sin(state.elapsed * 3.8) * 0.035

  parts.scarfTail.rotation.z = -0.1 + Math.sin(state.elapsed * 5.5) * 0.08 - walkAmount * 0.16
  parts.scarfTail.rotation.y = -0.45 - walkAmount * 0.16

  parts.body.rotation.x = 0
  parts.head.rotation.x = 0

  if (state.mode === 'jump') {
    parts.body.rotation.x = -0.16
    parts.leftLeg.rotation.x = 0.42
    parts.rightLeg.rotation.x = 0.34
    parts.leftWing.rotation.z = -0.62
    parts.rightWing.rotation.z = 0.62
  }

  if (state.mode === 'jet') {
    parts.body.rotation.x = -0.24
    parts.head.rotation.x = 0.08
    parts.leftLeg.rotation.x = 0.5
    parts.rightLeg.rotation.x = 0.48
    parts.leftWing.rotation.z = -0.74
    parts.rightWing.rotation.z = 0.74
    parts.leftWing.rotation.x = -0.18
    parts.rightWing.rotation.x = -0.18
  }

  if (state.mode === 'glide') {
    parts.body.rotation.x = 0.28
    parts.head.rotation.x = -0.1
    parts.leftWing.rotation.z = -1.18
    parts.rightWing.rotation.z = 1.18
    parts.leftWing.rotation.x = -0.22
    parts.rightWing.rotation.x = -0.22
    parts.leftLeg.rotation.x = 0.22
    parts.rightLeg.rotation.x = 0.22
    parts.scarfTail.rotation.y = -0.74
  }

  parts.flame.visible = state.jetActive
  if (state.jetActive) {
    const pulse = 0.86 + Math.sin(state.elapsed * 28) * 0.18
    parts.flame.scale.set(0.85 + pulse * 0.16, 0.85 + pulse * 0.16, pulse)
  }
}
