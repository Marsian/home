import * as THREE from 'three'

import type { StarTripInputState } from './input'
import { updatePicoAnimation } from './playerAnimation'
import type { PlayerAnimMode } from './playerAnimation'
import type { PicoParts } from './playerModel'
import {
  PLANET_RADIUS,
  PLAYER_SURFACE_OFFSET,
  buildSurfaceFrame,
  moveAlongSphere,
  normalFromLatLon,
  orientObjectToSurface,
  projectToTangent,
} from './planetMath'

export type PlayerSnapshot = {
  position: { x: number; y: number; z: number }
  up: { x: number; y: number; z: number }
  forward: { x: number; y: number; z: number }
  modelUp: { x: number; y: number; z: number }
  modelForward: { x: number; y: number; z: number }
  surfaceDot: number
  forwardDotUp: number
  modelUpDotSurfaceUp: number
  modelForwardDotSurfaceUp: number
  grounded: boolean
  mode: PlayerAnimMode
}

export class PlayerController {
  readonly group: THREE.Group

  private readonly parts: PicoParts
  private readonly surfacePoint = normalFromLatLon(-18, 22).multiplyScalar(PLANET_RADIUS)
  private readonly lastForward = buildSurfaceFrame(this.surfacePoint.clone().normalize()).forward
  private turnVelocity = 0
  private altitude = 0
  private verticalVelocity = 0
  private jetTimeLeft = 0.55
  private elapsed = 0
  private grounded = true
  private mode: PlayerAnimMode = 'idle'
  private currentSpeed = 0

  constructor(parts: PicoParts) {
    this.parts = parts
    this.group = parts.root
    this.syncTransform()
  }

  update(dt: number, input: StarTripInputState, jumpPressed: boolean) {
    this.elapsed += dt
    const up = this.getUp()
    const groundFrame = buildSurfaceFrame(up, this.lastForward)
    this.lastForward.copy(groundFrame.forward)
    const turnInput = Math.sign(input.moveX)
    const forwardInput = input.moveY
    const turning = Math.abs(turnInput) > 0.01
    this.turnVelocity += (turnInput * 2.35 - this.turnVelocity) * (1 - Math.exp(-dt * 10))
    if (Math.abs(this.turnVelocity) > 0.001) {
      this.lastForward.applyAxisAngle(up, -this.turnVelocity * dt)
      this.orthonormalizeForward(up)
    }

    const move = this.lastForward.clone().multiplyScalar(forwardInput)
    projectToTangent(move, up, move)
    const moving = Math.abs(forwardInput) > 0.01 && move.lengthSq() > 0.0001
    if (moving) move.normalize()

    if (jumpPressed && this.grounded) {
      this.grounded = false
      this.verticalVelocity = 3.35
      this.jetTimeLeft = 0.55
    }

    let jetActive = false
    let gliding = false
    if (!this.grounded) {
      if (input.jumpHeld && this.jetTimeLeft > 0) {
        jetActive = true
        this.jetTimeLeft = Math.max(0, this.jetTimeLeft - dt)
        this.verticalVelocity += 5.9 * dt
      } else if (input.jumpHeld && this.verticalVelocity < 0.7) {
        gliding = true
      }

      const gravity = jetActive ? 5.1 : gliding ? 2.2 : 7.7
      this.verticalVelocity -= gravity * dt
      if (gliding) this.verticalVelocity = Math.max(this.verticalVelocity, -1.05)
      this.altitude += this.verticalVelocity * dt
      if (this.altitude <= 0) {
        this.altitude = 0
        this.verticalVelocity = 0
        this.grounded = true
        this.jetTimeLeft = 0.55
      }
    }

    const baseSpeed = input.run ? 3.0 : 2.0
    const airSpeed = gliding ? 2.35 : 1.45
    const turnStepSpeed = turning && this.grounded ? 0.85 : 0
    const targetSpeed = moving ? (this.grounded ? baseSpeed : airSpeed) : turnStepSpeed
    this.currentSpeed += (targetSpeed - this.currentSpeed) * (1 - Math.exp(-dt * 12))

    if (moving && this.currentSpeed > 0.02) {
      const step = this.currentSpeed * dt
      this.surfacePoint.copy(moveAlongSphere(this.surfacePoint, move, step))
      const nextUp = this.getUp()
      this.orthonormalizeForward(nextUp)
    }

    if (!this.grounded) {
      if (jetActive) this.mode = 'jet'
      else if (gliding) this.mode = 'glide'
      else this.mode = 'jump'
    } else if (moving && this.currentSpeed > 2.45) {
      this.mode = 'run'
    } else if (moving || turning || this.currentSpeed > 0.12) {
      this.mode = 'walk'
    } else {
      this.mode = 'idle'
    }

    this.syncTransform()
    updatePicoAnimation(this.parts, {
      mode: this.mode,
      speed: this.currentSpeed,
      elapsed: this.elapsed,
      jetActive,
    })
  }

  getPosition() {
    return this.group.position
  }

  getUp() {
    return this.surfacePoint.clone().normalize()
  }

  getSnapshot(): PlayerSnapshot {
    const p = this.group.position
    const up = this.getUp()
    const radial = p.clone().normalize()
    const modelUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion).normalize()
    const modelForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion).normalize()
    return {
      position: { x: p.x, y: p.y, z: p.z },
      up: { x: up.x, y: up.y, z: up.z },
      forward: { x: this.lastForward.x, y: this.lastForward.y, z: this.lastForward.z },
      modelUp: { x: modelUp.x, y: modelUp.y, z: modelUp.z },
      modelForward: { x: modelForward.x, y: modelForward.y, z: modelForward.z },
      surfaceDot: radial.dot(up),
      forwardDotUp: this.lastForward.dot(up),
      modelUpDotSurfaceUp: modelUp.dot(up),
      modelForwardDotSurfaceUp: modelForward.dot(up),
      grounded: this.grounded,
      mode: this.mode,
    }
  }

  private syncTransform() {
    const up = this.getUp()
    this.orthonormalizeForward(up)
    this.group.position.copy(up).multiplyScalar(PLANET_RADIUS + this.altitude + PLAYER_SURFACE_OFFSET)
    orientObjectToSurface(this.group, up, this.lastForward)
  }

  private orthonormalizeForward(up: THREE.Vector3) {
    const frame = buildSurfaceFrame(up, this.lastForward)
    this.lastForward.copy(frame.forward)
  }
}
