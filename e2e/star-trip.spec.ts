import { expect, test, type Page } from '@playwright/test'

function attachNoErrorGuards(page: Page, bucket: string[]) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') bucket.push(`console:${msg.text()}`)
  })
  page.on('pageerror', (err) => {
    bucket.push(`pageerror:${err.message}`)
  })
}

async function getStarTripSnapshot(page: Page) {
  return page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    return w.__starTrip_e2e?.getSnapshot?.()
  })
}

function dot3(
  a: { x: number; y: number; z: number } | undefined,
  b: { x: number; y: number; z: number } | undefined,
) {
  if (!a || !b) return 0
  return a.x * b.x + a.y * b.y + a.z * b.z
}

async function waitForStarTripReady(page: Page) {
  await expect
    .poll(async () => {
      const snapshot = await getStarTripSnapshot(page)
      return snapshot?.ready === true
    })
    .toBe(true)
}

async function getCanvasPixelSummary(page: Page) {
  return page.locator('[data-testid="star-trip-canvas"]').evaluate((canvas) => {
    const source = canvas as HTMLCanvasElement
    const probe = document.createElement('canvas')
    probe.width = source.width
    probe.height = source.height
    const ctx = probe.getContext('2d')
    if (!ctx) return { opaque: 0, unique: 0 }
    ctx.drawImage(source, 0, 0)
    const colors = new Set<string>()
    let opaque = 0
    for (let y = 0; y < probe.height; y += Math.max(1, Math.floor(probe.height / 8))) {
      for (let x = 0; x < probe.width; x += Math.max(1, Math.floor(probe.width / 8))) {
        const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data
        if (a > 0) opaque += 1
        colors.add(`${r}:${g}:${b}:${a}`)
      }
    }
    return { opaque, unique: colors.size }
  })
}

test('star trip renders inside a game panel with no visible HUD', async ({ page }) => {
  const runtimeErrors: string[] = []
  attachNoErrorGuards(page, runtimeErrors)
  await page.goto('/games/star-trip?e2e=1')
  await waitForStarTripReady(page)
  const snapshot = await getStarTripSnapshot(page)

  const playfield = page.locator('[data-testid="star-trip-playfield"]')
  const canvas = page.locator('[data-testid="star-trip-canvas"]')
  await expect(playfield).toBeVisible()
  await expect(canvas).toBeVisible()
  expect(snapshot?.player?.picoAsset?.detailObjectsPresent).toBe(true)
  expect(snapshot?.player?.picoAsset?.detailObjectNames).toEqual(
    expect.arrayContaining([
      'Pico_Jetpack_Main_shell_lowpoly',
      'Pico_Tail_Upturned_3feather',
      'Pico_Crest_Back_Tuft_01',
      'Pico_Crest_Back_Tuft_02',
      'Pico_Crest_Back_Tuft_03',
    ]),
  )

  const layout = await playfield.evaluate((el) => {
    const r = el.getBoundingClientRect()
    return {
      ratio: r.width / r.height,
      width: r.width,
      height: r.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      text: el.textContent ?? '',
    }
  })
  expect(Math.abs(layout.ratio - 1.6)).toBeLessThan(0.04)
  expect(layout.width).toBeLessThan(layout.viewportWidth)
  expect(layout.height).toBeLessThan(layout.viewportHeight)
  expect(layout.text.trim()).toBe('')

  await expect(page.getByText('Reach the mountain tower')).toHaveCount(0)
  await expect(page.getByText('Signal')).toHaveCount(0)

  const pixels = await getCanvasPixelSummary(page)
  expect(pixels.opaque).toBeGreaterThan(12)
  expect(pixels.unique).toBeGreaterThan(2)
  expect(runtimeErrors).toEqual([])
})

test('star trip panel keeps its shape on mobile', async ({ page }) => {
  const runtimeErrors: string[] = []
  attachNoErrorGuards(page, runtimeErrors)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/games/star-trip?e2e=1')
  await waitForStarTripReady(page)

  const ratio = await page.locator('[data-testid="star-trip-playfield"]').evaluate((el) => {
    const r = el.getBoundingClientRect()
    return r.width / r.height
  })
  expect(Math.abs(ratio - 1.6)).toBeLessThan(0.06)
  expect(runtimeErrors).toEqual([])
})

