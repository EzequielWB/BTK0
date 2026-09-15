"use client";

import { useActionState, useRef, useState } from "react";
import { saveColorSchemeAction } from "@/lib/actions";
import {
  COLOR_KEYS,
  DEFAULT_COLORS,
  parseColors,
  PRESET_DESIGNS,
} from "@/lib/colors";
import type { PresetDesign } from "@/lib/colors";
import type { BitacoraColors } from "@/lib/types";

const COLOR_META: Record<keyof BitacoraColors, { label: string; hint: string }> = {
  bg: { label: "Fondo", hint: "Fondo general" },
  fg: { label: "Texto", hint: "Texto principal" },
  neon: { label: "Acento", hint: "Bordes, botones, 'hoy'" },
  green: { label: "Verde", hint: "Día cumplido · ✓ · SYS.OK" },
  amber: { label: "Ámbar", hint: "Notas · destacado · efemérides" },
  mut: { label: "Muted", hint: "Texto secundario" },
  dim: { label: "Dim", hint: "Texto apagado" },
  faint: { label: "Faint", hint: "Placeholders" },
  deep: { label: "Deep", hint: "Gris profundo (ejes)" },
  lines: { label: "Líneas", hint: "Bordes del header" },
  deckBg: { label: "Header bg", hint: "Barra superior" },
  panel: { label: "Panel", hint: "Reloj y paneles" },
  blk: { label: "Blk", hint: "Bordes de tarjetas" },
  btn: { label: "Botón", hint: "Bordes sutiles" },
  num: { label: "Números", hint: "Celdas del calendario" },
  trackBg: { label: "Track bg", hint: "Fondo de track" },
  track: { label: "Track", hint: "Inputs y grillas" },
  field: { label: "Campo", hint: "Fondo de inputs" },
  border: { label: "Borde", hint: "Bordes generales" },
  g1: { label: "Rojo", hint: "Aprendizaje · recuerdos · ✕" },
  g2: { label: "Cian", hint: "Glitch de la cita" },
  grad0: { label: "Degradé 0%", hint: "Calendario · sin objetivos completados" },
  grad50: { label: "Degradé 50%", hint: "Calendario · mitad de objetivos" },
  grad100: { label: "Degradé 100%", hint: "Calendario · día completamente cumplido" },
};

export function ColorThemeForm({ colors }: { colors: string | null }) {
  const [state, formAction, pending] = useActionState(saveColorSchemeAction, {});
  const [values, setValues] = useState<BitacoraColors>(() =>
    parseColors(colors)
  );
  const formRef = useRef<HTMLFormElement>(null);

  const setValue = (key: keyof BitacoraColors, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const applyPreset = (preset: PresetDesign) => {
    setValues({ ...preset.colors });
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  };

  const activePreset = PRESET_DESIGNS.find((preset) =>
    COLOR_KEYS.every(
      (key) =>
        values[key].toLowerCase() === preset.colors[key].toLowerCase()
    )
  );

  const resetToDefaults = () => {
    setValues({ ...DEFAULT_COLORS });
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  };

  return (
    <section className="blk">
      <h2 className="blk-tag">Colores_de_la_bitácora</h2>
      <p className="cyb-muted text-sm mb-3">
        Personalizá la paleta del HUD. Los cambios se aplican en toda la
        bitácora al guardar.
      </p>

      <form ref={formRef} action={formAction} className="space-y-4">
        <div>
          <span className="cyb-hint text-sm block mb-2">
            Diseños predefinidos
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_DESIGNS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                title={preset.description}
                className={"chip-btn" + (activePreset?.name === preset.name ? " active" : "")}
              >
                {preset.name}
              </button>
            ))}
          </div>
          <p className="cyb-hint text-xs mt-2">
            {activePreset
              ? `${activePreset.name}: ${activePreset.description}`
              : "Elegí un diseño para reemplazar toda la paleta y guardarla."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {COLOR_KEYS.map((key) => (
            <label
              key={key}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="color"
                name={key}
                value={values[key]}
                onChange={(event) => setValue(key, event.target.value)}
                className="h-8 w-10 shrink-0 cursor-pointer bg-transparent border border-[var(--cyb-num)] p-0"
              />
              <span className="leading-tight">
                <span className="block text-xs">
                  {COLOR_META[key].label}
                </span>
                <span className="block text-[10px] cyb-hint">
                  {COLOR_META[key].hint}
                </span>
              </span>
            </label>
          ))}
        </div>

        {state.error ? (
          <p className="text-sm text-[var(--cyb-g1)]">{state.error}</p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-[var(--cyb-green)]">{state.success}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className="cyb-btn">
            {pending ? "Guardando..." : "Guardar colores"}
          </button>
          <button
            type="button"
            onClick={resetToDefaults}
            className="cyb-link"
          >
            ↺ Restablecer originales
          </button>
        </div>
      </form>
    </section>
  );
}