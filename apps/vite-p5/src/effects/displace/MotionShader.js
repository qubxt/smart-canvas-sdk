// import { MotionEffect } from './MotionEffect.js';

 function MotionEffect() {
  filterColor.begin();

  let t = uniformFloat(() => millis() / 1000);
  let fgTexture = uniformTexture(() => nodes.img);

  let coord = filterColor.texCoord;
  let nx = noise(coord.x, coord.y, t);

  coord.x += 0.013 * sin(coord.y * (nx + 18.0) + t * 2.4);

  fgTexture = getTexture(fgTexture, coord);
  filterColor.set(fgTexture);

  filterColor.end();
}

class MotionShader {
  constructor() {
    this.frameBuffer = null;
  }

  async setupFilterShader() {
    this.frameBuffer = createFramebuffer()
  }

  drawShader() {
    this.frameBuffer.begin()
    filter(buildFilterShader(MotionEffect))
    this.frameBuffer.end()
    image(this.frameBuffer, -width / 2, -height / 2, width, height)
  }
}