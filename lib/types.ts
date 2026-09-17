export type Objective = {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  completable: boolean;
  sort_order: number;
  created_at: string;
};

export type TemporalGoal = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  /** Fecha en que se completó la meta (null = pendiente). */
  completed_at?: string | null;
  created_at: string;
};

export type Day = {
  id: string;
  date: string;
  created_at: string;
  updated_at: string;
};

export type Reminder = {
  id: string;
  date: string;
  content: string;
  created_at: string;
  completed_at?: string | null;
};

/** Efeméride: fecha que se repite todos los años (cumpleaños, aniversarios). */
export type AnnualReminder = {
  id: string;
  month: number;
  day: number;
  content: string;
  created_at: string;
  /** null/ausente = "sin separar". */
  category_id?: string | null;
};

/** Categoría para ordenar efemérides (ej: cumpleaños, aniversarios). */
export type AnnualCategory = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

/** "La hoja": pensamientos extensos del día. Una fila por día (date es PK). */
export type JournalEntry = {
  date: string;
  content: string;
  updated_at: string;
};

/** Peso corporal diario: una fila por día (date es PK), en kg con 1 decimal. */
export type Weight = {
  date: string;
  value: number;
  updated_at: string;
};

/** Resumen mensual del peso que se GUARDA al cerrar el mes.
 * month = primer día del mes (PK). value_min/max/avg en kg; avg con 2 decimales. */
export type WeightMonth = {
  month: string;
  value_min: number;
  value_max: number;
  value_avg: number;
  count: number;
  updated_at: string;
};

/** Categoría del anotador libre (Cuaderno). Grupos de ítems de texto. */
export type AgendaCategory = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

/** Ítem dentro de una categoría del Cuaderno: título + texto libre. */
export type AgendaItem = {
  id: string;
  category_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type AgendaCategoryWithCount = AgendaCategory & {
  /** Cantidad de ítems que tiene la categoría. */
  count: number;
};

/** "Objetivo del día": lista por día que se arma SOLO desde la vista
 * del día. Independiente de la eficiencia y del marcado verde.
 * completed_at null = pendiente (si el día terminó, quedó sin hacer). */
export type DayGoal = {
  id: string;
  date: string;
  title: string;
  completed_at?: string | null;
  created_at: string;
};

export type DayMark = {
  complete: boolean;
  thought: boolean;
  reminder: boolean;
  /** % de objetivos completados del día (0-100). Solo días pasados con
   * objetivos contables tienen valor; si no hay, undefined. */
  percent?: number;
};

export type CompletionMode = "off" | "count" | "percent";

/** Paleta de la bitácora: cada campo es un hex #rrggbb que alimenta una
 * variable --cyb-* del shell (ver globals.css). */
export type BitacoraColors = {
  bg: string;
  fg: string;
  neon: string;
  green: string;
  amber: string;
  mut: string;
  dim: string;
  faint: string;
  deep: string;
  lines: string;
  deckBg: string;
  panel: string;
  blk: string;
  btn: string;
  num: string;
  trackBg: string;
  track: string;
  field: string;
  border: string;
  g1: string;
  g2: string;
  /** Pelotita del calendario: pensamiento (hoja del día). */
  dotThought: string;
  /** Degradé del calendario: color en 0% de completado (default rojo). */
  grad0: string;
  /** Degradé del calendario: color en 50% de completado (default ámbar). */
  grad50: string;
  /** Degradé del calendario: color en 100% de completado (default verde). */
  grad100: string;
};

export type Settings = {
  id: number;
  completion_mode: CompletionMode;
  threshold: number;
  /** Orden de las tarjetas de la vista del día (JSON: array de claves). */
  section_order?: string | null;
  /** Colores del tema (JSON de BitacoraColors) o null = valores originales. */
  colors?: string | null;
  /** Contadores del banner (JSON de CountersConfig) o null = vacío. */
  counters?: string | null;
  updated_at: string;
};

/** Contador del banner: cuenta manual de días que suma 1 por día desde
 * last_date. name = siglas que se muestran en el recuadro.
 * limit null = sin límite. resettable = muestra el botón ↺ para volver a 0. */
export type CounterItem = {
  id: string;
  name: string;
  days: number;
  limit: number | null;
  /** Fecha (YYYY-MM-DD) del último cambio manual de days; el valor mostrado
   * es days + días transcurridos desde last_date. */
  last_date: string;
  resettable: boolean;
};

/** Configuración completa de los contadores del banner (settings.counters).
 * box/text: color global del recuadro y de la letra. */
export type CountersConfig = {
  box: string;
  text: string;
  items: CounterItem[];
};

export type ChecklistStatus = "none" | "partial" | "done" | "ignored";

export type DailyObjective = {
  id: string;
  day_id: string;
  objective_id: string;
  status: ChecklistStatus;
  /** Nota opcional del día para objetivos "completable". */
  note?: string | null;
};

export type ChecklistItem = {
  objectiveId: string;
  title: string;
  description: string | null;
  status: ChecklistStatus;
  completable?: boolean;
  note?: string | null;
};

export type DayStatsPoint = {
  date: string;
  percent: number;
  hasData: boolean;
};