
export function TextureEffect({ nodes }) {
  filterColor.begin();
  let coord = filterColor.texCoord;
  let fgTexture = uniformTexture(() => nodes.head.img);
  fgTexture = getTexture(fgTexture, coord);
  filterColor.set(fgTexture);
  filterColor.end();
}

export function MotionEffect({ nodes }) {
  filterColor.begin();
  let coord = filterColor.texCoord;
  let t = uniformFloat(() => millis() / 1000.0);
  let nx = noise(coord.x, coord.y, t);
  coord.x += 0.013 * sin(coord.y * (nx + 18.0) + t * 2.4);
  let fgTexture = uniformTexture(() => nodes.head.img);
  fgTexture = getTexture(fgTexture, coord);
  filterColor.set(fgTexture);
  filterColor.end();
}

export function ZoomEffect({ nodes })  {
  filterColor.begin();
  let coord = filterColor.texCoord;
  let t = uniformFloat(() => millis() / 1000.0);
  let zoomedCoord = (coord - vec2(0.5, 0.5)) / (1.5 + 0.5 * sin(t)) + vec2(0.5, 0.5);
  let fgTexture = uniformTexture(() => nodes.head.img);
  fgTexture = getTexture(fgTexture, zoomedCoord);
  filterColor.set(fgTexture);
  filterColor.end();
}