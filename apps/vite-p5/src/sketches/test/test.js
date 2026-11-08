
Object.assign(window, { setup, draw, windowResized });
import { nodes } from '../../utils/global-p5.js';
import MotionShader from '../../effects/displace/MotionShader.js';
import TextureShader from '../../effects/transition/TextureShader.js';
import { MotionEffect, TextureEffect } from '../../effects/displace/MotionEffect.js';

let motionShader = new MotionShader(nodes);
let textureShader = new TextureShader(nodes);

async function setup() {
  await nodes.ready;
  createCanvas(windowWidth * 0.75, windowHeight, WEBGL);
  textureShader.setupFilterShader(TextureEffect);
  motionShader.setupFilterShader(MotionEffect);
}

function draw() {
  textureShader.drawShader();
  motionShader.drawShader();
}

function windowResized() {
  resizeCanvas(windowWidth * 0.75, windowHeight);
}


