import { isAuthenticated } from "@/lib/session";
import { statusOf, statusValue } from "@/lib/completion";
import { createClient } from "@/lib/supabase/server";
import { addDays, todayISO } from "@/lib/utils";
import { chatWithFallback } from "@/lib/llm";
import type {
  DailyObjective,
  Day,
  DayStatsPoint,
  Learning,
  Note,
  Objective,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const RANGE_DAYS = 30;
const MAX_SAMPLES = 15;
const SAMPLE_CHARS = 300;

function json(message: unknown, status = 200): Response {
  return new Response(JSON.stringify(message), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function fmt(iso: string): string {
  const [, mm, dd] = iso.split("-");
  return `${dd}/${mm}`;
}

function clip(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > SAMPLE_CHARS ? `${t.slice(0, SAMPLE_CHARS)}…` : t;
}

type Fact = {
  rangeLabel: string;
  objectives: string[];
  daily: DayStatsPoint[];
  best: Array<{ iso: string; percent: number }>;
  worst: Array<{ iso: string; percent: number }>;
  daysWithData: number;
  emptyDays: number;
  daysWithNotes: number;
  daysWithLearnings: number;
  streak: number;
  efficiency: number;
  notes: { iso: string; content: string }[];
  learnings: { iso: string; content: string }[];
};

async function buildFacts(): Promise<Fact> {
  const supabase = await createClient();
  const toISO = todayISO();
  const fromISO = addDays(toISO, -(RANGE_DAYS - 1));

  const { data: days } = await supabase
    .from("days")
    .select("*")
    .gte("date", fromISO)
    .lte("date", toISO)
    .order("date");

  const dayRows = (days ?? []) as Day[];

  const { data: dailyObjectives } = dayRows.length
    ? await supabase
        .from("daily_objectives")
        .select("*")
        .in(
          "day_id",
          dayRows.map((day) => day.id)
        )
    : { data: [] as DailyObjective[] };

  const { data: noteRows } = await supabase
    .from("notes")
    .select("date, content")
    .gte("date", fromISO)
    .lte("date", toISO);

  const { data: learningRows } = await supabase
    .from("learnings")
    .select("date, content")
    .gte("date", fromISO)
    .lte("date", toISO);

  const { data: objectiveRows } = await supabase
    .from("objectives")
    .select("title")
    .eq("is_active", true);

  const objectives = ((objectiveRows ?? []) as Objective[]).map(
    (row) => row.title
  );

  const byDayId = new Map<string, DailyObjective[]>();
  for (const entry of (dailyObjectives ?? []) as DailyObjective[]) {
    const list = byDayId.get(entry.day_id) ?? [];
    list.push(entry);
    byDayId.set(entry.day_id, list);
  }

  const noteDates = new Set<string>(
    ((noteRows ?? []) as Note[]).map((note) => note.date)
  );
  const learningDates = new Set<string>(
    ((learningRows ?? []) as Learning[]).map((learning) => learning.date)
  );

  const points: DayStatsPoint[] = [];
  let periodPoints = 0;
  for (let i = 0; i < RANGE_DAYS; i++) {
    const date = addDays(fromISO, i);
    const day = dayRows.find((row) => row.date === date);
    const todosForDay = day ? (byDayId.get(day.id) ?? []) : [];
    const hasNotes = noteDates.has(date);
    const hasLearnings = learningDates.has(date);
    const hasData = Boolean(hasNotes || hasLearnings || todosForDay.length > 0);
    const dayPoints = todosForDay.reduce(
      (sum, entry) => sum + statusValue(statusOf(entry)),
      0
    );
    const percent = objectives.length
      ? Math.round((dayPoints / objectives.length) * 100)
      : 0;
    if (objectives.length) {
      periodPoints += dayPoints / objectives.length;
    }
    points.push({ date, percent, hasData });
  }

  let streak = 0;
  for (let i = points.length - 1; i >= 0; i--) {
    const point = points[i];
    if (point.date === toISO && !point.hasData) continue;
    if (point.hasData) streak++;
    else break;
  }

  const withData = points.filter((point) => point.hasData);
  const best = [...withData]
    .sort((a, b) => b.percent - a.percent || b.date.localeCompare(a.date))
    .slice(0, 3)
    .map((p) => ({ iso: p.date, percent: p.percent }));
  const worst = [...withData]
    .sort((a, b) => a.percent - b.percent || b.date.localeCompare(a.date))
    .slice(0, 3)
    .map((p) => ({ iso: p.date, percent: p.percent }));

  const daysWithData = withData.length;
  const emptyDays = RANGE_DAYS - daysWithData;
  const daysWithNotes = noteDates.size;
  const daysWithLearnings = learningDates.size;
  const efficiency = Math.round((periodPoints / RANGE_DAYS) * 100);

  const notes = ((noteRows ?? []) as Note[])
    .slice(0, MAX_SAMPLES)
    .map((note) => ({ iso: note.date, content: clip(note.content) }));
  const learnings = ((learningRows ?? []) as Learning[])
    .slice(0, MAX_SAMPLES)
    .map((learning) => ({
      iso: learning.date,
      content: clip(learning.content),
    }));

  return {
    rangeLabel: `${fmt(fromISO)} al ${fmt(toISO)}`,
    objectives,
    daily: points,
    best,
    worst,
    daysWithData,
    emptyDays,
    daysWithNotes,
    daysWithLearnings,
    streak,
    efficiency,
    notes,
    learnings,
  };
}

function buildPrompt(f: Fact): string {
  const lines: string[] = [];

  lines.push(
    "Eres un analista objetivo que revisa la bitácora personal del usuario. Trabajas SOLO con los datos que te dan: no inventes cifras, fechas ni situaciones. Estilo sobrio, directo y neutral, en español; nada de elogios vacíos ni dramatismo."
  );
  lines.push("");
  lines.push("Estructura EXACTA de tu respuesta (encabezados textuales):");
  lines.push("RESUMEN");
  lines.push("ALTOS");
  lines.push("BAJOS");
  lines.push("CIERRE");
  lines.push("");
  lines.push(
    "- RESUMEN: 3 a 4 líneas sobre cómo estuvo el período en general, con números concretos."
  );
  lines.push(
    "- ALTOS: 2 a 4 puntos específicos de lo que funcionó (apoyado en los datos)."
  );
  lines.push(
    "- BAJOS: 2 a 4 puntos concretos de lo que faltó o se estancó (también con datos)."
  );
  lines.push(
    "- CIERRE: una sola recomendación accionable y realista para el próximo período."
  );
  lines.push("");
  lines.push("DATOS DEL PERÍODO (últimos 30 días):");
  lines.push(`Rango: ${f.rangeLabel}`);
  lines.push(
    `Objetivos activos: ${f.objectives.length ? f.objectives.join(", ") : "ninguno"}`
  );
  lines.push(`Días con registro: ${f.daysWithData} de 30 (${f.emptyDays} vacíos)`);
  lines.push(`Días con notas: ${f.daysWithNotes}`);
  lines.push(`Días con aprendizajes: ${f.daysWithLearnings}`);
  lines.push(`Racha actual: ${f.streak} día(s)`);
  lines.push(`Eficiencia: ${f.efficiency}%`);
  lines.push(
    `Mejores días: ${f.best.length ? f.best.map((d) => `${fmt(d.iso)} (${d.percent}%)`).join(", ") : "sin registros"}`
  );
  lines.push(
    `Peores días con registro: ${f.worst.length ? f.worst.map((d) => `${fmt(d.iso)} (${d.percent}%)`).join(", ") : "sin registros"}`
  );
  lines.push(
    `% por día (solo días con registro): ${f.daily
      .filter((d) => d.hasData)
      .map((d) => `${fmt(d.date)}: ${d.percent}%`)
      .join(", ") || "ninguno"}`
  );
  lines.push("");
  if (f.notes.length) {
    lines.push("NOTAS (más recientes, tal cual escribió el usuario):");
    for (const note of f.notes) lines.push(`- [${fmt(note.iso)}] ${note.content}`);
    lines.push("");
  }
  if (f.learnings.length) {
    lines.push("APRENDIZAJES (más recientes):");
    for (const learning of f.learnings)
      lines.push(`- [${fmt(learning.iso)}] ${learning.content}`);
    lines.push("");
  }
  lines.push(
    "Usa las notas/aprendizajes solo como contexto para detectar altos y bajos; no los repitas textualmente. Responde únicamente el resumen, sin preámbulos."
  );

  return lines.join("\n");
}

export async function POST(): Promise<Response> {
  if (!(await isAuthenticated())) {
    return json({ error: "Fuera de alcance. 401." }, 401);
  }

  const facts = await buildFacts();

  if (!facts.daysWithData) {
    return json({
      text: "No hay registros en los últimos 30 días. Usá la bitácora unos días y volvé a preguntar.",
    });
  }

  const result = await chatWithFallback({
    system: buildPrompt(facts),
    maxTokens: 700,
    temperature: 0.3,
    stream: false,
  });

  if (result.type === "error") {
    return json({ error: result.message }, result.status === 503 ? 503 : 502);
  }

  return json({ text: result.text });
}