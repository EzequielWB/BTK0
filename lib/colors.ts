import type { CSSProperties } from "react";
import type { BitacoraColors } from "@/lib/types";

/** Paleta original (valores por defecto de .cyb-shell en globals.css). */
export const DEFAULT_COLORS: BitacoraColors = {
  bg: "#030303",
  fg: "#f2f2f2",
  neon: "#f2f2f2",
  green: "#00ff9d",
  amber: "#ffe14a",
  mut: "#8f8f8f",
  dim: "#6f6f6f",
  faint: "#555555",
  deep: "#4d4d4d",
  lines: "#1c1c1c",
  deckBg: "#050505",
  panel: "#0c0c0c",
  blk: "#1f1f1f",
  btn: "#2b2b2b",
  num: "#262626",
  trackBg: "#101010",
  track: "#2a2a2a",
  field: "#080808",
  border: "#242424",
  g1: "#ff3b5c",
  g2: "#00e5ff",
  dotThought: "#f2f2f2",
  grad0: "#ff3b5c",
  grad50: "#ffe14a",
  grad100: "#00ff9d",
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function isHex(value: unknown): value is string {
  return typeof value === "string" && HEX_RE.test(value);
}

function normalizeHex(value: unknown): string {
  return isHex(value) ? value.toLowerCase() : "#000000";
}

/** Devuelve la tripleta "r, g, b" de un hex #rrggbb para usar en rgba(). */
function hexToRgbTriplet(hex: string): string {
  const normalized = normalizeHex(hex).slice(1);
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

/** Parsea la columna settings.colors (JSON) con fallback a la paleta original.
 * Los campos inválidos/ausentes quedan con el valor por defecto. */
export function parseColors(raw: string | null | undefined): BitacoraColors {
  if (!raw) return { ...DEFAULT_COLORS };
  try {
    const parsed = JSON.parse(raw) as Partial<BitacoraColors>;
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_COLORS };
    const out: BitacoraColors = { ...DEFAULT_COLORS };
    for (const key of Object.keys(DEFAULT_COLORS) as (keyof BitacoraColors)[]) {
      const value = (parsed as Partial<BitacoraColors>)[key];
      if (isHex(value)) out[key] = value.toLowerCase();
    }
    return out;
  } catch {
    return { ...DEFAULT_COLORS };
  }
}

/** Serializa una paleta a la forma que se guarda en settings.colors. */
export function stringifyColors(colors: BitacoraColors): string {
  return JSON.stringify(colors);
}

/** Claves de la paleta (una por variable --cyb-*). */
export const COLOR_KEYS = Object.keys(DEFAULT_COLORS) as (keyof BitacoraColors)[];

export type PresetDesign = {
  name: string;
  description: string;
  colors: BitacoraColors;
};

/** Arma un diseño partiendo de la paleta original y pisando los cambios.
 * La pelotita del calendario deriva del acento neon que cada diseño usa. */
function design(
  name: string,
  description: string,
  overrides: Partial<BitacoraColors>
): PresetDesign {
  const colors: BitacoraColors = { ...DEFAULT_COLORS, ...overrides };
  colors.dotThought = overrides.dotThought ?? colors.neon;
  return {
    name,
    description,
    colors,
  };
}

/** Diseños predefinidos: reemplazan la paleta completa de un toque. */
export const PRESET_DESIGNS: PresetDesign[] = [
  {
    name: "Blanco neón",
    description: "El HUD original, acento blanco y verde ácido.",
    colors: { ...DEFAULT_COLORS },
  },
  design(
    "Verde ácido",
    "Terminal químico: todo el marco toma el verde de los días cumplidos.",
    {
      bg: "#010703",
      fg: "#d9ffe9",
      neon: "#00ff9d",
      mut: "#93c9ab",
      dim: "#6fae8f",
      faint: "#4b7d63",
      deep: "#3f6b54",
      lines: "#123624",
      deckBg: "#020805",
      panel: "#071510",
      blk: "#102420",
      btn: "#16332c",
      num: "#112a26",
      trackBg: "#040d09",
      track: "#17382c",
      field: "#020906",
      border: "#1a3d30",
      g2: "#1fe6d8",
    }
  ),
  design(
    "Cian glitch",
    "Hielo digital: acento cian y glitch en fucsia.",
    {
      bg: "#02060a",
      fg: "#d8f2ff",
      neon: "#22d3ee",
      mut: "#93b8ca",
      dim: "#6f93a5",
      faint: "#4a6b7a",
      deep: "#3e5c6b",
      lines: "#0c2431",
      deckBg: "#02070b",
      panel: "#06121a",
      blk: "#0d222c",
      btn: "#14303c",
      num: "#102936",
      trackBg: "#040c12",
      track: "#16343f",
      field: "#020910",
      border: "#1a3b49",
      g1: "#ff5c7a",
      g2: "#ff4fd8",
    }
  ),
  design(
    "Fucsia synth",
    "Magenta neón sobre violeta oscuro.",
    {
      bg: "#0a0208",
      fg: "#ffd9ee",
      neon: "#ff4fd8",
      mut: "#c79ab5",
      dim: "#a06f8d",
      faint: "#714a63",
      deep: "#5e3f53",
      lines: "#30102a",
      deckBg: "#0a0309",
      panel: "#160a14",
      blk: "#241222",
      btn: "#311b2f",
      num: "#2a1728",
      trackBg: "#0d050c",
      track: "#351f31",
      field: "#0a0309",
      border: "#3a2340",
      amber: "#ffd21e",
      g1: "#ff2e63",
      g2: "#4d8fff",
    }
  ),
  design(
    "Ámbar retro",
    "Terminal cálida de fósforo naranja.",
    {
      bg: "#0d0700",
      fg: "#ffe2b0",
      neon: "#ffb020",
      green: "#86e06b",
      amber: "#ffd21e",
      mut: "#d8b28c",
      dim: "#b08a66",
      faint: "#856644",
      deep: "#6f563a",
      lines: "#2a1a08",
      deckBg: "#0e0801",
      panel: "#1a1206",
      blk: "#241a0f",
      btn: "#332616",
      num: "#2b2115",
      trackBg: "#120b03",
      track: "#362a18",
      field: "#0f0901",
      border: "#3b2d1a",
      g1: "#ff5c4d",
      g2: "#4d8fff",
    }
  ),
];

/** Convierte la paleta en las custom properties CSS que pisa .cyb-shell,
 * incluyendo las tripletas RGB usadas por los rgba() del HUD. */
export function colorsToStyleVars(colors: BitacoraColors): CSSProperties {
  return {
    "--cyb-bg": colors.bg,
    "--cyb-fg": colors.fg,
    "--cyb-fg-rgb": hexToRgbTriplet(colors.fg),
    "--cyb-neon": colors.neon,
    "--cyb-neon-rgb": hexToRgbTriplet(colors.neon),
    "--cyb-green": colors.green,
    "--cyb-green-rgb": hexToRgbTriplet(colors.green),
    "--cyb-amber": colors.amber,
    "--cyb-amber-rgb": hexToRgbTriplet(colors.amber),
    "--cyb-mut": colors.mut,
    "--cyb-dim": colors.dim,
    "--cyb-faint": colors.faint,
    "--cyb-deep": colors.deep,
    "--cyb-lines": colors.lines,
    "--cyb-deck-bg": colors.deckBg,
    "--cyb-panel": colors.panel,
    "--cyb-blk": colors.blk,
    "--cyb-btn": colors.btn,
    "--cyb-num": colors.num,
    "--cyb-track-bg": colors.trackBg,
    "--cyb-track": colors.track,
    "--cyb-field": colors.field,
    "--cyb-border": colors.border,
    "--cyb-g1": colors.g1,
    "--cyb-g1-rgb": hexToRgbTriplet(colors.g1),
    "--cyb-g2": colors.g2,
    "--cyb-dot-thought": colors.dotThought,
    "--cyb-grad0": colors.grad0,
    "--cyb-grad50": colors.grad50,
    "--cyb-grad100": colors.grad100,
  } as CSSProperties;
}