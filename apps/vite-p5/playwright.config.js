import { defineConfig } from '@playwright/test'

const PORT = 4173

// Runners have no GPU, so both graphics APIs run on SwiftShader.
const SOFTWARE_GL = [
  '--no-sandbox',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
]
const SOFTWARE_WEBGPU = [
  ...SOFTWARE_GL,
  '--enable-unsafe-webgpu',
  '--use-webgpu-adapter=swiftshader',
  '--use-vulkan=swiftshader',
  '--enable-features=Vulkan,WebGPU',
]

export default defineConfig({
  testDir: 'e2e',
  // Software rendering is slow, and parallel pages would compete for the CPU.
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1024, height: 700 },
    screenshot: 'only-on-failure',
  },
  // Tests run against the production build, which can fail in ways the dev
  // server doesn't, such as rejecting top-level await.
  webServer: {
    command: `pnpm build && pnpm exec vite preview --port ${PORT} --strictPort --open false`,
    url: `http://localhost:${PORT}`,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'webgpu',
      testIgnore: /fallback/,
      use: { launchOptions: { args: SOFTWARE_WEBGPU } },
    },
    {
      name: 'no-webgpu',
      testMatch: /fallback/,
      use: {
        launchOptions: { args: [...SOFTWARE_GL, '--disable-features=WebGPU'] },
      },
    },
  ],
})
