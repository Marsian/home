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

async function teleportStarTripPlayer(page: Page, lat: number, lon: number) {
  await page.evaluate(
    ([targetLat, targetLon]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any
      w.__starTrip_e2e?.teleportPlayer?.(targetLat, targetLon)
    },
    [lat, lon],
  )
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
    }, { timeout: 25_000 })
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

async function setPixelationLevel(page: Page, level: number) {
  await page.locator('[data-testid="star-trip-pixelation-slider"]').fill(String(level))
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
  expect(snapshot?.player?.picoAsset?.version).toBe('pico-v0.1.4-proportions')
  expect(snapshot?.planetRadius).toBe(40.8)
  expect(snapshot?.player?.surfaceRadius).toBeGreaterThan(41)
  expect(snapshot?.player?.surfaceElevation).toBeGreaterThan(0.5)
  expect(snapshot?.environment?.version).toBe('world-v0.1.6')
  expect(snapshot?.environment?.assetDefinitions).toBe(38)
  expect(snapshot?.environment?.referenceManifestAssets).toBe(38)
  expect(snapshot?.environment?.placements).toBeGreaterThan(20)
  expect(snapshot?.environment?.missingAssetIds).toEqual([])
  expect(snapshot?.environment?.referenceChecks?.allAssetsHaveReference).toBe(true)
  expect(snapshot?.environment?.referenceChecks?.allReferencesHaveSourceUrl).toBe(true)
  expect(snapshot?.environment?.placementChecks?.allRadialDistancesValid).toBe(true)
  expect(snapshot?.environment?.placementChecks?.allUpAligned).toBe(true)
  expect(snapshot?.environment?.placementChecks?.allGroundedOnTerrain).toBe(true)
  expect(snapshot?.environment?.placementChecks?.groundedObjects).toBe(snapshot?.environment?.placements)
  expect(snapshot?.environment?.placementChecks?.floatingObjects).toEqual([])
  expect(snapshot?.environment?.placementChecks?.maxGroundingError).toBeLessThan(0.001)
  expect(snapshot?.environment?.collisionChecks?.allPlacedObjectsHaveCollisionBody).toBe(true)
  expect(snapshot?.environment?.collisionChecks?.terrainShellCollider).toBe(true)
  expect(snapshot?.environment?.collisionChecks?.terrainSurfaceMeshes).toBeGreaterThan(0)
  expect(snapshot?.environment?.collisionChecks?.solidBodies).toBeGreaterThan(20)
  expect(snapshot?.environment?.collisionChecks?.walkableBodies).toBeGreaterThan(0)
  expect(snapshot?.player?.terrainClearance).toBe(0)
  expect(snapshot?.player?.surfaceRadius).toBeLessThan(43)
  expect(snapshot?.player?.terrainSurface?.assetId).toBe('ST016_golden_grass_meadow')
  expect(snapshot?.environment?.terrainCoverage?.assetId).toBe('ST016_planet_terrain_shell')
  expect(snapshot?.environment?.terrainCoverage?.surface_coverage_percent).toBe(100)
  expect(snapshot?.environment?.terrainCoverage?.height_range).toBeGreaterThan(6)
  expect(snapshot?.environment?.terrainCoverage?.face_count).toBeGreaterThan(20000)
  expect(snapshot?.environment?.terrainCoverage?.biome_count).toBeGreaterThanOrEqual(8)
  expect(snapshot?.environment?.terrainCoverage?.patch_surface_coverage_percent).toBeGreaterThanOrEqual(66.67)
  expect(snapshot?.environment?.terrainCoverage?.patch_surface_coverage_percent).toBeGreaterThan(90)
  expect(snapshot?.environment?.terrainCoverage?.coverage_method).toContain('triangle area')
  expect(snapshot?.environment?.terrainCoverage?.terrain_patch_mesh_rule).toContain('spherical terrain shell')
  expect(snapshot?.environment?.keyLandmarksPresent).toEqual(
    expect.arrayContaining([
      'ST015_rocket_main_hull',
      'ST016_echo_crater_lake',
      'ST016_sunlit_beach_crescent',
      'ST016_mangrove_marsh_patch',
      'ST016_crystal_spine_ridge',
      'ST016_ember_cinder_field',
      'ST016_snow_cap_peak',
      'ST016_summit_comm_array',
    ]),
  )
  expect(snapshot?.environment?.regions?.['spawn-meadow']).toBeGreaterThan(4)
  expect(snapshot?.environment?.regions?.['snow-summit']).toBeGreaterThan(3)
  expect(snapshot?.environment?.regions?.['coastal-route']).toBeGreaterThan(0)
  expect(snapshot?.environment?.regions?.['ridge-route']).toBeGreaterThan(0)
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

  await expect(page.locator('[data-testid="star-trip-settings-button"]')).toBeVisible()
  await expect(page.locator('[data-testid="star-trip-settings-panel"]')).toHaveCount(0)
  await expect(page.getByText('Reach the mountain tower')).toHaveCount(0)
  await expect(page.getByText('Signal')).toHaveCount(0)

  await expect
    .poll(async () => {
      const pixels = await getCanvasPixelSummary(page)
      return pixels.unique
    })
    .toBeGreaterThan(2)
  const pixels = await getCanvasPixelSummary(page)
  expect(pixels.opaque).toBeGreaterThan(12)
  expect(pixels.unique).toBeGreaterThan(2)
  expect(runtimeErrors).toEqual([])
})

