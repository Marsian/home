import * as THREE from 'three'

import { PLANET_RADIUS, projectToTangent, rotateAroundAxis, tangentBasis } from './planetMath'

export type CameraSnapshot = {
  distance: number
  yaw: number
  pitch: number
}

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera

  private readonly host: HTMLElement
  private readonly target = new THREE.Vector3()
  private readonly desiredPosition = new THREE.Vector3()
  private readonly lookTarget = new THREE.Vector3()
  private readonly smoothUp = new THREE.Vector3(0, 1, 0)
  private dragging = false
  private lastPointerX = 0
  private lastPointerY = 0
  private yaw = -0.78
  private pitch = 0.36
  private distance = 13.2

  constructor(camera: THREE.PerspectiveCamera, host: HTMLElement) {
    this.camera = camera
    this.host = host
    this.host.addEventListener('pointerdown', this.onPointerDown)
    this.host.addEventListener('pointermove', this.onPointerMove)
    this.host.addEventListener('pointerup', this.onPointerUp)
    this.host.addEventListener('pointercancel', this.onPointerUp)
    this.host.addEventListener('wheel', this.onWheel, { passive: false })
  }

  dispose() {
    this.host.removeEventListener('pointerdown', this.onPointerDown)
    this.host.removeEventListener('pointermove', this.onPointerMove)
    this.host.removeEventListener('pointerup', this.onPointerUp)
    this.host.removeEventListener('pointercancel', this.onPointerUp)
    this.host.removeEventListener('wheel', this.onWheel)
  }

  update(playerPosition: THREE.Vector3, playerUp: THREE.Vector3, dt: number) {
    const basis = tangentBasis(playerUp)
    const orbitForward = rotateAroundAxis(basis.forward, playerUp, this.yaw).normalize()
    const horizontalBack = orbitForward.clone().multiplyScalar(-Math.cos(this.pitch) * this.distance)
    const vertical = playerUp.clone().multiplyScalar(Math.sin(this.pitch) * this.distance)

    this.target.copy(playerPosition).addScaledVector(playerUp, 1.05)
    this.desiredPosition.copy(this.target).add(horizontalBack).add(vertical)

    const minSurfaceDistance = PLANET_RADIUS + 0.9
    if (this.desiredPosition.length() < minSurfaceDistance) {
      this.desiredPosition.normalize().multiplyScalar(minSurfaceDistance)
    }

    const positionAlpha = 1 - Math.exp(-dt * 7.5)
    const upAlpha = 1 - Math.exp(-dt * 4.2)
    this.camera.position.lerp(this.desiredPosition, positionAlpha)
    this.smoothUp.lerp(playerUp, upAlpha).normalize()
    this.camera.up.copy(this.smoothUp)
    this.lookTarget.lerp(this.target, positionAlpha)
    this.camera.lookAt(this.lookTarget)
  }

  getMoveBasis(playerUp: THREE.Vector3) {
    const forward = projectToTangent(this.lookTarget.clone().sub(this.camera.position), playerUp)
    if (forward.lengthSq() < 0.000001) forward.copy(tangentBasis(playerUp).forward)
    forward.normalize()
    const right = new THREE.Vector3().crossVectors(playerUp, forward).normalize()
    return { forward, right }
  }

  getSnapshot(): CameraSnapshot {
    return {
      distance: this.distance,
      yaw: this.yaw,
      pitch: this.pitch,
    }
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    this.dragging = true
    this.lastPointerX = event.clientX
    this.lastPointerY = event.clientY
    this.host.setPointerCapture(event.pointerId)
  }

  private readonly onPointerMove = (event: PointerEvent) => {
    if (!this.dragging) return
    const dx = event.clientX - this.lastPointerX
    const dy = event.clientY - this.lastPointerY
    this.yaw -= dx * 0.005
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.0035, 0.12, 0.74)
    this.lastPointerX = event.clientX
    this.lastPointerY = event.clientY
  }

  private readonly onPointerUp = (event: PointerEvent) => {
    this.dragging = false
    if (this.host.hasPointerCapture(event.pointerId)) this.host.releasePointerCapture(event.pointerId)
  }

  private readonly onWheel = (event: WheelEvent) => {
    event.preventDefault()
    this.distance = THREE.MathUtils.clamp(this.distance + event.deltaY * 0.008, 8.5, 18)
  }
}
