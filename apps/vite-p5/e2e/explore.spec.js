import { expect, test as unguardedTest } from '@playwright/test'
import { CARDS, expectAnimating, showCanvasesOnly, test } from './helpers.js'

const SKETCHES = ['tide', ...CARDS]
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

const logEntry = (page, level, text) =>
  page.locator(`[role="log"] [data-level="${level}"]`, { hasText: text })

async function openSketch(page, id, language = 'WGSL') {
  await page.goto(`/explore/#/sketches/${id}`)
  await expect(logEntry(page, 'success', language)).toBeVisible()
  await showCanvasesOnly(page)
}

test.describe('gallery', () => {
  test('lists every sketch and links to its view', async ({ page }) => {
    await page.goto('/explore/')
    await expect(page.getByRole('listitem')).toHaveCount(SKETCHES.length)

    await page.getByRole('link', { name: /Feather/ }).click()
    await expect(page).toHaveURL(/#\/sketches\/feather$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Feather')
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
    await expect(page).toHaveTitle('Feather · Smart Canvas')
  })

  test('is reachable from the landing page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /Explore each sketch/ }).click()
    await expect(page.getByRole('listitem')).toHaveCount(SKETCHES.length)
  })
})

test.describe('routing', () => {
  for (const hash of ['#/nope', '#/sketches/nope', '#/sketches/constructor']) {
    test(`shows a not-found view for ${hash}`, async ({ page }) => {
      await page.goto(`/explore/${hash}`)
      await expect(page.getByText('No sketch here')).toBeVisible()
    })
  }

  test('tears the sketch down on the way out', async ({ page }) => {
    await openSketch(page, 'swell')
    await page.getByRole('link', { name: /All sketches/ }).click()
    await expect(page.locator('canvas')).toHaveCount(0)

    await page.goBack()
    await expect(page.locator('canvas')).toHaveCount(1)
    await expect(logEntry(page, 'success', 'WGSL')).toBeVisible()
  })
})

