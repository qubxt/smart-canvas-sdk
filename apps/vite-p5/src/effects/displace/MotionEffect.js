
export function MotionEffect() {
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