test('star trip collision keeps Pico above terrain and outside solid models', async ({ page }) => {
  const runtimeErrors: string[] = []
  attachNoErrorGuards(page, runtimeErrors)
  await page.goto('/games/star-trip?e2e=1')
  await waitForStarTripReady(page)

  await teleportStarTripPlayer(page, 55.2, -21.8)
  const summitSnapshot = await getStarTripSnapshot(page)
  expect(summitSnapshot?.player?.grounded).toBe(true)
  expect(summitSnapshot?.player?.terrainClearance).toBe(0)
  expect(summitSnapshot?.player?.terrainSurface?.assetId).toBe('ST016_snow_cap_peak')
  expect(summitSnapshot?.player?.surfaceRadius).toBeGreaterThan(49)
  expect(summitSnapshot?.player?.surfaceElevation).toBeGreaterThan(8)
  expect(summitSnapshot?.player?.nearestCollision?.penetration ?? 0).toBeLessThanOrEqual(0.01)

  await page.locator('[data-testid="star-trip-canvas"]').click()
  await page.keyboard.down('ArrowUp')
  await page.waitForTimeout(500)
  await page.keyboard.up('ArrowUp')
  const walkedOnSummit = await getStarTripSnapshot(page)
  expect(walkedOnSummit?.player?.terrainClearance).toBe(0)
  expect(walkedOnSummit?.player?.surfaceElevation).toBeGreaterThan(7)
  expect(walkedOnSummit?.player?.terrainSurface?.assetId).toBe('ST016_snow_cap_peak')

  await teleportStarTripPlayer(page, -22.7, 24.8)
  const rocketSnapshot = await getStarTripSnapshot(page)
  expect(rocketSnapshot?.player?.terrainClearance).toBe(0)
  expect(rocketSnapshot?.player?.collisionBlockCount).toBeGreaterThan(0)
  expect(rocketSnapshot?.player?.nearestCollision?.assetId).toBe('ST015_rocket_main_hull')
  expect(rocketSnapshot?.player?.nearestCollision?.solid).toBe(true)
  expect(rocketSnapshot?.player?.nearestCollision?.penetration).toBe(0)
  expect(rocketSnapshot?.player?.nearestCollision?.distance).toBeGreaterThanOrEqual(
    rocketSnapshot?.player?.nearestCollision?.minDistance ?? 0,
  )
  expect(runtimeErrors).toEqual([])
})

test('star trip settings panel can maximize pixelation', async ({ page }) => {
  const runtimeErrors: string[] = []
  attachNoErrorGuards(page, runtimeErrors)
  await page.goto('/games/star-trip?e2e=1')
  await waitForStarTripReady(page)

  await page.locator('[data-testid="star-trip-settings-button"]').click()
  await expect(page.locator('[data-testid="star-trip-settings-panel"]')).toBeVisible()
  await setPixelationLevel(page, 3)
  await expect(page.locator('[data-testid="star-trip-pixelation-value"]')).toHaveText('3px')

  await expect
    .poll(async () => {
      const snapshot = await getStarTripSnapshot(page)
      return snapshot?.renderSettings?.pixelationLevel
    })
    .toBe(3)

  const snapshot = await getStarTripSnapshot(page)
  expect(snapshot?.pixelation?.enabled).toBe(true)
  expect(snapshot?.pixelation?.blockSize).toBe(3)
  expect(snapshot?.pixelation?.targetWidth).toBeGreaterThan(0)
  expect(snapshot?.pixelation?.targetHeight).toBeGreaterThan(0)
  expect(snapshot?.pixelation?.targetWidth).toBeLessThan(snapshot?.canvas?.width ?? 0)
  expect(snapshot?.pixelation?.targetHeight).toBeLessThan(snapshot?.canvas?.height ?? 0)
  expect(runtimeErrors).toEqual([])
})

test('star trip settings panel can fully disable pixelation', async ({ page }) => {
  const runtimeErrors: string[] = []
  attachNoErrorGuards(page, runtimeErrors)
  await page.goto('/games/star-trip?e2e=1')
  await waitForStarTripReady(page)

  await page.locator('[data-testid="star-trip-settings-button"]').click()
  await setPixelationLevel(page, 0)
  await expect(page.locator('[data-testid="star-trip-pixelation-value"]')).toHaveText('0px')

  await expect
    .poll(async () => {
      const snapshot = await getStarTripSnapshot(page)
      return snapshot?.pixelation?.enabled
    })
    .toBe(false)

  const snapshot = await getStarTripSnapshot(page)
  expect(snapshot?.renderSettings?.pixelationLevel).toBe(0)
  expect(snapshot?.pixelation?.targetWidth).toBe(0)
  expect(snapshot?.pixelation?.targetHeight).toBe(0)
  expect(runtimeErrors).toEqual([])
})