test.describe('sketch view', () => {
  for (const id of SKETCHES) {
    test(`runs ${id}`, async ({ page }) => {
      await openSketch(page, id)
      await expectAnimating(page, id)
    })
  }

  test('pauses and resumes', async ({ page }) => {
    await openSketch(page, 'swell')
    await expectAnimating(page, 'swell')
    const stage = page.locator('[data-demo="swell"]')

    await page.getByRole('button', { name: 'Pause' }).click()
    await page.waitForTimeout(500)
    const frozen = await stage.screenshot()
    await page.waitForTimeout(1000)
    expect(frozen.equals(await stage.screenshot())).toBe(true)

    await page.getByRole('button', { name: 'Play' }).click()
    await expectAnimating(page, 'swell')
  })

  test('swaps to a preset texture', async ({ page }) => {
    await openSketch(page, 'breathe')
    await expectAnimating(page, 'breathe')
    await page.getByRole('button', { name: 'Pause' }).click()
    const stage = page.locator('[data-demo="breathe"]')
    const before = await stage.screenshot()

    await page.getByRole('radio', { name: 'Stripes' }).check({ force: true })
    await expect(logEntry(page, 'success', 'Stripes')).toBeVisible()
    await expect
      .poll(async () => !before.equals(await stage.screenshot()), {
        message: 'a paused sketch should still show the new texture',
      })
      .toBe(true)

    await page.getByRole('button', { name: 'Play' }).click()
    await expectAnimating(page, 'breathe')
  })

  test('uses an uploaded texture and survives a resize', async ({ page }) => {
    await openSketch(page, 'swell')
    await page.locator('input[type="file"]').setInputFiles({
      name: 'pixel.png',
      mimeType: 'image/png',
      buffer: PIXEL_PNG,
    })
    await expect(logEntry(page, 'success', 'pixel.png')).toBeVisible()
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)

    // The canvas is rebuilt on resize, and has to keep the upload.
    await page.setViewportSize({ width: 900, height: 600 })
    await expect(logEntry(page, 'success', 'WGSL')).toHaveCount(2)
    await expect(logEntry(page, 'error', '')).toHaveCount(0)
  })

  test('reports files that are not usable images', async ({ page }) => {
    await openSketch(page, 'swell')
    const input = page.locator('input[type="file"]')

    await input.setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    })
    await expect(logEntry(page, 'error', 'notes.txt')).toBeVisible()

    await input.setInputFiles({
      name: 'broken.png',
      mimeType: 'image/png',
      buffer: Buffer.from('not a png'),
    })
    await expect(logEntry(page, 'error', 'broken.png')).toBeVisible()

    await expect(input).toBeEnabled()
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(1)
    await expectAnimating(page, 'swell')
  })

  test('records a clip that shows the sketch', async ({ page }) => {
    await openSketch(page, 'swell')
    const download = page.getByRole('button', { name: 'Download' })
    await expect(download).toBeDisabled()

    await page.getByRole('button', { name: 'Record' }).click()
    await expect(logEntry(page, 'info', 'Recording started')).toBeVisible()
    // Swapping the texture mustn't end the recording.
    await page.getByRole('radio', { name: 'Stripes' }).check({ force: true })
    await page.waitForTimeout(2000)
    await page.getByRole('button', { name: 'Stop recording' }).click()

    await expect(logEntry(page, 'success', 'Recording ready')).toBeVisible()
    const [file] = await Promise.all([
      page.waitForEvent('download'),
      download.click(),
    ])
    expect(file.suggestedFilename()).toMatch(/^swell-\d+\.webm$/)

    // Black or empty video would otherwise pass as a non-empty file.
    const bytes = await (
      await import('node:fs/promises')
    ).readFile(await file.path())
    const brightness = await page.evaluate(async (base64) => {
      const video = document.createElement('video')
      video.muted = true
      video.src = `data:video/webm;base64,${base64}`
      await video.play()
      await new Promise((resolve) => setTimeout(resolve, 300))
      video.pause()
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 32
      const context = canvas.getContext('2d')
      context.drawImage(video, 0, 0, 32, 32)
      const { data } = context.getImageData(0, 0, 32, 32)
      return data.reduce((sum, value) => sum + value, 0) / data.length
    }, bytes.toString('base64'))
    expect(brightness).toBeGreaterThan(70)
  })

  test('recording a paused sketch starts it', async ({ page }) => {
    await openSketch(page, 'swell')
    await page.getByRole('button', { name: 'Pause' }).click()
    await page.getByRole('button', { name: 'Record' }).click()

    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Stop recording' }).click()
    await expect(logEntry(page, 'success', 'Recording ready')).toBeVisible()
  })

  test('holds a resize until the recording ends', async ({ page }) => {
    await openSketch(page, 'swell')
    await page.getByRole('button', { name: 'Record' }).click()
    await page.setViewportSize({ width: 900, height: 600 })
    await page.waitForTimeout(800)
    await expect(logEntry(page, 'success', 'WGSL')).toHaveCount(1)

    await page.getByRole('button', { name: 'Stop recording' }).click()
    await expect(logEntry(page, 'success', 'Recording ready')).toBeVisible()
    await expect(logEntry(page, 'success', 'WGSL')).toHaveCount(2)
    await expect(page.getByRole('button', { name: 'Download' })).toBeEnabled()
  })
})

// This one logs a console error on purpose, which the shared fixture rejects.
unguardedTest(
  'reports a lost GPU and falls back to WebGL2',
  async ({ page }) => {
    await openSketch(page, 'swell')

    await page.evaluate(() => {
      const context = document.querySelector('canvas').getContext('webgpu')
      context.getConfiguration().device.destroy()
    })

    await expect(logEntry(page, 'error', 'GPU context was lost')).toBeVisible()
    await expect(logEntry(page, 'success', 'GLSL')).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(1)
  }
)

test.describe('with reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  test('waits for Play, and paused texture swaps update the poster', async ({
    page,
  }) => {
    await page.goto('/explore/#/sketches/swell')
    await expect(logEntry(page, 'success', 'WGSL')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
    await expect(page.locator('[data-live]')).toHaveCount(0)

    await page.getByRole('radio', { name: 'Stripes' }).check({ force: true })
    await expect(logEntry(page, 'success', 'Stripes')).toBeVisible()
    await expect(page.locator('[data-demo] img')).toHaveAttribute(
      'src',
      /stripes/
    )
  })
})

test.describe('on a phone-sized screen', () => {
  test.use({ viewport: { width: 375, height: 740 } })

  test('has no horizontal overflow', async ({ page }) => {
    await openSketch(page, 'swell')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    )
    expect(overflow).toBe(0)
  })
})
