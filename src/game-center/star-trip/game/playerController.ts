import * as THREE from 'three'

import type { StarTripInputState } from './input'
import { createPicoGroundGait, updatePicoAnimation } from './playerAnimation'
import type { PicoGroundGaitMetrics, PlayerAnimMode } from './playerAnimation'
import { PICO_MODEL_VERSION } from './playerModel'
import type { PicoParts } from './playerModel'
import type { StarTripCollisionBody } from './spawnEnvironment'
import {
  PLAYER_SURFACE_OFFSET,
  PLANET_RADIUS,
  buildSurfaceFrame,
  normalFromLatLon,
  moveAlongSphere,
  orientObjectToSurface,
  projectToTangent,
  terrainRegionAssetIdAtNormal,
  terrainRadiusAtNormal,
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
  surfaceRadius: number
  surfaceElevation: number
  terrainClearance: number
  terrainSurface: {
    assetId: string
    meshName: string
    radius: number
    distance: number
    triangleIndex: number | null
  } | null
  collisionBlockCount: number
  nearestCollision: {
    assetId: string
    distance: number
    minDistance: number
    penetration: number
    solid: boolean
  } | null
  grounded: boolean
  mode: PlayerAnimMode
  speed: number
  gait: {
    effectiveLegLength: number
    walkSpeed: number
    runSpeed: number
    walkStepLength: number
    runStepLength: number
  }
  picoAsset: {
    version: string
    detailObjectNames: string[]
    detailObjectsPresent: boolean
    flameVisible: boolean
  }
}

const MIN_GLIDE_ALTITUDE = 0.35
const PLAYER_COLLISION_RADIUS = 0.32
const COLLISION_SOLVER_ITERATIONS = 3
const TERRAIN_RAY_START_RADIUS = 72
const TERRAIN_RAY_FAR = 90

function rounded(value: number) {
  const next = Number(value.toFixed(4))
  return Object.is(next, -0) ? 0 : next
}

export class PlayerController {
  readonly group: THREE.Group

  private readonly parts: PicoParts
  private readonly gait: PicoGroundGaitMetrics
  private readonly collisionBodies: StarTripCollisionBody[]
  private readonly terrainSurfaces: THREE.Object3D[]
  private readonly terrainRaycaster = new THREE.Raycaster()
  private lastTerrainHit: PlayerSnapshot['terrainSurface'] = null
  private readonly surfacePoint = (() => {
    const normal = normalFromLatLon(-18, 22)
    return normal.multiplyScalar(terrainRadiusAtNormal(normal))
  })()
  private readonly lastForward = buildSurfaceFrame(this.surfacePoint.clone().normalize()).forward
  private turnVelocity = 0
  private altitude = 0
  private verticalVelocity = 0
  private jetTimeLeft = 0.55
  private elapsed = 0
  private grounded = true
  private mode: PlayerAnimMode = 'walk'
  private currentSpeed = 0
  private collisionBlockCount = 0

  constructor(parts: PicoParts, collisionBodies: StarTripCollisionBody[] = [], terrainSurfaces: THREE.Object3D[] = []) {
    this.parts = parts
    this.gait = createPicoGroundGait(parts)
    this.collisionBodies = collisionBodies
    this.terrainSurfaces = terrainSurfaces
    this.group = parts.root
    this.resolveSurfaceConstraints()
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
      }
      gliding = forwardInput > 0.01 && this.altitude > MIN_GLIDE_ALTITUDE

      const gravity = gliding ? 2.2 : jetActive ? 5.1 : 7.7
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

    const baseSpeed = input.run ? this.gait.modes.run.speed : this.gait.modes.walk.speed
    const airSpeed = gliding ? 2.35 : 1.45
    const turnStepSpeed = turning && this.grounded ? this.gait.modes.walk.speed * 0.87 : 0
    const targetSpeed = moving ? (this.grounded ? baseSpeed : airSpeed) : turnStepSpeed
    this.currentSpeed += (targetSpeed - this.currentSpeed) * (1 - Math.exp(-dt * 12))

