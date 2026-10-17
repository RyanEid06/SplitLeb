import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const outputDir = "public/icons";
mkdirSync(outputDir, { recursive: true });

const colors = {
  ink: [16, 23, 20, 255],
  ink2: [16, 23, 20, 255],
  green: [57, 90, 67, 255],
  cream: [255, 250, 241, 255],
  sand: [244, 241, 234, 255],
  accent: [165, 230, 184, 255],
  accentShade: [165, 230, 184, 255],
};

function mix(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

function crc32(buffer) {
  let c = 0xffffffff;

  for (let i = 0; i < buffer.length; i += 1) {
    c ^= buffer[i];

    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }

  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);

  return Buffer.concat([length, name, data, crc]);
}

function encodePng(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const raw = Buffer.alloc((width * 4 + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    pixels.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function inRect(x, y, left, top, right, bottom) {
  return x >= left && x <= right && y >= top && y <= bottom;
}

function diamond(x, y, cx, cy, rx, ry) {
  return Math.abs((x - cx) / rx) + Math.abs((y - cy) / ry);
}

function makeIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let color = mix(colors.ink, colors.ink2, y / size);

      const lowerD = diamond(x, y, 0.5 * size, 0.57 * size, 0.31 * size, 0.18 * size);
      if (lowerD <= 1) {
        color = mix(colors.accent, colors.accentShade, y / size);
      }

      const upperD = diamond(x, y, 0.5 * size, 0.43 * size, 0.29 * size, 0.16 * size);
      if (upperD <= 1) {
        color = mix(colors.sand, colors.cream, y / size);
      }

      if (Math.abs(upperD - 1) < 0.022 && y < 0.62 * size) {
        color = colors.green;
      }

      const t = 0.038 * size;

      const sLeft = 0.31 * size;
      const sRight = 0.49 * size;
      const sTop = 0.66 * size;
      const sMid = 0.74 * size;
      const sBottom = 0.82 * size;

      const lLeft = 0.58 * size;
      const lRight = 0.72 * size;
      const lTop = 0.66 * size;
      const lBottom = 0.82 * size;

      const inS =
        inRect(x, y, sLeft, sTop, sRight, sTop + t) ||
        inRect(x, y, sLeft, sTop, sLeft + t, sMid) ||
        inRect(x, y, sLeft, sMid - t / 2, sRight, sMid + t / 2) ||
        inRect(x, y, sRight - t, sMid, sRight, sBottom) ||
        inRect(x, y, sLeft, sBottom - t, sRight, sBottom);

      const inL =
        inRect(x, y, lLeft, lTop, lLeft + t, lBottom) ||
        inRect(x, y, lLeft, lBottom - t, lRight, lBottom);

      if (inS || inL) {
        color = colors.cream;
      }

      const index = (y * size + x) * 4;
      pixels[index] = color[0];
      pixels[index + 1] = color[1];
      pixels[index + 2] = color[2];
      pixels[index + 3] = 255;
    }
  }

  return encodePng(size, size, pixels);
}

for (const size of [192, 512]) {
  const path = `${outputDir}/splitleb-icon-${size}.png`;
  writeFileSync(path, makeIcon(size));
  console.log(`created ${path}`);
}