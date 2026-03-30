import { TILE } from '../levels'
import { TANK_SIZE, WORLD_H, WORLD_W } from './constants'
import type { GameState, Tank } from './types'

function drawPixelTank(ctx: CanvasRenderingContext2D, tank: Tank, palette: [string, string, string]) {
  const [body, trim, barrel] = palette
  const x = Math.floor(tank.x)
  const y = Math.floor(tank.y)
  ctx.fillStyle = trim
  ctx.fillRect(x, y, TANK_SIZE, TANK_SIZE)
  ctx.fillStyle = body
  ctx.fillRect(x + 2, y + 2, TANK_SIZE - 4, TANK_SIZE - 4)
  ctx.fillStyle = trim
  ctx.fillRect(x + 6, y + 6, 4, 4)
  ctx.fillStyle = barrel
  if (tank.dir === 'up') ctx.fillRect(x + 6, y - 3, 4, 6)
  if (tank.dir === 'down') ctx.fillRect(x + 6, y + 13, 4, 6)
  if (tank.dir === 'left') ctx.fillRect(x - 3, y + 6, 6, 4)
  if (tank.dir === 'right') ctx.fillRect(x + 13, y + 6, 6, 4)
}

function drawOverlay(ctx: CanvasRenderingContext2D, text: string) {
  ctx.fillStyle = 'rgba(0,0,0,0.52)'
  ctx.fillRect(0, 0, WORLD_W, WORLD_H)
  ctx.fillStyle = '#f3e0ad'
  ctx.font = 'bold 28px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(text, WORLD_W / 2, WORLD_H / 2)
}

export function draw(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.clearRect(0, 0, WORLD_W, WORLD_H)
  ctx.fillStyle = '#161922'
  ctx.fillRect(0, 0, WORLD_W, WORLD_H)

  ctx.fillStyle = '#22293a'
  for (let y = 0; y < WORLD_H; y += TILE) {
    for (let x = 0; x < WORLD_W; x += TILE) {
      if ((x / TILE + y / TILE) % 2 === 0) ctx.fillRect(x, y, TILE, TILE)
    }
  }

  for (const tile of state.terrain) {
    if (tile.type === 'brick') {
      ctx.fillStyle = '#b45d34'
      ctx.fillRect(tile.x, tile.y, tile.size, tile.size)
      ctx.fillStyle = '#d38654'
      ctx.fillRect(tile.x + 2, tile.y + 2, tile.size - 4, tile.size - 4)
      continue
    }
    if (tile.type === 'steel') {
      ctx.fillStyle = '#8f9cb2'
      ctx.fillRect(tile.x, tile.y, tile.size, tile.size)
      ctx.fillStyle = '#6d778b'
      ctx.fillRect(tile.x + 2, tile.y + 2, tile.size - 4, tile.size - 4)
      continue
    }
    if (tile.type === 'grass') {
      ctx.fillStyle = '#4b8f42'
      ctx.fillRect(tile.x + 1, tile.y + 1, tile.size - 2, tile.size - 2)
      continue
    }
    if (tile.type === 'water') {
      ctx.fillStyle = '#2f5b9b'
      ctx.fillRect(tile.x, tile.y, tile.size, tile.size)
      ctx.fillStyle = '#4f80c0'
      ctx.fillRect(tile.x + 2, tile.y + 2, tile.size - 4, tile.size - 4)
    }
  }

  if (state.base.alive) {
    ctx.fillStyle = '#d8c35e'
    ctx.fillRect(state.base.x, state.base.y, state.base.size, state.base.size)
    ctx.fillStyle = '#3b2f20'
    ctx.fillRect(state.base.x + 5, state.base.y + 4, state.base.size - 10, state.base.size - 8)
    ctx.fillStyle = '#e8d890'
    ctx.fillRect(state.base.x + 12, state.base.y + 8, 8, 4)
  } else {
    ctx.fillStyle = '#6c3a3a'
    ctx.fillRect(state.base.x, state.base.y, state.base.size, state.base.size)
  }

  if (state.player.alive) {
    if (state.playerInvincibleUntil > 0) {
      ctx.globalAlpha = 0.74 + (Math.sin(state.playerInvincibleUntil / 120) + 1) * 0.13
    }
    drawPixelTank(ctx, state.player, ['#53a857', '#2e6f37', '#172518'])
    ctx.globalAlpha = 1
    if (state.playerInvincibleUntil > 0) {
      ctx.strokeStyle = '#f4e39e'
      ctx.lineWidth = 2
      ctx.strokeRect(state.player.x - 1, state.player.y - 1, TANK_SIZE + 2, TANK_SIZE + 2)
    }
  }

  for (const enemy of state.enemies) {
    if (!enemy.alive) continue
    const palette =
      enemy.archetypeId === 'heavy'
        ? (['#7a4750', '#582a31', '#1f1718'] as [string, string, string])
        : enemy.archetypeId === 'sniper'
          ? (['#a77d45', '#74552a', '#2a1c0d'] as [string, string, string])
          : enemy.archetypeId === 'raider'
            ? (['#8d5959', '#683737', '#2b1818'] as [string, string, string])
            : (['#b85f5f', '#7e3939', '#2b1818'] as [string, string, string])
    drawPixelTank(ctx, enemy, palette)
    if (enemy.hp > 1) {
      ctx.fillStyle = '#f2dd96'
      ctx.fillRect(enemy.x + 6, enemy.y - 3, 4, 2)
    }
  }

  for (const bullet of state.bullets) {
    ctx.fillStyle = bullet.owner === 'player' ? '#f8ebbf' : '#ffb178'
    ctx.beginPath()
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2)
    ctx.fill()
  }

  if (state.levelBannerUntil > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(0, WORLD_H / 2 - 26, WORLD_W, 52)
    ctx.fillStyle = '#ffe5a1'
    ctx.font = 'bold 20px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`STAGE ${state.level}`, WORLD_W / 2, WORLD_H / 2 + 7)
  }

  if (state.playerInvincibleUntil > 0 && state.status === 'running') {
    ctx.fillStyle = '#f4e39e'
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'left'
    ctx.fillText('SPAWN SHIELD', 8, 14)
  }

  if (state.status === 'paused') drawOverlay(ctx, 'PAUSED')
  if (state.status === 'won') drawOverlay(ctx, 'STAGE CLEAR')
  if (state.status === 'lost') drawOverlay(ctx, 'GAME OVER')
}
