import Link from "next/link";
import { redirect } from "next/navigation";
import { WeightChart } from "@/components/weight-chart";
import { WeightEntry } from "@/components/weight-entry";
import { parseColors } from "@/lib/colors";
import { isAuthenticated } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { addDays, monthLabel, monthRangeISO, todayISO } from "@/lib/utils";
import { kilogramAvgLabel, kilogramLabel } from "@/lib/weight";
import type { Weight, WeightMonth } from "@/lib/types";

export const dynamic = "force-dynamic";

function navLink(monthKey: string): string {
  return `/bitacora/peso?mes=${Number(monthKey.slice(5, 7))}&anio=${monthKey.slice(0, 4)}`;
}

function monthTitle(monthKey: string): string {
  return monthLabel(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)) - 1);
}

export default async function WeightPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; anio?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/");

  const today = todayISO();
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));

  const { mes = "", anio = "" } = await searchParams;
  const year = /^\d{4}$/.test(anio) ? Number(anio) : currentYear;
  const month = /^(1[0-2]|[1-9])$/.test(mes) ? Number(mes) : currentMonth;

  const isCurrentMonth = year === currentYear && month === currentMonth;
  const towardFuture =
    year > currentYear || (year === currentYear && month > currentMonth);

  const viewedMonthKey = `${year}-${String(month).padStart(2, "0")}`;
  const { start, end } = monthRangeISO(`${viewedMonthKey}-01`);
  const prevMonthKey = addDays(start, -1).slice(0, 7);
  const nextMonthKey = addDays(end, 1).slice(0, 7);
  const currentMonthKey = today.slice(0, 7);

  const supabase = await createClient();

  const { data: settingsRow } = await supabase
    .from("settings")
    .select("colors")
    .eq("id", 1)
    .maybeSingle();
  const colors = parseColors(
    (settingsRow as { colors?: string | null } | null)?.colors ?? null
  );

  const { data: weightRows } = await supabase
    .from("weight")
    .select("date, value")
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true });

  const weights = ((weightRows ?? []) as Weight[]).map((row) => ({
    date: String(row.date),
    value: Number(row.value),
  }));

  const { data: monthRow } = await supabase
    .from("weight_months")
    .select("*")
    .eq("month", start)
    .maybeSingle();

  const monthStats = monthRow as WeightMonth | null;

  const { data: historyRows } = await supabase
    .from("weight_months")
    .select("*")
    .order("month", { ascending: false })
    .limit(60);

  const history = ((historyRows ?? []) as WeightMonth[]).map((row) => ({
    month: String(row.month),
    value_min: Number(row.value_min),
    value_max: Number(row.value_max),
    value_avg: Number(row.value_avg),
    count: Number(row.count),
  }));

  const daysInMonth = Number(end.slice(8, 10));
  const chartData: { label: string; peso: number | null }[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dayISO = `${viewedMonthKey}-${String(day).padStart(2, "0")}`;
    const hit = weights.find((weight) => weight.date === dayISO);
    chartData.push({ label: String(day), peso: hit ? hit.value : null });
  }

  const existing = Object.fromEntries(
    weights.map((weight) => [weight.date, weight.value])
  );

  return (
    <div className="space-y-6">
      <section className="blk">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="blk-tag mb-0">Peso · {monthTitle(viewedMonthKey)}</span>
          <nav className="flex items-center gap-3 text-xs" aria-label="Cambiar de mes">
            <Link href={navLink(prevMonthKey)} className="cyb-link">
              ◀ Previa
            </Link>
            {nextMonthKey <= currentMonthKey ? (
              <Link href={navLink(nextMonthKey)} className="cyb-link">
                Siguiente ▶
              </Link>
            ) : (
              <span className="cyb-muted">Siguiente ▶</span>
            )}
          </nav>
        </div>

        {towardFuture ? (
          <p className="cyb-hint text-sm mt-4">
            Este período todavía no alcanzó a empezar.
          </p>
        ) : (
          <>
            {isCurrentMonth && (
              <div className="mt-4">
                <WeightEntry
                  monthStart={start}
                  monthEnd={end}
                  existing={existing}
                />
              </div>
            )}

            <div className="mt-4">
              <WeightChart data={chartData} colors={colors} />
            </div>

            {monthStats && (
              <dl className="grid grid-cols-3 gap-3 mt-4">
                <div className="blk">
                  <dt className="cyb-hint text-sm">Mínimo</dt>
                  <dd className="text-xl font-bold">{kilogramLabel(monthStats.value_min)}</dd>
                </div>
                <div className="blk">
                  <dt className="cyb-hint text-sm">Máximo</dt>
                  <dd className="text-xl font-bold">{kilogramLabel(monthStats.value_max)}</dd>
                </div>
                <div className="blk">
                  <dt className="cyb-hint text-sm">Promedio</dt>
                  <dd className="text-xl font-bold">{kilogramAvgLabel(monthStats.value_avg)}</dd>
                </div>
              </dl>
            )}
          </>
        )}
      </section>

      <section>
        <h2 className="blk-tag">Historial mensual</h2>
        {history.length === 0 ? (
          <p className="cyb-hint text-sm">
            Todavía no hay meses cerrados. El resumen de cada mes se guarda
            cuando registrás el primer peso del mes siguiente.
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((row) => (
              <div key={row.month} className="blk flex flex-wrap items-center gap-4">
                <span className="blk-tag mb-0">{monthTitle(row.month)}</span>
                <span className="text-sm">Min {kilogramLabel(row.value_min)}</span>
                <span className="text-sm">Máx {kilogramLabel(row.value_max)}</span>
                <span className="text-sm">Prom {kilogramAvgLabel(row.value_avg)}</span>
                <span className="cyb-hint text-xs">
                  {row.count} {row.count === 1 ? "día" : "días"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}