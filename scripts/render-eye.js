// Dev-tool: renderiza el modelo 3D del ojo como ASCII en la terminal.
// Uso: node scripts/render-eye.js [right|left|up|center|blink|half]
const W = 52;
const H = 30;
const CX = W / 2;
const CY = H / 2 + 0.5;
const R = 19;

const RAMP = ["·", ".", ":", "-", "=", "+", "*", "#", "%", "@"];

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
function norm3(a) {
  const l = Math.hypot(...a);
  return a.map((x) => x / l);
}
const L = norm3([0.5, -0.62, 0.62]);

const PUPIL_K = Math.cos(0.2); // 0.9801
const IRIS_INNER_K = Math.cos(0.29); // 0.958
const IRIS_MID_K = Math.cos(0.39); // 0.925
const IRIS_OUTER_K = Math.cos(0.44); // 0.905
const LIMBUS_K = Math.cos(0.47); // 0.892

function shade(b) {
  if (b <= 0.03) return " ";
  const i = Math.round(clamp(1 - b, 0, 1) * (RAMP.length - 1));
  return RAMP[i];
}

function cell(x, y, gx, gy, blink) {
  const u = (x - CX) / R;
  const v = (y - CY) / R;
  const r2 = u * u + v * v;

  const edge = Math.abs(u) <= 1 ? Math.sqrt(Math.max(0, 1 - u * u)) : 0;
  const dyFromTop = CY - edge * R - y; // >0 = por encima del borde del globo
  const aU = Math.abs(u);

  // ceja (arco sobre la cuenca, algo más alta hacia afuera)
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

  // arruga / frunce sutil entre ceja y párpado (solo donde hay globo cerca)
  if (dyFromTop >= 0.95 && dyFromTop < 1.5 && aU <= 0.95) {
    return ["@", 0.12];
  }

  // tejido que envuelve el globo: finito, pegado, sin alas a los costados
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
    // canto: apenas asoma en cada punta (sin proyecciones)
    if (aU >= 0.97 && aU <= 1.14 && Math.abs(v) <= 0.4) {
      const s = (1 - (aU - 0.97) / 0.17) * (1 - Math.abs(v) / 0.4);
      if (s > 0.12) return [s > 0.5 ? "#" : "%", 0.12 + 0.08 * s];
    }
    return null;
  }

  const n = norm3([u, v, Math.sqrt(Math.max(0, 1 - r2))]);

  // fracción de columna cubierta por cada párpado
  const topC = (1 - blink) * 0.34 + blink * 0.5;
  const botC = (1 - blink) * 0.3 + blink * 0.5;
  const vMin = edge * (2 * topC - 1);
  const vMax = edge * (1 - 2 * botC);

  if (v < vMin) {
    const d = vMin - v;
    const th = 0.11 - 0.05 * blink;
    if (d <= Math.max(0.02, th)) return ["_", 0.52]; // línea de pestañas
    if (d < 0.55) return ["%", 0.22]; // piel del párpado (baja, sombra)
    return ["#", 0.32]; // párpado alto (más claro, bajo la ceja)
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

  // sombra / luz de los bordes del párpado sobre el globo
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
  if (dO >= LIMBUS_K) return ["#", 0.17 * shadeMul]; // limbo

  const diff = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
  const limb = r2;
  const b = clamp((0.3 + 0.62 * diff) * (1 - 0.5 * limb * limb) * shadeMul, 0, 1);
  return [shade(b), b];
}

const GAZES = {
  center: [0, 0],
  right: [0.92, 0],
  left: [-0.92, 0],
  up: [0, -0.9],
  down: [0, 0.85],
};

function render(gx, gy, blink) {
  const rows = [];
  for (let y = 0; y < H; y++) {
    let line = "";
    for (let x = 0; x < W; x++) {
      const got = cell(x, y, gx, gy, blink);
      line += got ? got[0] : " ";
    }
    rows.push(line);
  }
  return rows.join("\n");
}

const which = process.argv[2] ?? "center";
const states = {
  center: [0, 0, 0],
  right: [0.6, 0.28, 0],
  left: [-0.6, 0.28, 0],
  up: [0.55, -0.35, 0],
  blink: [0, 0, 1],
  half: [0, 0, 0.45],
  stare: [0, 0, 0],
};

const s = states[which] ?? states.center;
console.log(render(s[0], s[1], s[2]));