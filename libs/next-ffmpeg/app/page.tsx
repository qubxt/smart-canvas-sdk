export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>FFmpeg Conversion Service</h1>
      <p>Status: Running</p>
      <h2>API</h2>
      <pre>{`POST /api/convert
Content-Type: multipart/form-data

Fields:
  video     - WebM video file (required)
  framerate - Target framerate (optional, default: 24)

Response: video/mp4 binary`}</pre>
      <h2>Supported Codecs</h2>
      <ul>
        <li>Video: H.264 (libx264), VP9 (decode)</li>
        <li>Audio: AAC</li>
        <li>Containers: WebM (input), MP4 (output)</li>
      </ul>
    </main>
  )
}
