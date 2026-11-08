import { expect } from '@playwright/test'
import {
  CARDS,
  expectAnimating,
  expectCompiled,
  openPage,
  showCanvasesOnly,
  test,
} from './helpers.js'

test.describe('with WebGPU', () => {
  test.beforeEach(({ page }) => openPage(page, 'WGSL'))

  test('runs every sketch on WebGPU', async ({ page }) => {
    await expect(page.locator('[data-renderer="webgpu"]')).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await expect(page.locator('#effect-compiled')).toContainText('vec4<f32>')

    for (const demo of ['tide', ...CARDS]) await expectAnimating(page, demo)
  })

  test('recompiles every sketch for WebGL2', async ({ page }) => {
    await page.click('[data-renderer="webgl"]')
    await expectCompiled(page, 'GLSL')
    await expect(page.locator('#effect-compiled')).not.toContainText('<f32>')

    for (const demo of CARDS) await expectAnimating(page, demo)
  })

  test('survives rapid renderer switching', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await page.click('[data-renderer="webgl"]')
      await page.click('[data-renderer="webgpu"]')
    }

    await expectCompiled(page, 'WGSL')
    await expect(page.locator('[data-renderer="webgpu"]')).toBeEnabled()
    await expectAnimating(page, 'swell')
  })

  test('keeps sketches animating after a resize', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 600 })

    await expect
      .poll(() =>
        page.locator('[data-demo="swell"]').evaluate((host) => {
          return host.querySelector('canvas').width === host.clientWidth
        })
      )
      .toBe(true)
    for (const demo of CARDS) await expectAnimating(page, demo)
  })

  test('pauses and resumes motion', async ({ page }) => {
    await expectAnimating(page, 'prism')
    const sketch = page.locator('[data-demo="prism"]')

    await page.click('#pause')
    await expect(page.locator('#pause')).toHaveText('Play')
    await page.waitForTimeout(500)
    const frozen = await sketch.screenshot()
    await page.waitForTimeout(1000)
    expect(frozen.equals(await sketch.screenshot())).toBe(true)

    await page.click('#pause')
    await expectAnimating(page, 'prism')
  })

  test('shows the source and output of the chosen effect', async ({ page }) => {
    const source = page.locator('#effect-source')
    await expect(source).toContainText('function swell')

    await page.click('[data-effect-tab="prism"]')
    await expect(source).toContainText('function prism')
    await expect(page.locator('#effect-compiled')).toContainText('hooks.focus')

    await page.click('[data-show-effect="feather"]')
    await expect(source).toContainText('function feather')
    await expect(page.locator('[data-effect-tab="feather"]')).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })
})

test.describe('with reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  test('shows still posters until Play is pressed', async ({ page }) => {
    await page.goto('/')
    await expectCompiled(page, 'WGSL')
    await expect(page.locator('#pause')).toHaveText('Play')
    await expect(page.locator('[data-demo][data-live]')).toHaveCount(0)
    await expect(page.locator('[data-demo="tide"] img')).toBeVisible()

    await page.click('#pause')
    await showCanvasesOnly(page)
    await expectAnimating(page, 'tide')
  })
})

test.describe('on a phone-sized screen', () => {
  test.use({ viewport: { width: 375, height: 740 } })

  test('has no horizontal overflow', async ({ page }) => {
    await openPage(page, 'WGSL')

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    )
    expect(overflow).toBe(0)
    await expect(page.locator('#pause')).toBeVisible()
  })
})
