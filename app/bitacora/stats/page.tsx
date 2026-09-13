import { redirect } from "next/navigation";
import { StatsCharts } from "@/components/stats-charts";
import { MonthlySummary } from "@/components/monthly-summary";
import { statusOf, statusValue } from "@/lib/completion";
import { isAuthenticated } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { addDays, shortDayLabel, todayISO } from "@/lib/utils";
import type { DailyObjective, Day, DayStatsPoint, Objective } from "@/lib/types";

export const dynamic = "force-dynamic";

const RANGE_DAYS = 30;

export default async function StatsPage() {
  if (!(await isAuthenticated())) redirect("/");

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
    .select("date")
    .gte("date", fromISO)
    .lte("date", toISO);

  const noteDates = new Set<string>(
    ((noteRows ?? []) as { date: string }[]).map((note) => note.date)
  );

  const { data: learningRows } = await supabase
    .from("learnings")
    .select("date")
    .gte("date", fromISO)
    .lte("date", toISO);

  const learningDates = new Set<string>(
    ((learningRows ?? []) as { date: string }[]).map((learning) => learning.date)
  );

  const { data: objectiveRows } = await supabase
    .from("objectives")
    .select("*")
    .eq("is_active", true);

  const totalObjectives = ((objectiveRows ?? []) as Objective[]).length;

  const byDayId = new Map<string, DailyObjective[]>();
  for (const entry of (dailyObjectives ?? []) as DailyObjective[]) {
    const list = byDayId.get(entry.day_id) ?? [];
    list.push(entry);
    byDayId.set(entry.day_id, list);
  }

  const points: DayStatsPoint[] = [];
  let periodPoints = 0;
  for (let i = 0; i < RANGE_DAYS; i++) {
    const date = addDays(fromISO, i);
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
    const denominator = totalObjectives - ignoredCount;
    const dayPoints = todosForDay.reduce(
      (sum, entry) => sum + statusValue(statusOf(entry)),
      0
    );
    const percent = denominator > 0
      ? Math.round((dayPoints / denominator) * 100)
      : 0;
    if (denominator > 0) {
      periodPoints += dayPoints / denominator;
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

  const daysWithData = points.filter((point) => point.hasData).length;
  const daysWithNotes = noteDates.size;
  const daysWithLearnings = learningDates.size;

  const daysTracked =
    dayRows.length > 0
      ? Math.round(
          (dayRows.filter((row) => byDayId.has(row.id)).length /
            dayRows.length) *
            100
        )
      : 0;

  const efficiency = Math.round((periodPoints / RANGE_DAYS) * 100);

  // Ánimo: promedio sobre los días con mood y racha de buen ánimo (>= 4).
  const moods = dayRows
    .map((row) => row.mood)
    .filter((mood): mood is number => mood !== null && mood !== undefined);
  const avgMood = moods.length
    ? (moods.reduce((sum, mood) => sum + mood, 0) / moods.length).toFixed(1)
    : "—";
  const moodByDate = new Map<string, number>(
    dayRows
      .filter((row) => row.mood !== null && row.mood !== undefined)
      .map((row) => [row.date, row.mood as number])
  );
  let goodStreak = 0;
  for (let i = points.length - 1; i >= 0; i--) {
    const mood = moodByDate.get(points[i].date);
    if (points[i].date === toISO && mood === undefined) continue;
    if (mood !== undefined && mood >= 4) goodStreak++;
    else break;
  }

  const chartData = points.map((point) => ({
    date: shortDayLabel(point.date),
    percent: point.percent,
  }));

  return (
    <div className="space-y-6">
      <section className="blk">
        <h2 className="blk-tag">Estadísticas</h2>
        <StatsCharts data={chartData} />
        <MonthlySummary />
      </section>

      <section>
        <h2 className="blk-tag">Resumen</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-8">
          <div className="blk">
            <dt className="cyb-hint text-sm">Racha actual</dt>
            <dd className="text-2xl font-bold">{streak} días</dd>
          </div>
          <div className="blk">
            <dt className="cyb-hint text-sm">Días con registro</dt>
            <dd className="text-2xl font-bold">{daysWithData}</dd>
          </div>
          <div className="blk">
            <dt className="cyb-hint text-sm">Días con notas</dt>
            <dd className="text-2xl font-bold">{daysWithNotes}</dd>
          </div>
          <div className="blk">
            <dt className="cyb-hint text-sm">Días con aprendizajes</dt>
            <dd className="text-2xl font-bold">{daysWithLearnings}</dd>
          </div>
          <div className="blk">
            <dt className="cyb-hint text-sm">Objetivos trackeados</dt>
            <dd className="text-2xl font-bold">{daysTracked}%</dd>
          </div>
          <div className="blk">
            <dt className="cyb-hint text-sm">
              Eficiencia · {RANGE_DAYS} días
            </dt>
            <dd className="text-2xl font-bold">{efficiency}%</dd>
            <dd className="cyb-hint text-sm">
              {periodPoints.toFixed(1)} / {RANGE_DAYS} pts
            </dd>
          </div>
          <div className="blk">
            <dt className="cyb-hint text-sm">Ánimo promedio</dt>
            <dd className="text-2xl font-bold">
              {avgMood}
              <span className="cyb-hint text-sm font-normal"> / 5</span>
            </dd>
            <dd className="cyb-hint text-sm">
              {moods.length} {moods.length === 1 ? "día" : "días"} con registro
            </dd>
          </div>
          <div className="blk">
            <dt className="cyb-hint text-sm">Racha de buen ánimo</dt>
            <dd className="text-2xl font-bold">{goodStreak} días</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}