
import p5 from 'p5'
window.p5 = p5
Object.assign(window, { setup, draw })
new p5() 

async function setup() {
  await nodes.setupImages()
  createCanvas(windowWidth/2, windowHeight, WEBGL);
  background(100)
  await motionShader.setupFilterShader()
}

function draw() {
  motionShader.drawShader()
}

