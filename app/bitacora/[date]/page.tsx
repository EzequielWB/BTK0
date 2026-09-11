import { notFound, redirect } from "next/navigation";
import { CalendarNav } from "@/components/calendar-nav";
import { DayFlagButton } from "@/components/day-flag-button";
import { LearningsEditor } from "@/components/learnings-editor";
import { MotivationalQuote } from "@/components/motivational-quote";
import { NotesEditor } from "@/components/notes-editor";
import { ObjectivesChecklist } from "@/components/objectives-checklist";
import { ReminderPanel } from "@/components/reminder-panel";
import { TemporalGoalsSection } from "@/components/temporal-goals-section";
import {
  completionConfigFromRow,
  countedItems,
  dayPercent,
  isDayFulfilled,
  statusOf,
  statusValue,
} from "@/lib/completion";
import { isAuthenticated } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  isValidISODate,
  monthLabel,
  monthRangeISO,
  parseISODate,
  todayISO,
} from "@/lib/utils";
import type {
  ChecklistItem,
  ChecklistStatus,
  DailyObjective,
  Day,
  DayMark,
  Learning,
  Note,
  Objective,
  Reminder,
  Settings,
  TemporalGoal,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!isValidISODate(date)) notFound();
  if (!(await isAuthenticated())) redirect("/");

  const supabase = await createClient();

  const [{ data: objectives }, { data: day }, { data: goals }, { data: noteRows }, { data: learningRows }, { data: reminderRows }] =
    await Promise.all([
      supabase
        .from("objectives")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .order("created_at"),
      supabase.from("days").select("*").eq("date", date).maybeSingle(),
      supabase
        .from("temporal_goals")
        .select("*")
        .eq("is_active", true)
        .lte("start_date", date)
        .gte("end_date", date)
        .order("start_date"),
      supabase
        .from("notes")
        .select("*")
        .eq("date", date)
        .order("created_at")
        .order("id"),
      supabase
        .from("learnings")
        .select("*")
        .eq("date", date)
        .order("created_at")
        .order("id"),
      supabase
        .from("reminders")
        .select("*")
        .eq("date", date)
        .order("created_at")
        .order("id"),
    ]);

  const dayRow = (day ?? null) as Day | null;
  const notes = (noteRows ?? []) as Note[];
  const learnings = (learningRows ?? []) as Learning[];
  const reminders = (reminderRows ?? []) as Reminder[];
  const isFuture = date > todayISO();
  const hasActiveReminder = reminders.length > 0 && date >= todayISO();

  const { data: dailyObjectives } = dayRow
    ? await supabase
        .from("daily_objectives")
        .select("*")
        .eq("day_id", dayRow.id)
    : { data: [] as DailyObjective[] };

  const statusById = new Map<string, ChecklistStatus>(
    ((dailyObjectives ?? []) as DailyObjective[]).map((entry) => [
      entry.objective_id,
      statusOf(entry),
    ])
  );

  const checklistItems: ChecklistItem[] = ((objectives ?? []) as Objective[]).map(
    (objective) => ({
      objectiveId: objective.id,
      title: objective.title,
      description: objective.description,
      status: statusById.get(objective.id) ?? "none",
    })
  );

  const counted = countedItems(checklistItems);
  const completedCount = counted.filter(
    (item) => item.status === "done"
  ).length;
  const { data: settingsRow } = await supabase
    .from("settings")
    .select("id, completion_mode, threshold")
    .eq("id", 1)
    .maybeSingle();

  const config = completionConfigFromRow(
    (settingsRow ?? null) as Pick<Settings, "completion_mode" | "threshold"> | null
  );

  // Marcado del calendario con 3 componentes por día:
  // verde = día cumplido (según Ajustes), amarillo = hay notas, rojo = se aprendió algo.
  const { start: monthStart, end: monthEnd } = monthRangeISO(date);

  const [
    { data: allDays },
    { data: allDailyObjectives },
    { data: notesInMonth },
    { data: learningsInMonth },
    { data: remindersInMonth },
    { data: flagsInMonth },
  ] = await Promise.all([
    supabase.from("days").select("id, date"),
    supabase.from("daily_objectives").select("*"),
    supabase
      .from("notes")
      .select("date")
      .gte("date", monthStart)
      .lte("date", monthEnd),
    supabase
      .from("learnings")
      .select("date")
      .gte("date", monthStart)
      .lte("date", monthEnd),
    supabase
      .from("reminders")
      .select("*")
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("created_at"),
    supabase
      .from("day_flags")
      .select("date")
      .gte("date", monthStart)
      .lte("date", monthEnd),
  ]);

  // Recordatorios del mes. El calendario pinta el recuadro rojo solo para
  // días activos (date <= hoy) con recordatorios PENDIENTES; los futuros se
  // pueden ver/editar/borrar desde el modal pero todavía no marcan el
  // calendario, y los vencidos/completados quedan en la tarjeta del día
  // sin recuadro.
  const remindersByDate: Record<string, Reminder[]> = {};
  const pendingRemindersByDate: Record<string, Reminder[]> = {};
  for (const row of (remindersInMonth ?? []) as Reminder[]) {
    (remindersByDate[row.date] ??= []).push(row);
    if (!(row.completed_at ?? null)) {
      (pendingRemindersByDate[row.date] ??= []).push(row);
    }
  }

  const flaggedDates = ((flagsInMonth ?? []) as { date: string }[]).map(
    (row) => row.date
  );
  const isFlagged = flaggedDates.includes(date);

  const completedDates = new Set<string>();
  const activeTotal = countedItems(checklistItems).length;
  if (config.mode !== "off" && activeTotal > 0) {
    const dateByDayId = new Map(
      ((allDays ?? []) as { id: string; date: string }[]).map((row) => [
        row.id,
        row.date,
      ])
    );
    const completedByDate = new Map<string, number>();
    const ignoredByDate = new Map<string, number>();
    for (const entry of (allDailyObjectives ?? []) as DailyObjective[]) {
      const entryDate = dateByDayId.get(entry.day_id);
      if (!entryDate) continue;
      const entryStatus = statusOf(entry);
      if (entryStatus === "ignored") {
        ignoredByDate.set(entryDate, (ignoredByDate.get(entryDate) ?? 0) + 1);
        continue;
      }
      const entryPoints = statusValue(entryStatus);
      if (entryPoints > 0) {
        completedByDate.set(
          entryDate,
          (completedByDate.get(entryDate) ?? 0) + entryPoints
        );
      }
    }

    for (const [entryDate, points] of completedByDate) {
      const totalForDate = Math.max(0, activeTotal - (ignoredByDate.get(entryDate) ?? 0));
      if (isDayFulfilled(config, totalForDate, points)) {
        completedDates.add(entryDate);
      }
    }
  }

  const noteDates = new Set(
    ((notesInMonth ?? []) as { date: string }[]).map((row) => row.date)
  );
  const learningDates = new Set(
    ((learningsInMonth ?? []) as { date: string }[]).map((row) => row.date)
  );

  const marks: Record<string, DayMark> = {};
  const allMarkedDates = new Set([
    ...completedDates,
    ...noteDates,
    ...learningDates,
  ]);
  for (const markedDate of allMarkedDates) {
    marks[markedDate] = {
      complete: completedDates.has(markedDate),
      note: noteDates.has(markedDate),
      learn: learningDates.has(markedDate),
      reminder: (remindersByDate[markedDate]?.length ?? 0) > 0,
    };
  }

  const parsed = parseISODate(date);

  return (
    <div className="space-y-4">
      <div className="blk">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="blk-tag">
            Agenda · {monthLabel(parsed.getFullYear(), parsed.getMonth())}
          </span>
          <DayFlagButton date={date} flagged={isFlagged} />
        </div>
        <CalendarNav
          date={date}
          marks={marks}
          reminders={remindersByDate}
          pendingReminders={pendingRemindersByDate}
          flaggedDates={flaggedDates}
        />
      </div>

      {isFuture && (
        <div className="blk future-blk">
          <span className="blk-tag">Vista futura</span>
          <p className="cyb-hint text-sm">
            Todavía no llegó este día. Podés dejar recordatorios, pero las
            notas, los objetivos y los aprendizajes se habilitan cuando llegue
            la fecha.
          </p>
        </div>
      )}

      <MotivationalQuote date={date} />

      {!isFuture && (
        <section className="blk">
          <h2 className="blk-tag">
            Objetivos ·
            {counted.length > 0 && (
              <span className="normal-case tracking-normal text-xs opacity-80">
                {" "}
                {completedCount}/{counted.length} · {dayPercent(checklistItems)}%
              </span>
            )}
          </h2>
          <ObjectivesChecklist date={date} items={checklistItems} />
        </section>
      )}

      <TemporalGoalsSection goals={((goals ?? []) as TemporalGoal[])} />

      <div className={hasActiveReminder ? "blk reminder-blk" : "blk"}>
        <span className="blk-tag">
          Recordatorios
          {reminders.length > 0 && (
            <span className="normal-case tracking-normal text-xs opacity-80">
              {" "}
              ({reminders.length})
            </span>
          )}
        </span>
        <ReminderPanel date={date} initialReminders={reminders} />
      </div>

      {!isFuture && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="blk">
            <NotesEditor key={`notes-${date}`} date={date} initialNotes={notes} />
          </div>
          <div className="blk">
            <LearningsEditor key={`learnings-${date}`} date={date} initialLearnings={learnings} />
          </div>
        </div>
      )}
    </div>
  );
}