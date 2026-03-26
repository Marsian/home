import { test, expect } from '@playwright/test'

test('tank90 main flow (debug assisted)', async ({ page }) => {
  await page.goto('/tank90?debug=1')

  // Basic HUD visible
  await expect(page.getByText('90 TANK BATTLE')).toBeVisible()
  await expect(page.getByText('WASD MOVE / SPACE FIRE / P PAUSE')).toBeVisible()

  const hud = page.locator('main').getByText(/^LV\./).first()

  // Start game
  await page.getByRole('button', { name: 'START' }).click()
  await expect(hud).toContainText(/RUNNING/i)
  await expect(hud).toContainText(/PLAYER ALIVE/i)

  // Pause / resume via keyboard
  await page.keyboard.press('P')
  await expect(hud).toContainText(/PAUSED/i)
  await page.keyboard.press('P')
  await expect(hud).toContainText(/RUNNING/i)

  // Force lose -> should show GAME OVER, LOST, PLAYER DEAD, and RESTART available
  await page.getByRole('button', { name: 'FORCE_LOSE' }).click()
  await expect(hud).toContainText(/LOST/i)
  await expect(hud).toContainText(/PLAYER DEAD/i)
  await expect(page.getByRole('button', { name: 'RESTART' })).toBeVisible()

  // Restart should clear old HUD state
  await page.getByRole('button', { name: 'RESTART' }).click()
  await expect(hud).toContainText(/RUNNING/i)
  await expect(hud).toContainText(/PLAYER ALIVE/i)

  // Force win -> NEXT LV appears, can advance to next level
  await page.getByRole('button', { name: 'FORCE_WIN' }).click()
  await expect(hud).toContainText(/WON/i)
  const nextBtn = page.getByRole('button', { name: 'NEXT LV' })
  await expect(nextBtn).toBeVisible()
  await nextBtn.click()
  await expect(hud).toContainText(/LV\.2/i)
  await expect(hud).toContainText(/RUNNING/i)
})

