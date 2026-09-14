import { statusOf, statusValue } from "@/lib/completion";
import { createClient } from "@/lib/supabase/server";
import { addDays, parseISODate, todayISO } from "@/lib/utils";
import type {
  DailyObjective,
  Day,
  DayGoal,
  DayStatsPoint,
  Learning,
  Note,
  Objective,
} from "@/lib/types";

const MAX_SAMPLES = 15;
const SAMPLE_CHARS = 300;

export type PeriodDayPoint = DayStatsPoint & { ratio: number };

export type PeriodFacts = {
  rangeLabel: string;
  rangeDays: number;
  objectives: string[];
  daily: PeriodDayPoint[];
  best: Array<{ iso: string; percent: number }>;
  worst: Array<{ iso: string; percent: number }>;
  daysWithData: number;
  emptyDays: number;
  daysWithNotes: number;
  daysWithLearnings: number;
  streak: number;
  longestStreak: number;
  efficiency: number;
  notes: { iso: string; content: string }[];
  learnings: { iso: string; content: string }[];
  dayGoals: { iso: string; content: string }[];
};

function fmt(iso: string): string {
  const [, mm, dd] = iso.split("-");
  return `${dd}/${mm}`;
}

function clip(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > SAMPLE_CHARS ? `${t.slice(0, SAMPLE_CHARS)}…` : t;
}

function bestAndWorst(points: PeriodDayPoint[]): {
  best: Array<{ iso: string; percent: number }>;
  worst: Array<{ iso: string; percent: number }>;
} {
  const withData = points.filter((point) => point.hasData);
  const best = [...withData]
    .sort((a, b) => b.percent - a.percent || b.date.localeCompare(a.date))
    .slice(0, 3)
    .map((p) => ({ iso: p.date, percent: p.percent }));
  const worst = [...withData]
    .sort((a, b) => a.percent - b.percent || b.date.localeCompare(a.date))
    .slice(0, 3)
    .map((p) => ({ iso: p.date, percent: p.percent }));
  return { best, worst };
}

function longestStreak(points: PeriodDayPoint[]): number {
  let best = 0;
  let current = 0;
  for (const point of points) {
    if (point.hasData) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}

/**
 * Construye los hechos de un período [startISO, endISO], recortando el fin a
 * hoy si el período todavía no terminó. Sirve para meses y años.
 */
export async function buildPeriodFacts(
  startISO: string,
  endISO: string
): Promise<PeriodFacts> {
  const supabase = await createClient();
  const today = todayISO();
  const toISO = endISO < today ? endISO : today;
  const rangeDays =
    Math.round(
      (parseISODate(toISO).getTime() - parseISODate(startISO).getTime()) /
        86400000
    ) + 1;

  const { data: days } = rangeDays > 0
    ? await supabase
        .from("days")
        .select("*")
        .gte("date", startISO)
        .lte("date", toISO)
        .order("date")
    : { data: [] as Day[] };

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

  const { data: noteRows } = rangeDays > 0
    ? await supabase
        .from("notes")
        .select("date, content")
        .gte("date", startISO)
        .lte("date", toISO)
        .order("date", { ascending: false })
    : { data: [] as Note[] };

  const { data: learningRows } = rangeDays > 0
    ? await supabase
        .from("learnings")
        .select("date, content")
        .gte("date", startISO)
        .lte("date", toISO)
        .order("date", { ascending: false })
    : { data: [] as Learning[] };

  const { data: dayGoalRows } = rangeDays > 0
    ? await supabase
        .from("day_goals")
        .select("date, title, completed_at")
        .gte("date", startISO)
        .lte("date", toISO)
        .order("date", { ascending: false })
    : { data: [] as DayGoal[] };

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

  const daily: PeriodDayPoint[] = [];
  let periodPoints = 0;
  for (let i = 0; i < Math.max(rangeDays, 0); i++) {
    const date = addDays(startISO, i);
    const day = dayRows.find((row) => row.date === date);
    const todosForDay = day ? (byDayId.get(day.id) ?? []) : [];
    const hasNotes = noteDates.has(date);
    const hasLearnings = learningDates.has(date);
    const hasData = Boolean(hasNotes || hasLearnings || todosForDay.length > 0);
    const ignoredCount = todosForDay.filter(
      (entry) => statusOf(entry) === "ignored"
    ).length;
    // Los ignorados del día no cuentan ni en el numerador ni en el
    // denominador; si el día quedó sin objetivos en cuenta es neutro.
    const denominator = objectives.length - ignoredCount;
    const dayPoints = todosForDay.reduce(
      (sum, entry) => sum + statusValue(statusOf(entry)),
      0
    );
    const percent = denominator > 0
      ? Math.round((dayPoints / denominator) * 100)
      : 0;
    const ratio = denominator > 0 ? dayPoints / denominator : 0;
    if (denominator > 0) {
      periodPoints += ratio;
    }
    daily.push({ date, percent, hasData, ratio });
  }

  let streak = 0;
  for (let i = daily.length - 1; i >= 0; i--) {
    const point = daily[i];
    if (point.date === toISO && !point.hasData) continue;
    if (point.hasData) streak++;
    else break;
  }

  const { best, worst } = bestAndWorst(daily);

  const withData = daily.filter((point) => point.hasData);
  const daysWithData = withData.length;
  const emptyDays = Math.max(rangeDays, 0) - daysWithData;
  const daysWithNotes = noteDates.size;
  const daysWithLearnings = learningDates.size;
  const efficiency = Math.round((periodPoints / Math.max(rangeDays, 0)) * 100);

  const notes = ((noteRows ?? []) as Note[])
    .slice(0, MAX_SAMPLES)
    .map((note) => ({ iso: note.date, content: clip(note.content) }));
  const learnings = ((learningRows ?? []) as Learning[])
    .slice(0, MAX_SAMPLES)
    .map((learning) => ({
      iso: learning.date,
      content: clip(learning.content),
    }));
  const dayGoals = ((dayGoalRows ?? []) as DayGoal[])
    .slice(0, MAX_SAMPLES)
    .map((goal) => ({
      iso: goal.date,
      content: `${goal.title} (${goal.completed_at ? "completado" : "pendiente"})`,
    }));

  return {
    rangeLabel: `${fmt(startISO)} al ${fmt(toISO)}`,
    rangeDays: Math.max(rangeDays, 0),
    objectives,
    daily,
    best,
    worst,
    daysWithData,
    emptyDays,
    daysWithNotes,
    daysWithLearnings,
    streak,
    longestStreak: longestStreak(daily),
    efficiency,
    notes,
    learnings,
    dayGoals,
  };
}