import { formatDateRange } from "@/lib/utils";
import { TemporalGoalDone } from "@/components/temporal-goal-done";
import { ClampText } from "@/components/clamp-text";
import type { TemporalGoal } from "@/lib/types";

export function TemporalGoalsSection({ goals }: { goals: TemporalGoal[] }) {
  if (goals.length === 0) return null;

  return (
    <section className="blk">
      <h2 className="blk-tag">Metas_activas</h2>
      <ul className="space-y-2">
        {goals.map((goal) => {
          const done = Boolean(goal.completed_at);
          return (
            <li key={goal.id} className="enrow">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <ClampText
                        as="strong"
                        text={goal.title}
                        max={80}
                        className={done ? "cyb-goal-completed" : ""}
                      />
                    {done ? (
                      <span className="cyb-hint text-xs whitespace-nowrap text-[#00ff9d]">
                        ✓ Hecha
                      </span>
                    ) : null}
                  </div>
                  <span className="cyb-hint text-xs whitespace-nowrap">
                    {formatDateRange(goal.start_date, goal.end_date)}
                  </span>
                </div>
                <TemporalGoalDone goal={goal} />
              </div>
              {goal.description ? (
                <ClampText text={goal.description} className="cyb-muted text-sm mt-1" />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}