    if (moving && this.currentSpeed > 0.02) {
      const step = this.currentSpeed * dt
      this.surfacePoint.copy(moveAlongSphere(this.surfacePoint, move, step))
      this.resolveSurfaceConstraints()
      const nextUp = this.getUp()
      this.orthonormalizeForward(nextUp)
    }

    if (!this.grounded) {
      if (gliding) this.mode = 'glide'
      else if (jetActive) this.mode = 'jet'
      else this.mode = 'jump'
    } else if (moving && input.run && this.currentSpeed > (this.gait.modes.walk.speed + this.gait.modes.run.speed) / 2) {
      this.mode = 'run'
    } else if (moving || turning || this.currentSpeed > 0.12) {
      this.mode = 'walk'
    } else {
      this.mode = 'walk'
    }

    this.syncTransform()
    updatePicoAnimation(this.parts, {
      mode: this.mode,
      speed: this.currentSpeed,
      elapsed: this.elapsed,
      delta: dt,
      jetActive,
      gait: this.gait,
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
      surfaceRadius: rounded(this.surfacePoint.length()),
      surfaceElevation: rounded(this.surfacePoint.length() - PLANET_RADIUS),
      terrainClearance: rounded(p.length() - PLAYER_SURFACE_OFFSET - this.surfacePoint.length()),
      terrainSurface: this.lastTerrainHit,
      collisionBlockCount: this.collisionBlockCount,
      nearestCollision: this.getNearestCollisionSnapshot(),
      grounded: this.grounded,
      mode: this.mode,
      speed: this.currentSpeed,
      gait: {
        effectiveLegLength: this.gait.effectiveLegLength,
        walkSpeed: this.gait.modes.walk.speed,
        runSpeed: this.gait.modes.run.speed,
        walkStepLength: this.gait.modes.walk.visualStepLength,
        runStepLength: this.gait.modes.run.visualStepLength,
      },
      picoAsset: {
        version: PICO_MODEL_VERSION,
        detailObjectNames: this.parts.detailObjectNames,
        detailObjectsPresent: this.parts.detailObjectNames.every((name) => Boolean(this.parts.model.getObjectByName(name))),
        flameVisible: this.parts.flame?.visible === true,
      },
    }
  }

  teleportToLatLon(lat: number, lon: number) {
    const normal = normalFromLatLon(lat, lon)
    this.surfacePoint.copy(normal.multiplyScalar(terrainRadiusAtNormal(normal)))
    this.altitude = 0
    this.verticalVelocity = 0
    this.grounded = true
    this.resolveSurfaceConstraints()
    this.orthonormalizeForward(this.getUp())
    this.syncTransform()
  }

  private syncTransform() {
    const up = this.getUp()
    this.orthonormalizeForward(up)
    this.group.position.copy(up).multiplyScalar(this.surfacePoint.length() + this.altitude + PLAYER_SURFACE_OFFSET)
    orientObjectToSurface(this.group, up, this.lastForward)
  }

  private orthonormalizeForward(up: THREE.Vector3) {
    const frame = buildSurfaceFrame(up, this.lastForward)
    this.lastForward.copy(frame.forward)
  }

  private resolveSurfaceConstraints() {
    this.snapToTerrain()
    for (let i = 0; i < COLLISION_SOLVER_ITERATIONS; i += 1) {
      let pushed = false
      for (const body of this.collisionBodies) {
        if (!body.solid) continue
        if (this.pushOutOfCollisionBody(body)) pushed = true
      }
      this.snapToTerrain()
      if (!pushed) break
    }
  }