test('star trip moves Pico without scrolling the page', async ({ page }) => {
  const runtimeErrors: string[] = []
  attachNoErrorGuards(page, runtimeErrors)
  await page.goto('/games/star-trip?e2e=1')
  await waitForStarTripReady(page)

  const before = await getStarTripSnapshot(page)
  await page.locator('[data-testid="star-trip-canvas"]').click()
  await page.keyboard.down('ArrowUp')
  await page.keyboard.down('ShiftLeft')
  await page.waitForTimeout(650)
  await page.keyboard.up('ShiftLeft')
  await page.keyboard.up('ArrowUp')
  const after = await getStarTripSnapshot(page)
  const scrollY = await page.evaluate(() => window.scrollY)
  const movedDistance = Math.hypot(
    (after?.player?.position?.x ?? 0) - (before?.player?.position?.x ?? 0),
    (after?.player?.position?.y ?? 0) - (before?.player?.position?.y ?? 0),
    (after?.player?.position?.z ?? 0) - (before?.player?.position?.z ?? 0),
  )

  expect(movedDistance).toBeGreaterThan(0.12)
  expect(after?.player?.surfaceDot).toBeGreaterThan(0.999)
  expect(Math.abs(after?.player?.forwardDotUp ?? 1)).toBeLessThan(0.001)
  expect(after?.player?.modelUpDotSurfaceUp).toBeGreaterThan(0.999)
  expect(Math.abs(after?.player?.modelForwardDotSurfaceUp ?? 1)).toBeLessThan(0.001)
  expect(after?.playerVisible).toBe(true)
  expect(scrollY).toBe(0)
  expect(runtimeErrors).toEqual([])
})

test('star trip left and right keys turn Pico instead of strafing', async ({ page }) => {
  const runtimeErrors: string[] = []
  attachNoErrorGuards(page, runtimeErrors)
  await page.goto('/games/star-trip?e2e=1')
  await waitForStarTripReady(page)

  const before = await getStarTripSnapshot(page)
  await page.keyboard.down('ArrowRight')
  await page.waitForTimeout(520)
  await page.keyboard.up('ArrowRight')
  const afterTurn = await getStarTripSnapshot(page)
  const turnOnlyDistance = Math.hypot(
    (afterTurn?.player?.position?.x ?? 0) - (before?.player?.position?.x ?? 0),
    (afterTurn?.player?.position?.y ?? 0) - (before?.player?.position?.y ?? 0),
    (afterTurn?.player?.position?.z ?? 0) - (before?.player?.position?.z ?? 0),
  )
  expect(turnOnlyDistance).toBeLessThan(0.04)
  expect(dot3(before?.player?.forward, afterTurn?.player?.forward)).toBeLessThan(0.995)
  expect(afterTurn?.player?.mode).toBe('walk')

  await page.keyboard.down('ArrowUp')
  await page.waitForTimeout(420)
  await page.keyboard.up('ArrowUp')
  const afterForward = await getStarTripSnapshot(page)
  const forwardDistance = Math.hypot(
    (afterForward?.player?.position?.x ?? 0) - (afterTurn?.player?.position?.x ?? 0),
    (afterForward?.player?.position?.y ?? 0) - (afterTurn?.player?.position?.y ?? 0),
    (afterForward?.player?.position?.z ?? 0) - (afterTurn?.player?.position?.z ?? 0),
  )

  expect(forwardDistance).toBeGreaterThan(0.12)
  expect(afterForward?.player?.surfaceDot).toBeGreaterThan(0.999)
  expect(Math.abs(afterForward?.player?.forwardDotUp ?? 1)).toBeLessThan(0.001)
  expect(afterForward?.player?.modelUpDotSurfaceUp).toBeGreaterThan(0.999)
  expect(Math.abs(afterForward?.player?.modelForwardDotSurfaceUp ?? 1)).toBeLessThan(0.001)
  expect(runtimeErrors).toEqual([])
})

test('star trip camera supports drag orbit and wheel distance', async ({ page }) => {
  const runtimeErrors: string[] = []
  attachNoErrorGuards(page, runtimeErrors)
  await page.goto('/games/star-trip?e2e=1')
  await waitForStarTripReady(page)

  const canvas = page.locator('[data-testid="star-trip-canvas"]')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return

  const before = await getStarTripSnapshot(page)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 36)
  await page.mouse.up()
  await page.waitForTimeout(120)
  const afterDrag = await getStarTripSnapshot(page)

  await canvas.hover()
  await page.mouse.wheel(0, 420)
  await page.waitForTimeout(120)
  const afterWheel = await getStarTripSnapshot(page)

  expect(afterDrag?.camera?.yaw).not.toBeCloseTo(before?.camera?.yaw ?? 0, 3)
  expect(afterDrag?.camera?.pitch).not.toBeCloseTo(before?.camera?.pitch ?? 0, 3)
  expect(dot3(before?.player?.forward, afterDrag?.player?.forward)).toBeGreaterThan(0.999)
  expect(afterWheel?.camera?.distance).toBeGreaterThan(afterDrag?.camera?.distance ?? 0)
  expect(afterWheel?.camera?.distance).toBeLessThanOrEqual(18)
  expect(afterWheel?.playerVisible).toBe(true)
  expect(runtimeErrors).toEqual([])
})
