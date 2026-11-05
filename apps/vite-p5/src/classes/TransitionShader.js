let time = 0;
let mixType = 0;

class TransitionShader {
  constructor() {
    this.frameBuffer = null;
    this.durationSlider = null;
    this.mixTypeSlider = null;
  }

  setupFilterShader() {
    this.durationSlider = createSlider(1000, 5000, 5000, 1000);
    this.mixTypeSlider = createSlider(0, 1, 0, 0.1);
    this.frameBuffer = createFramebuffer();

    this.frameBuffer.begin();
    filter(buildFilterShader(TextureMix));
    this.frameBuffer.end();
  }

  drawShader() {
    time += deltaTime / this.durationSlider.value();
    mixType = this.mixTypeSlider.value();

    if (constrain(time, 0, 1.0) == 1.0) {
      time = 0;
      nodes = nodes.next;
    }

    image(this.frameBuffer, -width / 2, -height / 2, width, height);
  }
}

function TextureMix() {
  filterColor.begin();

  let coord = zoom(filterColor.texCoord, 1.3);

  function zoom(coord, amount) {
    return (coord - 0.5) / amount + 0.5;
  }

  cord = zoom(coord, 0.0);

  let sTime = uniformFloat(() => time);

  let t = millis() / 5000;

  let nx = noise(coord.x, coord.y, t);
  let ny = noise(coord.x, coord.y, t + 5.0);
  let nz = noise(coord.x, coord.y, t + 10.0);
  let na = noise(coord.x, coord.y, t + 15.0);

  let n = [nx, ny, nz, na];

  let disp = [coord.x, coord.y];

  // disp.x += 0.013 * sin(disp.y * (n.r + 18.0) + t * 2.4);
  // disp.y += 0.013 * cos(disp.x * (n.g + 16.0) + t * 2.0);
  // disp.x += 0.008 * sin(disp.y * (n.b + 7.0) - t * 1.3);
  // disp.y += 0.006 * cos(disp.x * (n.a + 9.0) - t * 1.7);

  let uMix = uniformFloat(() => mixType);

  let fgTexture = uniformTexture(() => nodes.img);
  let bgTexture = uniformTexture(() => nodes.next.img);

  fgTexture = getTexture(fgTexture, disp);
  bgTexture = getTexture(bgTexture, disp);

  let smoother = smoothstep(sTime - 0.2, sTime + 0.2, nx / 1.3);

  let res = mix(bgTexture, fgTexture, nx);

  // if (uMix == 0.0) {
  //   res = mix(fgTexture, bgTexture, sTime);
  //   // res = mix(
  //   //   [1, 0, 1, 1], // Magenta
  //   //   [0, 1, 1, 1], // Cyan
  //   //   smoother,
  //   // );
  // } else if (uMix == 1.0) {
  //   res = mix(bgTexture, fgTexture, smoother);
  //     res = mix(
  //   [1, 0, 1, 1], // Magenta
  //   [0, 1, 1, 1], // Cyan
  //   smoother,
  // );
  // } else if (uMix == 2.0) {
  //   res = mix(bgTexture, fgTexture, smoother);
  // } else if (uMix == 3.0) {
  res = mix(bgTexture, fgTexture, smoother);
  // }

  filterColor.set(res);
  filterColor.end();
}
