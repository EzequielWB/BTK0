import { redirect } from "next/navigation";
import { StatsCharts } from "@/components/stats-charts";
import { StatsPeriodSelector } from "@/components/stats-period-selector";
import { MonthlySummary } from "@/components/monthly-summary";
import { YearlySummary } from "@/components/yearly-summary";
import { parseColors } from "@/lib/colors";
import { statusOf, statusValue } from "@/lib/completion";
import { isAuthenticated } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  monthLabel,
  monthRangeISO,
  parseISODate,
  shortDayLabel,
  todayISO,
} from "@/lib/utils";
import type { DailyObjective, Day, Objective } from "@/lib/types";

export const dynamic = "force-dynamic";

const MONTH_SHORT = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat("es-AR", { month: "short" })
    .format(new Date(2020, i, 1))
    .replace(/\./g, "")
);

type Point = {
  date: string;
  percent: number;
  hasData: boolean;
  ratio: number;
};

function trailingStreak(points: Point[], today: string): number {
  let streak = 0;
  for (let i = points.length - 1; i >= 0; i--) {
    const point = points[i];
    if (point.date === today && !point.hasData) continue;
    if (point.hasData) streak++;
    else break;
  }
  return streak;
}

function longestStreak(points: Point[]): number {
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

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; mes?: string; vista?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/");

  const today = todayISO();
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));

  const { anio = "", mes = "", vista = "" } = await searchParams;
  const year = /^\d{4}$/.test(anio) ? Number(anio) : currentYear;
  const month = /^(1[0-2]|[1-9])$/.test(mes) ? Number(mes) : currentMonth;
  const isYearView = vista === "año";

  const periodEnd = isYearView
    ? `${year}-12-31`
    : monthRangeISO(`${year}-${String(month).padStart(2, "0")}-01`).end;
  const fromISO = isYearView
    ? `${year}-01-01`
    : monthRangeISO(`${year}-${String(month).padStart(2, "0")}-01`).start;
  const endDate = periodEnd < today ? periodEnd : today;
  const rangeDays =
    Math.round(
      (parseISODate(endDate).getTime() - parseISODate(fromISO).getTime()) /
        86400000
    ) + 1;

  const supabase = await createClient();

  const { data: settingsRow } = await supabase
    .from("settings")
    .select("colors")
    .eq("id", 1)
    .maybeSingle();
  const colors = parseColors(
    (settingsRow as { colors?: string | null } | null)?.colors ?? null
  );

  const { data: days } = rangeDays > 0
    ? await supabase
        .from("days")
        .select("*")
        .gte("date", fromISO)
        .lte("date", endDate)
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
        .select("date")
        .gte("date", fromISO)
        .lte("date", endDate)
    : { data: [] as { date: string }[] };

  const noteDates = new Set<string>(
    ((noteRows ?? []) as { date: string }[]).map((note) => note.date)
  );

  const { data: learningRows } = rangeDays > 0
    ? await supabase
        .from("learnings")
        .select("date")
        .gte("date", fromISO)
        .lte("date", endDate)
    : { data: [] as { date: string }[] };

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

  const points: Point[] = [];
  for (let i = 0; i < Math.max(rangeDays, 0); i++) {
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
    const ratio = denominator > 0 ? dayPoints / denominator : 0;
    points.push({ date, percent, hasData, ratio });
  }

  const streak = isYearView
    ? longestStreak(points)
    : trailingStreak(points, today);

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

  const totalRatio = points.reduce((sum, point) => sum + point.ratio, 0);
  const efficiency = Math.round((totalRatio / rangeDays) * 100);

  let chartData: { date: string; percent: number }[];
  let chartInterval: number | "preserveStartEnd" = "preserveStartEnd";
  if (isYearView) {
    const elapsedPerMonth = new Array(12).fill(0);
    const ratioPerMonth = new Array(12).fill(0);
    for (const point of points) {
      const m = Number(point.date.slice(5, 7)) - 1;
      elapsedPerMonth[m]++;
      ratioPerMonth[m] += point.ratio;
    }
    chartData = MONTH_SHORT.map((label, m) => ({
      date: label,
      percent:
        elapsedPerMonth[m] > 0
          ? Math.round((ratioPerMonth[m] / elapsedPerMonth[m]) * 100)
          : 0,
    }));
    chartInterval = 0;
  } else {
    chartData = points.map((point) => ({
      date: shortDayLabel(point.date),
      percent: point.percent,
    }));
  }

  const periodLabel = isYearView
    ? `Resumen · Año ${year}`
    : monthLabel(year, month - 1);

  return (
    <div className="space-y-6">
      <section className="blk">
        <h2 className="blk-tag">Estadísticas</h2>
        <StatsPeriodSelector
          mes={String(month)}
          anio={String(year)}
          vista={isYearView ? "año" : "mes"}
          currentYear={currentYear}
        />

        <div className="mt-4">
          <span className="cyb-hint block text-xs uppercase tracking-wider mb-1">
            {periodLabel}
          </span>
          {rangeDays > 0 ? (
            <StatsCharts data={chartData} interval={chartInterval} colors={colors} />
          ) : (
            <p className="cyb-hint text-sm">
              Este período todavía no alcanzó a empezar.
            </p>
          )}
        </div>

        {isYearView ? (
          <YearlySummary anio={String(year)} />
        ) : (
          <MonthlySummary mes={String(month)} anio={String(year)} />
        )}
      </section>

      <section>
        <h2 className="blk-tag">Resumen</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="blk">
            <dt className="cyb-hint text-sm">
              {isYearView ? "Mejor racha" : "Racha actual"}
            </dt>
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
              {isYearView ? `Eficiencia · ${year}` : `Eficiencia · ${rangeDays} días`}
            </dt>
            <dd className="text-2xl font-bold">{efficiency}%</dd>
            <dd className="cyb-hint text-sm">
              {totalRatio.toFixed(1)} / {rangeDays} pts
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}