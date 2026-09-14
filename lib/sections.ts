/** Claves de las tarjetas de contenido del día, en el orden por defecto. */
export const DEFAULT_DAY_SECTION_ORDER = [
  "efemerides",
  "cita",
  "objetivos",
  "objetivos_dia",
  "metas_activas",
  "recordatorios",
  "notas_aprendizajes",
] as const;

export type DaySectionKey = (typeof DEFAULT_DAY_SECTION_ORDER)[number];

export const DAY_SECTION_LABELS: Record<DaySectionKey, string> = {
  efemerides: "Efemérides",
  cita: "Cita del día",
  objetivos: "Objetivos",
  objetivos_dia: "Objetivos del día",
  metas_activas: "Metas activas",
  recordatorios: "Recordatorios",
  notas_aprendizajes: "Notas + Aprendizajes",
};

/** Devuelve un orden válido (claves canónicas, sin repetir) desde el JSON guardado. */
export function parseDaySectionOrder(
  raw: string | null | undefined
): DaySectionKey[] {
  if (!raw) return [...DEFAULT_DAY_SECTION_ORDER];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_DAY_SECTION_ORDER];

    const valid = new Set<string>(DEFAULT_DAY_SECTION_ORDER);
    const seen = new Set<DaySectionKey>();
    const out: DaySectionKey[] = [];
    for (const item of parsed) {
      if (typeof item === "string" && valid.has(item) && !seen.has(item as DaySectionKey)) {
        seen.add(item as DaySectionKey);
        out.push(item as DaySectionKey);
      }
    }
    // Claves que falten (config vieja) se agregan al final en el orden por defecto.
    for (const key of DEFAULT_DAY_SECTION_ORDER) {
      if (!seen.has(key)) out.push(key);
    }
    return out;
  } catch {
    return [...DEFAULT_DAY_SECTION_ORDER];
  }
}

/** true si `ids` es una permutación exacta de las claves canónicas. */
export function isDaySectionOrder(ids: string[]): ids is DaySectionKey[] {
  if (ids.length !== DEFAULT_DAY_SECTION_ORDER.length) return false;
  const valid = new Set<string>(DEFAULT_DAY_SECTION_ORDER);
  const seen = new Set<string>();
  for (const id of ids) {
    if (!valid.has(id) || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}