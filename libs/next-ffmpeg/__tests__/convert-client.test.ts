import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../app/api/convert/client/route";

function request() {
  const form = new FormData();
  form.append("frame", new File(["x"], "frame.jpg"));
  return new NextRequest("http://localhost/api/convert/client", { method: "POST", body: form });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/convert/client", () => {
  it("forwards the form to the ffmpeg service and relays the asset", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("gif-bytes", {
        headers: {
          "Content-Type": "image/gif",
          "Content-Disposition": 'attachment; filename="video.gif"',
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(request());

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:3001/api/convert");
    expect(init.method).toBe("POST");
    expect((init.body as FormData).get("frame")).toBeInstanceOf(File);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/gif");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="video.gif"');
    expect(await res.text()).toBe("gif-bytes");
  });

  it("defaults to mp4 headers when the service omits them", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Uint8Array([1]))));

    const res = await POST(request());

    expect(res.headers.get("Content-Type")).toBe("video/mp4");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="video.mp4"');
  });

  it("passes through the service's error body and status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ error: "No video or frames provided" }, { status: 400 })),
    );

    const res = await POST(request());

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No video or frames provided" });
  });

  it("returns 503 when the service is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    const res = await POST(request());

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "FFmpeg service unavailable" });
  });
});
