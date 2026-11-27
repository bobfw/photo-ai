import { adjustPortraitPixels, decontaminateEdges } from "@photo-ai/portrait-editor";
import { expect, test } from "vite-plus/test";

type Rgba = readonly [number, number, number, number];

function createImageData(width: number, height: number, color: Rgba) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = color[0];
    data[index + 1] = color[1];
    data[index + 2] = color[2];
    data[index + 3] = color[3];
  }
  return data;
}

function setPixel(data: Uint8ClampedArray, width: number, x: number, y: number, color: Rgba) {
  const offset = (y * width + x) * 4;
  data[offset] = color[0];
  data[offset + 1] = color[1];
  data[offset + 2] = color[2];
  data[offset + 3] = color[3];
}

test("decontaminateEdges pulls the fringe color from the opaque subject", () => {
  const width = 5;
  const height = 5;
  const data = createImageData(width, height, [0, 0, 0, 0]);
  const fringe: Rgba = [255, 255, 255, 128];
  for (let y = 1; y <= 3; y += 1) {
    for (let x = 1; x <= 3; x += 1) {
      setPixel(data, width, x, y, fringe);
    }
  }
  setPixel(data, width, 2, 2, [200, 20, 20, 255]);

  decontaminateEdges(data, width, height);

  const offset = (1 * width + 1) * 4;
  expect(data[offset]).toBeGreaterThan(180);
  expect(data[offset + 1]).toBeLessThan(120);
});

test("adjustPortraitPixels retouches skin without tinting other colors", () => {
  const width = 4;
  const height = 4;
  const data = createImageData(width, height, [20, 40, 200, 255]);
  const skin: Rgba = [224, 172, 140, 255];
  setPixel(data, width, 1, 1, skin);
  const corner = data.slice(0, 4);

  adjustPortraitPixels(data, width, height, {
    smooth: 0.8,
    whiten: 0.5,
    brightness: 0,
    saturation: 0,
    warmth: 0,
  });

  const skinOffset = (1 * width + 1) * 4;
  expect(data[skinOffset]).not.toBe(skin[0]);
  expect(data.slice(0, 4)).toEqual(corner);
});

test("adjustPortraitPixels applies global tone to every visible pixel", () => {
  const width = 2;
  const height = 2;
  const data = createImageData(width, height, [20, 40, 200, 255]);

  adjustPortraitPixels(data, width, height, {
    smooth: 0,
    whiten: 0,
    brightness: 0.5,
    saturation: 0,
    warmth: 0,
  });

  expect(data[0]).toBe(50);
  expect(data[1]).toBe(70);
  expect(data[2]).toBe(230);
});
