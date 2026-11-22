// Minimal PNG decoder for 8-bit, non-interlaced greyscale, RGB, RGBA and palette images.
// Mapzen terrarium tiles only need these formats, so no image dependency is required.
import {inflateSync} from 'node:zlib';

const SIGNATURE = '89504e470d0a1a0a';
const CHANNELS = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4};

export function decodePng(buffer) {
  if (buffer.subarray(0, 8).toString('hex') !== SIGNATURE) throw new Error('Not a PNG file');
  let width = 0, height = 0, depth = 0, colorType = 0, interlace = 0, palette = null;
  const idat = [];
  for (let offset = 8; offset < buffer.length;) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('latin1', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'PLTE') {
      palette = data;
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += length + 12;
  }
  if (depth !== 8 || interlace !== 0 || !(colorType in CHANNELS)) {
    throw new Error(`Unsupported PNG: depth ${depth}, colour type ${colorType}, interlace ${interlace}`);
  }
  const channels = CHANNELS[colorType];
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    const previous = y ? pixels.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? out[x - channels] : 0;
      const up = previous[x];
      const corner = x >= channels ? previous[x - channels] : 0;
      let value = line[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) {
        const estimate = left + up - corner;
        const pa = Math.abs(estimate - left), pb = Math.abs(estimate - up), pc = Math.abs(estimate - corner);
        value += pa <= pb && pa <= pc ? left : pb <= pc ? up : corner;
      } else if (filter !== 0) throw new Error(`Unknown PNG filter ${filter}`);
      out[x] = value & 255;
    }
  }
  // Expand to RGB so callers can read every format the same way.
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    let r, g, b;
    if (colorType === 3) {
      const index = pixels[i];
      [r, g, b] = [palette[index * 3], palette[index * 3 + 1], palette[index * 3 + 2]];
    } else if (colorType === 0 || colorType === 4) {
      r = g = b = pixels[i * channels];
    } else {
      [r, g, b] = [pixels[i * channels], pixels[i * channels + 1], pixels[i * channels + 2]];
    }
    rgb.set([r, g, b], i * 3);
  }
  return {width, height, rgb};
}
