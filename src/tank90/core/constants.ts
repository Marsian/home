import { TILE } from '../levels'

export const WORLD_W = TILE * 26
export const WORLD_H = TILE * 26
export const TANK_SIZE = TILE
export const PLAYER_SPEED = 112
export const PLAYER_BULLET_SPEED = 240
export const BASE_SIZE = TILE * 2
export const EARLY_GAME_SAFETY_MS = 6500
export const STAGE1_EARLY_ACTIVE_ENEMY_CAP = 2
export const STAGE1_EARLY_FIRE_CHANCE_SCALE = 0.58

export const SPAWN_POINTS = [
  { x: TILE * 2, y: TILE * 1 },
  { x: TILE * 12, y: TILE * 1 },
  { x: TILE * 22, y: TILE * 1 },
]
