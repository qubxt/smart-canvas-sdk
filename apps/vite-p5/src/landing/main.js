import { sketches as catalog, sourceOf } from '../smart-sketches/catalog.js'
import { detectWebGPU, mountSketch } from '../smart-sketches/mount.js'

const hosts = [...document.querySelectorAll('[data-demo]')]
const sketches = new Map()
const visible = new Set()

const rendererButtons = [...document.querySelectorAll('[data-renderer]')]
const rendererNote = document.querySelector('#renderer-note')
const pauseButton = document.querySelector('#pause')
const effectTabs = [...document.querySelectorAll('[data-effect-tab]')]
const sourcePanel = document.querySelector('#effect-source')
const compiledPanel = document.querySelector('#effect-compiled')
const compiledLabel = document.querySelector('#compiled-label')

const LANGUAGE = { webgpu: 'WGSL', webgl: 'GLSL' }

let renderer = 'webgl'
let paused = matchMedia('(prefers-reduced-motion: reduce)').matches
let selectedEffect = 'swell'

const shouldRun = (host) => !paused && visible.has(host)

function mount(host) {
  sketches.get(host)?.destroy()
  const sketch = mountSketch(host, catalog[host.dataset.demo], renderer, {
    running: shouldRun(host),
    onReady: renderCompiled,
    onResize: () => mount(host),
    onError: handleSketchError,
  })
  sketches.set(host, sketch)
}

function mountAll() {
  hosts.forEach(mount)
  renderCompiled()
}

// Adapters can pass detection and still fail device creation.
function handleSketchError(error) {
  console.error(error)
  if (renderer !== 'webgpu') return
  rendererNote.textContent = 'WebGPU failed to start, so this is WebGL2.'
  rendererButtons.find((b) => b.dataset.renderer === 'webgpu').disabled = true
  setRenderer('webgl')
}

function setRenderer(next) {
  if (next === renderer && sketches.size > 0) return
  renderer = next
  for (const button of rendererButtons) {
    button.setAttribute('aria-pressed', button.dataset.renderer === next)
  }
  compiledLabel.textContent = LANGUAGE[next]
  mountAll()
}

function setPaused(next) {
  paused = next
  pauseButton.textContent = paused ? 'Play' : 'Pause'
  pauseButton.setAttribute('aria-pressed', paused)
  for (const [host, sketch] of sketches) sketch.setRunning(shouldRun(host))
}

function renderCompiled() {
  const host = hosts.find((h) => h.dataset.demo === selectedEffect)
  const code = sketches.get(host)?.compiledSource()
  compiledPanel.textContent = code || 'Compiling…'
}

function selectEffect(name) {
  selectedEffect = name
  for (const tab of effectTabs) {
    tab.setAttribute('aria-pressed', tab.dataset.effectTab === name)
  }
  sourcePanel.textContent = sourceOf(name)
  renderCompiled()
}

// Only sketches on screen spend GPU time.
const observer = new IntersectionObserver((entries) => {
  for (const { target, isIntersecting } of entries) {
    if (isIntersecting) visible.add(target)
    else visible.delete(target)
    sketches.get(target)?.setRunning(shouldRun(target))
  }
})
hosts.forEach((host) => observer.observe(host))

for (const button of rendererButtons) {
  button.addEventListener('click', () => setRenderer(button.dataset.renderer))
}
pauseButton.addEventListener('click', () => setPaused(!paused))
for (const tab of effectTabs) {
  tab.addEventListener('click', () => selectEffect(tab.dataset.effectTab))
}
for (const link of document.querySelectorAll('[data-show-effect]')) {
  link.addEventListener('click', () => selectEffect(link.dataset.showEffect))
}

detectWebGPU().then((hasWebGPU) => {
  if (!hasWebGPU) {
    rendererButtons.find((b) => b.dataset.renderer === 'webgpu').disabled = true
    rendererNote.textContent = 'WebGPU isn’t available here, so this is WebGL2.'
  }
  setPaused(paused)
  setRenderer(hasWebGPU ? 'webgpu' : 'webgl')
  selectEffect(selectedEffect)
})
