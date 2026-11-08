/*
  p5.strands effects for the smart sketches. catalog.js imports this file as
  text and hands each function to strands as a string. The minifier never
  touches it, so generated shaders keep these variable names, and the page can
  display the exact code it runs.

  Closures wouldn't survive anyway: everything a function needs arrives through
  the scope object that mount.js passes to buildFilterShader(). `tex` is a
  getter rather than an image, so the texture can change without recompiling.
*/

export function tide({ p, tex, map, fit, clock }) {
  p.filterColor.begin()
  let t = p.uniformFloat(clock)
  let cover = p.uniformVec2(fit)
  let image = p.uniformTexture(tex)
  let clouds = p.uniformTexture(() => map)

  let uv = (p.filterColor.texCoord - 0.5) * cover + 0.5
  let pull = p.getTexture(clouds, uv * 0.6 + t * 0.012)
  uv.x += 0.03 * (pull.r - 0.5)
  uv.y += 0.03 * (pull.g - 0.5) * p.sin(t * 0.25)

  p.filterColor.set(p.getTexture(image, uv))
  p.filterColor.end()
}

export function swell({ p, tex, fit, clock }) {
  p.filterColor.begin()
  let t = p.uniformFloat(clock)
  let cover = p.uniformVec2(fit)
  let image = p.uniformTexture(tex)

  let uv = (p.filterColor.texCoord - 0.5) * cover + 0.5
  let wander = p.noise(uv.x * 2.0, uv.y * 3.0, t * 0.1)
  uv.x += 0.016 * p.sin(uv.y * (wander * 10.0 + 16.0) + t * 0.9)
  uv.y += 0.006 * p.cos(uv.x * 9.0 - t * 0.6)

  p.filterColor.set(p.getTexture(image, uv))
  p.filterColor.end()
}

export function breathe({ p, tex, fit, clock }) {
  p.filterColor.begin()
  let t = p.uniformFloat(clock)
  let cover = p.uniformVec2(fit)
  let image = p.uniformTexture(tex)

  let centered = (p.filterColor.texCoord - 0.5) * cover
  let zoom = 1.0 - 0.07 * (0.5 + 0.5 * p.sin(t * 0.5))
  let turn = 0.025 * p.sin(t * 0.3)
  let c = p.cos(turn)
  let s = p.sin(turn)
  let x = (centered.x * c - centered.y * s) * zoom + 0.5
  let y = (centered.x * s + centered.y * c) * zoom + 0.5

  p.filterColor.set(p.getTexture(image, [x, y]))
  p.filterColor.end()
}

export function feather({ p, tex, map, fit, clock }) {
  p.filterColor.begin()
  let t = p.uniformFloat(clock)
  let cover = p.uniformVec2(fit)
  let image = p.uniformTexture(tex)
  let veins = p.uniformTexture(() => map)

  let uv = (p.filterColor.texCoord - 0.5) * cover + 0.5
  let vein = p.getTexture(veins, uv + 0.04 * p.sin(t * 0.3)).r
  let bend = vein * (0.05 + 0.03 * p.sin(t * 0.7))
  uv.x += bend
  uv.y -= bend * 0.5

  p.filterColor.set(p.getTexture(image, uv))
  p.filterColor.end()
}

export function prism({ p, tex, fit, clock, pointer }) {
  p.filterColor.begin()
  let t = p.uniformFloat(clock)
  let cover = p.uniformVec2(fit)
  let focus = p.uniformVec2(pointer)
  let image = p.uniformTexture(tex)

  let screen = p.filterColor.texCoord
  let uv = (screen - 0.5) * cover + 0.5
  let near = p.smoothstep(0.55, 0.0, p.distance(screen, focus))
  let split = 0.002 + 0.022 * near
  let dir = [p.cos(t * 0.4), p.sin(t * 0.4)]

  let r = p.getTexture(image, uv + dir * split).r
  let g = p.getTexture(image, uv).g
  let b = p.getTexture(image, uv - dir * split).b

  p.filterColor.set([r, g, b, 1.0])
  p.filterColor.end()
}
