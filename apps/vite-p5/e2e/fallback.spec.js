import { expect } from '@playwright/test'
import { CARDS, expectAnimating, openPage, test } from './helpers.js'

test('falls back to WebGL2 without WebGPU', async ({ page }) => {
  await openPage(page, 'GLSL')

  await expect(page.locator('[data-renderer="webgpu"]')).toBeDisabled()
  await expect(page.locator('#renderer-note')).toContainText('WebGL2')
  for (const demo of CARDS) await expectAnimating(page, demo)
})
