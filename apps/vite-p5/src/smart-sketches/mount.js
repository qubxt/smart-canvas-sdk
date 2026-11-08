import p5 from 'p5'
import webgpu from 'p5/webgpu'

p5.registerAddon(webgpu)

const MAX_PIXEL_DENSITY = 1.5
// Displaced coordinates stay inside the texture instead of smearing its edge.
const EDGE_INSET = 0.94
const RESIZE_DEBOUNCE_MS = 200
// The largest texture side WebGPU guarantees, and WebGL2 allows on most GPUs.
const MAX_TEXTURE_SIZE = 8192

// p5's WebGPU renderer requests this feature unconditionally, so an adapter
// without it fails at createCanvas().
export async function detectWebGPU() {
  try {
    const adapter = await navigator.gpu?.requestAdapter()
    return Boolean(adapter?.features.has('depth32float-stencil8'))
  } catch {
    return false
  }
}

/**
 * Runs one demo as its own p5 instance inside `host`.
 * Several sketches share the page, so global mode isn't an option.
 */
export function mountSketch(host, demo, renderer, options) {
  const { onReady, onResize, onError, onStatus = () => {} } = options
  let { running } = options
  let destroyed = false
  let shader = null
  let tex = null
  let canvasElement = null
  const loadedTextures = new Map()
  let seconds = 0
  let hovering = false
  const target = [0.5, 0.5]
  const pointer = [0.5, 0.5]

  const onPointerMove = (event) => {
    const box = host.getBoundingClientRect()
    target[0] = (event.clientX - box.left) / box.width
    target[1] = (event.clientY - box.top) / box.height
    hovering = true
  }
  const onPointerLeave = () => (hovering = false)
  host.addEventListener('pointermove', onPointerMove)
  host.addEventListener('pointerleave', onPointerLeave)

  /*
    Each image keeps a GPU texture for the life of the renderer, so going back
    to an earlier one reuses it instead of uploading a copy.
  */
  const loadTexture = async (url) => {
    if (loadedTextures.has(url)) return loadedTextures.get(url)
    const image = await instance.loadImage(url)
    if (Math.max(image.width, image.height) > MAX_TEXTURE_SIZE) {
      throw new Error(
        `Images can be at most ${MAX_TEXTURE_SIZE}px on a side, and this one is ${image.width}×${image.height}.`
      )
    }
    loadedTextures.set(url, image)
    return image
  }

  // A lost context never recovers by itself, and the canvas just stops updating.
  const watchContext = (context) => {
    const report = () => {
      if (!destroyed) onError(new Error('The GPU context was lost.'))
    }
    canvasElement.addEventListener('webglcontextlost', report)
    context.getConfiguration?.()?.device.lost.then(report)
  }

  const instance = new p5((p) => {
    p.setup = async () => {
      try {
        onStatus('info', 'Loading texture')
        const [image, map] = await Promise.all([
          loadTexture(demo.texture),
          demo.map ? p.loadImage(demo.map) : null,
        ])
        // A renderer switch can destroy this sketch during either await.
        if (destroyed) return
        tex = image

        onStatus('info', 'Creating the canvas')
        p.pixelDensity(Math.min(window.devicePixelRatio, MAX_PIXEL_DENSITY))
        const canvas = await p.createCanvas(
          host.clientWidth,
          host.clientHeight,
          renderer === 'webgpu' ? p.WEBGPU : p.WEBGL
        )
        if (destroyed) {
          canvas.elt.remove()
          return
        }
        canvas.elt.setAttribute('aria-hidden', 'true')
        canvasElement = canvas.elt
        watchContext(p.drawingContext)

        // Scale texture coordinates so the image covers the canvas.
        const fit = () => {
          const ratio = p.width / p.height / (tex.width / tex.height)
          return ratio > 1
            ? [EDGE_INSET, EDGE_INSET / ratio]
            : [EDGE_INSET * ratio, EDGE_INSET]
        }

        shader = p.buildFilterShader(demo.effect, {
          p,
          tex: () => tex,
          map,
          fit,
          clock: () => seconds,
          pointer: () => pointer,
        })
        if (!running) p.noLoop()
        onReady()
      } catch (error) {
        if (!destroyed) onError(error)
      }
    }

    p.draw = () => {
      if (!shader) return

      try {
        drawFrame(p)
      } catch (error) {
        // Without this, a broken frame would throw again on every tick.
        p.noLoop()
        if (!destroyed) onError(error)
      }
    }
  }, host)

  const drawFrame = (p) => {
    // A private clock, so pausing doesn't make the motion jump on resume.
    seconds += Math.min(p.deltaTime, 100) / 1000
    if (!hovering) {
      target[0] = 0.5 + 0.3 * Math.sin(seconds * 0.5)
      target[1] = 0.5 + 0.3 * Math.cos(seconds * 0.37)
    }
    pointer[0] += (target[0] - pointer[0]) * 0.06
    pointer[1] += (target[1] - pointer[1]) * 0.06

    p.filter(shader)
    // A sketch that starts paused renders a blank setup frame, so it keeps
    // showing its poster until it first runs.
    if (p.isLooping() && !host.dataset.live) {
      host.dataset.live = 'true'
      onStatus('success', 'First frame drawn')
    }
  }

  // resizeCanvas() can leave a p5 2.3.3 WebGPU canvas blank for good, with every
  // submit hitting a destroyed framebuffer texture, and rebuilding the shader
  // doesn't help. So a resize asks the caller for a fresh instance instead.
  const checkSize = () => {
    const { clientWidth: width, clientHeight: height } = host
    if (shader && (width !== instance.width || height !== instance.height)) {
      onResize()
    }
  }

  let resizeTimer
  const resize = new ResizeObserver(() => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(checkSize, RESIZE_DEBOUNCE_MS)
  })
  resize.observe(host)

  return {
    setRunning(next) {
      running = next
      if (!shader) return // setup reads `running` when it finishes
      if (running) instance.loop()
      else instance.noLoop()
    },
    /*
      Swaps the image under the compiled shader, so the clock keeps running and
      a recording carries on. Resolves to false if the sketch was torn down
      while the image loaded, and rejects if the image can't be used.
    */
    async setTexture(url) {
      const image = await loadTexture(url)
      if (destroyed) return false
      tex = image
      // The next frame picks it up, but a paused sketch has no next frame.
      if (!running) instance.redraw()
      return true
    },
    get canvas() {
      return canvasElement
    },
    // The fragment hooks strands generated for the active renderer.
    compiledSource() {
      if (!shader) return ''
      const { fragment, modified } = shader.hooks
      return Object.keys(fragment)
        .filter((key) => modified.fragment[key])
        .map((key) => `${key}${fragment[key]}`)
        .join('\n\n')
        .trim()
    },
    destroy() {
      destroyed = true
      clearTimeout(resizeTimer)
      resize.disconnect()
      host.removeEventListener('pointermove', onPointerMove)
      host.removeEventListener('pointerleave', onPointerLeave)
      delete host.dataset.live
      // Browsers cap live WebGL contexts, and remove() leaves them for the GC.
      const context = instance.drawingContext
      instance.remove()
      context?.getExtension?.('WEBGL_lose_context')?.loseContext()
    },
  }
}
