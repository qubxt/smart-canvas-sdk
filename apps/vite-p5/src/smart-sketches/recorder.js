const FRAMES_PER_SECOND = 30
// Safari only records MP4, and Chrome and Firefox prefer WebM.
const MIME_TYPES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
]

const pickMimeType = () =>
  window.MediaRecorder && MIME_TYPES.find(MediaRecorder.isTypeSupported)

export const canRecord = () =>
  Boolean(pickMimeType() && HTMLCanvasElement.prototype.captureStream)

/** Starts recording `canvas`. `stop()` resolves to the finished video. */
export function startRecording(canvas) {
  const stream = canvas.captureStream(FRAMES_PER_SECOND)
  const recorder = new MediaRecorder(stream, { mimeType: pickMimeType() })
  const chunks = []
  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  })

  const finished = new Promise((resolve, reject) => {
    recorder.addEventListener('error', (event) => reject(event.error))
    recorder.addEventListener('stop', () => {
      stream.getTracks().forEach((track) => track.stop())
      resolve(new Blob(chunks, { type: recorder.mimeType }))
    })
  })
  recorder.start()

  return {
    pause: () => recorder.pause(),
    resume: () => recorder.resume(),
    stop() {
      if (recorder.state !== 'inactive') recorder.stop()
      return finished
    },
  }
}
