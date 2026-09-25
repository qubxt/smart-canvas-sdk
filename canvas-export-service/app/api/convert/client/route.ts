import { NextRequest, NextResponse } from "next/server";

const FFMPEG_SERVICE_URL = process.env.FFMPEG_SERVICE_URL || "http://localhost:3001";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const response = await fetch(`${FFMPEG_SERVICE_URL}/api/convert`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "video/mp4",
        "Content-Disposition":
          response.headers.get("Content-Disposition") ??
          'attachment; filename="video.mp4"',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "FFmpeg service unavailable" }, { status: 503 });
  }
}
