import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdtemp, rm, readdir } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

// H.264 video encode shared by the MP4 paths. veryfast/crf18 gives near-
// visually-lossless output at a good speed; yuv420p + faststart keep it broadly
// playable and streamable on social platforms. Audio handling is appended per
// path (still sequences are silent; a live capture may carry a song).
const VIDEO_ENCODE = [
  "-c:v",
  "libx264",
  "-preset",
  "veryfast",
  "-crf",
  "18",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
];

// Force even dimensions — required by yuv420p (H.264) and keeps GIF scaling
// clean. Applied to whatever aspect the client already shaped the canvas to, so
// this is a safety net, not a crop.
const EVEN = "scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos";

type OutputFormat = "mp4" | "gif";

const OUTPUT: Record<OutputFormat, { file: string; type: string; name: string }> = {
  mp4: { file: "output.mp4", type: "video/mp4", name: "video.mp4" },
  gif: { file: "output.gif", type: "image/gif", name: "video.gif" },
};

/**
 * Build the requested asset from a numbered frame sequence.
 *
 *  - mp4: stitch the stills at `fps` (CFR) and H.264-encode.
 *  - gif: two-pass palette (palettegen → paletteuse) for a clean, small,
 *    infinitely-looping GIF.
 */
async function synthesize(
  dir: string,
  pattern: string,
  fps: string,
  format: OutputFormat,
): Promise<string> {
  const out = join(dir, OUTPUT[format].file);
  const input = join(dir, pattern);

  if (format === "gif") {
    const palette = join(dir, "palette.png");
    await execAsync(
      [
        "ffmpeg",
        "-y",
        "-framerate",
        fps,
        "-i",
        input,
        "-vf",
        `"${EVEN},palettegen=stats_mode=diff"`,
        palette,
      ].join(" "),
      { timeout: 300000 },
    );
    await execAsync(
      [
        "ffmpeg",
        "-y",
        "-framerate",
        fps,
        "-i",
        input,
        "-i",
        palette,
        "-lavfi",
        `"${EVEN}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle"`,
        // -loop 0 => the GIF loops forever (seamless when fed a loop sequence).
        "-loop",
        "0",
        out,
      ].join(" "),
      { timeout: 300000 },
    );
    return out;
  }

  await execAsync(
    [
      "ffmpeg",
      "-y",
      "-framerate",
      fps,
      "-i",
      input,
      "-vf",
      `"${EVEN}"`,
      ...VIDEO_ENCODE,
      // A still-frame sequence has no audio track.
      "-an",
      out,
    ].join(" "),
    { timeout: 300000 },
  );
  return out;
}

/** True if the file has at least one audio stream (probed with ffprobe). */
async function hasAudioStream(path: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "a",
        "-show_entries",
        "stream=codec_type",
        "-of",
        "csv=p=0",
        path,
      ].join(" "),
      { timeout: 30000 },
    );
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Transcode a live capture straight to MP4, keeping its audio (e.g. the pulse
 * lab's song). Unlike the silent path we don't extract-then-restitch frames:
 * `-r fps` normalises the jittery WebM to constant frame rate while ffmpeg keeps
 * audio and video aligned by their timestamps, so the song stays in sync.
 */
async function transcodeWithAudio(
  dir: string,
  inputPath: string,
  fps: string,
): Promise<string> {
  const out = join(dir, OUTPUT.mp4.file);
  await execAsync(
    [
      "ffmpeg",
      "-y",
      "-i",
      inputPath,
      "-vf",
      `"${EVEN}"`,
      "-r",
      fps,
      ...VIDEO_ENCODE,
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      out,
    ].join(" "),
    { timeout: 300000 },
  );
  return out;
}

export async function POST(req: NextRequest) {
  let tempDir: string | null = null;

  try {
    const formData = await req.formData();
    const framerate = (formData.get("framerate") as string) || "30";
    const fps = /^\d+(\.\d+)?$/.test(framerate) ? framerate : "30";
    const format: OutputFormat =
      (formData.get("format") as string) === "gif" ? "gif" : "mp4";
    const frames = formData.getAll("frame") as File[];
    const video = formData.get("video") as File | null;

    tempDir = await mkdtemp(join(tmpdir(), "ffmpeg-"));
    let pattern: string;
    // Set directly by a path that produces the final asset itself (bypassing the
    // frame-sequence synthesize stage) — currently the audio-preserving MP4.
    let directOutput: string | null = null;

    if (frames.length > 0) {
      // Deterministic loop export: a numbered still sequence. Stitching exact
      // frames at `fps` guarantees the intended duration, perfectly even
      // spacing (smooth), and a seamless loop.
      await Promise.all(
        frames.map(async (frame, i) => {
          const buf = Buffer.from(await frame.arrayBuffer());
          await writeFile(join(tempDir!, `f${String(i).padStart(5, "0")}.jpg`), buf);
        }),
      );
      pattern = "f%05d.jpg";
    } else if (video) {
      // Live MediaRecorder capture. Its WebM carries unreliable, jittery
      // timestamps, so we run a frame-extraction stage first: decode every
      // encoded frame to a numbered PNG. Re-stitching those at `-framerate fps`
      // discards the bad timestamps and yields a constant-rate source that both
      // the MP4 and GIF synthesis stages can build from cleanly.
      const ext = video.name.endsWith(".mp4") ? "mp4" : "webm";
      const inputPath = join(tempDir, `input.${ext}`);
      await writeFile(inputPath, Buffer.from(await video.arrayBuffer()));

      // Keep the audio when the capture carries a song (pulse lab) and the
      // output is MP4 — GIF has no audio track, so it always takes the silent
      // frame-restitch path below.
      if (format === "mp4" && (await hasAudioStream(inputPath))) {
        directOutput = await transcodeWithAudio(tempDir, inputPath, fps);
        pattern = ""; // unused; directOutput is the finished asset
      } else {
        await execAsync(
          ["ffmpeg", "-y", "-i", inputPath, join(tempDir, "x%05d.png")].join(" "),
          { timeout: 300000 },
        );
        const extracted = (await readdir(tempDir)).filter((f) => /^x\d{5}\.png$/.test(f));
        if (extracted.length === 0) {
          return NextResponse.json(
            { error: "Frame extraction produced no frames" },
            { status: 422 },
          );
        }
        pattern = "x%05d.png";
      }
    } else {
      return NextResponse.json({ error: "No video or frames provided" }, { status: 400 });
    }

    const outputPath = directOutput ?? (await synthesize(tempDir, pattern, fps, format));
    const outputBuffer = await readFile(outputPath);
    const meta = OUTPUT[format];

    return new NextResponse(outputBuffer, {
      headers: {
        "Content-Type": meta.type,
        "Content-Disposition": `attachment; filename="${meta.name}"`,
      },
    });
  } catch (error: any) {
    console.error("FFmpeg conversion error:", error);
    return NextResponse.json(
      { error: "Conversion failed", details: error.message },
      { status: 500 },
    );
  } finally {
    if (tempDir) {
      rm(tempDir, { recursive: true }).catch(() => {});
    }
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
