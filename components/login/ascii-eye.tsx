"use client";

import { useEffect, useRef } from "react";

const W = 52;
const H = 30;
const CHAR_W = 16;
const CHAR_H = 17;

const CX = W / 2;
const CY = H / 2 + 0.5;
const R = 19;

const RAMP = ["·", ".", ":", "-", "=", "+", "*", "#", "%", "@"];

const PUPIL_K = Math.cos(0.2);
const IRIS_INNER_K = Math.cos(0.29);
const IRIS_MID_K = Math.cos(0.39);
const IRIS_OUTER_K = Math.cos(0.44);
const LIMBUS_K = Math.cos(0.47);
const L = norm3([0.5, -0.62, 0.62]);

const FIXED_LOOKS: ReadonlyArray<readonly [number, number]> = [
  [0.55, 0.1],
  [-0.55, 0.1],
  [0.55, -0.35],
  [-0.55, -0.35],
  [0.6, 0.28],
  [-0.6, 0.28],
  [0.5, 0],
  [-0.5, 0],
];
function norm3(a: number[]): [number, number, number] {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function shadeChar(b: number): string {
  if (b <= 0.03) return " ";
  return RAMP[Math.round(clamp(1 - b, 0, 1) * (RAMP.length - 1))];
}

function cell(
  x: number,
  y: number,
  gx: number,
  gy: number,
  blink: number
): [string, number] | null {
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
    if (dyFromTop >= lo && dyFromTop <= hi) {
      const t = (dyFromTop - lo) / Math.max(0.01, hi - lo);
      if (t < 0.45) return ["%", 0.3];
      if (t < 0.8) return ["%", 0.23];
      return ["#", 0.15];
    }
  }

  if (dyFromTop >= 0.95 && dyFromTop < 1.5 && aU <= 0.95) {
    return ["@", 0.12];
  }

  if (r2 > 1) {
    if (aU <= 0.98) {
      if (dyFromTop > 0.06 && dyFromTop < 0.85) {
        const t = 1 - dyFromTop / 0.85;
        return ["#", 0.16 + 0.06 * t];
      }
      const dyBelow = y - (CY + edge * R);
      if (dyBelow > 0.06 && dyBelow < 0.8) {
        const t = 1 - dyBelow / 0.8;
        return ["%", 0.12 + 0.05 * t];
      }
    }
    if (aU >= 0.97 && aU <= 1.14 && Math.abs(v) <= 0.4) {
      const s = (1 - (aU - 0.97) / 0.17) * (1 - Math.abs(v) / 0.4);
      if (s > 0.12) return [s > 0.5 ? "#" : "%", 0.12 + 0.08 * s];
    }
    return null;
  }

  const n = norm3([u, v, Math.sqrt(Math.max(0, 1 - r2))]);

  const topC = (1 - blink) * 0.34 + blink * 0.5;
  const botC = (1 - blink) * 0.3 + blink * 0.5;
  const vMin = edge * (2 * topC - 1);
  const vMax = edge * (1 - 2 * botC);

  if (v < vMin) {
    const d = vMin - v;
    const th = 0.11 - 0.05 * blink;
    if (d <= Math.max(0.02, th)) return ["_", 0.52];
    if (d < 0.55) return ["%", 0.22];
    return ["#", 0.32];
  }
  if (v > vMax) {
    const d = v - vMax;
    if (d <= Math.max(0.02, 0.08 - 0.04 * blink)) return ["_", 0.46];
    return ["%", 0.17];
  }

  const G = norm3([
    gx,
    gy * 0.9,
    Math.sqrt(Math.max(0, 1 - gx * gx - (gy * 0.9) * (gy * 0.9))),
  ]);
  const dO = n[0] * G[0] + n[1] * G[1] + n[2] * G[2];

  let shadeMul = 1;
  if (v - vMin < 0.6) shadeMul *= 0.78;
  if (vMax - v < 0.6) shadeMul *= 1.08;

  if (dO >= PUPIL_K) {
    const gd = norm3([gx - 0.16, gy - 0.18, 1.1]);
    const glint = clamp((n[0] * gd[0] + n[1] * gd[1] + n[2] * gd[2] - 0.956) * 22, 0, 1);
    if (glint > 0.6) return ["·", 0.98];
    return ["@", 0.05];
  }
  if (dO >= IRIS_INNER_K) return ["*", 0.3 * shadeMul];
  if (dO >= IRIS_MID_K) return ["+", 0.42 * shadeMul];
  if (dO >= IRIS_OUTER_K) return ["*", 0.32 * shadeMul];
  if (dO >= LIMBUS_K) return ["#", 0.17 * shadeMul];

  const diff = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
  const limb = r2;
  const b = clamp(
    (0.3 + 0.62 * diff) * (1 - 0.5 * limb * limb) * shadeMul,
    0,
    1
  );
  return [shadeChar(b), b];
}

