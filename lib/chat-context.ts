import { dayPercent, statusOf, statusValue } from "@/lib/completion";
import { createClient } from "@/lib/supabase/server";
import { arNow, formatShortDate, monthLabel, toISODate } from "@/lib/utils";
import type { Day, Note, Objective } from "@/lib/types";

const MAX_DAY_LINES = 24;
const NOTE_TRUNC = 140;

type StateRow = { status?: string; completed?: boolean };

function statusChar(status: { status?: string; completed?: boolean }): string {
  const state = statusOf(status);
  if (state === "done") return "✓";
  if (state === "partial") return "−";
  return "✕";
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

/**
 * Slot de contexto en memoria para la consulta "cómo va el día".
 * Se regenera desde cero en cada request (sobrescribiendo el slot anterior).
 */
export async function buildDayContext(): Promise<string> {
  const supabase = await createClient();
  const { date: today, hour } = arNow();

  const [
    { data: objectives },
    { data: day },
    { data: noteRows },
    { data: learningRows },
    { data: reminderRows },
  ] = await Promise.all([
    supabase
      .from("objectives")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at"),
    supabase.from("days").select("*").eq("date", today).maybeSingle(),
    supabase
      .from("notes")
      .select("content")
      .eq("date", today)
      .order("created_at")
      .order("id"),
    supabase.from("learnings").select("id").eq("date", today),
    supabase.from("reminders").select("id").eq("date", today),
  ]);

  const activeObjectives = (objectives ?? []) as Objective[];
  const notes = (noteRows ?? []) as Pick<Note, "content">[];
  const learnings = (learningRows ?? []) as { id: string }[];
  const reminders = (reminderRows ?? []) as { id: string }[];

  let objectivesLine = "OBJETIVOS: ninguno definido.";
  if (activeObjectives.length > 0) {
    const states = new Map<string, StateRow>();
    if (day) {
      const { data: dailyObjectiveRows } = await supabase
        .from("daily_objectives")
        .select("objective_id, status, completed")
        .eq("day_id", (day as Day).id);
      for (const row of (dailyObjectiveRows ?? []) as (StateRow & {
        objective_id: string;
      })[]) {
        states.set(row.objective_id, row);
      }
    }
    const statusById = new Map<string, { status?: string; completed?: boolean }>();
    for (const [objectiveId, row] of states) {
      statusById.set(objectiveId, row);
    }
    const items = activeObjectives.map((o) => ({
      status: statusById.has(o.id) ? statusOf(statusById.get(o.id)!) : ("none" as const),
    }));
    const marks = activeObjectives
      .map((o) => `${statusChar(statusById.get(o.id) ?? {})}${o.title}`)
      .join(" · ");
    const pts = items.reduce((sum, item) => sum + statusValue(item.status), 0);
    objectivesLine = `OBJETIVOS (${items.length}): ${marks} → ${pts}/${
      items.length
    } = ${dayPercent(items)}%`;
  }

  const lastNote = notes.length > 0 ? notes[notes.length - 1].content : "";
  const notesLine = notes.length
    ? `NOTAS hoy: ${notes.length}${lastNote ? ` · última: "${truncate(lastNote, NOTE_TRUNC)}"` : ""}`
    : "NOTAS hoy: 0";

  return [
    "DATOS DEL DÍA",
    `hora ${hour} · hoy ${formatShortDate(today)}`,
    objectivesLine,
    notesLine,
    `APRENDIZAJES hoy: ${learnings.length}`,
    `RECORDATORIOS hoy: ${reminders.length}`,
  ].join("\n");
}

/**
 * Slot de contexto en memoria para la consulta "cómo va el mes".
 * month: 1..12. Se regenera desde cero en cada request.
 */
export async function buildMonthContext(
  month: number,
  year: number
): Promise<string> {
  const supabase = await createClient();
  const mm = String(month).padStart(2, "0");
  const start = `${year}-${mm}-01`;
  const end = toISODate(new Date(year, month, 0, 12));

  const [{ data: days }, { data: objectiveRows }, { data: dailyObjectives }, { data: noteRows }, { data: learningRows }] =
    await Promise.all([
      supabase
        .from("days")
        .select("id, date")
        .gte("date", start)
        .lte("date", end)
        .order("date"),
      supabase.from("objectives").select("*").eq("is_active", true),
      supabase
        .from("daily_objectives")
        .select("day_id, status, completed"),
      supabase
        .from("notes")
        .select("date")
        .gte("date", start)
        .lte("date", end),
      supabase
        .from("learnings")
        .select("date")
        .gte("date", start)
        .lte("date", end),
    ]);

  const dayRows = (days ?? []) as Day[];
  const totalObjectives = ((objectiveRows ?? []) as Objective[]).length;

  const byDayId = new Map<string, StateRow[]>();
  for (const row of (dailyObjectives ?? []) as (StateRow & {
    day_id: string;
  })[]) {
    const list = byDayId.get(row.day_id) ?? [];
    list.push(row);
    byDayId.set(row.day_id, list);
  }

  const noteCount = new Map<string, number>();
  for (const row of (noteRows ?? []) as { date: string }[]) {
    noteCount.set(row.date, (noteCount.get(row.date) ?? 0) + 1);
  }
  const learningCount = new Map<string, number>();
  for (const row of (learningRows ?? []) as { date: string }[]) {
    learningCount.set(row.date, (learningCount.get(row.date) ?? 0) + 1);
  }

  const dayLines: string[] = [];
  let periodPoints = 0;
  let bestDate = "";
  let bestFrac = 0;

  for (const day of dayRows) {
    const date = day.date;
    const entries = byDayId.get(day.id) ?? [];
    const pts = entries.reduce(
      (sum, entry) => sum + statusValue(statusOf(entry)),
      0
    );
    const frac = totalObjectives > 0 ? pts / totalObjectives : 0;
    const pct = totalObjectives > 0 ? Math.round(frac * 100) : 0;
    const n = noteCount.get(date) ?? 0;
    const a = learningCount.get(date) ?? 0;

    if (frac > bestFrac) {
      bestFrac = frac;
      bestDate = date;
    }
    periodPoints += frac;

    if (entries.length === 0 && n === 0 && a === 0) continue;

    const bits = [`${date.slice(8, 10)}/${mm}`];
    if (entries.length > 0) {
      bits.push(`${pts.toFixed(1)}/${totalObjectives} ${pct}%`);
    }
    if (n > 0) bits.push(`n${n}`);
    if (a > 0) bits.push(`a${a}`);
    dayLines.push(bits.join(" "));
  }

  const efficiency =
    dayRows.length > 0 ? Math.round((periodPoints / dayRows.length) * 100) : 0;

  const lines = [
    `DATOS DEL MES · ${monthLabel(year, month - 1).toLowerCase()}`,
    `periodo: ${formatShortDate(start)} al ${formatShortDate(end)}`,
    `días con registro: ${dayLines.length}/${dayRows.length} · puntos: ${periodPoints.toFixed(1)} · eficiencia: ${efficiency}%`,
  ];
  if (bestDate) {
    lines.push(`mejor día: ${formatShortDate(bestDate)} (${Math.round(bestFrac * 100)}%)`);
  }
  if (dayLines.length > 0) {
    lines.push("PER DÍA:");
    lines.push(...dayLines.slice(-MAX_DAY_LINES));
  }

  return lines.join("\n");
}