export type Objective = {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
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

export type Note = {
  id: string;
  date: string;
  content: string;
  created_at: string;
};

export type Learning = {
  id: string;
  date: string;
  content: string;
  created_at: string;
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
  note: boolean;
  learn: boolean;
  thought: boolean;
  reminder: boolean;
};

export type CompletionMode = "off" | "count" | "percent";

export type Settings = {
  id: number;
  completion_mode: CompletionMode;
  threshold: number;
  /** Orden de las tarjetas de la vista del día (JSON: array de claves). */
  section_order?: string | null;
  updated_at: string;
};

export type ChecklistStatus = "none" | "partial" | "done" | "ignored";

export type DailyObjective = {
  id: string;
  day_id: string;
  objective_id: string;
  status: ChecklistStatus;
};

export type ChecklistItem = {
  objectiveId: string;
  title: string;
  description: string | null;
  status: ChecklistStatus;
};

export type DayStatsPoint = {
  date: string;
  percent: number;
  hasData: boolean;
};