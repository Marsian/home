import { createElement, type ReactNode } from 'react'

import { FruitNinjaThumbnail } from './thumbnails/FruitNinjaThumbnail'
import { PixelKnightThumbnail } from './thumbnails/PixelKnightThumbnail'
import { StarTripThumbnail } from './thumbnails/StarTripThumbnail'
import { Tank90Thumbnail } from './thumbnails/Tank90Thumbnail'

export type GameDescriptor = {
  id: 'tank90' | 'fruit-ninja' | 'pixel-knight' | 'star-trip'
  title: string
  cardLabel: string
  route: string
  description?: string
  thumbnail: ReactNode
}

export const games: GameDescriptor[] = [
  {
    id: 'tank90',
    title: '90 TANK BATTLE',
    cardLabel: '90 Tank Battle',
    route: '/games/tank90',
    description: 'Arcade tank combat',
    thumbnail: createElement(Tank90Thumbnail, { className: 'h-full w-full' }),
  },
  {
    id: 'fruit-ninja',
    title: 'FRUIT NINJA',
    cardLabel: 'Fruit Ninja',
    route: '/games/fruit-ninja',
    description: 'Dojo slicing — fruit, combos, bombs & lives',
    thumbnail: createElement(FruitNinjaThumbnail, { className: 'h-full w-full' }),
  },
  {
    id: 'pixel-knight',
    title: 'PIXEL KNIGHT',
    cardLabel: 'Pixel Knight',
    route: '/games/pixel-knight',
    description: 'Bright dungeon runs, difficulty tiers, knight loot builds',
    thumbnail: createElement(PixelKnightThumbnail, { className: 'h-full w-full' }),
  },
  {
    id: 'star-trip',
    title: 'A STAR TRIP',
    cardLabel: 'a star trip',
    route: '/games/star-trip',
    description: 'Tiny planet exploration, gardening, fishing & neighbors',
    thumbnail: createElement(StarTripThumbnail, { className: 'h-full w-full' }),
  },
]
