let alphaScalar = null
let cursorPix = null
let cursorPixSum = null
let cursorPixInpt = null

class AlphaShader {
  constructor() {
    this.frameBuffer = null
    this.durationSlider = null
    this.alphaEditShader = null
  }

  setupFilterShader() {
    this.durationSlider = createSlider(0, 1, 0.01, 0.01)
    this.frameBuffer = createFramebuffer()
    this.alphaEditShader = buildFilterShader(ColorPick)
    console.log(this.alphaEditShader.inspectHooks())
  }

  drawShader() {
    this.frameBuffer.begin()
    background(0, 5)
    filter(this.alphaEditShader)
    this.frameBuffer.end()
  }
}

function ColorPick() {
  function flipY(uv) {
    return mix(uv, vec2(uv.x, 1.0 - uv.y), 1.0)
  }

  function sampleImage(uv) {
    const flip = flipY(uv)
    return clamp(flip, 0.0, 1.0)
  }

  function colorChange() {}

  function liquidDisp(uv, nm) {
    let n = nm * 2.0
    let t = millis() * 0.0005
    let nx = noise(uCoord.x, uCoord.y, t)
    let ny = noise(uCoord.x, uCoord.y, t + 100.0)
    let nz = noise(uCoord.x, uCoord.y, t + 200.0)
    let disp = vec2(0.0)
    disp.x += 0.013 * sin(uv.y * (nx + 18.0) + t * 2.4)
    disp.y += 0.013 * cos(uv.x * (ny + 16.0) + t * 2.0)
    disp.x += 0.008 * sin(uv.y * (nz + 7.0) - t * 1.3)
    disp.y += 0.006 * cos(uv.x * (nx + 9.0) - t * 1.7)
    return disp
  }

  filterColor.begin()

  let t = uniformFloat(() => millis())

  let uCoord = filterColor.texCoord
  let disp = sampleImage(uCoord)

  let uTexture = uniformTexture(() => nodes.img)
  // let uAlpha = uniformFloat(() => alphaScalar.value());

  let uMouseClick = uniformVector4(() => cursorPix)
  let uMouseClickRGBSum = uniformFloat(() => cursorPixSum)

  let uPixel = getTexture(uTexture, disp)
  let uPixelRGBSum = abs(uPixel.r) + abs(uPixel.g) + abs(uPixel.b)

  let result = uPixel

  let rDist = uMouseClick.r - uPixel.r
  let gDist = uMouseClick.g - uPixel.g
  let bDist = uMouseClick.b - uPixel.b
  let aDist = uMouseClick.a - uPixel.a

  let distSum = abs(rDist) + abs(gDist) + abs(bDist)
  let sumLessThanLimitBit = step(distSum, 0.05)
  // let alphaLessThanLimitBit = step(aDist, 0.1);

  let nx = noise(uCoord.x, uCoord.y, t)
  // let ny = noise(coord.x, coord.y, t + 5.0);
  // let nz = noise(coord.x, coord.y, t + 10.0);
  // let na = noise(coord.x, coord.y, t + 15.0);

  let n = [nx, nx, nx, nx]

  if (sumLessThanLimitBit == 1.0) {
    disp += liquidDisp(disp, n)
  }
  let motionApplied = getTexture(uTexture, disp)
  result = motionApplied
  filterColor.set(result)
  filterColor.end()
}
