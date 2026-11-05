
class TransitionEffect {
  constructor() {
    this.frameBuffer = null
    this.durationSlider = null
  }

  setupFilterShader() {
    this.durationSlider = createSlider(1000, 5000, 5000, 1000)
    this.frameBuffer = createFramebuffer()
  }

  drawShader() {
    filter(buildFilterShader(TransitionStrand))
  }
}