import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

let crcTable = null;

function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePng(size, paint) {
  // paint(pixels: Uint8Array, size: number). pixels es RGBA row-major.
  const pixels = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const p = i * 4;
    pixels[p] = 10;
    pixels[p + 1] = 10;
    pixels[p + 2] = 10;
    pixels[p + 3] = 255;
  }
  paint(pixels, size);

  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const p = (y * size + x) * 4;
      const r = pixels[p];
      const g = pixels[p + 1];
      const b = pixels[p + 2];
      const a = pixels[p + 3];
      const off = rowStart + 1 + x * 4;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = deflateSync(raw, { level: 9 });
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------
// El ojo ASCII del login (components/login/ascii-eye.tsx, estático).
// Cada celda del ojo se pinta como un bloque blanco/gris sobre
// fondo negro, manteniendo la estética del ASCII art.
// ---------------------------------------------------------------

const W = 52;
const H = 30;
const CX = W / 2;
const CY = H / 2 + 0.5;
const R = 19;

const PUPIL_K = Math.cos(0.2);
const IRIS_INNER_K = Math.cos(0.29);
const IRIS_MID_K = Math.cos(0.39);
const IRIS_OUTER_K = Math.cos(0.44);
const LIMBUS_K = Math.cos(0.47);
const L = norm3([0.5, -0.62, 0.62]);

function norm3(a) {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function eyeBrightness(x, y) {
  const u = (x - CX) / R;
  const v = (y - CY) / R;
  const r2 = u * u + v * v;

  const edge = Math.abs(u) <= 1 ? Math.sqrt(Math.max(0, 1 - u * u)) : 0;
  const dyFromTop = CY - edge * R - y;
  const aU = Math.abs(u);

  if (aU <= 1.1 && dyFromTop > 0) {
    const lo = 2.35 + 0.3 * u;
    const thin = aU > 0.85;
    const hi = 4.1 - (thin ? 0.45 + 1.5 * (aU - 0.85) : 0.35);
    if (dyFromTop >= lo && dyFromTop <= hi) return 0.28;
  }

  if (dyFromTop >= 0.95 && dyFromTop < 1.5 && aU <= 0.95) return 0.12;

  if (r2 > 1) {
    if (aU <= 0.98) {
      if (dyFromTop > 0.06 && dyFromTop < 0.85) {
        const t = 1 - dyFromTop / 0.85;
        return 0.16 + 0.06 * t;
      }
      const dyBelow = y - (CY + edge * R);
      if (dyBelow > 0.06 && dyBelow < 0.8) {
        const t = 1 - dyBelow / 0.8;
        return 0.12 + 0.05 * t;
      }
    }
    if (aU >= 0.97 && aU <= 1.14 && Math.abs(v) <= 0.4) {
      const s = (1 - (aU - 0.97) / 0.17) * (1 - Math.abs(v) / 0.4);
      if (s > 0.12) return 0.12 + 0.08 * s;
    }
    return 0;
  }

  const n = norm3([u, v, Math.sqrt(Math.max(0, 1 - r2))]);

  const vMin = edge * (2 * (0.34 - 1e-9) - 1);
  const vMax = edge * (1 - 2 * 0.3);

  if (v < vMin) {
    const d = vMin - v;
    if (d <= 0.11) return 0.52;
    if (d < 0.55) return 0.22;
    return 0.32;
  }
  if (v > vMax) {
    const d = v - vMax;
    if (d <= 0.08) return 0.46;
    return 0.17;
  }

  const G = norm3([0.08, -0.245, 1]);
  const dO =
    n[0] * G[0] + n[1] * G[1] + n[2] * G[2];

  let shadeMul = 1;
  if (v - vMin < 0.6) shadeMul *= 0.78;
  if (vMax - v < 0.6) shadeMul *= 1.08;

  if (dO >= PUPIL_K) {
    const gd = norm3([-0.16, -0.18, 1.1]);
    const glint = clamp(
      (n[0] * gd[0] + n[1] * gd[1] + n[2] * gd[2] - 0.956) * 22,
      0,
      1
    );
    if (glint > 0.6) return 0.98;
    return 0.05;
  }
  if (dO >= IRIS_INNER_K) return 0.3 * shadeMul;
  if (dO >= IRIS_MID_K) return 0.42 * shadeMul;
  if (dO >= IRIS_OUTER_K) return 0.32 * shadeMul;
  if (dO >= LIMBUS_K) return 0.17 * shadeMul;

  const diff = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
  const limb = r2;
  return clamp(
    (0.3 + 0.62 * diff) * (1 - 0.5 * limb * limb) * shadeMul,
    0,
    1
  );
}

function paintEye(size) {
  return function (pixels, size) {
    const block = Math.max(1, Math.floor(size / W));
    const totalW = W * block;
    const totalH = H * block;
    const offsetX = Math.floor((size - totalW) / 2);
    const offsetY = Math.floor((size - totalH) / 2);

    for (let cy = 0; cy < H; cy++) {
      for (let cx = 0; cx < W; cx++) {
        const b = eyeBrightness(cx, cy);
        if (b <= 0.01) continue;
        const gray = Math.round(clamp(b, 0, 1) * 255);
        const x0 = offsetX + cx * block;
        const y0 = offsetY + cy * block;
        for (let py = y0; py < y0 + block; py++) {
          if (py < 0 || py >= size) continue;
          for (let px = x0; px < x0 + block; px++) {
            if (px < 0 || px >= size) continue;
            const p = (py * size + px) * 4;
            pixels[p] = gray;
            pixels[p + 1] = gray;
            pixels[p + 2] = gray;
            pixels[p + 3] = 255;
          }
        }
      }
    }
  };
}

const publicDir = join(process.cwd(), "public");

writeFileSync(
  join(publicDir, "icon-192.png"),
  makePng(192, paintEye(192))
);
writeFileSync(
  join(publicDir, "icon-512.png"),
  makePng(512, paintEye(512))
);
writeFileSync(
  join(publicDir, "apple-touch-icon.png"),
  makePng(180, paintEye(180))
);

console.log("Iconos PWA generados en public/");