import { expect, test as base } from '@playwright/test'

export const CARDS = ['swell', 'breathe', 'feather', 'prism']

// An empty card screenshot is about 2 KB, and a painted one is far larger.
const MIN_PAINTED_BYTES = 10_000

const GPU_WARNINGS = /Destroyed texture|Too many active WebGL contexts/

// Fails any test that logs an error or a known GPU warning.
export const test = base.extend({
  page: async ({ page }, use) => {
    const problems = []
    page.on('pageerror', (error) => problems.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error' || GPU_WARNINGS.test(message.text())) {
        problems.push(message.text())
      }
    })
    // Keeps the tests independent of Google Fonts.
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
      route.fulfill({ status: 200, contentType: 'text/css', body: '' })
    )

    await use(page)
    expect(problems).toEqual([])
  },
})

export async function openPage(page, language) {
  await page.goto('/')
  await expectCompiled(page, language)
  await showCanvasesOnly(page)
}

export async function expectCompiled(page, language) {
  await expect(page.locator('#compiled-label')).toHaveText(language)
  await expect(page.locator('[data-demo] canvas')).toHaveCount(5)
  await expect(page.locator('#effect-compiled')).toContainText('getColor')
}

// Posters sit behind the canvases, so a blank sketch would otherwise pass. The
// fade is removed so it can't be mistaken for motion.
export function showCanvasesOnly(page) {
  return page.addStyleTag({
    content: `
      html { scroll-behavior: auto !important; }
      [data-demo] img { display: none !important; }
      [data-demo] canvas { transition: none !important; }
    `,
  })
}

export async function expectAnimating(page, demo) {
  const sketch = page.locator(`[data-demo="${demo}"]`)
  await sketch.scrollIntoViewIfNeeded()
  await expect(sketch).toHaveAttribute('data-live', 'true')

  const first = await sketch.screenshot()
  expect(first.length).toBeGreaterThan(MIN_PAINTED_BYTES)
  await expect
    .poll(async () => !first.equals(await sketch.screenshot()), {
      message: `${demo} should change between frames`,
    })
    .toBe(true)
}
