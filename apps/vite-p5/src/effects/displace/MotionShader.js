let time = 0;
let mixType = 0;
let noiseSc = 0;
let prevFb = null;

function MotionEffect() {
  filterColor.begin();

  let coord = filterColor.texCoord;

  let sNoise = uniformFloat(() => noiseSc);
  let t = millis() / 3000;

  let nx = noise(coord.x, coord.y, t);
  let ny = noise(coord.x, coord.y, t + 0.1);
  let nz = noise(coord.x, coord.y, t + 0.2);
  let na = noise(coord.x, coord.y, t + 0.3);

  let n = [nx, ny, nz, na];
  let disp = [coord.x, coord.y];

  disp.x += 0.013 * sin(disp.y * (n.r + 18.0) + t * 2.4);
  disp.y += 0.013 * cos(disp.x * (n.g + 16.0) + t * 2.0);
  disp.x += 0.008 * sin(disp.y * (n.b + 7.0) - t * 1.3);
  disp.y += 0.006 * cos(disp.x * (n.a + 9.0) - t * 1.7);

  let fgTexture = uniformTexture(() => nodes.img);

  fgTexture = getTexture(fgTexture, disp);

  filterColor.set(fgTexture);
  filterColor.end();
}

class MotionShader {
  constructor() {
    this.frameBuffer = null;
    this.durationSlider = null;
    this.mixTypeSlider = null;
  }

  async setupFilterShader() {
    this.durationSlider = createSlider(1000, 5000, 5000, 1000);
    this.mixTypeSlider = createSlider(0, 2, 1, 1);
    this.noiseScaleSlider = createSlider(0, 10, 0.01, 0.01);
  }

  drawShader() {
    filter(buildFilterShader(TextureMix));
  }
}