test('star trip restores pixelation settings after refresh', async ({ page }) => {
  const runtimeErrors: string[] = []
  attachNoErrorGuards(page, runtimeErrors)
  await page.goto('/games/star-trip?e2e=1')
  await waitForStarTripReady(page)

  await page.locator('[data-testid="star-trip-settings-button"]').click()
  await setPixelationLevel(page, 1)
  await expect(page.locator('[data-testid="star-trip-pixelation-value"]')).toHaveText('1px')
  await page.reload()
  await waitForStarTripReady(page)

  const snapshot = await getStarTripSnapshot(page)
  expect(snapshot?.renderSettings?.pixelationLevel).toBe(1)
  expect(snapshot?.pixelation?.enabled).toBe(true)
  expect(snapshot?.pixelation?.blockSize).toBe(1)

  await page.locator('[data-testid="star-trip-settings-button"]').click()
  await expect(page.locator('[data-testid="star-trip-pixelation-value"]')).toHaveText('1px')
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
  await page.waitForTimeout(850)
  const after = await getStarTripSnapshot(page)
  await page.keyboard.up('ShiftLeft')
  await page.keyboard.up('ArrowUp')
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
  expect(after?.player?.mode).toBe('run')
  expect(after?.player?.gait?.runSpeed).toBeGreaterThan(after?.player?.gait?.walkSpeed ?? 0)
  expect(after?.player?.speed).toBeLessThanOrEqual((after?.player?.gait?.runSpeed ?? 0) * 1.05)
  expect(scrollY).toBe(0)
  expect(runtimeErrors).toEqual([])
})

test('star trip derives walk and run speed from Pico gait metrics', async ({ page }) => {
  const runtimeErrors: string[] = []
  attachNoErrorGuards(page, runtimeErrors)
  await page.goto('/games/star-trip?e2e=1')
  await waitForStarTripReady(page)

  const ready = await getStarTripSnapshot(page)
  expect(ready?.player?.picoAsset?.version).toBe('pico-v0.1.4-proportions')
  expect(ready?.player?.gait?.effectiveLegLength).toBeGreaterThan(0.3)
  expect(ready?.player?.gait?.walkStepLength).toBeGreaterThan(0.35)
  expect(ready?.player?.gait?.runStepLength).toBeGreaterThan(ready?.player?.gait?.walkStepLength ?? 0)
  expect(ready?.player?.gait?.runSpeed).toBeGreaterThan(ready?.player?.gait?.walkSpeed ?? 0)

  await page.locator('[data-testid="star-trip-canvas"]').click()
  const beforeWalk = await getStarTripSnapshot(page)
  await page.keyboard.down('ArrowUp')
  await page.waitForTimeout(650)
  const afterWalk = await getStarTripSnapshot(page)
  await page.keyboard.up('ArrowUp')
  const walkDistance = Math.hypot(
    (afterWalk?.player?.position?.x ?? 0) - (beforeWalk?.player?.position?.x ?? 0),
    (afterWalk?.player?.position?.y ?? 0) - (beforeWalk?.player?.position?.y ?? 0),
    (afterWalk?.player?.position?.z ?? 0) - (beforeWalk?.player?.position?.z ?? 0),
  )
  const walkSpeed = afterWalk?.player?.gait?.walkSpeed ?? 0
  expect(afterWalk?.player?.mode).toBe('walk')
  expect(afterWalk?.player?.speed).toBeGreaterThan(walkSpeed * 0.82)
  expect(afterWalk?.player?.speed).toBeLessThanOrEqual(walkSpeed * 1.05)

  const beforeRun = await getStarTripSnapshot(page)
  await page.keyboard.down('ArrowUp')
  await page.keyboard.down('ShiftLeft')
  await page.waitForTimeout(650)
  const afterRun = await getStarTripSnapshot(page)
  await page.keyboard.up('ShiftLeft')
  await page.keyboard.up('ArrowUp')
  const runDistance = Math.hypot(
    (afterRun?.player?.position?.x ?? 0) - (beforeRun?.player?.position?.x ?? 0),
    (afterRun?.player?.position?.y ?? 0) - (beforeRun?.player?.position?.y ?? 0),
    (afterRun?.player?.position?.z ?? 0) - (beforeRun?.player?.position?.z ?? 0),
  )
  const runSpeed = afterRun?.player?.gait?.runSpeed ?? 0
  expect(afterRun?.player?.mode).toBe('run')
  expect(afterRun?.player?.speed).toBeGreaterThan(runSpeed * 0.82)
  expect(afterRun?.player?.speed).toBeLessThanOrEqual(runSpeed * 1.05)
  expect(runDistance).toBeGreaterThan(walkDistance * 1.25)
  expect(runtimeErrors).toEqual([])
})

test('star trip left and right keys turn Pico instead of strafing', async ({ page }) => {
  const runtimeErrors: string[] = []
  attachNoErrorGuards(page, runtimeErrors)
  await page.goto('/games/star-trip?e2e=1')
  await waitForStarTripReady(page)

  await page.locator('[data-testid="star-trip-canvas"]').click()
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
  await page.waitForTimeout(650)
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
