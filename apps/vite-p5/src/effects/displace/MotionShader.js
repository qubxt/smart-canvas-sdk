export default class MotionShader {
  constructor(nodes) {
    this.nodes = nodes;
    this.frameBuffer = null;
    this.filterShader = null;
  }

  setupFilterShader(MotionEffect) {
    this.frameBuffer = createFramebuffer();
    this.filterShader = buildFilterShader(
      MotionEffect, { nodes: this.nodes }
    );
  }

  drawShader() {
    this.frameBuffer.begin();
    filter(this.filterShader);
    this.frameBuffer.end();
    image(this.frameBuffer, -width / 2, -height / 2, width, height);
  }
}