  private snapToTerrain() {
    const normal = this.surfacePoint.clone().normalize()
    const terrainHit = this.findTerrainSurface(normal)
    if (terrainHit) {
      this.surfacePoint.copy(terrainHit.point)
      const hitObject = terrainHit.object
      const rootAsset = this.getTerrainAssetObject(hitObject)
      const hitAssetId = String(rootAsset?.userData.assetId ?? hitObject.userData.assetId ?? 'ST016_planet_terrain_shell')
      this.lastTerrainHit = {
        assetId:
          hitAssetId === 'ST016_planet_terrain_shell'
            ? terrainRegionAssetIdAtNormal(terrainHit.point.clone().normalize())
            : hitAssetId,
        meshName: hitObject.name,
        radius: rounded(terrainHit.point.length()),
        distance: rounded(terrainHit.distance),
        triangleIndex: terrainHit.faceIndex ?? null,
      }
    } else {
      this.surfacePoint.copy(normal.multiplyScalar(terrainRadiusAtNormal(normal)))
      this.lastTerrainHit = null
    }
    if (this.altitude < 0) this.altitude = 0
  }

  private findTerrainSurface(normal: THREE.Vector3) {
    if (this.terrainSurfaces.length === 0) return null
    const origin = normal.clone().multiplyScalar(TERRAIN_RAY_START_RADIUS)
    this.terrainRaycaster.set(origin, normal.clone().multiplyScalar(-1))
    this.terrainRaycaster.near = 0
    this.terrainRaycaster.far = TERRAIN_RAY_FAR
    const intersections = this.terrainRaycaster.intersectObjects(this.terrainSurfaces, false)
    for (const intersection of intersections) {
      if (intersection.point.dot(normal) <= 0) continue
      return intersection
    }
    return null
  }

  private getTerrainAssetObject(object: THREE.Object3D) {
    let current: THREE.Object3D | null = object
    while (current) {
      if (current.userData.assetId) return current
      current = current.parent
    }
    return null
  }

  private pushOutOfCollisionBody(body: StarTripCollisionBody) {
    const normal = this.getUp()
    const bodyNormal = body.normal
    const tangentOffset = normal.clone().addScaledVector(bodyNormal, -normal.dot(bodyNormal))
    const localRadius = this.surfacePoint.length()
    const angularDistance = Math.acos(THREE.MathUtils.clamp(normal.dot(bodyNormal), -1, 1))
    const distance = angularDistance * localRadius
    const minDistance = body.radius + PLAYER_COLLISION_RADIUS
    if (distance >= minDistance) return false

    const verticalSeparation = Math.abs(this.surfacePoint.length() + this.altitude - body.position.length())
    if (verticalSeparation > body.height + 0.8) return false

    if (tangentOffset.lengthSq() < 0.000001) {
      const frame = buildSurfaceFrame(bodyNormal, this.lastForward)
      tangentOffset.copy(frame.forward)
    }
    tangentOffset.normalize()
    const correctedNormal = bodyNormal
      .clone()
      .multiplyScalar(Math.cos(minDistance / localRadius))
      .addScaledVector(tangentOffset, Math.sin(minDistance / localRadius))
      .normalize()
    this.surfacePoint.copy(correctedNormal.multiplyScalar(terrainRadiusAtNormal(correctedNormal)))
    this.collisionBlockCount += 1
    return true
  }

  private getNearestCollisionSnapshot() {
    let nearest: PlayerSnapshot['nearestCollision'] = null
    const normal = this.getUp()
    const localRadius = this.surfacePoint.length()
    for (const body of this.collisionBodies) {
      if (!body.solid) continue
      const distance = Math.acos(THREE.MathUtils.clamp(normal.dot(body.normal), -1, 1)) * localRadius
      const minDistance = body.radius + PLAYER_COLLISION_RADIUS
      const penetration = Math.max(0, minDistance - distance)
      if (!nearest || distance < nearest.distance) {
        nearest = {
          assetId: body.assetId,
          distance: rounded(distance),
          minDistance: rounded(minDistance),
          penetration: rounded(penetration),
          solid: body.solid,
        }
      }
    }
    return nearest
  }
}
