import { expect } from '@playwright/test'
import { expectAnimating, showCanvasesOnly, test } from './helpers.js'

test('runs and records on WebGL2 without WebGPU', async ({ page }) => {
  await page.goto('/explore/#/sketches/prism')
  const log = page.getByRole('log')
  await expect(log).toContainText('WebGPU isn’t available')
  await expect(log).toContainText('GLSL')
  await showCanvasesOnly(page)
  await expectAnimating(page, 'prism')

  await page.getByRole('button', { name: 'Record' }).click()
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: 'Stop recording' }).click()
  await expect(log).toContainText('Recording ready')
  await expect(page.getByRole('button', { name: 'Download' })).toBeEnabled()
})
