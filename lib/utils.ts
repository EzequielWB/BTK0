export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const AR_TZ = "America/Argentina/Buenos_Aires";

/** Fecha real (YYYY-MM-DD) y hora (HH:MM) en Argentina, sin depender de la zona del server. */
export function arNow(): { date: string; hour: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: AR_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const map = new Map(parts.map((p) => [p.type, p.value]));
  return {
    date: `${map.get("year")}-${map.get("month")}-${map.get("day")}`,
    hour: `${map.get("hour")}:${map.get("minute")}`,
  };
}

export function todayISO(): string {
  return arNow().date;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function isValidISODate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = parseISODate(iso);
  return toISODate(d) === iso;
}

/**
 * Interpreta una fecha "dd/mm/aa" o "dd/mm/aaaa" → ISO (YYYY-MM-DD).
 * Años de 2 dígitos se asumen 20XX. Devuelve null si no es una fecha real.
 */
export function parseShortDate(input: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(input.trim());
  if (!m) return null;
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  const iso = `${String(year).padStart(4, "0")}-${String(Number(m[2])).padStart(
    2,
    "0"
  )}-${String(Number(m[1])).padStart(2, "0")}`;
  return isValidISODate(iso) ? iso : null;
}

/** "2026-09-08" → "08/09/26" */
export function formatShortDate(iso: string): string {
  const d = parseISODate(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

export function dayLabel(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseISODate(iso));
}

export function shortDayLabel(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
  }).format(parseISODate(iso));
}

export function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));
}

export function monthRangeISO(iso: string): { start: string; end: string } {
  const [year, month] = iso.split("-").map(Number);
  const start = `${iso.slice(0, 7)}-01`;
  const end = toISODate(new Date(year, month, 0, 12));
  return { start, end };
}

export function getMonthGrid(year: number, month: number): (string | null)[] {
  const startDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toISODate(new Date(year, month, d, 12)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export const WEEKDAYS = ["L", "M", "Mi", "J", "V", "S", "D"];

export function formatDateRange(startISO: string, endISO: string): string {
  const start = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
  }).format(parseISODate(startISO));
  const end = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  }).format(parseISODate(endISO));
  return `${start} → ${end}`;
}

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Valida un día/mes como fecha recurrente (Febrero admite hasta 29). */
export function isValidMonthDay(month: number, day: number): boolean {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= (DAYS_IN_MONTH[month - 1] ?? 0);
}

/** "14/05" a partir de mes y día (formato corto, sin año). */
export function formatMonthDay(month: number, day: number): string {
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

/**
 * Próxima ocurrencia de una efeméride (mes/día recursivo). Ej: hoy 11/09,
 * "14/05" cae el 14/05 del año que viene. El 29/02 en año no bisiesto cae
 * el 28/02. Devuelve null si el día/mes no es válido.
 */
export function annualOccurrenceISO(
  month: number,
  day: number,
  from = todayISO()
): { iso: string; inDays: number } | null {
  if (!isValidMonthDay(month, day)) return null;
  const fromYear = Number(from.slice(0, 4));
  const build = (year: number): string => {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return isValidISODate(iso) ? iso : `${year}-02-28`;
  };
  let candidate = build(fromYear);
  if (candidate < from) candidate = build(fromYear + 1);
  const inDays = Math.round(
    (parseISODate(candidate).getTime() - parseISODate(from).getTime()) / 86400000
  );
  return { iso: candidate, inDays };
}