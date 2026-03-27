import { test, expect, type Page } from '@playwright/test'

function attachNoErrorGuards(page: Page, bucket: string[]) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') bucket.push(`console:${msg.text()}`)
  })
  page.on('pageerror', (err) => {
    bucket.push(`pageerror:${err.message}`)
  })
}

test('tank90 main flow (debug assisted)', async ({ page }) => {
  const runtimeErrors: string[] = []
  attachNoErrorGuards(page, runtimeErrors)
  await page.goto('/tank90?debug=1')

  // Basic HUD visible
  await expect(page.getByText('90 TANK BATTLE')).toBeVisible()
  await expect(page.getByText('KEYBOARD: WASD + ARROWS MOVE / SPACE FIRE / P PAUSE')).toBeVisible()

  const hud = page.locator('main').getByText(/^LV\./).first()

  // Start game
  await page.getByRole('button', { name: 'START' }).click()
  await expect(hud).toContainText(/RUNNING/i)
  await expect(hud).toContainText(/PLAYER ALIVE/i)
  await page.waitForTimeout(250)
  await expect(hud).toContainText(/RUNNING/i)

  // Arrow keys also move (v2)
  await page.keyboard.down('ArrowRight')
  await page.waitForTimeout(200)
  await page.keyboard.up('ArrowRight')

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
  expect(runtimeErrors).toEqual([])
})

test('tank90 mobile controls and menu-safe layout', async ({ page }) => {
  const runtimeErrors: string[] = []
  attachNoErrorGuards(page, runtimeErrors)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/tank90?debug=1')
  await page.getByRole('button', { name: 'START' }).click()

  await expect(page.getByText('TOUCH: DRAG JOYSTICK MOVE / HOLD FIRE SHOOT / PAUSE TOGGLE')).toBeVisible()

  await expect(page.getByLabel('Virtual joystick')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Touch fire' })).toBeVisible()

  // ensure fixed app menu does not overlap core action buttons
  await expect(page.getByRole('button', { name: 'START' })).toBeVisible()
  await expect(page.getByRole('button', { name: '90 Tank Battle' })).toBeVisible()
  await expect(page.getByLabel('Touch controls')).toBeVisible()

  await page.getByRole('button', { name: 'Touch fire' }).dispatchEvent('pointerdown')
  await page.waitForTimeout(120)
  await page.getByRole('button', { name: 'Touch fire' }).dispatchEvent('pointerup')

  await page.getByRole('button', { name: 'Pause game' }).click()
  const hud = page.locator('main').getByText(/^LV\./).first()
  await expect(hud).toContainText(/PAUSED/i)
  expect(runtimeErrors).toEqual([])
})

test('tank90 progression with repeated pause/restart/win/lose loops', async ({ page }) => {
  const runtimeErrors: string[] = []
  attachNoErrorGuards(page, runtimeErrors)
  await page.goto('/tank90?debug=1')
  const hud = page.locator('main').getByText(/^LV\./).first()

  await page.getByRole('button', { name: 'START' }).click()
  await expect(hud).toContainText(/RUNNING/i)

  // Exercise repeated pause/resume and restart loops.
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press('P')
    await expect(hud).toContainText(/PAUSED/i)
    await page.keyboard.press('P')
    await expect(hud).toContainText(/RUNNING/i)

    await page.getByRole('button', { name: 'FORCE_LOSE' }).click()
    await expect(hud).toContainText(/LOST/i)
    await page.getByRole('button', { name: 'RESTART' }).click()
    await expect(hud).toContainText(/RUNNING/i)
  }

  // Progress across multiple levels with deterministic debug win.
  for (let level = 1; level <= 4; level += 1) {
    await page.getByRole('button', { name: 'FORCE_WIN' }).click()
    await expect(hud).toContainText(/WON/i)
    const nextBtn = page.getByRole('button', { name: 'NEXT LV' })
    await expect(nextBtn).toBeVisible()
    await nextBtn.click()
    await expect(hud).toContainText(new RegExp(`LV\\.${level + 1}`, 'i'))
    await expect(hud).toContainText(/RUNNING/i)
  }

  expect(runtimeErrors).toEqual([])
})

test('tank90 sustained soak input has no runtime errors', async ({ page }) => {
  const runtimeErrors: string[] = []
  attachNoErrorGuards(page, runtimeErrors)
  await page.goto('/tank90?debug=1')
  const hud = page.locator('main').getByText(/^LV\./).first()
  await page.getByRole('button', { name: 'START' }).click()
  await expect(hud).toContainText(/RUNNING/i)

  const movementKeys = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft']
  for (let i = 0; i < 8; i += 1) {
    const key = movementKeys[i % movementKeys.length]
    await page.keyboard.down(key)
    await page.keyboard.down('Space')
    await page.waitForTimeout(420)
    await page.keyboard.up('Space')
    await page.keyboard.up(key)
    await page.waitForTimeout(90)
    await expect(hud).not.toContainText(/READY/i)
  }

  await expect(hud).toContainText(/RUNNING|WON|LOST|PAUSED/i)
  expect(runtimeErrors).toEqual([])
})

