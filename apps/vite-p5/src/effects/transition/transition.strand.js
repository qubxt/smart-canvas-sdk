
function TransitionStrand() {
  filterColor.begin()

  let coord = filterColor.texCoord

  let t = uniformFloat(() => millis())
  let fgTexture = uniformTexture(() => nodes.img)

  let nx = noise(coord.x, coord.y, t)
  let ny = noise(coord.x, coord.y, t + 0.1)
  let nz = noise(coord.x, coord.y, t + 0.2)
  let na = noise(coord.x, coord.y, t + 0.3)

  let n = [nx, ny, nz, na]
  let disp = [coord.x, coord.y]

  disp.x += 0.013 * sin(disp.y * (n.r + 18.0) + t * 2.4)
  disp.y += 0.013 * cos(disp.x * (n.g + 16.0) + t * 2.0)
  disp.x += 0.008 * sin(disp.y * (n.b + 7.0) - t * 1.3)
  disp.y += 0.006 * cos(disp.x * (n.a + 9.0) - t * 1.7)

  fgTexture = getTexture(fgTexture, disp)

  filterColor.set(fgTexture)
  filterColor.end()
}
