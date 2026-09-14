import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { CalendarNav } from "@/components/calendar-nav";
import { DayFlagButton } from "@/components/day-flag-button";
import { DayGoals } from "@/components/day-goals";
import { LearningsEditor } from "@/components/learnings-editor";
import { MotivationalQuote } from "@/components/motivational-quote";
import { JournalSheet } from "@/components/journal-sheet";
import { NotesEditor } from "@/components/notes-editor";
import { ObjectivesChecklist } from "@/components/objectives-checklist";
import { ReminderPanel } from "@/components/reminder-panel";
import { TemporalGoalsSection } from "@/components/temporal-goals-section";
import { ClampText } from "@/components/clamp-text";
import {
  completionConfigFromRow,
  countedItems,
  dayPercent,
  isDayFulfilled,
  statusOf,
  statusValue,
} from "@/lib/completion";
import { parseDaySectionOrder } from "@/lib/sections";
import type { DaySectionKey } from "@/lib/sections";
import { isAuthenticated } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  formatMonthDay,
  isValidISODate,
  monthLabel,
  monthRangeISO,
  parseISODate,
  todayISO,
} from "@/lib/utils";
import type {
  AnnualReminder,
  ChecklistItem,
  ChecklistStatus,
  DailyObjective,
  Day,
  DayGoal,
  DayMark,
  JournalEntry,
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

  const [{ data: objectives }, { data: day }, { data: goals }, { data: noteRows }, { data: learningRows }, { data: reminderRows }, { data: annualRows }, { data: journalRow }, { data: dayGoalRows }] =
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
      supabase.from("annual_reminders").select("*"),
      supabase.from("journal").select("date, content").eq("date", date).maybeSingle(),
      supabase
        .from("day_goals")
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
    .select("id, completion_mode, threshold, section_order")
    .eq("id", 1)
    .maybeSingle();

  const config = completionConfigFromRow(
    (settingsRow ?? null) as Pick<
      Settings,
      "completion_mode" | "threshold"
    > | null
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
    { data: journalDates },
  ] = await Promise.all([
    supabase.from("days").select("id, date"),
    supabase.from("daily_objectives").select("*"),
    supabase
      .from("notes")
      .select("date, content")
      .gte("date", monthStart)
      .lte("date", monthEnd),
    supabase
      .from("learnings")
      .select("date, content")
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
    supabase
      .from("journal")
      .select("date, content")
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
  const thoughtDates = new Set(
    ((journalDates ?? []) as { date: string }[]).map((row) => row.date)
  );

  const marks: Record<string, DayMark> = {};
  const allMarkedDates = new Set([
    ...completedDates,
    ...noteDates,
    ...learningDates,
    ...thoughtDates,
  ]);
  for (const markedDate of allMarkedDates) {
    marks[markedDate] = {
      complete: completedDates.has(markedDate),
      note: noteDates.has(markedDate),
      learn: learningDates.has(markedDate),
      thought: thoughtDates.has(markedDate),
      reminder: (remindersByDate[markedDate]?.length ?? 0) > 0,
    };
  }

  const parsed = parseISODate(date);

  // Efemérides: marcan su celda en el calendario del mes y aparecen como
  // propia categoría encima de la cita en la vista del día.
  const efemerides = (annualRows ?? []) as AnnualReminder[];
  const dayEfemerides = efemerides.filter(
    (entry) =>
      entry.month === Number(date.slice(5, 7)) &&
      entry.day === Number(date.slice(8, 10))
  );
  const journal = (journalRow ?? null) as Pick<JournalEntry, "content"> | null;
  const dayGoals = (dayGoalRows ?? []) as DayGoal[];
  const annualDates = new Set<string>();
  for (const entry of efemerides) {
    if (entry.month !== parsed.getMonth() + 1) continue;
    const iso = `${parsed.getFullYear()}-${String(entry.month).padStart(
      2,
      "0"
    )}-${String(entry.day).padStart(2, "0")}`;
    if (isValidISODate(iso)) annualDates.add(iso);
  }

  const rawSectionOrder =
    ((settingsRow ?? null) as { section_order?: string | null } | null)
      ?.section_order ?? null;
  const sectionOrderKeys = parseDaySectionOrder(rawSectionOrder);
  const orderIndex = new Map(
    sectionOrderKeys.map((key, index) => [key, index])
  );

  const daySections: Array<[DaySectionKey, ReactNode]> = [
    [
      "efemerides",
      dayEfemerides.length > 0 ? (
        <section className="blk efemeride-blk" key="efemerides">
          <span className="blk-tag">
            Efemérides
            <span className="normal-case tracking-normal text-xs opacity-80">
              {" "}
              {formatMonthDay(
                dayEfemerides[0].month,
                dayEfemerides[0].day
              )}
            </span>
          </span>
          <ul className="space-y-2">
            {dayEfemerides.map((entry) => (
              <li key={entry.id} className="enrow">
                <ClampText text={entry.content} className="whitespace-pre-wrap" />
              </li>
            ))}
          </ul>
        </section>
      ) : null,
    ],
    [
      "cita",
      <MotivationalQuote key="cita" date={date} />,
    ],
    [
      "objetivos",
      !isFuture ? (
        <section className="blk" key="objetivos">
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
      ) : null,
    ],
    [
      "objetivos_dia",
      !isFuture ? (
        <section className="blk" key="objetivos_dia">
          <h2 className="blk-tag">
            Objetivos_del_día
            {dayGoals.length > 0 && (
              <span className="normal-case tracking-normal text-xs opacity-80">
                {" "}
                {dayGoals.filter((goal) => Boolean(goal.completed_at)).length}/
                {dayGoals.length}
              </span>
            )}
          </h2>
          <DayGoals
            key={`day-goals-${date}`}
            date={date}
            initialGoals={dayGoals}
          />
        </section>
      ) : null,
    ],
    [
      "metas_activas",
      <TemporalGoalsSection
        key="metas_activas"
        goals={(goals ?? []) as TemporalGoal[]}
      />,
    ],
    [
      "recordatorios",
      <div
        key="recordatorios"
        className={hasActiveReminder ? "blk reminder-blk" : "blk"}
      >
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
      </div>,
    ],
    [
      "notas_aprendizajes",
      !isFuture ? (
        <div className="grid gap-4 md:grid-cols-2" key="notas_aprendizajes">
          <div className="blk">
            <NotesEditor
              key={`notes-${date}`}
              date={date}
              initialNotes={notes}
            />
          </div>
          <div className="blk">
            <LearningsEditor
              key={`learnings-${date}`}
              date={date}
              initialLearnings={learnings}
            />
          </div>
        </div>
      ) : null,
    ],
  ];

  const daySectionsSorted = [...daySections]
    .sort(
      (a, b) => (orderIndex.get(a[0]) ?? 0) - (orderIndex.get(b[0]) ?? 0)
    )
    .filter(([, node]) => node !== null)
    .map(([, node]) => node);

  return (
    <div className="space-y-4">
      <div className="blk">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="blk-tag">
            Agenda - {monthLabel(parsed.getFullYear(), parsed.getMonth())}
          </span>
          <div className="flex items-center gap-2">
            <JournalSheet
              key={`journal-${date}`}
              date={date}
              initial={journal?.content ?? ""}
            />
            <DayFlagButton date={date} flagged={isFlagged} />
          </div>
        </div>
        <CalendarNav
          date={date}
          marks={marks}
          reminders={remindersByDate}
          pendingReminders={pendingRemindersByDate}
          flaggedDates={flaggedDates}
          annualDates={[...annualDates]}
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

      {daySectionsSorted}
    </div>
  );
}