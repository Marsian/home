import type { DungeonId } from '../types'
import { autumnWoodMapPack } from './autumn-wood/autumnWoodMap'

export const otherworldMapPacks = [autumnWoodMapPack] as const

export type OtherworldMapPack = (typeof otherworldMapPacks)[number]

export const availableOtherworldDungeonIds = otherworldMapPacks.map((pack) => pack.dungeonId) as DungeonId[]

export function hasOtherworldMapForDungeon(dungeonId: DungeonId) {
  return availableOtherworldDungeonIds.includes(dungeonId)
}

export function getOtherworldMapPack(dungeonId: DungeonId): OtherworldMapPack | null {
  return otherworldMapPacks.find((pack) => pack.dungeonId === dungeonId) ?? null
}
