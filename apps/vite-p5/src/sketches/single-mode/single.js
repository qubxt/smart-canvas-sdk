import p5 from 'p5'
const sketch = window
window.p5 = p5

sketch.setup = function () {
  createCanvas(800, 600)
}

sketch.draw = function () {
  background(100)
  fill(255, 0, 0)
  noStroke()
  rectMode(CENTER)
  rect(mouseX, mouseY, 50, 50)
}

sketch.mousePressed = function () {
  console.log('here')
}