export function AsciiEye({ stare = false }: { stare?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stareRef = useRef(stare);

  useEffect(() => {
    stareRef.current = stare;
  }, [stare]);

  useEffect(() => {
    const elem = canvasRef.current;
    if (!elem) return;
    const context = elem.getContext("2d");
    if (!context) return;
    const canvas = elem;
    const ctx = context;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * CHAR_W * dpr;
    canvas.height = H * CHAR_H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `bold ${CHAR_W}px ui-monospace, SFMono-Regular, Menlo, "Courier New", monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    let raf = 0;
    let hidden = false;
    let lastNow = performance.now();
    let ox = 0;
    let oy = 0;
    let dirIdx = 0;
    let flipped = true;
    let nextBlinkAt = performance.now() + rand(1500, 2800);
    let blinkStart = -Infinity;
    const blinkDuration = 130;
    const blinkHold = 60;
    const blinkOpen = 150;

    function draw(gx: number, gy: number, blink: number) {
      ctx.clearRect(0, 0, W * CHAR_W, H * CHAR_H);

      const glowX = CX * CHAR_W;
      const glowY = CY * CHAR_H;
      const glowR = R * CHAR_W * 2.4;
      const grad = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, glowR);
      grad.addColorStop(0, "rgba(0,0,0,0.92)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W * CHAR_W, H * CHAR_H);

      for (let cy = 0; cy < H; cy++) {
        for (let cx = 0; cx < W; cx++) {
          const got = cell(cx, cy, gx, gy, blink);
          if (!got) continue;
          const [ch, b] = got;
          const g = Math.round(b * 255);
          ctx.fillStyle = `rgb(${g},${g},${g})`;
          ctx.fillText(
            ch,
            cx * CHAR_W + CHAR_W / 2,
            cy * CHAR_H + CHAR_H / 2
          );
        }
      }
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (hidden) return;

      const staring = stareRef.current;

      let lid = 0;
      if (now - blinkStart < blinkDuration) {
        lid = ease((now - blinkStart) / blinkDuration);
      } else if (now - blinkStart < blinkDuration + blinkHold) {
        lid = 1;
        // con el ojo cerrado, cambia a la siguiente dirección fija
        if (!staring && !flipped) {
          flipped = true;
          dirIdx = (dirIdx + 1) % FIXED_LOOKS.length;
        }
      } else if (now - blinkStart < blinkDuration + blinkHold + blinkOpen) {
        lid = 1 - ease((now - blinkStart - blinkDuration - blinkHold) / blinkOpen);
      } else if (!staring && now >= nextBlinkAt) {
        blinkStart = now;
        flipped = false;
        nextBlinkAt = now + rand(1500, 2800);
      }

      const dt = Math.min(0.1, (now - lastNow) / 1000 || 0.016);
      lastNow = now;
      const k = staring ? 1 - Math.exp(-dt * 9) : 1 - Math.exp(-dt * 7);
      const look = FIXED_LOOKS[staring ? 0 : dirIdx];
      ox += ((staring ? 0 : look[0]) - ox) * k;
      oy += ((staring ? 0 : look[1]) - oy) * k;

      const amp = staring ? 0.015 : 0.035;
      const idlDx = Math.sin(now / 900) * amp;
      const idlDy = Math.cos(now / 1100) * amp;

      draw(ox + idlDx, oy + idlDy, lid);
    }

    const onVisibility = () => {
      hidden = document.hidden;
    };

    document.addEventListener("visibilitychange", onVisibility);

    if (reduceMotion) {
      draw(0, 0, 0);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="mx-auto block"
      style={{ width: "min(86vw, 832px)", height: "auto" }}
    />
  );
}