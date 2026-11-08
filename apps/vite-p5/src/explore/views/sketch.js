import { sketches, textures } from '../../smart-sketches/catalog.js'
import { detectWebGPU, mountSketch } from '../../smart-sketches/mount.js'
import { canRecord, startRecording } from '../../smart-sketches/recorder.js'
import { createLifecycleLog } from '../lifecycle-log.js'
import { notFoundView } from './not-found.js'
import { fromTemplate } from './template.js'

const RENDERER_NAMES = {
  webgpu: 'WebGPU (WGSL)',
  webgl: 'WebGL2 (GLSL)',
}

// p5 rejects with a bare DOM event when an image won't decode.
const describeError = (error) =>
  error instanceof Event
    ? 'The file could not be read as an image.'
    : (error?.message ?? String(error))

const formatSize = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

function renderTextureOption(texture, selected) {
  const { root, slot } = fromTemplate('texture-option')
  slot('input').value = texture.url
  slot('input').checked = selected
  slot('input').setAttribute('aria-label', texture.name)
  slot('thumbnail').src = texture.url
  return root
}

export function sketchView({ outlet, params }) {
  if (!Object.hasOwn(sketches, params.id)) return notFoundView({ outlet })

  const sketch = sketches[params.id]
  const { root, slot } = fromTemplate('sketch-view')
  const host = slot('stage')
  const poster = slot('poster')
  const playButton = slot('play')
  const recordButton = slot('record')
  const recordLabel = slot('record-label')
  const downloadButton = slot('download')
  const downloadHint = slot('download-hint')
  const fileInput = slot('file')
  const fileName = slot('file-name')
  const presets = slot('presets')
  const log = createLifecycleLog(slot('log'))

  host.dataset.demo = params.id
  poster.src = sketch.texture
  slot('title').textContent = sketch.title
  slot('summary').textContent = sketch.summary
  presets.append(
    ...textures.map((texture) =>
      renderTextureOption(texture, texture.url === sketch.texture)
    )
  )
  outlet.replaceChildren(root)

  let instance = null
  let renderer = 'webgl'
  let ready = false
  let loadingTexture = false
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches
  let texture = sketch.texture
  let uploadUrl = null
  let recording = null
  let clip = null
  let resizePending = false
  let destroyed = false

  function renderControls() {
    const canChangeTexture = ready && !loadingTexture
    playButton.disabled = !ready
    playButton.textContent = paused ? 'Play' : 'Pause'
    recordButton.disabled = !ready || !canRecord()
    recordLabel.textContent = recording ? 'Stop recording' : 'Record'
    recordButton.setAttribute('aria-pressed', Boolean(recording))
    downloadButton.disabled = !clip
    downloadHint.hidden = Boolean(clip)
    fileInput.disabled = !canChangeTexture
    for (const input of presets.querySelectorAll('input')) {
      input.disabled = !canChangeTexture
    }
  }

  function setReady(next) {
    ready = next
    renderControls()
  }

  function reportFailure(message, error) {
    log('error', `${message}: ${describeError(error)}`)
    console.error(error)
  }

  function mount() {
    // Replacing the canvas ends its video stream, so keep what's been captured.
    stopRecording()
    resizePending = false
    instance?.destroy()
    setReady(false)
    instance = mountSketch(host, { ...sketch, texture }, renderer, {
      running: !paused,
      onStatus: log,
      onReady() {
        log('success', `Shader compiled for ${RENDERER_NAMES[renderer]}`)
        setReady(true)
      },
      onResize() {
        /*
          Resizing replaces the canvas, which would cut a recording short. The
          canvas stretches to fit in the meantime.
        */
        if (recording) resizePending = true
        else mount()
      },
      onError(error) {
        reportFailure(`${RENDERER_NAMES[renderer]} failed`, error)
        setReady(false)
        if (renderer !== 'webgpu') return
        // Adapters can pass detection and still fail device creation.
        log('info', 'Falling back to WebGL2')
        renderer = 'webgl'
        mount()
      },
    })
  }

  function setPaused(next) {
    paused = next
    instance.setRunning(!paused)
    if (recording) paused ? recording.pause() : recording.resume()
    log('info', paused ? 'Paused' : 'Playing')
    renderControls()
  }

  async function changeTexture(url, name) {
    loadingTexture = true
    renderControls()
    log('info', `Loading ${name}`)
    let applied = false
    try {
      applied = await instance.setTexture(url)
      if (applied) log('success', `Texture changed to ${name}`)
    } catch (error) {
      log('error', `Couldn't use ${name}: ${describeError(error)}`)
    }
    if (destroyed) return false

    if (applied) {
      texture = url
      poster.src = url
    } else {
      // The radio buttons already moved, so put them back.
      for (const input of presets.querySelectorAll('input')) {
        input.checked = input.value === texture
      }
    }
    loadingTexture = false
    renderControls()
    return applied
  }

  async function uploadTexture(file) {
    if (!file.type.startsWith('image/')) {
      log('error', `Couldn't use ${file.name}: it isn't an image.`)
      return
    }
    const url = URL.createObjectURL(file)
    if (await changeTexture(url, file.name)) {
      if (uploadUrl) URL.revokeObjectURL(uploadUrl)
      uploadUrl = url
      fileName.textContent = file.name
      for (const input of presets.querySelectorAll('input')) {
        input.checked = false
      }
    } else {
      URL.revokeObjectURL(url)
    }
  }

  function discardClip() {
    if (clip) URL.revokeObjectURL(clip.url)
    clip = null
  }

  function beginRecording() {
    // A canvas that isn't drawing produces no video frames.
    if (paused) setPaused(false)
    discardClip()
    try {
      recording = startRecording(instance.canvas)
      log('info', 'Recording started')
    } catch (error) {
      reportFailure('Recording failed to start', error)
    }
    renderControls()
  }

  async function stopRecording() {
    if (!recording) return
    const active = recording
    recording = null
    renderControls()

    try {
      const blob = await active.stop()
      if (destroyed) return
      if (blob.size === 0) throw new Error('No frames were captured.')
      const extension = blob.type.includes('mp4') ? 'mp4' : 'webm'
      clip = {
        url: URL.createObjectURL(blob),
        fileName: `${params.id}-${Date.now()}.${extension}`,
      }
      log('success', `Recording ready to download (${formatSize(blob.size)})`)
    } catch (error) {
      if (destroyed) return
      reportFailure('Recording failed', error)
    }
    renderControls()
    if (resizePending) mount()
  }

  function downloadClip() {
    const link = document.createElement('a')
    link.href = clip.url
    link.download = clip.fileName
    link.click()
    log('success', `Downloaded ${clip.fileName}`)
  }

  playButton.addEventListener('click', () => setPaused(!paused))
  recordButton.addEventListener('click', () =>
    recording ? stopRecording() : beginRecording()
  )
  downloadButton.addEventListener('click', downloadClip)
  presets.addEventListener('change', ({ target }) => {
    fileName.textContent = ''
    changeTexture(target.value, target.getAttribute('aria-label'))
  })
  fileInput.addEventListener('change', () => {
    const [file] = fileInput.files
    fileInput.value = '' // So choosing the same file again still fires this.
    if (file) uploadTexture(file)
  })

  renderControls()
  if (!canRecord()) log('info', 'This browser can’t record a canvas.')

  detectWebGPU().then((hasWebGPU) => {
    if (destroyed) return
    renderer = hasWebGPU ? 'webgpu' : 'webgl'
    if (!hasWebGPU) log('info', 'WebGPU isn’t available, so using WebGL2')
    mount()
  })

  return {
    title: sketch.title,
    destroy() {
      destroyed = true
      recording?.stop()
      instance?.destroy()
      discardClip()
      if (uploadUrl) URL.revokeObjectURL(uploadUrl)
    },
  }
}
