const KG_RANGE_MIN = 20;
const KG_RANGE_MAX = 400;

/** Parsea "84", "84.5" o "84,5" (kg, hasta 1 decimal) dentro del rango válido.
 * Devuelve null si no es un peso aceptable. */
export function parseKilograms(raw: string): number | null {
  const text = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d)?$/.test(text)) return null;
  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  if (value < KG_RANGE_MIN || value > KG_RANGE_MAX) return null;
  return value;
}

/** "84.5" → "84,5 kg" (formato es-AR, 0 o 1 decimal). */
export function kilogramLabel(value: number): string {
  const formatted = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
  return `${formatted} kg`;
}

/** "84.333" → "84,33 kg" (2 decimales, para el promedio mensual). */
export function kilogramAvgLabel(value: number): string {
  const formatted = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} kg`;
}