function keyPressed() {
  if (mouseOnCanvas()) nodes = nodes.next;
  // else console.log('off-canvas');
}

function mouseOnCanvas() {
  return mouseX <= width && mouseY <= height;
  {
    console.log("on canvas");
    return true;
  }
}

function mouseClicked() {
  if (!mouseOnCanvas()) return;

  cursorPix = get(mouseX, mouseY);
  const pCursorCol = color(cursorPix);
  const pCursorColHex = pCursorCol.toString("#rrggbb");
  cursorPixInpt.value(pCursorColHex);

  const mappedRChannel = map(cursorPix[0], 0.0, 255.0, 0.0, 1.0);
  const mappedGChannel = map(cursorPix[1], 0.0, 255.0, 0.0, 1.0);
  const mappedBChannel = map(cursorPix[2], 0.0, 255.0, 0.0, 1.0);
  const mappedAhannel = map(cursorPix[3], 0.0, 255.0, 0.0, 1.0);

  cursorPix = [mappedRChannel, mappedGChannel, mappedBChannel, mappedAhannel];

  // console.log(
  //   'uPixel: pixel at cursor click',
  //   cursorPix,
  //   'uPixelColor: p5js color object for uPixel',
  //   pCursorCol,
  //   'uPixelHex: hexcode for uPixel',
  //   pCursorColHex,
  // );
}

async function setup() {
  await nodes.setupImages();
  nodes = nodes.head;
  createCanvas(800, windowHeight - 50, WEBGL);
  cursorPixInpt = createColorPicker("white");
  texMix.setupFilterShader();
}

function draw() {
  texMix.drawShader();
}
