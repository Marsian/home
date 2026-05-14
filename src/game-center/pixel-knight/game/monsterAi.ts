import type { EnemyKind } from '../types'

export type CombatEnemyKind = Exclude<EnemyKind, 'boss'>
export type MonsterAiState = 'idle' | 'wander' | 'chase' | 'windup' | 'charge' | 'recover'

export type MonsterAiConfig = {
  radius: number
  baseHealth: number
  baseDamage: number
  baseSpeed: number
  aggroRange: number
  leashRange: number
  attackRange: number
  attackCooldownMs: [number, number]
  attackWindupMs: number
  attackRecoverMs: number
  attackHitDelayMs: number
  aggroMemoryMs: number
  wanderSpeed: number
  wanderIntervalMs: [number, number]
  wanderDurationMs: [number, number]
  chargeSpeed?: number
  chargeDurationMs?: number
}

export const monsterAiConfigs: Record<CombatEnemyKind, MonsterAiConfig> = {
  slime: {
    radius: 14,
    baseHealth: 50,
    baseDamage: 10,
    baseSpeed: 55,
    aggroRange: 150,
    leashRange: 190,
    attackRange: 34,
    attackCooldownMs: [980, 1360],
    attackWindupMs: 260,
    attackRecoverMs: 420,
    attackHitDelayMs: 180,
    aggroMemoryMs: 820,
    wanderSpeed: 22,
    wanderIntervalMs: [1700, 3200],
    wanderDurationMs: [420, 820],
  },
  boar: {
    radius: 16,
    baseHealth: 76,
    baseDamage: 15,
    baseSpeed: 105,
    aggroRange: 260,
    leashRange: 340,
    attackRange: 42,
    attackCooldownMs: [760, 1080],
    attackWindupMs: 330,
    attackRecoverMs: 520,
    attackHitDelayMs: 120,
    aggroMemoryMs: 1900,
    wanderSpeed: 38,
    wanderIntervalMs: [900, 1800],
    wanderDurationMs: [500, 980],
    chargeSpeed: 220,
    chargeDurationMs: 360,
  },
}

export function isCombatEnemyKind(kind: EnemyKind): kind is CombatEnemyKind {
  return kind === 'slime' || kind === 'boar'
}
